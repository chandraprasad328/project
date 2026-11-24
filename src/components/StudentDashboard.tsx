import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Flame,
  HardDriveDownload,
  Play,
  RefreshCw,
  Square,
  TrendingUp,
  Trophy,
  Volume2,
} from 'lucide-react';
import React, { useState } from 'react';
import { getGlossaryForSubject, getUILabels } from '../lib/i18n';
import { estimatePackSizeKB } from '../lib/offlineDb';
import { getSubjectPalette } from '../lib/subjectTheme';
import { isSpeechSupported, speakText, stopSpeaking } from '../lib/tts';
import {
  AssignmentItem,
  CustomQuizItem,
  Difficulty,
  ExamAttempt,
  LeaderboardEntry,
  LearningModule,
  ModulePerformanceSummary,
  PracticeAttempt,
  QuestionItem,
  StudentAnalyticsReport,
  StudentGamification,
  SubjectInfo,
  SupportedLanguage,
  TeacherRecommendation,
  UserProfile,
} from '../shared/types';
import { ExamCenter } from './ExamCenter';
import { PracticeSession } from './PracticeSession';

export type StudentTab = 'overview' | 'subjects' | 'exams' | 'assignments' | 'history' | 'offline';

interface StudentDashboardProps {
  student: UserProfile;
  token: string;
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
  subjects: SubjectInfo[];
  modules: LearningModule[];
  questions: QuestionItem[];
  analytics: StudentAnalyticsReport;
  gamification: StudentGamification;
  leaderboard: LeaderboardEntry[];
  attempts: PracticeAttempt[];
  exams: ExamAttempt[];
  recommendations: TeacherRecommendation[];
  assignments: AssignmentItem[];
  customQuizzes: CustomQuizItem[];
  uiLanguage: SupportedLanguage;
  isEffectivelyOnline: boolean;
  downloadedSubjectIds: string[];
  pendingSubjectIds: string[];
  lastOfflineSyncAt: string | null;
  unsyncedCount: number;
  onDownloadOfflinePack: (subjectIds?: string[], simulateInterrupt?: boolean) => Promise<void>;
  onResumeOfflinePack: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  activeModule: LearningModule | null;
  onSelectActiveModule: (mod: LearningModule | null) => void;
  isPracticeMode: boolean;
  onPracticeModeChange: (active: boolean) => void;
  onActivePracticeQuestionChange: (q: QuestionItem | null) => void;
  onAskTutorHint: (prompt: string) => void;
  onAttemptCompleted: (attempt: PracticeAttempt) => Promise<void>;
  onExamCompleted: (exam: ExamAttempt) => Promise<void>;
  onExamModeChange: (active: boolean) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  token,
  activeTab,
  onChangeTab,
  subjects,
  modules,
  questions,
  analytics,
  gamification,
  leaderboard,
  attempts,
  exams,
  recommendations,
  assignments,
  customQuizzes,
  uiLanguage,
  isEffectivelyOnline,
  downloadedSubjectIds,
  pendingSubjectIds,
  lastOfflineSyncAt,
  unsyncedCount,
  onDownloadOfflinePack,
  onResumeOfflinePack,
  onSyncNow,
  activeModule,
  onSelectActiveModule,
  isPracticeMode,
  onPracticeModeChange,
  onActivePracticeQuestionChange,
  onAskTutorHint,
  onAttemptCompleted,
  onExamCompleted,
  onExamModeChange,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [practiceDifficulty, setPracticeDifficulty] = useState<Difficulty | 'adaptive'>('adaptive');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const t = getUILabels(uiLanguage);

  const openModule = (moduleId: string, startPractice = false, diff: Difficulty | 'adaptive' = 'adaptive') => {
    stopSpeaking();
    setIsSpeaking(false);
    const found = modules.find((m) => m.id === moduleId) || null;
    if (!found) return;
    setSelectedSubjectId(found.subjectId);
    onSelectActiveModule(found);
    setPracticeDifficulty(diff);
    onPracticeModeChange(startPractice);
  };

  const handleDownloadSubject = async (subjectId: string) => {
    setDownloadingId(subjectId);
    await onDownloadOfflinePack([subjectId], false);
    setDownloadingId(null);
  };

  const handleDownloadAll = async (simulateInterrupt = false) => {
    setDownloadingId('ALL');
    await onDownloadOfflinePack(
      subjects.map((s) => s.id),
      simulateInterrupt
    );
    setDownloadingId(null);
  };

  const handleReadLesson = (mod: LearningModule) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    const text = [
      `${mod.title}. ${mod.summary}`,
      mod.moduleExplanation,
      ...mod.learningMaterial.map((s) => `${s.heading}. ${s.explanation} Key rule: ${s.keyRule}`),
    ].join(' ');
    const started = speakText(text, uiLanguage, () => setIsSpeaking(false));
    setIsSpeaking(started);
  };

  // Active Practice Session View
  if (activeModule && isPracticeMode) {
    const moduleQuestions = questions.filter((q) => q.moduleId === activeModule.id);
    return (
      <PracticeSession
        student={student}
        token={token}
        module={activeModule}
        moduleQuestions={moduleQuestions}
        attemptHistory={attempts}
        isEffectivelyOnline={isEffectivelyOnline}
        initialDifficulty={practiceDifficulty}
        onActiveQuestionChange={onActivePracticeQuestionChange}
        onAskTutorHint={onAskTutorHint}
        onAttemptCompleted={onAttemptCompleted}
        onBackToModule={() => onPracticeModeChange(false)}
      />
    );
  }

  // Active Module Learning Reader View
  if (activeModule) {
    const palette = getSubjectPalette(activeModule.subjectId);
    const subjSummary = analytics.subjects.find((s) => s.subjectId === activeModule.subjectId);
    const modSummary = subjSummary?.modules.find((m) => m.moduleId === activeModule.id);
    const isCached = downloadedSubjectIds.includes(activeModule.subjectId);
    const modQuestionCount = questions.filter((q) => q.moduleId === activeModule.id).length;
    const glossary = getGlossaryForSubject(activeModule.subjectId);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              setIsSpeaking(false);
              onSelectActiveModule(null);
              onPracticeModeChange(false);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {activeModule.subjectName}
          </button>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>Class {activeModule.classLevel}</span>
            <span aria-hidden="true">·</span>
            <span>Module {activeModule.moduleNumber} of 4</span>
            <span aria-hidden="true">·</span>
            <span>{modQuestionCount} Practice Questions</span>
            <span aria-hidden="true">·</span>
            <span className={isCached ? 'font-semibold text-emerald-700' : ''}>
              {isCached ? 'Cached Offline' : 'Online Ready'}
            </span>
          </div>
        </div>

        {/* Colourful Module Header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className={`h-1.5 w-full ${palette.topBar}`} />
          <div className="p-6 sm:p-8 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className={`text-xs font-bold ${palette.accentText}`}>
                {activeModule.subjectName} · Module {activeModule.moduleNumber}
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {activeModule.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeModule.summary}</p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              {modSummary && modSummary.latestAccuracy !== null ? (
                <div className="text-left sm:text-right">
                  <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {modSummary.latestAccuracy}%
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    Status: {modSummary.status} ({modSummary.attemptsCount} attempts)
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-sky-700">Ready to Start · Attempt 0</div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isSpeechSupported() && (
                  <button
                    type="button"
                    onClick={() => handleReadLesson(activeModule)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      isSpeaking
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {isSpeaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    {isSpeaking ? t.stopReading : t.readAloud}
                  </button>
                )}
                <select
                  aria-label="Select practice difficulty"
                  value={practiceDifficulty}
                  onChange={(e) => setPracticeDifficulty(e.target.value as Difficulty | 'adaptive')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                >
                  <option value="adaptive">Adaptive Difficulty</option>
                  <option value="easy">Easy Foundation</option>
                  <option value="medium">Medium Standard</option>
                  <option value="hard">Hard Challenge</option>
                </select>
                <button
                  type="button"
                  onClick={() => onPracticeModeChange(true)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${palette.topBar} hover:opacity-95`}
                >
                  <Play className="h-4 w-4" />
                  {t.startPractice}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Materials */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {activeModule.learningMaterial.map((sec, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white flex flex-col justify-between"
            >
              <div className={`h-1 ${palette.topBar}`} />
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className={`text-xs font-bold ${palette.accentText}`}>Concept 0{idx + 1}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{sec.heading}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{sec.explanation}</p>
                </div>
                <div className={`mt-4 space-y-2 rounded-lg border p-3 text-xs ${palette.softBg} ${palette.softBorder}`}>
                  <div className="text-slate-900">
                    <strong>Key Rule:</strong> {sec.keyRule}
                  </div>
                  <div className="text-slate-700">
                    <strong>Example:</strong> {sec.example}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Multilingual Academic Glossary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-bold text-slate-900">{t.keyGlossary}</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {glossary.map((item) => (
              <div key={item.term} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div className="font-bold text-slate-900">{item.term}</div>
                <p className="mt-1 leading-relaxed text-slate-700">
                  {uiLanguage === 'kn' ? item.kn : uiLanguage === 'hi' ? item.hi : item.en}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Module Walkthrough + Offline FAQs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <h3 className="text-base font-bold text-slate-900">Step-by-Step Module Explanation</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {activeModule.moduleExplanation}
            </p>
            {modSummary && (
              <div className={`mt-4 rounded-lg border p-3.5 text-xs text-slate-800 ${palette.softBg} ${palette.softBorder}`}>
                <strong>Personalized Guidance:</strong> {modSummary.recommendation}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <h3 className="text-base font-bold text-slate-900">Cached Doubt FAQs (Offline Ready)</h3>
            <div className="mt-3 space-y-3">
              {activeModule.faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-slate-900">{faq.question}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exams & Mock Tests Tab
  if (activeTab === 'exams') {
    return (
      <ExamCenter
        student={student}
        token={token}
        subjects={subjects}
        modules={modules}
        questions={questions}
        exams={exams}
        isEffectivelyOnline={isEffectivelyOnline}
        onExamCompleted={onExamCompleted}
        onExamModeChange={onExamModeChange}
      />
    );
  }

  // Homework, Assignments & Teacher Custom Quizzes Tab
  if (activeTab === 'assignments') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.assignments} &amp; Teacher Quizzes (Class {student.classLevel})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Homework deadlines, custom practice quizzes, and revision notes assigned by your teacher.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">
                Assigned Homework ({assignments.length})
              </h2>
            </div>
            {assignments.length === 0 ? (
              <p className="text-xs text-slate-500">
                No homework assignments posted yet for Class {student.classLevel}.
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-sky-700">
                        {a.subjectName} · {a.moduleTitle}
                      </span>
                      <span className="font-mono font-semibold text-amber-700 tabular-nums">
                        Due {a.dueDate}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{a.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">{a.instructions}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openModule(a.moduleId, false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        Read Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => openModule(a.moduleId, true)}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        Start Practice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Custom Teacher Quizzes ({customQuizzes.length})
              </h2>
            </div>
            {customQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">
                No custom teacher quizzes assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {customQuizzes.map((qz) => (
                  <div key={qz.id} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                    <div className="text-xs font-semibold text-indigo-700">
                      By {qz.teacherName} · {qz.questionIds.length} questions
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{qz.title}</h3>
                    <button
                      type="button"
                      onClick={() => openModule(qz.moduleId, true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Attempt Quiz
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Subjects & 4-Module Explorer Tab
  if (activeTab === 'subjects') {
    const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
    const currentPalette = getSubjectPalette(currentSubject?.id || 'math');
    const subjPerf = analytics.subjects.find((s) => s.subjectId === currentSubject?.id);
    const subjModules = modules
      .filter((m) => m.subjectId === currentSubject?.id)
      .sort((a, b) => a.moduleNumber - b.moduleNumber);

    const fullPackKB = estimatePackSizeKB(modules, questions);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Class {student.classLevel} {t.subjectsModules}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              6 subjects · 4 dedicated modules per subject · Select a module to study or practice.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDownloadAll(false)}
            disabled={downloadingId === 'ALL'}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 transition-colors"
          >
            <HardDriveDownload className="h-4 w-4 text-sky-600" />
            {downloadingId === 'ALL'
              ? 'Caching Class Pack...'
              : `Download Class ${student.classLevel} (${fullPackKB} KB)`}
          </button>
        </div>

        {/* 6 Colour-Coded Subject Selector Tabs */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {subjects.map((subj) => {
            const perf = analytics.subjects.find((s) => s.subjectId === subj.id);
            const active = subj.id === currentSubject?.id;
            const pal = getSubjectPalette(subj.id);
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => setSelectedSubjectId(subj.id)}
                className={`overflow-hidden rounded-xl border text-left transition-colors ${
                  active
                    ? pal.activeTab
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`h-1 w-full ${pal.topBar}`} />
                <div className="p-3">
                  <div className="text-sm font-bold truncate">{subj.shortName}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    {perf?.completedModules ?? 0}/4 done ·{' '}
                    {perf?.averageAccuracy !== null && perf?.averageAccuracy !== undefined
                      ? `${perf.averageAccuracy}%`
                      : '0%'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Subject Header & 4 Modules */}
        {currentSubject && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className={`h-1.5 w-full ${currentPalette.topBar}`} />
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{currentSubject.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{currentSubject.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    {downloadedSubjectIds.includes(currentSubject.id)
                      ? 'Cached Offline'
                      : 'Not downloaded yet'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSubject(currentSubject.id)}
                    disabled={downloadingId === currentSubject.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingId === currentSubject.id ? 'Saving...' : 'Save Subject Offline'}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {subjModules.map((mod) => {
                  const modPerf = subjPerf?.modules.find((m) => m.moduleId === mod.id);
                  const statusColor =
                    modPerf?.status === 'Strong'
                      ? 'text-emerald-700'
                      : modPerf?.status === 'Needs Revision'
                      ? 'text-red-700'
                      : modPerf?.status === 'Developing'
                      ? 'text-amber-700'
                      : 'text-slate-500';

                  return (
                    <div
                      key={mod.id}
                      className={`flex flex-col justify-between rounded-xl border p-5 ${currentPalette.softBg} ${currentPalette.softBorder}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className={`font-bold ${currentPalette.accentText}`}>
                            Module {mod.moduleNumber} · {mod.estimatedMinutes} min
                          </span>
                          <span className={`font-semibold tabular-nums ${statusColor}`}>
                            {modPerf?.status || 'Not Started'}
                            {modPerf?.latestAccuracy !== null && modPerf?.latestAccuracy !== undefined
                              ? ` (${modPerf.latestAccuracy}%)`
                              : ''}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-slate-900">{mod.title}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{mod.summary}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
                        <button
                          type="button"
                          onClick={() => openModule(mod.id, false)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          {t.studyNotes}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openModule(
                              mod.id,
                              true,
                              modPerf?.recommendedAction === 'revisit_explanation'
                                ? 'easy'
                                : modPerf?.recommendedAction === 'advance'
                                ? 'hard'
                                : 'adaptive'
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${currentPalette.topBar} hover:opacity-95`}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Practice Session
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Practice History Tab
  if (activeTab === 'history') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Practice Session History</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every practice attempt is saved locally in IndexedDB and synced automatically without duplicates.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {attempts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-900">No Practice Attempts Yet</h2>
              <p className="mt-1 text-sm text-slate-600">
                You are at the starting line! Pick any subject and complete Module 1 to see your adaptive score history here.
              </p>
              <button
                type="button"
                onClick={() => onChangeTab('subjects')}
                className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Explore Subjects &amp; Start Practice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Subject &amp; Module</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                    <th className="px-4 py-3">Weak Topics</th>
                    <th className="px-4 py-3">Sync</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{att.moduleTitle}</div>
                        <div className="text-xs text-slate-500">{att.subjectName}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                        {att.correctCount}/{att.totalQuestions}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        <span
                          className={
                            att.percentage >= 80
                              ? 'text-emerald-700'
                              : att.percentage >= 50
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }
                        >
                          {att.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {att.weakTopics.length > 0 ? att.weakTopics.join(', ') : 'None'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={att.synced ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                          {att.synced ? 'Synced' : 'Pending Sync'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {new Date(att.completedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Offline Packs & Resumable Sync Manager Tab
  if (activeTab === 'offline') {
    const fullClassKB = estimatePackSizeKB(modules, questions);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Offline Study Packs &amp; Resumable Sync</h1>
            <p className="mt-1 text-sm text-slate-600">
              Preview pack sizes before downloading Class {student.classLevel} lessons, FAQs, and question banks to IndexedDB.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={!isEffectivelyOnline || unsyncedCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Pending ({unsyncedCount})
            </button>
            {pendingSubjectIds.length > 0 && (
              <button
                type="button"
                onClick={onResumeOfflinePack}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Resume Interrupted ({pendingSubjectIds.length} left)
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDownloadAll(false)}
              disabled={downloadingId === 'ALL'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <HardDriveDownload className="h-3.5 w-3.5" />
              {downloadingId === 'ALL' ? 'Downloading...' : `Download Full Class (${fullClassKB} KB)`}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadAll(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Test Partial Download
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-5">
            <div className="text-xs font-medium text-sky-800">Cached Subjects</div>
            <div className="mt-1 font-mono text-2xl font-bold text-sky-950 tabular-nums">
              {downloadedSubjectIds.length} / {subjects.length}
            </div>
            <div className="text-xs text-sky-700 tabular-nums">Full pack size: {fullClassKB} KB</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="text-xs font-medium text-amber-800">Pending Sync Queue</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-950 tabular-nums">
              {unsyncedCount} items
            </div>
            <div className="text-xs text-amber-700">Duplicate-free reconciliation</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="text-xs font-medium text-emerald-800">Last Offline Cache Update</div>
            <div className="mt-1 font-mono text-sm font-semibold text-emerald-950 tabular-nums">
              {lastOfflineSyncAt ? new Date(lastOfflineSyncAt).toLocaleString() : 'Not downloaded yet'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subj) => {
            const isCached = downloadedSubjectIds.includes(subj.id);
            const isInterrupted = pendingSubjectIds.includes(subj.id);
            const subjMods = modules.filter((m) => m.subjectId === subj.id);
            const subjQs = questions.filter((q) => q.subjectId === subj.id);
            const subjKB = estimatePackSizeKB(subjMods, subjQs);
            const pal = getSubjectPalette(subj.id);
            return (
              <div key={subj.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                <div className={`h-1 w-full ${pal.topBar}`} />
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${pal.accentText} tabular-nums`}>
                        4 Modules · {subjQs.length} Qs · {subjKB} KB
                      </span>
                      <span
                        className={
                          isInterrupted
                            ? 'font-semibold text-amber-700'
                            : isCached
                            ? 'font-semibold text-emerald-700'
                            : 'text-slate-500'
                        }
                      >
                        {isInterrupted ? 'Paused (Resume)' : isCached ? 'Saved Locally' : 'Online Only'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-slate-900">{subj.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">{subj.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadSubject(subj.id)}
                    disabled={downloadingId === subj.id}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingId === subj.id
                      ? 'Caching...'
                      : isInterrupted
                      ? `Resume (${subjKB} KB)`
                      : isCached
                      ? `Refresh (${subjKB} KB)`
                      : `Download (${subjKB} KB)`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Determine Continue Learning target module
  const continueMod =
    modules.find((m) => m.id === analytics.continueModuleId) || modules[0];

  // Default: Student Overview Dashboard
  return (
    <div className="space-y-6">
      {/* Vibrant Colourful Welcome & Continue Learning Banner */}
      <div className="overflow-hidden rounded-2xl border border-sky-700/20 bg-gradient-to-br from-sky-700 via-indigo-700 to-violet-800 p-6 sm:p-7 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-sky-200">
              Class {student.classLevel} · {student.studentCode || '@' + student.username} · Milestone: {gamification.milestone}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Welcome, {student.name}
            </h1>
            <p className="mt-1 text-sm text-sky-100">
              {attempts.length === 0
                ? `All 6 subjects and 24 modules for Class ${student.classLevel} are ready. Start with Module 1 below!`
                : `Recommended next: ${continueMod ? `${continueMod.subjectName} — ${continueMod.title}` : 'Keep practicing!'}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {continueMod && (
              <button
                type="button"
                onClick={() => openModule(continueMod.id, false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-colors"
              >
                <Play className="h-4 w-4" />
                {attempts.length === 0 ? t.startFirstModule : t.continueLearning}
              </button>
            )}
            <button
              type="button"
              onClick={() => onChangeTab('subjects')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
            >
              {t.browseSubjects}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Overall Progress Bar + 4 Crisp Metric Tiles */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-sky-100 mb-1.5">
            <span>Class {student.classLevel} Curriculum Progress</span>
            <span className="font-mono font-semibold tabular-nums">{analytics.overallProgressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-300"
              style={{ width: `${analytics.overallProgressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-sky-100">Overall Accuracy</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {analytics.overallAccuracy !== null ? `${analytics.overallAccuracy}%` : '—'}
            </div>
            <div className="text-[11px] text-sky-200 tabular-nums">
              {analytics.totalPracticeSessions} sessions · {exams.length} exams
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-1 text-xs text-amber-200">
              <Flame className="h-3.5 w-3.5" /> Learning Streak
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
              {gamification.streakDays} {gamification.streakDays === 1 ? 'day' : 'days'}
            </div>
            <div className="text-[11px] text-sky-200 tabular-nums">
              {gamification.xp} / {gamification.nextMilestoneXp} XP
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-emerald-200">Strong Modules</div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
              {analytics.strongModules.length}
            </div>
            <div className="text-[11px] text-sky-200">80%+ accuracy</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-rose-200">Needs Revision</div>
            <div className="mt-1 font-mono text-2xl font-bold text-rose-300 tabular-nums">
              {analytics.weakModules.length}
            </div>
            <div className="text-[11px] text-sky-200">below 65% accuracy</div>
          </div>
        </div>
      </div>

      {/* Daily Learning Goals + Weekly Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{t.dailyGoals}</h2>
            <span className="font-mono text-xs font-semibold text-sky-700 tabular-nums">
              {gamification.dailyGoals.filter((g) => g.completed).length}/{gamification.dailyGoals.length} done
            </span>
          </div>
          <div className="space-y-2">
            {gamification.dailyGoals.map((goal) => (
              <div
                key={goal.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs ${
                  goal.completed
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                    : 'border-slate-200 bg-slate-50/60 text-slate-800'
                }`}
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${goal.completed ? 'text-emerald-600' : 'text-slate-300'}`}
                  />
                  {goal.title}
                </span>
                {goal.targetModuleId && !goal.completed && (
                  <button
                    type="button"
                    onClick={() => openModule(goal.targetModuleId!, false)}
                    className="rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-700 shrink-0"
                  >
                    Go
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">{t.weeklySummary}</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-sky-50/70 border border-sky-100 p-3">
              <div className="font-mono text-xl font-bold text-sky-900 tabular-nums">
                {gamification.weeklySummary.sessionsThisWeek}
              </div>
              <div className="text-[11px] text-sky-700">Sessions (7d)</div>
            </div>
            <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-3">
              <div className="font-mono text-xl font-bold text-indigo-900 tabular-nums">
                {gamification.weeklySummary.modulesCompletedThisWeek}
              </div>
              <div className="text-[11px] text-indigo-700">Modules Touched</div>
            </div>
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3">
              <div className="font-mono text-xl font-bold text-emerald-900 tabular-nums">
                {gamification.weeklySummary.improvementDelta !== null
                  ? `${gamification.weeklySummary.improvementDelta >= 0 ? '+' : ''}${
                      gamification.weeklySummary.improvementDelta
                    }%`
                  : '—'}
              </div>
              <div className="text-[11px] text-emerald-700">Accuracy Shift</div>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            {gamification.weeklySummary.focusAreas.length > 0
              ? `Weekly attention areas: ${gamification.weeklySummary.focusAreas.join(' · ')}`
              : 'Complete sessions this week to track accuracy improvement and personalized focus topics.'}
          </p>
        </div>
      </div>

      {/* Teacher Revision Recommendations & Assignments Preview */}
      {(recommendations.length > 0 || assignments.length > 0) && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-indigo-950">
              Teacher Recommendations &amp; Homework
            </h2>
            {assignments.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeTab('assignments')}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                View all homework ({assignments.length})
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.slice(0, 2).map((rec) => (
              <div
                key={rec.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-indigo-200 bg-white p-4"
              >
                <div>
                  <div className="text-xs font-semibold text-indigo-700">
                    From {rec.teacherName} · {rec.moduleTitle}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{rec.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModule(rec.moduleId, false)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
                >
                  Revise
                </button>
              </div>
            ))}
            {assignments.slice(0, 2).map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-white p-4"
              >
                <div>
                  <div className="text-xs font-semibold text-sky-700">
                    Homework · {a.title} (Due {a.dueDate})
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{a.instructions}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModule(a.moduleId, true)}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Colour-Coded Subjects with 4 Modules Each */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">
            {t.yourSubjects} (Class {student.classLevel})
          </h2>
          <span className="text-xs font-medium text-slate-500">4 modules under each subject</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analytics.subjects.map((subj) => {
            const pal = getSubjectPalette(subj.subjectId);
            const progressPct = Math.round((subj.completedModules / 4) * 100);
            return (
              <div key={subj.subjectId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className={`h-1.5 w-full ${pal.topBar}`} />
                <div className="p-5">
                  <div className="flex items-center justify-between pb-2.5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{subj.subjectName}</h3>
                      <p className={`text-xs font-medium tabular-nums ${pal.accentText}`}>
                        {subj.completedModules}/4 modules completed
                      </p>
                    </div>
                    <div className="text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                      {subj.averageAccuracy !== null ? `${subj.averageAccuracy}%` : '0%'}
                    </div>
                  </div>

                  {/* Subject Progress Bar */}
                  <div className="mb-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${pal.progressFill}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    {subj.modules.map((mod: ModulePerformanceSummary) => (
                      <button
                        key={mod.moduleId}
                        type="button"
                        onClick={() => openModule(mod.moduleId, false)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${pal.softBg} ${pal.softBorder} hover:brightness-95`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            M{mod.moduleNumber}: {mod.moduleTitle}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums shrink-0">
                          {mod.status === 'Strong' && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                          {mod.status === 'Needs Revision' && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                          )}
                          {mod.status === 'Developing' && (
                            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          {mod.status === 'Not Started' && (
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span
                            className={
                              mod.status === 'Strong'
                                ? 'text-emerald-700 font-semibold'
                                : mod.status === 'Needs Revision'
                                ? 'text-red-700 font-semibold'
                                : mod.status === 'Developing'
                                ? 'text-amber-700 font-semibold'
                                : `${pal.accentText} font-semibold`
                            }
                          >
                            {mod.latestAccuracy !== null ? `${mod.latestAccuracy}%` : 'Start'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges & Privacy-Safe Class Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">{t.badgesMilestones}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {gamification.badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl border p-3 text-xs ${
                  b.earned
                    ? 'border-amber-300 bg-amber-50/70 text-slate-900'
                    : 'border-slate-200 bg-slate-50/60 text-slate-500'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{b.title}</span>
                  <span className={b.earned ? 'text-amber-700' : 'text-slate-400'}>
                    {b.earned ? 'Earned' : 'Locked'}
                  </span>
                </div>
                <p className="mt-1 text-[11px]">{b.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                {t.classLeaderboard} (Class {student.classLevel})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Privacy-safe initials</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500">Classmates appear here as your class progresses.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {leaderboard.slice(0, 5).map((row) => (
                <div
                  key={`${row.rank}-${row.displayLabel}`}
                  className={`flex items-center justify-between py-2 text-xs ${
                    row.isCurrentUser ? 'font-bold text-sky-800' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono w-5 text-slate-400 tabular-nums">#{row.rank}</span>
                    <span>{row.displayLabel}</span>
                    <span className="text-[11px] text-slate-400">{row.milestone}</span>
                  </div>
                  <span className="font-mono font-semibold tabular-nums">
                    {row.xp} XP{row.accuracy !== null ? ` · ${row.accuracy}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weak Areas & Personalized Recommendations + Recent Practice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <h2 className="text-base font-bold text-slate-900">{t.weakAreas}</h2>
          {analytics.recommendedToRevise.length === 0 ? (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
              <p className="text-sm font-semibold text-sky-950">Ready for your first adaptive check</p>
              <p className="mt-1 text-xs leading-relaxed text-sky-800">
                Complete a practice session in any module above. LEARNLOCAL will immediately identify weak topics,
                adjust question difficulty, and list personalized revision steps here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.recommendedToRevise.map((mod) => (
                <div
                  key={mod.moduleId}
                  className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {mod.subjectName} · {mod.moduleTitle}{' '}
                      <span className="font-mono text-amber-700 tabular-nums">
                        ({mod.latestAccuracy}%)
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{mod.recommendation}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openModule(
                        mod.moduleId,
                        mod.recommendedAction !== 'revisit_explanation',
                        mod.recommendedAction === 'revisit_explanation' ? 'easy' : 'adaptive'
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    {mod.recommendedAction === 'revisit_explanation' ? 'Review Notes' : 'Practice'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{t.recentPractice}</h2>
            <button
              type="button"
              onClick={() => onChangeTab('history')}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              View all
            </button>
          </div>
          {attempts.length === 0 ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-sm font-semibold text-emerald-950">Start from Module 1</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Your session history starts clean at 0 attempts. Open any subject card, read the study notes, and
                finish a practice round to record your first score.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {attempts.slice(0, 5).map((att) => (
                <div key={att.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {att.moduleTitle}
                    </div>
                    <div className="text-xs text-slate-500">
                      {att.subjectName} · {new Date(att.completedAt).toLocaleDateString()} ·{' '}
                      {att.synced ? 'Synced' : 'Saved Offline'}
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm font-bold tabular-nums shrink-0">
                    <span
                      className={
                        att.percentage >= 80
                          ? 'text-emerald-700'
                          : att.percentage >= 50
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {att.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
