import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  computeStudentAnalytics,
  computeTeacherClassAnalytics,
  selectAdaptiveQuestions,
} from './src/shared/adaptiveEngine';
import { getSubjectsForClass } from './src/shared/curriculumData';
import { computeGamification, computePrivacySafeLeaderboard, generateExamPaper } from './src/shared/examEngine';
import {
  AccountStatus,
  Difficulty,
  ExamAttempt,
  ExamType,
  ParentNotification,
  PracticeAttempt,
  SupportedLanguage,
  UserProfile,
  UserRole,
} from './src/shared/types';
import { dbStore, sanitizeUser, validatePasswordStrength, verifyPassword } from './src/server/store';

dotenv.config();

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 2; // Short-lived 2-hour tokens

interface TokenPayload {
  jti: string;
  uid: string;
  role: UserRole;
  exp: number;
}

// Server-side token revocation registry (logout immediately invalidates token)
const revokedTokenIds = new Set<string>();

// Brute-force login rate limiter: max 5 failed attempts per 10 mins -> 5 min lockout
const loginAttemptsMap = new Map<string, { count: number; lockedUntil: number; firstAttemptAt: number }>();

function signToken(user: UserProfile): string {
  const payload: TokenPayload = {
    jti: crypto.randomUUID(),
    uid: user.id,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as TokenPayload;
    if (!payload.uid || !payload.jti || payload.exp < Date.now() || revokedTokenIds.has(payload.jti)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function cleanText(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

interface AuthedRequest extends Request {
  user?: UserProfile;
  tokenPayload?: TokenPayload;
}

function authenticateToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired, invalid, or logged out. Please sign in again.' });
    return;
  }
  const user = dbStore.findUserById(payload.uid);
  if (!user || user.status !== 'active') {
    res.status(401).json({ error: 'Account unavailable or inactive.' });
    return;
  }
  req.user = sanitizeUser(user);
  req.tokenPayload = payload;
  next();
}

function authorizeRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      dbStore.addAuditLog({
        actorId: req.user?.id || 'unknown',
        actorName: req.user?.name || 'Unknown',
        actorRole: req.user?.role || 'anonymous',
        action: 'UNAUTHORIZED_ACCESS_BLOCKED',
        details: `Blocked ${req.method} ${req.originalUrl}`,
      });
      res.status(403).json({ error: `Access denied. Permitted roles: ${roles.join(', ')}.` });
      return;
    }
    next();
  };
}

function verifyClassAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  const cls = Number(req.params.classLevel || req.body?.classLevel);
  if (!Number.isInteger(cls) || cls < 1 || cls > 10) {
    res.status(400).json({ error: 'Invalid class level (must be 1–10).' });
    return;
  }
  const u = req.user!;
  if (u.role === 'admin') {
    next();
    return;
  }
  if (u.role === 'student' && u.classLevel !== cls) {
    res.status(403).json({ error: 'Students can only access their own registered class.' });
    return;
  }
  if (u.role === 'teacher' && !u.assignedClasses.includes(cls)) {
    res.status(403).json({ error: `Teacher is not assigned to Class ${cls}.` });
    return;
  }
  next();
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Public safe list of active demo accounts
  app.get('/api/auth/demo-accounts', (_req, res) => {
    const demos = dbStore
      .getUsers()
      .filter((u) => u.isDemo && u.status === 'active')
      .map(sanitizeUser);
    res.json({ accounts: demos });
  });

  app.post('/api/auth/demo-login', (req, res) => {
    const userId = cleanText(req.body?.userId, 64);
    if (!userId) {
      res.status(400).json({ error: 'Demo userId is required.' });
      return;
    }
    const user = dbStore.findUserById(userId);
    if (!user || !user.isDemo || user.status !== 'active') {
      res.status(404).json({ error: 'Demo account not found.' });
      return;
    }
    dbStore.recordLoginTimestamp(user.id);
    const profile = sanitizeUser(user);
    const token = signToken(profile);
    dbStore.addAuditLog({
      actorId: profile.id,
      actorName: profile.name,
      actorRole: profile.role,
      action: 'DEMO_LOGIN',
      details: `Signed in via demo portal (${profile.role})`,
    });
    res.json({ token, user: profile });
  });

  app.post('/api/auth/register', (req, res) => {
    const name = cleanText(req.body?.name, 80);
    const username = cleanText(req.body?.username, 50).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role as UserRole;
    const classLevel = Number(req.body?.classLevel);
    const preferredLanguage = (req.body?.preferredLanguage as SupportedLanguage) || 'en';
    const studentCode = cleanText(req.body?.studentCode, 30);
    const teacherCode = cleanText(req.body?.teacherCode, 30);
    const email = cleanText(req.body?.email, 100).toLowerCase();
    const assignedClassesRaw = Array.isArray(req.body?.assignedClasses)
      ? req.body.assignedClasses.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 10)
      : [];
    const linkedStudentIdentifier = cleanText(req.body?.linkedStudentIdentifier, 60);

    // Block public admin registration
    if (role === 'admin') {
      res.status(403).json({ error: 'Administrator registration is not publicly permitted.' });
      return;
    }

    if (!name || !username) {
      res.status(400).json({ error: 'Full name and username are required.' });
      return;
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }

    if (dbStore.findUserByUsername(username)) {
      res.status(409).json({ error: 'That username is already registered.' });
      return;
    }

    const userRole: UserRole = role === 'teacher' || role === 'parent' ? role : 'student';

    if (userRole === 'student') {
      if (!Number.isInteger(classLevel) || classLevel < 1 || classLevel > 10) {
        res.status(400).json({ error: 'Students must select a valid class from Class 1 to Class 10.' });
        return;
      }
      if (!studentCode) {
        res.status(400).json({ error: 'Student ID is required for student registration.' });
        return;
      }
      const created = dbStore.createUser({
        name,
        username,
        password,
        role: 'student',
        classLevel,
        studentCode,
        preferredLanguage,
        status: 'active',
      });
      const profile = sanitizeUser(created);
      const token = signToken(profile);
      dbStore.addAuditLog({
        actorId: profile.id,
        actorName: profile.name,
        actorRole: 'student',
        action: 'STUDENT_REGISTERED',
        details: `Registered Class ${classLevel} (${studentCode})`,
      });
      res.status(201).json({ token, user: profile });
      return;
    }

    if (userRole === 'teacher') {
      if (!teacherCode || !email || !email.includes('@')) {
        res.status(400).json({ error: 'Teacher ID and a valid official email address are required.' });
        return;
      }
      if (assignedClassesRaw.length === 0) {
        res.status(400).json({ error: 'Select at least one assigned class (1–10).' });
        return;
      }
      // Teacher registrations require Admin approval
      const created = dbStore.createUser({
        name,
        username,
        password,
        role: 'teacher',
        classLevel: 0,
        teacherCode,
        email,
        assignedClasses: assignedClassesRaw,
        preferredLanguage,
        status: 'pending',
      });
      dbStore.addAuditLog({
        actorId: created.id,
        actorName: created.name,
        actorRole: 'teacher',
        action: 'TEACHER_REGISTRATION_PENDING',
        details: `Registered ${teacherCode} (${email}) awaiting admin approval`,
      });
      res.status(201).json({
        pendingApproval: true,
        message:
          'Teacher registration submitted and awaiting Administrator approval. Use the Admin Portal to approve or try the Demo Teacher sign-in.',
      });
      return;
    }

    // Parent registration: link strictly to an existing student
    const linkedStudent = dbStore.findStudentByIdentifier(linkedStudentIdentifier);
    if (!linkedStudent) {
      res.status(404).json({
        error: 'Could not find a student matching that username or Student ID (e.g., aarav.c6 or LL-STU-601).',
      });
      return;
    }
    const created = dbStore.createUser({
      name,
      username,
      password,
      role: 'parent',
      classLevel: 0,
      email,
      linkedStudentIds: [linkedStudent.id],
      preferredLanguage,
      status: 'active',
    });
    const profile = sanitizeUser(created);
    const token = signToken(profile);
    dbStore.addAuditLog({
      actorId: profile.id,
      actorName: profile.name,
      actorRole: 'parent',
      action: 'PARENT_REGISTERED',
      details: `Linked parent account to student ${linkedStudent.username}`,
    });
    res.status(201).json({ token, user: profile });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = cleanText(req.body?.username, 50).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const expectedRole = req.body?.expectedRole as UserRole | undefined;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const key = `${username}:${req.ip}`;
    const record = loginAttemptsMap.get(key);
    if (record && record.lockedUntil > Date.now()) {
      res.status(429).json({
        error: 'Too many failed login attempts. Account temporarily locked for 5 minutes.',
      });
      return;
    }

    const user = dbStore.findUserByLoginIdentifier(username);
    // Optional env override for admin passcode if configured
    const envAdminPass = process.env.ADMIN_PASSCODE;
    const isEnvAdminMatch =
      user?.role === 'admin' && envAdminPass && envAdminPass.length >= 8 && password === envAdminPass;

    if (!user || (!isEnvAdminMatch && !verifyPassword(password, user.salt, user.passwordHash))) {
      const now = Date.now();
      const prevCount = record && now - record.firstAttemptAt < 10 * 60000 ? record.count : 0;
      const nextCount = prevCount + 1;
      const lockedUntil = nextCount >= 5 ? now + 5 * 60000 : 0;
      loginAttemptsMap.set(key, {
        count: nextCount,
        lockedUntil,
        firstAttemptAt: prevCount === 0 ? now : record!.firstAttemptAt,
      });
      dbStore.addAuditLog({
        actorId: user?.id || 'unknown',
        actorName: username,
        actorRole: user?.role || 'anonymous',
        action: lockedUntil ? 'LOGIN_RATE_LIMITED' : 'LOGIN_FAILED',
        details: `Failed login attempt #${nextCount} on ${expectedRole || 'any'} portal`,
      });
      res.status(lockedUntil ? 429 : 401).json({
        error: lockedUntil
          ? 'Too many failed login attempts. Account temporarily locked for 5 minutes.'
          : 'Invalid credentials.',
      });
      return;
    }

    if (user.status === 'pending') {
      res.status(403).json({ error: 'Your account is pending Administrator approval.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Contact an Administrator.' });
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      res.status(403).json({ error: 'Role mismatch for this portal. Please use your assigned role portal.' });
      return;
    }

    loginAttemptsMap.delete(key);
    dbStore.recordLoginTimestamp(user.id);
    const profile = sanitizeUser(user);
    const token = signToken(profile);
    dbStore.addAuditLog({
      actorId: profile.id,
      actorName: profile.name,
      actorRole: profile.role,
      action: 'LOGIN_SUCCESS',
      details: `Signed in to ${profile.role} portal`,
    });
    res.json({ token, user: profile });
  });

  app.post('/api/auth/logout', authenticateToken, (req: AuthedRequest, res) => {
    if (req.tokenPayload?.jti) {
      revokedTokenIds.add(req.tokenPayload.jti);
    }
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'LOGOUT',
      details: 'Session invalidated on logout',
    });
    res.json({ loggedOut: true });
  });

  app.post('/api/auth/change-password', authenticateToken, (req: AuthedRequest, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const user = dbStore.findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (!user.isDemo && !verifyPassword(currentPassword, user.salt, user.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    const pwErr = validatePasswordStrength(newPassword);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    dbStore.updateUserPassword(user.id, newPassword);
    dbStore.addAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      details: 'Password updated securely via scrypt',
    });
    res.json({ updated: true });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const username = cleanText(req.body?.username, 50).toLowerCase();
    const verificationCode = cleanText(req.body?.verificationCode, 100).toLowerCase();
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const user = dbStore.findUserByUsername(username);
    if (!user || user.isDemo) {
      res.status(400).json({ error: 'Account not eligible or verification details did not match.' });
      return;
    }
    const matchesStudent = user.studentCode && user.studentCode.toLowerCase() === verificationCode;
    const matchesTeacher = user.teacherCode && user.teacherCode.toLowerCase() === verificationCode;
    const matchesEmail = user.email && user.email.toLowerCase() === verificationCode;
    if (!matchesStudent && !matchesTeacher && !matchesEmail) {
      res.status(403).json({ error: 'Verification code (Student/Teacher ID or email) did not match.' });
      return;
    }
    const pwErr = validatePasswordStrength(newPassword);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    dbStore.updateUserPassword(user.id, newPassword);
    dbStore.addAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET',
      details: 'Password reset after identity verification',
    });
    res.json({ reset: true });
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  });

  // Curriculum route guarded by class access
  app.get('/api/curriculum/:classLevel', authenticateToken, verifyClassAccess, (req: AuthedRequest, res) => {
    const classLevel = Number(req.params.classLevel);
    const subjects = getSubjectsForClass(classLevel);
    const modules = dbStore.getMergedModules(classLevel);
    const questions = dbStore.getMergedQuestions(classLevel);
    res.json({ classLevel, subjects, modules, questions });
  });

  // Practice generator (strictly module-scoped)
  app.post('/api/practice/generate', authenticateToken, authorizeRole('student', 'teacher', 'admin'), (req: AuthedRequest, res) => {
    const moduleId = cleanText(req.body?.moduleId, 60);
    const count = Number(req.body?.count);
    const forcedDifficulty = req.body?.forcedDifficulty as Difficulty | 'adaptive' | undefined;
    if (!moduleId) {
      res.status(400).json({ error: 'moduleId is required.' });
      return;
    }
    const mod = dbStore.getMergedModules().find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Module not found.' });
      return;
    }
    if (req.user!.role === 'student' && mod.classLevel !== req.user!.classLevel) {
      res.status(403).json({ error: 'Cannot generate practice for a different class.' });
      return;
    }
    const classQuestions = dbStore.getMergedQuestions(mod.classLevel, moduleId);
    const attempts = dbStore.getAttempts().filter((a) => a.studentId === req.user!.id);
    const selection = selectAdaptiveQuestions({
      moduleId,
      studentId: req.user!.id,
      questionBank: classQuestions,
      attemptHistory: attempts,
      count: Math.min(Math.max(count || 6, 3), 10),
      sessionNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      forcedDifficulty: forcedDifficulty || 'adaptive',
    });
    res.json(selection);
  });

  // Student Dashboard, Settings, Practice & Exam Sync
  app.get('/api/student/dashboard', authenticateToken, authorizeRole('student'), (req: AuthedRequest, res) => {
    const user = req.user!;
    const modules = dbStore.getMergedModules(user.classLevel);
    const attempts = dbStore
      .getAttempts()
      .filter((a) => a.studentId === user.id)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const exams = dbStore
      .getExams()
      .filter((e) => e.studentId === user.id)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const analytics = computeStudentAnalytics(user.id, user.classLevel, attempts, modules);
    const gamification = computeGamification(user, analytics, attempts, exams);

    // Privacy-safe class leaderboard (no private info exposed)
    const classStudents = dbStore
      .getUsers()
      .filter((u) => u.role === 'student' && u.classLevel === user.classLevel && u.status === 'active')
      .map(sanitizeUser);
    const classAttempts = dbStore.getAttempts().filter((a) => a.classLevel === user.classLevel);
    const classExams = dbStore.getExams().filter((e) => e.classLevel === user.classLevel);
    const leaderboard = computePrivacySafeLeaderboard(user.id, classStudents, classAttempts, classExams);

    const recommendations = dbStore.getRecommendations(user.classLevel, user.id);
    const assignments = dbStore.getAssignments(user.classLevel, user.id);
    const customQuizzes = dbStore.getCustomQuizzes(user.classLevel, user.id);

    res.json({
      analytics,
      gamification,
      leaderboard,
      attempts,
      exams,
      recommendations,
      assignments,
      customQuizzes,
    });
  });

  app.patch('/api/student/settings', authenticateToken, authorizeRole('student'), (req: AuthedRequest, res) => {
    const lang = req.body?.preferredLanguage as SupportedLanguage;
    if (lang !== 'en' && lang !== 'kn' && lang !== 'hi') {
      res.status(400).json({ error: 'Invalid language selection.' });
      return;
    }
    const updated = dbStore.updateUserLanguage(req.user!.id, lang);
    res.json({ user: updated ? sanitizeUser(updated) : req.user });
  });

  app.post('/api/sync/attempts', authenticateToken, authorizeRole('student', 'teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.user!;
    const { attempts, exams } = req.body as { attempts?: PracticeAttempt[]; exams?: ExamAttempt[] };

    const sanitizedAttempts: PracticeAttempt[] = [];
    if (Array.isArray(attempts)) {
      for (const att of attempts) {
        if (user.role === 'student' && (att.studentId !== user.id || att.classLevel !== user.classLevel)) {
          continue;
        }
        const mod = dbStore.getMergedModules().find((m) => m.id === att.moduleId);
        if (!mod || mod.classLevel !== att.classLevel) continue;
        // Recompute percentage cleanly on server to prevent client score tampering
        const validTotal = Math.max(1, att.answers.length);
        const validCorrect = att.answers.filter((a) => a.isCorrect).length;
        sanitizedAttempts.push({
          ...att,
          studentName: user.role === 'student' ? user.name : att.studentName,
          totalQuestions: validTotal,
          correctCount: validCorrect,
          incorrectCount: validTotal - validCorrect,
          percentage: Math.round((validCorrect / validTotal) * 100),
          synced: true,
        });
      }
    }

    const sanitizedExams: ExamAttempt[] = [];
    if (Array.isArray(exams)) {
      for (const ex of exams) {
        if (user.role === 'student' && (ex.studentId !== user.id || ex.classLevel !== user.classLevel)) {
          continue;
        }
        const totalMarks = ex.answers.reduce((s, a) => s + a.maxMarks, 0);
        const marksObtained = ex.answers.reduce((s, a) => s + (a.isCorrect ? a.maxMarks : 0), 0);
        sanitizedExams.push({
          ...ex,
          studentName: user.role === 'student' ? user.name : ex.studentName,
          totalMarks,
          marksObtained,
          percentage: totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0,
          synced: true,
        });
      }
    }

    const savedAttempts = dbStore.upsertAttempts(sanitizedAttempts);
    const savedExams = dbStore.upsertExams(sanitizedExams);
    res.json({ syncedAttempts: savedAttempts.length, syncedExams: savedExams.length });
  });

  // Examination Generator & Submission
  app.post('/api/exams/generate', authenticateToken, authorizeRole('student'), (req: AuthedRequest, res) => {
    const examType = req.body?.examType as ExamType;
    const subjectId = cleanText(req.body?.subjectId, 40);
    const moduleId = cleanText(req.body?.moduleId, 60);
    const classLevel = req.user!.classLevel;

    const modules = dbStore.getMergedModules(classLevel);
    const questions = dbStore.getMergedQuestions(classLevel);
    const paper = generateExamPaper({
      classLevel,
      examType: examType === 'chapter' || examType === 'subject' ? examType : 'mock_class',
      subjectId,
      moduleId,
      studentId: req.user!.id,
      modules,
      questionBank: questions,
    });
    res.json(paper);
  });

  // Parent / Guardian Dashboard (strictly scoped to linkedStudentIds)
  app.get('/api/parent/dashboard', authenticateToken, authorizeRole('parent'), (req: AuthedRequest, res) => {
    const linkedIds = req.user!.linkedStudentIds || [];
    const childrenData = linkedIds
      .map((sid) => {
        const st = dbStore.findUserById(sid);
        if (!st || st.role !== 'student') return null;
        const modules = dbStore.getMergedModules(st.classLevel);
        const attempts = dbStore
          .getAttempts()
          .filter((a) => a.studentId === st.id)
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        const exams = dbStore
          .getExams()
          .filter((e) => e.studentId === st.id)
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        const analytics = computeStudentAnalytics(st.id, st.classLevel, attempts, modules);
        const gamification = computeGamification(sanitizeUser(st), analytics, attempts, exams);

        const notifications: ParentNotification[] = [];
        if (analytics.strongModules.length > 0) {
          notifications.push({
            id: `not-strong-${st.id}`,
            studentId: st.id,
            studentName: st.name,
            type: 'milestone',
            message: `${st.name} achieved strong mastery (80%+) in ${analytics.strongModules.length} module(s).`,
            createdAt: attempts[0]?.completedAt || new Date().toISOString(),
          });
        }
        if (analytics.weakModules.length > 0) {
          notifications.push({
            id: `not-weak-${st.id}`,
            studentId: st.id,
            studentName: st.name,
            type: 'support_needed',
            message: `${st.name} needs revision support in ${analytics.weakModules[0].moduleTitle} (${analytics.weakModules[0].latestAccuracy}%).`,
            createdAt: attempts[0]?.completedAt || new Date().toISOString(),
          });
        }

        return {
          student: sanitizeUser(st),
          analytics,
          gamification,
          attempts: attempts.slice(0, 10),
          exams: exams.slice(0, 10),
          notifications,
        };
      })
      .filter(Boolean);

    res.json({ children: childrenData });
  });

  // Teacher Endpoints (strictly assigned classes only)
  app.get('/api/teacher/class/:classLevel', authenticateToken, authorizeRole('teacher', 'admin'), verifyClassAccess, (req: AuthedRequest, res) => {
    const classLevel = Number(req.params.classLevel);
    const students = dbStore.getUsers().map(sanitizeUser);
    const attempts = dbStore.getAttempts();
    const modules = dbStore.getMergedModules(classLevel);
    const analytics = computeTeacherClassAnalytics(classLevel, students, attempts, modules);
    const recommendations = dbStore.getRecommendations(classLevel);
    const assignments = dbStore.getAssignments(classLevel);
    const customQuizzes = dbStore.getCustomQuizzes(classLevel);
    const activityLogs = dbStore
      .getAuditLogs()
      .filter((l) => l.actorId === req.user!.id || l.action.startsWith('TEACHER_'))
      .slice(0, 20);

    res.json({ analytics, recommendations, assignments, customQuizzes, activityLogs });
  });

  app.get('/api/teacher/student/:studentId', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const student = dbStore.findUserById(req.params.studentId);
    if (!student || student.role !== 'student') {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(student.classLevel)) {
      res.status(403).json({ error: 'Student is not in your assigned classes.' });
      return;
    }
    const modules = dbStore.getMergedModules(student.classLevel);
    const attempts = dbStore
      .getAttempts()
      .filter((a) => a.studentId === student.id)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const exams = dbStore
      .getExams()
      .filter((e) => e.studentId === student.id)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const analytics = computeStudentAnalytics(student.id, student.classLevel, attempts, modules);
    const recommendations = dbStore.getRecommendations(student.classLevel, student.id);

    res.json({ student: sanitizeUser(student), analytics, attempts, exams, recommendations });
  });

  app.get('/api/teacher/export/:classLevel', authenticateToken, authorizeRole('teacher', 'admin'), verifyClassAccess, (req: AuthedRequest, res) => {
    const classLevel = Number(req.params.classLevel);
    const students = dbStore.getUsers().map(sanitizeUser);
    const attempts = dbStore.getAttempts();
    const modules = dbStore.getMergedModules(classLevel);
    const analytics = computeTeacherClassAnalytics(classLevel, students, attempts, modules);

    const header = 'Student Name,Username,Student ID,Section,Class,Sessions,Modules Completed,Average Accuracy %,Trend,Weakest Module';
    const rows = analytics.allStudents.map((s) =>
      [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.username}"`,
        `"${s.studentCode || ''}"`,
        `"${s.section || 'A'}"`,
        s.classLevel,
        s.totalAttempts,
        `${s.completedModules}/24`,
        s.overallAccuracy ?? '',
        s.trend,
        `"${(s.weakestModule || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="learnlocal-class-${classLevel}-report.csv"`);
    res.send(csv);
  });

  app.put('/api/teacher/module/:moduleId', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const mod = dbStore.getMergedModules().find((m) => m.id === req.params.moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Module not found.' });
      return;
    }
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(mod.classLevel)) {
      res.status(403).json({ error: 'Not assigned to this class.' });
      return;
    }
    const updated = dbStore.updateModule(mod.id, {
      title: cleanText(req.body?.title, 120),
      summary: cleanText(req.body?.summary, 400),
      moduleExplanation: cleanText(req.body?.moduleExplanation, 2000),
    });
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'TEACHER_MODULE_UPDATED',
      details: `Updated Class ${mod.classLevel} module ${mod.title}`,
    });
    res.json({ module: updated });
  });

  app.post('/api/teacher/question', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const moduleId = cleanText(req.body?.moduleId, 60);
    const mod = dbStore.getMergedModules().find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Target module not found.' });
      return;
    }
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(mod.classLevel)) {
      res.status(403).json({ error: 'Not assigned to this class.' });
      return;
    }
    const prompt = cleanText(req.body?.prompt, 500);
    const optionsRaw = Array.isArray(req.body?.options) ? req.body.options.map((o: unknown) => cleanText(o, 250)) : [];
    const correctIndex = Number(req.body?.correctIndex);
    if (!prompt || optionsRaw.length !== 4 || optionsRaw.some((o: string) => !o)) {
      res.status(400).json({ error: 'Question prompt and 4 non-empty options are required.' });
      return;
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      res.status(400).json({ error: 'correctIndex must be between 0 and 3.' });
      return;
    }
    const difficulty: Difficulty =
      req.body?.difficulty === 'easy' || req.body?.difficulty === 'hard' ? req.body.difficulty : 'medium';

    const created = dbStore.addQuestion({
      classLevel: mod.classLevel,
      subjectId: mod.subjectId,
      moduleId: mod.id,
      topic: cleanText(req.body?.topic, 80) || mod.title,
      difficulty,
      prompt,
      options: optionsRaw as [string, string, string, string],
      correctIndex,
      hint: cleanText(req.body?.hint, 300) || 'Review the key rule in this module.',
      explanation: cleanText(req.body?.explanation, 500) || 'Check the module learning material.',
    });
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'TEACHER_QUESTION_ADDED',
      details: `Added ${difficulty} question to ${mod.title}`,
    });
    res.status(201).json({ question: created });
  });

  app.delete('/api/teacher/question/:questionId', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const q = dbStore.getMergedQuestions().find((x) => x.id === req.params.questionId);
    if (!q) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(q.classLevel)) {
      res.status(403).json({ error: 'Not assigned to this class.' });
      return;
    }
    dbStore.deleteQuestion(q.id);
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'TEACHER_QUESTION_DELETED',
      details: `Removed question ${q.id} from Class ${q.classLevel}`,
    });
    res.json({ deleted: true });
  });

  app.post('/api/teacher/recommendations', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const moduleId = cleanText(req.body?.moduleId, 60);
    const mod = dbStore.getMergedModules().find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Module not found.' });
      return;
    }
    const targetClass = Number(req.body?.classLevel) || mod.classLevel;
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(targetClass)) {
      res.status(403).json({ error: 'Not assigned to this class.' });
      return;
    }
    const created = dbStore.addRecommendation({
      teacherId: req.user!.id,
      teacherName: req.user!.name,
      studentId: cleanText(req.body?.studentId, 60) || 'ALL_CLASS',
      classLevel: targetClass,
      subjectId: mod.subjectId,
      moduleId: mod.id,
      moduleTitle: mod.title,
      note: cleanText(req.body?.note, 400) || `Please revise ${mod.title} and complete a practice set.`,
    });
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'TEACHER_RECOMMENDATION_SENT',
      details: `Recommended ${mod.title} in Class ${targetClass}`,
    });
    res.status(201).json({ recommendation: created });
  });

  app.post('/api/teacher/assignments', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const moduleId = cleanText(req.body?.moduleId, 60);
    const mod = dbStore.getMergedModules().find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Module not found.' });
      return;
    }
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(mod.classLevel)) {
      res.status(403).json({ error: 'Not assigned to this class.' });
      return;
    }
    const created = dbStore.addAssignment({
      teacherId: req.user!.id,
      teacherName: req.user!.name,
      classLevel: mod.classLevel,
      section: cleanText(req.body?.section, 4) || 'A',
      subjectId: mod.subjectId,
      subjectName: mod.subjectName,
      moduleId: mod.id,
      moduleTitle: mod.title,
      title: cleanText(req.body?.title, 120) || `${mod.title} Homework`,
      instructions: cleanText(req.body?.instructions, 500) || `Study ${mod.title} notes and complete a practice set.`,
      dueDate: cleanText(req.body?.dueDate, 30) || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      targetStudentId: cleanText(req.body?.targetStudentId, 60) || 'ALL_CLASS',
    });
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'TEACHER_ASSIGNMENT_CREATED',
      details: `Assigned "${created.title}" to Class ${mod.classLevel}`,
    });
    res.status(201).json({ assignment: created });
  });

  app.post('/api/teacher/quizzes', authenticateToken, authorizeRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const moduleId = cleanText(req.body?.moduleId, 60);
    const mod = dbStore.getMergedModules().find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Module not found.' });
      return;
    }
    if (req.user!.role === 'teacher' && !req.user!.assignedClasses.includes(mod.classLevel)) {
      res.status(403).json({ error: 'Not assigned to this class.' });
      return;
    }
    const modQs = dbStore.getMergedQuestions(mod.classLevel, mod.id).slice(0, 5).map((q) => q.id);
    const created = dbStore.addCustomQuiz({
      teacherId: req.user!.id,
      teacherName: req.user!.name,
      classLevel: mod.classLevel,
      subjectId: mod.subjectId,
      moduleId: mod.id,
      title: cleanText(req.body?.title, 120) || `${mod.title} Quick Quiz`,
      targetStudentId: cleanText(req.body?.targetStudentId, 60) || 'ALL_CLASS',
      questionIds: modQs,
    });
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'TEACHER_QUIZ_CREATED',
      details: `Created custom quiz "${created.title}" for Class ${mod.classLevel}`,
    });
    res.status(201).json({ quiz: created });
  });

  // Administrator Endpoints (strictly Admin role)
  app.get('/api/admin/overview', authenticateToken, authorizeRole('admin'), (_req, res) => {
    const users = dbStore.getUsers().map(sanitizeUser);
    const attempts = dbStore.getAttempts();
    const exams = dbStore.getExams();
    const modules = dbStore.getMergedModules();
    const storage = dbStore.getStorageStats();
    const auditLogs = dbStore.getAuditLogs();
    const apiErrors = dbStore.getApiErrors();

    res.json({
      users,
      stats: {
        totalUsers: users.length,
        studentsCount: users.filter((u) => u.role === 'student').length,
        teachersCount: users.filter((u) => u.role === 'teacher').length,
        pendingTeachersCount: users.filter((u) => u.role === 'teacher' && u.status === 'pending').length,
        parentsCount: users.filter((u) => u.role === 'parent').length,
        totalPracticeAttempts: attempts.length,
        totalExamsCompleted: exams.length,
        totalModules: modules.length,
        verifiedModules: modules.filter((m) => m.verifiedByAdmin).length,
        dbSizeKB: storage.dbSizeKB,
        backupCount: storage.backupCount,
      },
      modulesSummary: modules.slice(0, 30),
      auditLogs,
      apiErrors,
    });
  });

  app.patch('/api/admin/user/:userId', authenticateToken, authorizeRole('admin'), (req: AuthedRequest, res) => {
    const target = dbStore.findUserById(req.params.userId);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const status = req.body?.status as AccountStatus | undefined;
    const assignedClasses = Array.isArray(req.body?.assignedClasses)
      ? req.body.assignedClasses.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 10)
      : undefined;
    const classLevel = typeof req.body?.classLevel === 'number' ? Number(req.body.classLevel) : undefined;
    const section = typeof req.body?.section === 'string' ? req.body.section : undefined;

    const updated = dbStore.adminUpdateUser(target.id, { status, assignedClasses, classLevel, section });
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'admin',
      action: 'ADMIN_USER_UPDATED',
      details: `Updated ${target.username}: status=${status || target.status}`,
    });
    res.json({ user: updated ? sanitizeUser(updated) : null });
  });

  app.post('/api/admin/curriculum/:moduleId/verify', authenticateToken, authorizeRole('admin'), (req: AuthedRequest, res) => {
    const updated = dbStore.updateModule(req.params.moduleId, {
      verifiedByAdmin: Boolean(req.body?.verified ?? true),
    });
    if (!updated) {
      res.status(404).json({ error: 'Module not found.' });
      return;
    }
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'admin',
      action: 'ADMIN_CURRICULUM_VERIFIED',
      details: `Marked ${updated.title} as verified`,
    });
    res.json({ module: updated });
  });

  app.get('/api/admin/backup', authenticateToken, authorizeRole('admin'), (req: AuthedRequest, res) => {
    const { fileName, backupData } = dbStore.createBackup();
    dbStore.addAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'admin',
      action: 'ADMIN_BACKUP_CREATED',
      details: `Created database backup ${fileName}`,
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(backupData, null, 2));
  });

  // Server-Side Gemini AI Doubt-Clearing Endpoint
  app.post('/api/doubt-chat', authenticateToken, async (req: AuthedRequest, res) => {
    const question = cleanText(req.body?.question, 800);
    const classLevel = Number(req.body?.classLevel) || req.user!.classLevel || 6;
    const subjectName = cleanText(req.body?.subjectName, 60) || 'General';
    const moduleTitle = cleanText(req.body?.moduleTitle, 120) || 'Overview';
    const moduleContent = cleanText(req.body?.moduleContent, 3000);
    const language = (req.body?.language as SupportedLanguage) || 'en';
    const isPracticeMode = Boolean(req.body?.isPracticeMode);
    const isExamMode = Boolean(req.body?.isExamMode);
    const currentPracticeQuestion = cleanText(req.body?.currentPracticeQuestion, 400);
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!question) {
      res.status(400).json({ error: 'Please type a question first.' });
      return;
    }

    // Never provide answers during timed assessments
    if (isExamMode) {
      res.json({
        reply:
          'Exam Mode Guard: Hints and direct answers are paused during active assessments so your exam stays fair. After submitting, ask me about any question!',
        mode: 'online-ai',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Online AI tutor awaits GEMINI_API_KEY configuration. Using cached offline module guide.',
        code: 'NO_API_KEY',
      });
      return;
    }

    const langName = language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English';

    const systemInstruction = [
      `You are LEARNLOCAL's patient, age-appropriate personal school tutor helping a Class ${classLevel} student.`,
      `Current context: Class ${classLevel} | Subject: ${subjectName} | Module: ${moduleTitle}.`,
      `Respond in ${langName}. Adjust explanation complexity specifically for a Class ${classLevel} learner.`,
      `Always use everyday life examples when explaining difficult concepts, and break explanations into clear numbered steps.`,
      moduleContent ? `Base explanations on this module material:\n${moduleContent}` : '',
      isPracticeMode
        ? `CRITICAL PRACTICE RULE: The student is actively solving a practice question${
            currentPracticeQuestion ? `: "${currentPracticeQuestion}"` : ''
          }. NEVER reveal the direct answer or option letter! Provide progressive hints, formulas, or a gentle nudge so the student solves it themselves.`
        : `Keep responses encouraging, clear, and concise.`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const recentTurns = history
      .slice(-6)
      .map((m: { role?: string; text?: string }) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${cleanText(m.text, 400)}`)
      .join('\n');

    const contents = recentTurns
      ? `Recent conversation:\n${recentTurns}\n\nStudent question: ${question}`
      : question;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: { systemInstruction },
      });
      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'AI tutor returned an empty response.' });
        return;
      }
      res.json({ reply, mode: 'online-ai' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reach AI tutor.';
      dbStore.recordApiError('/api/doubt-chat', message);
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LEARNLOCAL server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
