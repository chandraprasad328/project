import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MASTER_CURRICULUM } from '../shared/curriculumData';
import {
  AccountStatus,
  AssignmentItem,
  AuditLogEntry,
  CustomQuizItem,
  ExamAttempt,
  LearningModule,
  PracticeAttempt,
  QuestionItem,
  SupportedLanguage,
  TeacherRecommendation,
  UserProfile,
  UserRole,
} from '../shared/types';

export interface StoredUser extends UserProfile {
  passwordHash: string;
  salt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  moduleOverrides: Record<string, Partial<LearningModule>>;
  customQuestions: QuestionItem[];
  deletedQuestionIds: string[];
  attempts: PracticeAttempt[];
  exams: ExamAttempt[];
  recommendations: TeacherRecommendation[];
  assignments: AssignmentItem[];
  customQuizzes: CustomQuizItem[];
  auditLogs: AuditLogEntry[];
  apiErrors: Array<{ id: string; endpoint: string; message: string; timestamp: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const DB_PATH = path.resolve(DATA_DIR, 'learnlocal-db.json');

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character (e.g., !@#$%).';
  }
  return null;
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash: derived };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const bufA = Buffer.from(hash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function sanitizeUser(user: StoredUser): UserProfile {
  const { passwordHash: _p, salt: _s, ...profile } = user;
  return profile;
}

function createInitialState(): DatabaseState {
  const makeDemoUser = (params: {
    id: string;
    name: string;
    username: string;
    role: UserRole;
    classLevel: number;
    assignedClasses: number[];
    preferredLanguage?: SupportedLanguage;
    studentCode?: string;
    teacherCode?: string;
    email?: string;
    section?: string;
    linkedStudentIds?: string[];
    status?: AccountStatus;
    isDemo?: boolean;
  }): StoredUser => {
    const { salt, hash } = hashPassword(`LearnLocal#${params.id}!2026`);
    return {
      id: params.id,
      name: params.name,
      username: params.username,
      role: params.role,
      classLevel: params.classLevel,
      section: params.section || 'A',
      studentCode: params.studentCode,
      teacherCode: params.teacherCode,
      email: params.email,
      assignedClasses: params.assignedClasses,
      linkedStudentIds: params.linkedStudentIds,
      preferredLanguage: params.preferredLanguage || 'en',
      status: params.status || 'active',
      isDemo: params.isDemo ?? true,
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      passwordHash: hash,
      salt,
    };
  };

  const adminUser = makeDemoUser({
    id: 'admin-learnlocal',
    name: 'Dr. Sunita Deshpande (Admin)',
    username: 'admin.learnlocal',
    role: 'admin',
    classLevel: 0,
    assignedClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    email: 'admin@learnlocal.edu',
  });

  const teacher1 = makeDemoUser({
    id: 'teacher-kavitha',
    name: 'Ms. Kavitha Rao',
    username: 'teacher.kavitha',
    role: 'teacher',
    classLevel: 0,
    assignedClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    teacherCode: 'LL-TEA-001',
    email: 'kavitha.rao@learnlocal.edu',
  });

  const teacher2 = makeDemoUser({
    id: 'teacher-vikram',
    name: 'Mr. Vikram Shetty',
    username: 'teacher.vikram',
    role: 'teacher',
    classLevel: 0,
    assignedClasses: [6, 7], // Restricted to Class 6 and 7 for class-isolation testing
    teacherCode: 'LL-TEA-002',
    email: 'vikram.shetty@learnlocal.edu',
  });

  const pendingTeacher = makeDemoUser({
    id: 'teacher-pending-ramesh',
    name: 'Mr. Ramesh Kulkarni',
    username: 'teacher.ramesh',
    role: 'teacher',
    classLevel: 0,
    assignedClasses: [8, 9, 10],
    teacherCode: 'LL-TEA-003',
    email: 'ramesh.k@learnlocal.edu',
    status: 'pending',
    isDemo: false,
  });

  const demoStudents: StoredUser[] = [
    makeDemoUser({ id: 'stu-c1-diya', name: 'Diya Sharma', username: 'diya.c1', role: 'student', classLevel: 1, assignedClasses: [1], studentCode: 'LL-STU-101' }),
    makeDemoUser({ id: 'stu-c2-rohan', name: 'Rohan Verma', username: 'rohan.c2', role: 'student', classLevel: 2, assignedClasses: [2], studentCode: 'LL-STU-201' }),
    makeDemoUser({ id: 'stu-c3-meera', name: 'Meera Nair', username: 'meera.c3', role: 'student', classLevel: 3, assignedClasses: [3], studentCode: 'LL-STU-301' }),
    makeDemoUser({ id: 'stu-c4-kabir', name: 'Kabir Gowda', username: 'kabir.c4', role: 'student', classLevel: 4, assignedClasses: [4], studentCode: 'LL-STU-401', preferredLanguage: 'kn' }),
    makeDemoUser({ id: 'stu-c5-sana', name: 'Sana Patel', username: 'sana.c5', role: 'student', classLevel: 5, assignedClasses: [5], studentCode: 'LL-STU-501' }),
    makeDemoUser({ id: 'stu-c6-aarav', name: 'Aarav Kulkarni', username: 'aarav.c6', role: 'student', classLevel: 6, assignedClasses: [6], studentCode: 'LL-STU-601' }),
    makeDemoUser({ id: 'stu-c6-ishaan', name: 'Ishaan Hegde', username: 'ishaan.c6', role: 'student', classLevel: 6, assignedClasses: [6], studentCode: 'LL-STU-602' }),
    makeDemoUser({ id: 'stu-c6-priya', name: 'Priya Menon', username: 'priya.c6', role: 'student', classLevel: 6, assignedClasses: [6], studentCode: 'LL-STU-603', section: 'B' }),
    makeDemoUser({ id: 'stu-c7-tanvi', name: 'Tanvi Deshmukh', username: 'tanvi.c7', role: 'student', classLevel: 7, assignedClasses: [7], studentCode: 'LL-STU-701' }),
    makeDemoUser({ id: 'stu-c8-vivek', name: 'Vivek Joshi', username: 'vivek.c8', role: 'student', classLevel: 8, assignedClasses: [8], studentCode: 'LL-STU-801' }),
    makeDemoUser({ id: 'stu-c9-neha', name: 'Neha Reddy', username: 'neha.c9', role: 'student', classLevel: 9, assignedClasses: [9], studentCode: 'LL-STU-901' }),
    makeDemoUser({ id: 'stu-c10-ananya', name: 'Ananya Iyer', username: 'ananya.c10', role: 'student', classLevel: 10, assignedClasses: [10], studentCode: 'LL-STU-1001' }),
    makeDemoUser({ id: 'stu-c10-arjun', name: 'Arjun Bhat', username: 'arjun.c10', role: 'student', classLevel: 10, assignedClasses: [10], studentCode: 'LL-STU-1002' }),
  ];

  const demoParent = makeDemoUser({
    id: 'parent-kulkarni',
    name: 'Mrs. Deepa Kulkarni (Parent)',
    username: 'parent.kulkarni',
    role: 'parent',
    classLevel: 0,
    assignedClasses: [],
    linkedStudentIds: ['stu-c6-aarav'],
    email: 'deepa.kulkarni@example.com',
  });

  // Clean initial state: all students start with 0 attempts & 0 exams
  return {
    users: [adminUser, teacher1, teacher2, pendingTeacher, demoParent, ...demoStudents],
    moduleOverrides: {},
    customQuestions: [],
    deletedQuestionIds: [],
    attempts: [],
    exams: [],
    recommendations: [],
    assignments: [],
    customQuizzes: [],
    auditLogs: [
      {
        id: 'audit-init',
        actorId: 'system',
        actorName: 'LEARNLOCAL System',
        actorRole: 'admin',
        action: 'SYSTEM_INITIALIZED',
        details: 'Initialized clean academic state for Class 1–10 with RBAC enabled.',
        timestamp: new Date().toISOString(),
      },
    ],
    apiErrors: [],
  };
}

class Store {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseState>;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.attempts)) {
          // Ensure backward compatibility if older DB file exists
          const users = parsed.users.map((u) => ({
            ...u,
            status: u.status || 'active',
            assignedClasses: Array.isArray(u.assignedClasses) ? u.assignedClasses : [],
          }));
          // Ensure admin & demo parent exist
          const fresh = createInitialState();
          for (const reqUser of fresh.users) {
            if (!users.some((u) => u.id === reqUser.id)) {
              users.push(reqUser);
            }
          }
          return {
            users,
            moduleOverrides: parsed.moduleOverrides || {},
            customQuestions: parsed.customQuestions || [],
            deletedQuestionIds: parsed.deletedQuestionIds || [],
            attempts: parsed.attempts || [],
            exams: parsed.exams || [],
            recommendations: parsed.recommendations || [],
            assignments: parsed.assignments || [],
            customQuizzes: parsed.customQuizzes || [],
            auditLogs: parsed.auditLogs || [],
            apiErrors: parsed.apiErrors || [],
          };
        }
      }
    } catch {
      // Fallback to fresh seed state
    }
    const fresh = createInitialState();
    this.saveState(fresh);
    return fresh;
  }

  private saveState(state: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const resolved = path.resolve(DB_PATH);
      if (!resolved.startsWith(DATA_DIR + path.sep)) {
        throw new Error('Invalid DB path');
      }
      fs.writeFileSync(resolved, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store:', err);
    }
  }

  private persist() {
    this.saveState(this.state);
  }

  createBackup(): { fileName: string; backupData: DatabaseState } {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `learnlocal-backup-${stamp}.json`;
    const target = path.resolve(BACKUP_DIR, fileName);
    if (!target.startsWith(BACKUP_DIR + path.sep)) {
      throw new Error('Invalid backup path');
    }
    fs.writeFileSync(target, JSON.stringify(this.state, null, 2), 'utf-8');
    return { fileName, backupData: this.state };
  }

  getStorageStats(): { dbSizeKB: number; backupCount: number } {
    let dbSizeKB = 0;
    let backupCount = 0;
    try {
      if (fs.existsSync(DB_PATH)) {
        dbSizeKB = Math.round(fs.statSync(DB_PATH).size / 1024);
      }
      if (fs.existsSync(BACKUP_DIR)) {
        backupCount = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).length;
      }
    } catch {
      // Ignore
    }
    return { dbSizeKB, backupCount };
  }

  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    this.state.auditLogs.unshift({
      ...entry,
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    });
    if (this.state.auditLogs.length > 250) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 250);
    }
    this.persist();
  }

  getAuditLogs(): AuditLogEntry[] {
    return this.state.auditLogs;
  }

  recordApiError(endpoint: string, message: string) {
    this.state.apiErrors.unshift({
      id: `err-${crypto.randomUUID().slice(0, 8)}`,
      endpoint,
      message,
      timestamp: new Date().toISOString(),
    });
    if (this.state.apiErrors.length > 50) {
      this.state.apiErrors = this.state.apiErrors.slice(0, 50);
    }
    this.persist();
  }

  getApiErrors() {
    return this.state.apiErrors;
  }

  getUsers(): StoredUser[] {
    return this.state.users;
  }

  findUserById(id: string): StoredUser | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  findUserByUsername(username: string): StoredUser | undefined {
    const clean = username.trim().toLowerCase();
    return this.state.users.find((u) => u.username.toLowerCase() === clean);
  }

  findUserByLoginIdentifier(identifier: string): StoredUser | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.state.users.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        (u.teacherCode && u.teacherCode.toLowerCase() === clean) ||
        (u.studentCode && u.studentCode.toLowerCase() === clean)
    );
  }

  findStudentByIdentifier(identifier: string): StoredUser | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.state.users.find(
      (u) =>
        u.role === 'student' &&
        (u.username.toLowerCase() === clean ||
          (u.studentCode && u.studentCode.toLowerCase() === clean) ||
          u.id.toLowerCase() === clean)
    );
  }

  recordLoginTimestamp(userId: string) {
    const user = this.findUserById(userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      this.persist();
    }
  }

  updateUserPassword(userId: string, newPassword: string): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    const { salt, hash } = hashPassword(newPassword);
    user.salt = salt;
    user.passwordHash = hash;
    this.persist();
    return true;
  }

  updateUserLanguage(userId: string, language: SupportedLanguage): StoredUser | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.preferredLanguage = language;
    this.persist();
    return user;
  }

  adminUpdateUser(
    userId: string,
    patch: { status?: AccountStatus; assignedClasses?: number[]; classLevel?: number; section?: string }
  ): StoredUser | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    if (patch.status) user.status = patch.status;
    if (Array.isArray(patch.assignedClasses)) user.assignedClasses = patch.assignedClasses;
    if (typeof patch.classLevel === 'number' && user.role === 'student') {
      user.classLevel = patch.classLevel;
      user.assignedClasses = [patch.classLevel];
    }
    if (typeof patch.section === 'string' && patch.section.trim()) {
      user.section = patch.section.trim().toUpperCase().slice(0, 4);
    }
    this.persist();
    return user;
  }

  createUser(params: {
    name: string;
    username: string;
    password: string;
    role: UserRole;
    classLevel: number;
    preferredLanguage?: SupportedLanguage;
    studentCode?: string;
    teacherCode?: string;
    email?: string;
    assignedClasses?: number[];
    linkedStudentIds?: string[];
    section?: string;
    status?: AccountStatus;
  }): StoredUser {
    const { salt, hash } = hashPassword(params.password);
    const prefix = params.role === 'teacher' ? 'tea' : params.role === 'parent' ? 'par' : 'stu';
    const assigned =
      params.role === 'teacher'
        ? params.assignedClasses && params.assignedClasses.length > 0
          ? params.assignedClasses
          : [1, 2, 3, 4, 5, 6]
        : params.role === 'student'
        ? [params.classLevel]
        : [];

    const newUser: StoredUser = {
      id: `${prefix}-${crypto.randomUUID().slice(0, 8)}`,
      name: params.name.trim(),
      username: params.username.trim().toLowerCase(),
      role: params.role,
      classLevel: params.role === 'student' ? params.classLevel : 0,
      section: params.section || 'A',
      studentCode: params.studentCode?.trim(),
      teacherCode: params.teacherCode?.trim(),
      email: params.email?.trim().toLowerCase(),
      assignedClasses: assigned,
      linkedStudentIds: params.linkedStudentIds,
      preferredLanguage: params.preferredLanguage || 'en',
      status: params.status || 'active',
      isDemo: false,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      salt,
    };
    this.state.users.push(newUser);
    this.persist();
    return newUser;
  }

  getMergedModules(classLevel?: number): LearningModule[] {
    return MASTER_CURRICULUM.modules
      .filter((m) => (classLevel ? m.classLevel === classLevel : true))
      .map((m) => {
        const override = this.state.moduleOverrides[m.id];
        return override ? { ...m, ...override } : m;
      });
  }

  updateModule(moduleId: string, patch: Partial<LearningModule>): LearningModule | null {
    const base = MASTER_CURRICULUM.modules.find((m) => m.id === moduleId);
    if (!base) return null;
    const prev = this.state.moduleOverrides[moduleId] || {};
    const updatedOverride: Partial<LearningModule> = {
      ...prev,
      title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : prev.title,
      summary: typeof patch.summary === 'string' && patch.summary.trim() ? patch.summary.trim() : prev.summary,
      moduleExplanation:
        typeof patch.moduleExplanation === 'string' && patch.moduleExplanation.trim()
          ? patch.moduleExplanation.trim()
          : prev.moduleExplanation,
      learningMaterial: Array.isArray(patch.learningMaterial) ? patch.learningMaterial : prev.learningMaterial,
      faqs: Array.isArray(patch.faqs) ? patch.faqs : prev.faqs,
      verifiedByAdmin:
        typeof patch.verifiedByAdmin === 'boolean' ? patch.verifiedByAdmin : prev.verifiedByAdmin,
      updatedAt: new Date().toISOString(),
    };
    this.state.moduleOverrides[moduleId] = updatedOverride;
    this.persist();
    return { ...base, ...updatedOverride };
  }

  getMergedQuestions(classLevel?: number, moduleId?: string): QuestionItem[] {
    const deleted = new Set(this.state.deletedQuestionIds);
    const all = [...MASTER_CURRICULUM.questions, ...this.state.customQuestions].filter((q) => !deleted.has(q.id));
    return all.filter((q) => {
      if (classLevel && q.classLevel !== classLevel) return false;
      if (moduleId && q.moduleId !== moduleId) return false;
      return true;
    });
  }

  addQuestion(item: Omit<QuestionItem, 'id' | 'createdByTeacher'>): QuestionItem {
    const created: QuestionItem = {
      ...item,
      id: `tq-${crypto.randomUUID().slice(0, 8)}`,
      createdByTeacher: true,
    };
    this.state.customQuestions.push(created);
    this.persist();
    return created;
  }

  deleteQuestion(questionId: string): boolean {
    const customIdx = this.state.customQuestions.findIndex((q) => q.id === questionId);
    if (customIdx !== -1) {
      this.state.customQuestions.splice(customIdx, 1);
      this.persist();
      return true;
    }
    const existsInMaster = MASTER_CURRICULUM.questions.some((q) => q.id === questionId);
    if (existsInMaster && !this.state.deletedQuestionIds.includes(questionId)) {
      this.state.deletedQuestionIds.push(questionId);
      this.persist();
      return true;
    }
    return false;
  }

  getAttempts(): PracticeAttempt[] {
    return this.state.attempts;
  }

  upsertAttempts(incoming: PracticeAttempt[]): PracticeAttempt[] {
    const saved: PracticeAttempt[] = [];
    for (const att of incoming) {
      const existingIdx = this.state.attempts.findIndex((a) => a.id === att.id);
      const cleanAttempt: PracticeAttempt = { ...att, synced: true };
      if (existingIdx >= 0) {
        this.state.attempts[existingIdx] = cleanAttempt;
      } else {
        this.state.attempts.push(cleanAttempt);
      }
      saved.push(cleanAttempt);
    }
    this.persist();
    return saved;
  }

  getExams(): ExamAttempt[] {
    return this.state.exams;
  }

  upsertExams(incoming: ExamAttempt[]): ExamAttempt[] {
    const saved: ExamAttempt[] = [];
    for (const ex of incoming) {
      const existingIdx = this.state.exams.findIndex((e) => e.id === ex.id);
      const cleanExam: ExamAttempt = { ...ex, synced: true };
      if (existingIdx >= 0) {
        this.state.exams[existingIdx] = cleanExam;
      } else {
        this.state.exams.push(cleanExam);
      }
      saved.push(cleanExam);
    }
    this.persist();
    return saved;
  }

  getRecommendations(classLevel?: number, studentId?: string): TeacherRecommendation[] {
    return this.state.recommendations
      .filter((r) => {
        if (classLevel && r.classLevel !== classLevel) return false;
        if (studentId && r.studentId !== studentId && r.studentId !== 'ALL_CLASS') return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addRecommendation(rec: Omit<TeacherRecommendation, 'id' | 'createdAt'>): TeacherRecommendation {
    const created: TeacherRecommendation = {
      ...rec,
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.recommendations.unshift(created);
    this.persist();
    return created;
  }

  getAssignments(classLevel?: number, studentId?: string): AssignmentItem[] {
    return this.state.assignments
      .filter((a) => {
        if (classLevel && a.classLevel !== classLevel) return false;
        if (studentId && a.targetStudentId !== studentId && a.targetStudentId !== 'ALL_CLASS') return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addAssignment(item: Omit<AssignmentItem, 'id' | 'createdAt'>): AssignmentItem {
    const created: AssignmentItem = {
      ...item,
      id: `asg-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.assignments.unshift(created);
    this.persist();
    return created;
  }

  getCustomQuizzes(classLevel?: number, studentId?: string): CustomQuizItem[] {
    return this.state.customQuizzes
      .filter((q) => {
        if (classLevel && q.classLevel !== classLevel) return false;
        if (studentId && q.targetStudentId !== studentId && q.targetStudentId !== 'ALL_CLASS') return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addCustomQuiz(item: Omit<CustomQuizItem, 'id' | 'createdAt'>): CustomQuizItem {
    const created: CustomQuizItem = {
      ...item,
      id: `qz-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.customQuizzes.unshift(created);
    this.persist();
    return created;
  }
}

export const dbStore = new Store();
