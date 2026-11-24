import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  HardDriveDownload,
  HelpCircle,
  History,
  KeyRound,
  LayoutDashboard,
  RefreshCw,
  SlidersHorizontal,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthPortal } from './components/AuthPortal';
import { DoubtChatSidebar } from './components/DoubtChatSidebar';
import { ParentDashboard } from './components/ParentDashboard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { StudentDashboard, StudentTab } from './components/StudentDashboard';
import { TeacherDashboard, TeacherTab } from './components/TeacherDashboard';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getUILabels } from './lib/i18n';
import {
  getAccessibilityPrefsOffline,
  getClassPackOffline,
  getRecommendationsOffline,
  getStudentAttemptsOffline,
  getStudentExamsOffline,
  getUnsyncedAttemptsOffline,
  getUnsyncedExamsOffline,
  markAttemptsSyncedOffline,
  markExamsSyncedOffline,
  reconcileStudentAttemptsOffline,
  reconcileStudentExamsOffline,
  saveAccessibilityPrefsOffline,
  saveAttemptOffline,
  saveClassPackOffline,
  saveExamOffline,
  saveRecommendationsOffline,
} from './lib/offlineDb';
import { computeStudentAnalytics } from './shared/adaptiveEngine';
import { getSubjectsForClass, MASTER_CURRICULUM } from './shared/curriculumData';
import { computeGamification } from './shared/examEngine';
import {
  AccessibilityPrefs,
  AssignmentItem,
  CustomQuizItem,
  ExamAttempt,
  LeaderboardEntry,
  LearningModule,
  PracticeAttempt,
  QuestionItem,
  SubjectInfo,
  SupportedLanguage,
  TeacherRecommendation,
  UserProfile,
} from './shared/types';

const DEFAULT_PREFS: AccessibilityPrefs = {
  fontSize: 'normal',
  highContrast: false,
  dyslexiaFont: false,
  lightweightMode: false,
};

export default function App() {
  const isBrowserOnline = useOnlineStatus();
  const [simulateOffline, setSimulateOffline] = useState(false);
  const isEffectivelyOnline = isBrowserOnline && !simulateOffline;

  // Session held strictly in React memory
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<UserProfile | null>(null);

  // Navigation state
  const [studentTab, setStudentTab] = useState<StudentTab>('overview');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('analytics');
  const [teacherSelectedClass, setTeacherSelectedClass] = useState<number>(6);

  // Language & Accessibility Preferences
  const [uiLanguage, setUiLanguage] = useState<SupportedLanguage>('en');
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Change Password inline form inside Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  // Curriculum & Progress state
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [exams, setExams] = useState<ExamAttempt[]>([]);
  const [recommendations, setRecommendations] = useState<TeacherRecommendation[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuizItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [downloadedSubjectIds, setDownloadedSubjectIds] = useState<string[]>([]);
  const [pendingSubjectIds, setPendingSubjectIds] = useState<string[]>([]);
  const [lastOfflineSyncAt, setLastOfflineSyncAt] = useState<string | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);

  // Active module, practice & exam context for right-side Doubt Tutor
  const [activeModule, setActiveModule] = useState<LearningModule | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [isExamMode, setIsExamMode] = useState<boolean>(false);
  const [activePracticeQuestion, setActivePracticeQuestion] = useState<QuestionItem | null>(null);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(true);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  const loadCurriculumForClass = useCallback(
    async (cls: number, authToken: string, online: boolean) => {
      if (online && authToken) {
        try {
          const res = await fetch(`/api/curriculum/${cls}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setSubjects(data.subjects);
            setModules(data.modules);
            setQuestions(data.questions);

            const existingPack = await getClassPackOffline(cls);
            const prevSubjectIds = existingPack?.downloadedSubjectIds || [];
            const prevPending = existingPack?.pendingSubjectIds || [];
            await saveClassPackOffline({
              classLevel: cls,
              subjects: data.subjects,
              modules: data.modules,
              questions: data.questions,
              downloadedAt: new Date().toISOString(),
              downloadedSubjectIds:
                prevSubjectIds.length > 0
                  ? prevSubjectIds
                  : data.subjects.map((s: SubjectInfo) => s.id),
              pendingSubjectIds: prevPending,
            });
            setDownloadedSubjectIds(
              prevSubjectIds.length > 0
                ? prevSubjectIds
                : data.subjects.map((s: SubjectInfo) => s.id)
            );
            setPendingSubjectIds(prevPending);
            setLastOfflineSyncAt(new Date().toISOString());
            return;
          }
        } catch {
          // Fall through to IndexedDB offline pack
        }
      }

      const cached = await getClassPackOffline(cls);
      if (cached) {
        setSubjects(cached.subjects);
        setModules(cached.modules);
        setQuestions(cached.questions);
        setDownloadedSubjectIds(cached.downloadedSubjectIds);
        setPendingSubjectIds(cached.pendingSubjectIds || []);
        setLastOfflineSyncAt(cached.downloadedAt);
      } else {
        setSubjects(getSubjectsForClass(cls));
        setModules(MASTER_CURRICULUM.modules.filter((m) => m.classLevel === cls));
        setQuestions(MASTER_CURRICULUM.questions.filter((q) => q.classLevel === cls));
      }
    },
    []
  );

  const syncPendingAttempts = useCallback(
    async (studentId: string, authToken: string, online: boolean) => {
      if (!online || !authToken) return;
      const pendingAttempts = await getUnsyncedAttemptsOffline(studentId);
      const pendingExams = await getUnsyncedExamsOffline(studentId);
      if (pendingAttempts.length === 0 && pendingExams.length === 0) {
        setUnsyncedCount(0);
        return;
      }
      try {
        const res = await fetch('/api/sync/attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ attempts: pendingAttempts, exams: pendingExams }),
        });
        if (res.ok) {
          await markAttemptsSyncedOffline(pendingAttempts.map((p) => p.id));
          await markExamsSyncedOffline(pendingExams.map((e) => e.id));
          setUnsyncedCount(0);
          const totalSynced = pendingAttempts.length + pendingExams.length;
          setSyncBanner(`Synced ${totalSynced} offline ${totalSynced === 1 ? 'record' : 'records'} cleanly.`);
          setTimeout(() => setSyncBanner(null), 4500);
          setAttempts(await getStudentAttemptsOffline(studentId));
          setExams(await getStudentExamsOffline(studentId));
        }
      } catch {
        // Retry automatically next time online
      }
    },
    []
  );

  const loadStudentData = useCallback(
    async (student: UserProfile, authToken: string, online: boolean) => {
      await loadCurriculumForClass(student.classLevel, authToken, online);
      await syncPendingAttempts(student.id, authToken, online);

      if (online && authToken) {
        try {
          const res = await fetch('/api/student/dashboard', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            const serverAttempts: PracticeAttempt[] = data.attempts || [];
            const serverExams: ExamAttempt[] = data.exams || [];
            await reconcileStudentAttemptsOffline(student.id, serverAttempts);
            await reconcileStudentExamsOffline(student.id, serverExams);
            setAttempts(await getStudentAttemptsOffline(student.id));
            setExams(await getStudentExamsOffline(student.id));
            setRecommendations(data.recommendations || []);
            setAssignments(data.assignments || []);
            setCustomQuizzes(data.customQuizzes || []);
            setLeaderboard(data.leaderboard || []);
            await saveRecommendationsOffline(student.id, data.recommendations || []);
            const unsyncedA = await getUnsyncedAttemptsOffline(student.id);
            const unsyncedE = await getUnsyncedExamsOffline(student.id);
            setUnsyncedCount(unsyncedA.length + unsyncedE.length);
            return;
          }
        } catch {
          // Offline fallback below
        }
      }

      setAttempts(await getStudentAttemptsOffline(student.id));
      setExams(await getStudentExamsOffline(student.id));
      setRecommendations(await getRecommendationsOffline(student.id));
      const unsyncedA = await getUnsyncedAttemptsOffline(student.id);
      const unsyncedE = await getUnsyncedExamsOffline(student.id);
      setUnsyncedCount(unsyncedA.length + unsyncedE.length);
    },
    [loadCurriculumForClass, syncPendingAttempts]
  );

  // Initial load after authentication
  useEffect(() => {
    if (!user || !token) return;
    setUiLanguage(user.preferredLanguage || 'en');
    getAccessibilityPrefsOffline(user.id).then((saved) => {
      if (saved) setPrefs(saved);
      else setPrefs(DEFAULT_PREFS);
    });

    if (user.role === 'student') {
      loadStudentData(user, token, isEffectivelyOnline);
    } else if (user.role === 'teacher') {
      loadCurriculumForClass(teacherSelectedClass, token, isEffectivelyOnline);
    }
  }, [user?.id, token]);

  // Reload curriculum when teacher switches assigned Class
  useEffect(() => {
    if (user?.role === 'teacher' && token) {
      loadCurriculumForClass(teacherSelectedClass, token, isEffectivelyOnline);
      setActiveModule(null);
    }
  }, [teacherSelectedClass]);

  // Automatic background sync when connectivity returns
  useEffect(() => {
    if (user?.role === 'student' && token && isEffectivelyOnline) {
      syncPendingAttempts(user.id, token, true);
    }
  }, [isEffectivelyOnline, user?.id, token, syncPendingAttempts]);

  const studentAnalytics = useMemo(() => {
    if (!user || user.role !== 'student') return null;
    return computeStudentAnalytics(user.id, user.classLevel, attempts, modules);
  }, [user, attempts, modules]);

  const studentGamification = useMemo(() => {
    if (!user || user.role !== 'student' || !studentAnalytics) return null;
    return computeGamification(user, studentAnalytics, attempts, exams);
  }, [user, studentAnalytics, attempts, exams]);

  const handleAuthenticated = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    setUiLanguage(newUser.preferredLanguage || 'en');
    setActiveModule(null);
    setIsPracticeMode(false);
    setIsExamMode(false);
    setStudentTab('overview');
    setTeacherTab('analytics');
    if (newUser.role === 'teacher') {
      setTeacherSelectedClass(newUser.assignedClasses[0] || 6);
    }
  };

  const handleLogout = async () => {
    if (token && isEffectivelyOnline) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Proceed with local sign-out
      }
    }
    setToken('');
    setUser(null);
    setActiveModule(null);
    setIsPracticeMode(false);
    setIsExamMode(false);
    setAttempts([]);
    setExams([]);
    setRecommendations([]);
    setAssignments([]);
    setCustomQuizzes([]);
    setLeaderboard([]);
  };

  const handleAttemptCompleted = async (attempt: PracticeAttempt) => {
    if (!user) return;
    await saveAttemptOffline(attempt);
    setAttempts(await getStudentAttemptsOffline(user.id));

    if (isEffectivelyOnline && token) {
      await syncPendingAttempts(user.id, token, true);
    } else {
      const ua = await getUnsyncedAttemptsOffline(user.id);
      const ue = await getUnsyncedExamsOffline(user.id);
      setUnsyncedCount(ua.length + ue.length);
    }
  };

  const handleExamCompleted = async (exam: ExamAttempt) => {
    if (!user) return;
    await saveExamOffline(exam);
    setExams(await getStudentExamsOffline(user.id));

    if (isEffectivelyOnline && token) {
      await syncPendingAttempts(user.id, token, true);
    } else {
      const ua = await getUnsyncedAttemptsOffline(user.id);
      const ue = await getUnsyncedExamsOffline(user.id);
      setUnsyncedCount(ua.length + ue.length);
    }
  };

  const handleDownloadOfflinePack = async (subjectIds?: string[], simulateInterrupt = false) => {
    if (!user) return;
    const cls = user.role === 'student' ? user.classLevel : teacherSelectedClass;
    const targetIds = subjectIds || subjects.map((s) => s.id);

    if (simulateInterrupt && targetIds.length > 2) {
      const completed = targetIds.slice(0, 2);
      const remaining = targetIds.slice(2);
      await saveClassPackOffline({
        classLevel: cls,
        subjects,
        modules,
        questions,
        downloadedAt: new Date().toISOString(),
        downloadedSubjectIds: completed,
        pendingSubjectIds: remaining,
      });
      setDownloadedSubjectIds(completed);
      setPendingSubjectIds(remaining);
      setSyncBanner(
        `Download paused after ${completed.length} subjects (${remaining.length} queued to resume).`
      );
      setTimeout(() => setSyncBanner(null), 4000);
      return;
    }

    const mergedIds = Array.from(new Set([...downloadedSubjectIds, ...targetIds]));
    const remainingPending = pendingSubjectIds.filter((id) => !mergedIds.includes(id));

    await saveClassPackOffline({
      classLevel: cls,
      subjects,
      modules,
      questions,
      downloadedAt: new Date().toISOString(),
      downloadedSubjectIds: mergedIds,
      pendingSubjectIds: remainingPending,
    });
    setDownloadedSubjectIds(mergedIds);
    setPendingSubjectIds(remainingPending);
    setLastOfflineSyncAt(new Date().toISOString());
    setSyncBanner(`Saved ${mergedIds.length} subject packs in IndexedDB for offline access.`);
    setTimeout(() => setSyncBanner(null), 3500);
  };

  const handleResumeOfflinePack = async () => {
    if (pendingSubjectIds.length === 0) return;
    await handleDownloadOfflinePack(pendingSubjectIds, false);
  };

  const updatePrefs = async (next: AccessibilityPrefs) => {
    setPrefs(next);
    if (user) {
      await saveAccessibilityPrefsOffline(user.id, next);
    }
  };

  const updateUiLanguage = async (lang: SupportedLanguage) => {
    setUiLanguage(lang);
    if (user) {
      setUser({ ...user, preferredLanguage: lang });
      if (user.role === 'student' && isEffectivelyOnline && token) {
        try {
          await fetch('/api/student/settings', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ preferredLanguage: lang }),
          });
        } catch {
          // Persisted in memory cleanly
        }
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwErr(data.error || 'Could not update password.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setPwMsg('Password updated securely.');
  };

  if (!user || !token) {
    return <AuthPortal onAuthenticated={handleAuthenticated} />;
  }

  const t = getUILabels(uiLanguage);
  const accessibilityClasses = [
    prefs.fontSize === 'large' ? 'text-scale-lg' : prefs.fontSize === 'xlarge' ? 'text-scale-xl' : '',
    prefs.highContrast ? 'high-contrast' : '',
    prefs.dyslexiaFont ? 'dyslexia-mode' : '',
    prefs.lightweightMode ? 'lightweight-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${accessibilityClasses}`}>
      {/* Strict 3-Zone Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="h-1 w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-500" />
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-8 px-4 sm:px-6 py-3">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveModule(null);
              setIsPracticeMode(false);
              setIsExamMode(false);
              if (user.role === 'student') setStudentTab('overview');
              else if (user.role === 'teacher') setTeacherTab('analytics');
            }}
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            LEARNLOCAL
          </button>

          {/* Zone 2: Concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
            {user.role === 'student' && (
              <>
                {(
                  [
                    { id: 'overview', label: t.dashboard },
                    { id: 'subjects', label: t.subjectsModules },
                    { id: 'exams', label: t.examsPrep },
                    { id: 'assignments', label: t.assignments },
                    { id: 'history', label: t.practiceHistory },
                    { id: 'offline', label: t.offlinePacks },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(null);
                      setIsPracticeMode(false);
                      setIsExamMode(false);
                      setStudentTab(item.id);
                    }}
                    className={`whitespace-nowrap shrink-0 transition-colors ${
                      studentTab === item.id && !activeModule
                        ? 'text-sky-700 font-semibold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}

            {user.role === 'teacher' && (
              <>
                {(
                  [
                    { id: 'analytics', label: 'Class Analytics' },
                    { id: 'students', label: 'Students' },
                    { id: 'assignments', label: 'Homework & Quizzes' },
                    { id: 'curriculum', label: 'Curriculum & Questions' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTeacherTab(item.id)}
                    className={`whitespace-nowrap shrink-0 transition-colors ${
                      teacherTab === item.id ? 'text-sky-700 font-semibold' : 'hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}

            {user.role === 'parent' && (
              <span className="font-semibold text-emerald-700 whitespace-nowrap">
                Parent Progress Overview
              </span>
            )}

            {user.role === 'admin' && (
              <span className="font-semibold text-slate-900 whitespace-nowrap">
                System Administration &amp; Governance
              </span>
            )}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {t.signOut}
          </button>
        </div>
      </header>

      {/* Workspace Sub-Toolbar */}
      <div className="no-print border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {user.name} ·{' '}
              {user.role === 'student'
                ? `Class ${user.classLevel}`
                : user.role === 'teacher'
                ? `Teacher (C${user.assignedClasses.join(', C')})`
                : user.role === 'parent'
                ? 'Parent / Guardian'
                : 'Administrator'}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                isEffectivelyOnline ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isEffectivelyOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isEffectivelyOnline ? 'Online & Synced' : 'Offline Mode Active'}
            </span>
            {unsyncedCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => syncPendingAttempts(user.id, token, isEffectivelyOnline)}
                  disabled={!isEffectivelyOnline}
                  className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:underline disabled:opacity-60"
                >
                  <RefreshCw className="h-3 w-3" />
                  {unsyncedCount} pending sync
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t.accessibilitySettings}
            </button>
            <button
              type="button"
              onClick={() => setSimulateOffline((v) => !v)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                simulateOffline
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {simulateOffline ? 'Go Back Online' : 'Test Offline Mode'}
            </button>
            {!prefs.lightweightMode && <PWAInstallButton />}
            {(user.role === 'student' || user.role === 'teacher') && (
              <button
                type="button"
                onClick={() => setChatOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {chatOpen ? 'Hide Doubt Tutor' : 'Open Doubt Tutor'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      {user.role === 'student' && (
        <div className="no-print flex md:hidden items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold">
          {(
            [
              { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
              { id: 'subjects', label: t.subjectsModules, icon: BookOpen },
              { id: 'exams', label: t.examsPrep, icon: ClipboardCheck },
              { id: 'assignments', label: t.assignments, icon: ClipboardList },
              { id: 'history', label: t.practiceHistory, icon: History },
              { id: 'offline', label: t.offlinePacks, icon: HardDriveDownload },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(null);
                  setIsPracticeMode(false);
                  setIsExamMode(false);
                  setStudentTab(item.id);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 whitespace-nowrap ${
                  studentTab === item.id && !activeModule ? 'bg-sky-50 text-sky-800' : 'text-slate-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {user.role === 'teacher' && (
        <div className="no-print flex md:hidden items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold">
          {(
            [
              { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
              { id: 'students', label: 'Students', icon: Users },
              { id: 'assignments', label: 'Homework', icon: ClipboardList },
              { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTeacherTab(item.id)}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 whitespace-nowrap ${
                  teacherTab === item.id ? 'bg-sky-50 text-sky-800' : 'text-slate-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {syncBanner && (
        <div className="no-print border-b border-emerald-200 bg-emerald-50 px-6 py-2 text-center text-xs font-medium text-emerald-800">
          {syncBanner}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {user.role === 'student' && studentAnalytics && studentGamification && (
            <StudentDashboard
              student={user}
              token={token}
              activeTab={studentTab}
              onChangeTab={setStudentTab}
              subjects={subjects}
              modules={modules}
              questions={questions}
              analytics={studentAnalytics}
              gamification={studentGamification}
              leaderboard={leaderboard}
              attempts={attempts}
              exams={exams}
              recommendations={recommendations}
              assignments={assignments}
              customQuizzes={customQuizzes}
              uiLanguage={uiLanguage}
              isEffectivelyOnline={isEffectivelyOnline}
              downloadedSubjectIds={downloadedSubjectIds}
              pendingSubjectIds={pendingSubjectIds}
              lastOfflineSyncAt={lastOfflineSyncAt}
              unsyncedCount={unsyncedCount}
              onDownloadOfflinePack={handleDownloadOfflinePack}
              onResumeOfflinePack={handleResumeOfflinePack}
              onSyncNow={() => syncPendingAttempts(user.id, token, isEffectivelyOnline)}
              activeModule={activeModule}
              onSelectActiveModule={setActiveModule}
              isPracticeMode={isPracticeMode}
              onPracticeModeChange={setIsPracticeMode}
              onActivePracticeQuestionChange={setActivePracticeQuestion}
              onAskTutorHint={(prompt) => {
                setChatOpen(true);
                setPendingChatPrompt(prompt);
              }}
              onAttemptCompleted={handleAttemptCompleted}
              onExamCompleted={handleExamCompleted}
              onExamModeChange={setIsExamMode}
            />
          )}

          {user.role === 'teacher' && (
            <TeacherDashboard
              teacher={user}
              token={token}
              activeTab={teacherTab}
              onChangeTab={setTeacherTab}
              selectedClass={teacherSelectedClass}
              onSelectClass={setTeacherSelectedClass}
              subjects={subjects}
              modules={modules}
              questions={questions}
              onRefreshCurriculum={(cls) => loadCurriculumForClass(cls, token, isEffectivelyOnline)}
              onSelectActiveModuleForChat={setActiveModule}
            />
          )}

          {user.role === 'parent' && <ParentDashboard parent={user} token={token} />}

          {user.role === 'admin' && <AdminDashboard admin={user} token={token} />}
        </main>

        {/* Dedicated RIGHT-SIDE AI Doubt-Clearing Chatbox for Students & Teachers */}
        {(user.role === 'student' || user.role === 'teacher') && (
          <DoubtChatSidebar
            user={user}
            token={token}
            isEffectivelyOnline={isEffectivelyOnline}
            activeModule={activeModule}
            isPracticeMode={isPracticeMode}
            isExamMode={isExamMode}
            uiLanguage={uiLanguage}
            currentPracticeQuestion={activePracticeQuestion}
            pendingPrompt={pendingChatPrompt}
            onConsumePendingPrompt={() => setPendingChatPrompt(null)}
            isOpen={chatOpen}
            onToggleOpen={() => setChatOpen((o) => !o)}
          />
        )}
      </div>

      {/* Language, Accessibility, Low-Bandwidth & Password Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Language, Accessibility &amp; Account Security
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interface & Lesson Language */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Interface &amp; Tutor Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { code: 'en', label: 'English' },
                    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                    { code: 'hi', label: 'हिन्दी (Hindi)' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => updateUiLanguage(l.code)}
                    className={`rounded-lg border py-2 text-xs font-semibold ${
                      uiLanguage === l.code
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reading Font Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'normal', label: 'Standard' },
                    { id: 'large', label: 'Large (+12%)' },
                    { id: 'xlarge', label: 'Extra Large (+25%)' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updatePrefs({ ...prefs, fontSize: f.id })}
                    className={`rounded-lg border py-2 text-xs font-semibold ${
                      prefs.fontSize === f.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900">High-Contrast Display Mode</div>
                  <div className="text-slate-500">Sharper borders and high-legibility text</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.highContrast}
                  onChange={(e) => updatePrefs({ ...prefs, highContrast: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900">Dyslexia-Friendly Reading Mode</div>
                  <div className="text-slate-500">Readable sans-serif font with wider word &amp; line spacing</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.dyslexiaFont}
                  onChange={(e) => updatePrefs({ ...prefs, dyslexiaFont: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900">Low-Bandwidth Lightweight Mode</div>
                  <div className="text-slate-500">Disables animations and reduces background requests</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.lightweightMode}
                  onChange={(e) => updatePrefs({ ...prefs, lightweightMode: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
              </label>
            </div>

            {/* Change Password */}
            <form onSubmit={handleChangePassword} className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <KeyRound className="h-3.5 w-3.5 text-sky-600" />
                Change Account Password
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={user.isDemo ? 'Current (optional for demo)' : 'Current password'}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New strong password (8+ chars)"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
              {pwErr && <p className="text-xs text-red-700">{pwErr}</p>}
              {pwMsg && <p className="text-xs text-emerald-700">{pwMsg}</p>}
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
