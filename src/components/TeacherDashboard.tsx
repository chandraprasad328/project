import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  Plus,
  Printer,
  Send,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  AssignmentItem,
  AuditLogEntry,
  CustomQuizItem,
  Difficulty,
  LearningModule,
  PracticeAttempt,
  QuestionItem,
  StudentAnalyticsReport,
  SubjectInfo,
  TeacherClassAnalytics,
  TeacherRecommendation,
  UserProfile,
} from '../shared/types';

export type TeacherTab = 'analytics' | 'students' | 'assignments' | 'curriculum';

interface TeacherDashboardProps {
  teacher: UserProfile;
  token: string;
  activeTab: TeacherTab;
  onChangeTab: (tab: TeacherTab) => void;
  selectedClass: number;
  onSelectClass: (cls: number) => void;
  subjects: SubjectInfo[];
  modules: LearningModule[];
  questions: QuestionItem[];
  onRefreshCurriculum: (cls: number) => Promise<void>;
  onSelectActiveModuleForChat: (mod: LearningModule | null) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacher,
  token,
  activeTab,
  onChangeTab,
  selectedClass,
  onSelectClass,
  subjects,
  modules,
  questions,
  onRefreshCurriculum,
  onSelectActiveModuleForChat,
}) => {
  const [classAnalytics, setClassAnalytics] = useState<TeacherClassAnalytics | null>(null);
  const [classRecs, setClassRecs] = useState<TeacherRecommendation[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuizItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student Detail Inspector state
  const [inspectedStudent, setInspectedStudent] = useState<{
    student: UserProfile;
    analytics: StudentAnalyticsReport;
    attempts: PracticeAttempt[];
  } | null>(null);

  // Send Revision Recommendation form
  const [recModuleId, setRecModuleId] = useState<string>('');
  const [recStudentId, setRecStudentId] = useState<string>('ALL_CLASS');
  const [recNote, setRecNote] = useState<string>('');
  const [recFeedback, setRecFeedback] = useState<string | null>(null);

  // Homework & Assignment form
  const [assignModuleId, setAssignModuleId] = useState<string>('');
  const [assignTitle, setAssignTitle] = useState<string>('');
  const [assignInstructions, setAssignInstructions] = useState<string>('');
  const [assignDueDate, setAssignDueDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);

  // Custom Quiz form
  const [quizModuleId, setQuizModuleId] = useState<string>('');
  const [quizTitle, setQuizTitle] = useState<string>('');
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  // Curriculum & Question Bank Editor state
  const [editorSubjectId, setEditorSubjectId] = useState<string>(subjects[0]?.id || 'math');
  const [editorModuleId, setEditorModuleId] = useState<string>('');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Add Question state
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQTopic, setNewQTopic] = useState('');
  const [newQDifficulty, setNewQDifficulty] = useState<Difficulty>('medium');
  const [newQOpts, setNewQOpts] = useState<[string, string, string, string]>(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState<number>(0);
  const [newQHint, setNewQHint] = useState('');
  const [newQExplanation, setNewQExplanation] = useState('');
  const [qSaveMsg, setQSaveMsg] = useState<string | null>(null);

  const fetchClassData = async (cls: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teacher/class/${cls}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load class analytics.');
        return;
      }
      setClassAnalytics(data.analytics);
      setClassRecs(data.recommendations || []);
      setAssignments(data.assignments || []);
      setCustomQuizzes(data.customQuizzes || []);
      setActivityLogs(data.activityLogs || []);
    } catch {
      setError('Server unavailable for teacher analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassData(selectedClass);
    setInspectedStudent(null);
  }, [selectedClass]);

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.id === editorSubjectId)) {
      setEditorSubjectId(subjects[0].id);
    }
  }, [subjects]);

  const subjectModules = modules
    .filter((m) => m.subjectId === editorSubjectId)
    .sort((a, b) => a.moduleNumber - b.moduleNumber);

  useEffect(() => {
    if (subjectModules.length > 0 && !subjectModules.some((m) => m.id === editorModuleId)) {
      setEditorModuleId(subjectModules[0].id);
    }
  }, [editorSubjectId, modules]);

  const activeEditModule = modules.find((m) => m.id === editorModuleId) || subjectModules[0] || null;

  useEffect(() => {
    if (activeEditModule) {
      setEditTitle(activeEditModule.title);
      setEditSummary(activeEditModule.summary);
      setEditExplanation(activeEditModule.moduleExplanation);
      onSelectActiveModuleForChat(activeEditModule);
    }
  }, [activeEditModule?.id]);

  useEffect(() => {
    if (modules.length > 0) {
      if (!modules.some((m) => m.id === recModuleId)) setRecModuleId(modules[0].id);
      if (!modules.some((m) => m.id === assignModuleId)) setAssignModuleId(modules[0].id);
      if (!modules.some((m) => m.id === quizModuleId)) setQuizModuleId(modules[0].id);
    }
  }, [modules]);

  const inspectStudent = async (studentId: string) => {
    try {
      const res = await fetch(`/api/teacher/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setInspectedStudent({
          student: data.student,
          analytics: data.analytics,
          attempts: data.attempts || [],
        });
        setRecStudentId(studentId);
      }
    } catch {
      // Ignore
    }
  };

  const handleExportCSV = async () => {
    const res = await fetch(`/api/teacher/export/${selectedClass}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learnlocal-class-${selectedClass}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignFeedback(null);
    if (!assignModuleId) return;
    const res = await fetch('/api/teacher/assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        moduleId: assignModuleId,
        title: assignTitle,
        instructions: assignInstructions,
        dueDate: assignDueDate,
        targetStudentId: 'ALL_CLASS',
      }),
    });
    if (res.ok) {
      setAssignTitle('');
      setAssignInstructions('');
      setAssignFeedback(`Homework posted to Class ${selectedClass}.`);
      await fetchClassData(selectedClass);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizFeedback(null);
    if (!quizModuleId) return;
    const res = await fetch('/api/teacher/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        moduleId: quizModuleId,
        title: quizTitle,
        targetStudentId: 'ALL_CLASS',
      }),
    });
    if (res.ok) {
      setQuizTitle('');
      setQuizFeedback(`Custom quiz assigned to Class ${selectedClass}.`);
      await fetchClassData(selectedClass);
    }
  };

  const handleSendRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecFeedback(null);
    if (!recModuleId) return;
    try {
      const res = await fetch('/api/teacher/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: recStudentId,
          classLevel: selectedClass,
          moduleId: recModuleId,
          note: recNote,
        }),
      });
      if (res.ok) {
        setRecNote('');
        setRecFeedback('Revision recommendation sent.');
        await fetchClassData(selectedClass);
      }
    } catch {
      setRecFeedback('Failed to send recommendation.');
    }
  };

  const handleSaveModuleMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditModule) return;
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/teacher/module/${activeEditModule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          summary: editSummary,
          moduleExplanation: editExplanation,
        }),
      });
      if (res.ok) {
        setSaveMsg('Module content updated and published to students.');
        await onRefreshCurriculum(selectedClass);
      }
    } catch {
      setSaveMsg('Could not save module updates.');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditModule) return;
    setQSaveMsg(null);
    try {
      const res = await fetch('/api/teacher/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleId: activeEditModule.id,
          topic: newQTopic || activeEditModule.title,
          difficulty: newQDifficulty,
          prompt: newQPrompt,
          options: newQOpts,
          correctIndex: newQCorrect,
          hint: newQHint,
          explanation: newQExplanation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQSaveMsg(data.error || 'Failed to add question.');
        return;
      }
      setNewQPrompt('');
      setNewQTopic('');
      setNewQOpts(['', '', '', '']);
      setNewQHint('');
      setNewQExplanation('');
      setQSaveMsg('New question added to this module’s question bank.');
      await onRefreshCurriculum(selectedClass);
    } catch {
      setQSaveMsg('Failed to reach server.');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/teacher/question/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await onRefreshCurriculum(selectedClass);
      }
    } catch {
      // Ignore
    }
  };

  const ClassSelectorBar = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500" />
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-bold text-indigo-700">
            Teacher Workspace · {teacher.name} · Assigned: Classes {teacher.assignedClasses.join(', ')}
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold text-slate-900">
            Class {selectedClass} Academic Control
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {teacher.assignedClasses.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => onSelectClass(cls)}
                className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors tabular-nums ${
                  selectedClass === cls
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                C{cls}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );

  // Individual Student Inspector View
  if (inspectedStudent) {
    return (
      <div className="space-y-6">
        {ClassSelectorBar}
        <button
          type="button"
          onClick={() => setInspectedStudent(null)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class {selectedClass} Students
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{inspectedStudent.student.name}</h2>
              <p className="text-xs text-slate-500">
                Class {inspectedStudent.student.classLevel} · @{inspectedStudent.student.username}
                {inspectedStudent.student.studentCode ? ` · ${inspectedStudent.student.studentCode}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-6 text-right font-mono tabular-nums">
              <div>
                <div className="text-xs text-slate-500">Overall Accuracy</div>
                <div className="text-xl font-bold text-slate-900">
                  {inspectedStudent.analytics.overallAccuracy !== null
                    ? `${inspectedStudent.analytics.overallAccuracy}%`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Progress</div>
                <div className="text-xl font-bold text-sky-700">
                  {inspectedStudent.analytics.overallProgressPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Subject-wise breakdown */}
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inspectedStudent.analytics.subjects.map((subj) => (
              <div key={subj.subjectId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>{subj.subjectName}</span>
                  <span className="font-mono tabular-nums">
                    {subj.averageAccuracy !== null ? `${subj.averageAccuracy}%` : '—'}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {subj.modules.map((m) => (
                    <div key={m.moduleId} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 truncate pr-2">
                        M{m.moduleNumber}: {m.moduleTitle}
                      </span>
                      <span
                        className={`font-mono font-semibold tabular-nums shrink-0 ${
                          m.status === 'Strong'
                            ? 'text-emerald-700'
                            : m.status === 'Needs Revision'
                            ? 'text-red-700'
                            : m.status === 'Developing'
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {m.latestAccuracy !== null ? `${m.latestAccuracy}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommend Module Revision for this Student */}
        <form onSubmit={handleSendRecommendation} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Recommend Module Revision to {inspectedStudent.student.name}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Select Module</label>
              <select
                value={recModuleId}
                onChange={(e) => setRecModuleId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.subjectName} — M{m.moduleNumber}: {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Guidance Note</label>
              <input
                type="text"
                value={recNote}
                onChange={(e) => setRecNote(e.target.value)}
                placeholder="e.g., Revisit worked examples and complete Easy practice set"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {recFeedback && <p className="text-xs font-medium text-emerald-700">{recFeedback}</p>}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Send className="h-4 w-4" />
            Send Revision Recommendation
          </button>
        </form>
      </div>
    );
  }

  // Assignments, Custom Quizzes & Activity History Tab
  if (activeTab === 'assignments') {
    return (
      <div className="space-y-6">
        {ClassSelectorBar}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Assign Homework */}
          <form
            onSubmit={handleCreateAssignment}
            className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-6"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">
                Assign Homework (Class {selectedClass})
              </h2>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Target Module</label>
              <select
                value={assignModuleId}
                onChange={(e) => setAssignModuleId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.subjectName} — M{m.moduleNumber}: {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g., Fractions Practice Sheet"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Due Date</label>
                <input
                  type="date"
                  required
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Instructions</label>
              <textarea
                rows={2}
                value={assignInstructions}
                onChange={(e) => setAssignInstructions(e.target.value)}
                placeholder="Read Concept 01 & 02 and finish 1 Medium practice session."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {assignFeedback && <p className="text-xs font-medium text-emerald-700">{assignFeedback}</p>}
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Publish Homework
            </button>
          </form>

          {/* Create Custom Quiz */}
          <form
            onSubmit={handleCreateQuiz}
            className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-6"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Create Custom Practice Quiz (Class {selectedClass})
              </h2>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Module Bank</label>
              <select
                value={quizModuleId}
                onChange={(e) => setQuizModuleId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.subjectName} — M{m.moduleNumber}: {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Quiz Title</label>
              <input
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g., Weekly Revision Check"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {quizFeedback && <p className="text-xs font-medium text-emerald-700">{quizFeedback}</p>}
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Create &amp; Assign Quiz
            </button>

            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold text-slate-700 mb-2">
                Active Homework ({assignments.length}) &amp; Quizzes ({customQuizzes.length})
              </h3>
              <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                {assignments.map((a) => (
                  <div key={a.id} className="flex justify-between text-slate-700">
                    <span className="truncate pr-2">HW: {a.title} ({a.moduleTitle})</span>
                    <span className="font-mono text-amber-700 shrink-0">{a.dueDate}</span>
                  </div>
                ))}
                {customQuizzes.map((q) => (
                  <div key={q.id} className="flex justify-between text-indigo-800">
                    <span className="truncate pr-2">Quiz: {q.title}</span>
                    <span className="font-mono shrink-0">{q.questionIds.length} Qs</span>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Teacher Activity History */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Teacher Activity History</h2>
          </div>
          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-500">No recorded teaching actions yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-4 py-2 text-xs">
                  <div>
                    <span className="font-mono font-semibold text-indigo-700">{log.action}</span>
                    <span className="ml-2 text-slate-700">{log.details}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Curriculum & Question Bank Editor Tab
  if (activeTab === 'curriculum') {
    const moduleQuestions = activeEditModule
      ? questions.filter((q) => q.moduleId === activeEditModule.id)
      : [];

    return (
      <div className="space-y-6">
        {ClassSelectorBar}

        {/* Subject & Module Picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Curriculum &amp; Question Bank Editor (Class {selectedClass})
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setEditorSubjectId(s.id)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  editorSubjectId === s.id
                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {subjectModules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setEditorModuleId(m.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  activeEditModule?.id === m.id
                    ? 'border-sky-600 bg-sky-50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500">Module {m.moduleNumber}</div>
                <div className="mt-0.5 text-xs font-bold truncate">{m.title}</div>
              </button>
            ))}
          </div>
        </div>

        {activeEditModule && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Edit Learning Material */}
            <form
              onSubmit={handleSaveModuleMaterial}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-5"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Module Material</h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Module Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Summary</label>
                <textarea
                  rows={2}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Step-by-Step Module Explanation
                </label>
                <textarea
                  rows={5}
                  required
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {saveMsg && <p className="text-xs font-medium text-emerald-700">{saveMsg}</p>}

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Save Module Changes
              </button>
            </form>

            {/* Manage Module Question Bank */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-sky-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Module Question Bank ({moduleQuestions.length} Questions)
                  </h3>
                </div>
                <span className="text-xs text-slate-500">Strictly scoped to M{activeEditModule.moduleNumber}</span>
              </div>

              {/* Add Question Form */}
              <form onSubmit={handleAddQuestion} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Plus className="h-3.5 w-3.5" />
                  Add New Question to {activeEditModule.title}
                </div>
                <input
                  type="text"
                  required
                  value={newQPrompt}
                  onChange={(e) => setNewQPrompt(e.target.value)}
                  placeholder="Enter question prompt..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    value={newQTopic}
                    onChange={(e) => setNewQTopic(e.target.value)}
                    placeholder="Topic tag"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <select
                    value={newQDifficulty}
                    onChange={(e) => setNewQDifficulty(e.target.value as Difficulty)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <select
                    value={newQCorrect}
                    onChange={(e) => setNewQCorrect(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  >
                    <option value={0}>Correct: Option A</option>
                    <option value={1}>Correct: Option B</option>
                    <option value={2}>Correct: Option C</option>
                    <option value={3}>Correct: Option D</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      value={newQOpts[idx]}
                      onChange={(e) => {
                        const copy = [...newQOpts] as [string, string, string, string];
                        copy[idx] = e.target.value;
                        setNewQOpts(copy);
                      }}
                      placeholder={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newQHint}
                    onChange={(e) => setNewQHint(e.target.value)}
                    placeholder="Hint for students (optional)"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newQExplanation}
                    onChange={(e) => setNewQExplanation(e.target.value)}
                    placeholder="Step-by-step explanation"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>

                {qSaveMsg && <p className="text-xs font-medium text-emerald-700">{qSaveMsg}</p>}
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Add Question
                </button>
              </form>

              {/* Existing Questions List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 pr-1">
                {moduleQuestions.map((q, idx) => (
                  <div key={q.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        Q{idx + 1} · {q.topic} · {q.difficulty.toUpperCase()}
                        {q.createdByTeacher ? ' · Teacher Added' : ''}
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{q.prompt}</p>
                      <p className="mt-0.5 text-xs text-emerald-700">
                        Answer: {q.options[q.correctIndex]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Remove question"
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Students List & Comparison Tab
  if (activeTab === 'students') {
    return (
      <div className="space-y-6">
        {ClassSelectorBar}

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Class {selectedClass} Students ({classAnalytics?.allStudents.length ?? 0})
              </h2>
              <p className="text-xs text-slate-500">
                Click any student to inspect subject-wise and module-wise progress.
              </p>
            </div>
          </div>

          {!classAnalytics || classAnalytics.allStudents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              No students registered in Class {selectedClass} yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-4 py-3 text-right">Sessions</th>
                    <th className="px-4 py-3 text-right">Modules Done</th>
                    <th className="px-4 py-3 text-right">Avg Accuracy</th>
                    <th className="px-4 py-3">Trend</th>
                    <th className="px-4 py-3">Weakest Module</th>
                    <th className="px-5 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classAnalytics.allStudents.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{st.name}</div>
                        <div className="text-xs text-slate-500">
                          @{st.username} {st.studentCode ? `· ${st.studentCode}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{st.totalAttempts}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{st.completedModules}/24</td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                        {st.overallAccuracy !== null ? `${st.overallAccuracy}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {st.trend === 'improving' && <span className="text-emerald-700">Improving</span>}
                        {st.trend === 'needs_attention' && <span className="text-red-700">Needs Attention</span>}
                        {st.trend === 'steady' && <span className="text-slate-700">Steady</span>}
                        {st.trend === 'new' && <span className="text-slate-400">New</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {st.weakestModule || '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => inspectStudent(st.studentId)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          View Profile
                        </button>
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

  // Default: Teacher Class Analytics Overview
  return (
    <div className="space-y-6">
      {ClassSelectorBar}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !classAnalytics ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading Class {selectedClass} analytics...
        </div>
      ) : (
        classAnalytics && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
                <div className="text-xs font-semibold text-indigo-800">Students in Class {selectedClass}</div>
                <div className="mt-1 font-mono text-2xl font-bold text-indigo-950 tabular-nums">
                  {classAnalytics.totalStudents}
                </div>
                <div className="text-xs text-indigo-700 tabular-nums">
                  {classAnalytics.activeStudents} active
                </div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-5">
                <div className="text-xs font-semibold text-sky-800">Class Average Accuracy</div>
                <div className="mt-1 font-mono text-2xl font-bold text-sky-950 tabular-nums">
                  {classAnalytics.classAverageAccuracy !== null
                    ? `${classAnalytics.classAverageAccuracy}%`
                    : '—'}
                </div>
                <div className="text-xs text-sky-700">
                  {classAnalytics.classAverageAccuracy === null ? 'Awaiting first attempts' : 'Across all subjects'}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="text-xs font-semibold text-amber-800">Students Falling Behind</div>
                <div className="mt-1 font-mono text-2xl font-bold text-amber-950 tabular-nums">
                  {classAnalytics.studentsFallingBehind.length}
                </div>
                <div className="text-xs text-amber-700">need additional attention</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                <div className="text-xs font-semibold text-emerald-800">Consistent Improvement</div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-950 tabular-nums">
                  {classAnalytics.studentsImproving.length}
                </div>
                <div className="text-xs text-emerald-700">upward accuracy trend</div>
              </div>
            </div>

            {/* Teacher Actionable Insights */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Students Requiring Additional Attention
                  </h2>
                </div>
                {classAnalytics.studentsFallingBehind.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No students are currently falling below 60% in Class {selectedClass}.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {classAnalytics.studentsFallingBehind.map((st) => (
                      <div
                        key={st.studentId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/40 p-3.5"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {st.name}{' '}
                            <span className="font-mono text-red-700 tabular-nums">
                              ({st.overallAccuracy ?? 0}%)
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            Weakest: {st.weakestModule || 'Needs foundational practice'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => inspectStudent(st.studentId)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shrink-0"
                        >
                          Guide Student
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Students Showing Consistent Improvement
                    </h3>
                  </div>
                  {classAnalytics.studentsImproving.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Improvement trends appear once students complete 2 or more sessions.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {classAnalytics.studentsImproving.map((st) => (
                        <div key={st.studentId} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{st.name}</span>
                          <span className="font-mono text-emerald-700 font-semibold tabular-nums">
                            {st.overallAccuracy}% avg · Improving
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Frequently Misunderstood Topics */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Frequently Misunderstood Topics
                  </h3>
                  {classAnalytics.frequentlyMisunderstoodTopics.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Topic error hotspots appear as students complete class assessments.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {classAnalytics.frequentlyMisunderstoodTopics.map((tp) => (
                        <div key={tp.topic} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">{tp.topic}</span>
                          <span className="font-mono font-semibold text-red-700 tabular-nums">
                            {tp.missCount} misses
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Low-Performing Modules & Subject Performance */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6">
                <h2 className="text-base font-bold text-slate-900">
                  Modules with Low Class-Wide Performance
                </h2>
                {classAnalytics.lowPerformingModules.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No low-performing modules flagged yet in Class {selectedClass}.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {classAnalytics.lowPerformingModules.map((m) => (
                      <div
                        key={m.moduleId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{m.moduleTitle}</div>
                          <div className="text-xs text-slate-500">
                            {m.subjectName} · {m.attemptsCount} class attempts
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-amber-700 tabular-nums">
                          {m.averageAccuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="mt-6 border-t border-slate-100 pt-4 text-sm font-bold text-slate-900">
                  Subject-Wise Performance (All 6 Subjects)
                </h3>
                <div className="mt-3 space-y-2">
                  {classAnalytics.subjectsNeedingAttention.map((s) => (
                    <div key={s.subjectId} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{s.subjectName}</span>
                      <span className="font-mono text-slate-700 tabular-nums">
                        {s.averageAccuracy !== null ? `${s.averageAccuracy}%` : 'No attempts yet'}
                        {' · '}
                        {s.attemptsCount} sessions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Broadcast Module Revision Recommendation */}
            <form
              onSubmit={handleSendRecommendation}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Send Module Revision Recommendation
                </h2>
                <button
                  type="button"
                  onClick={() => onChangeTab('students')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                >
                  <Users className="h-3.5 w-3.5" />
                  Compare All Students
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <select
                  value={recStudentId}
                  onChange={(e) => setRecStudentId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                >
                  <option value="ALL_CLASS">Entire Class {selectedClass}</option>
                  {classAnalytics.allStudents.map((st) => (
                    <option key={st.studentId} value={st.studentId}>
                      {st.name} (@{st.username})
                    </option>
                  ))}
                </select>
                <select
                  value={recModuleId}
                  onChange={(e) => setRecModuleId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.subjectName} — M{m.moduleNumber}: {m.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recNote}
                    onChange={(e) => setRecNote(e.target.value)}
                    placeholder="Optional guidance note..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Send
                  </button>
                </div>
              </div>
              {recFeedback && (
                <p className="mt-2 text-xs font-medium text-emerald-700">{recFeedback}</p>
              )}
              {classRecs.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  Latest recommendation: <strong>{classRecs[0].moduleTitle}</strong> — {classRecs[0].note}
                </div>
              )}
            </form>
          </>
        )
      )}
    </div>
  );
};
