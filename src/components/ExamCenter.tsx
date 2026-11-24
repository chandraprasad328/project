import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { evaluateExamPaper, generateExamPaper } from '../shared/examEngine';
import {
  ExamAttempt,
  ExamQuestion,
  ExamType,
  LearningModule,
  QuestionItem,
  SubjectInfo,
  UserProfile,
} from '../shared/types';

interface ExamCenterProps {
  student: UserProfile;
  token: string;
  subjects: SubjectInfo[];
  modules: LearningModule[];
  questions: QuestionItem[];
  exams: ExamAttempt[];
  isEffectivelyOnline: boolean;
  onExamCompleted: (exam: ExamAttempt) => Promise<void>;
  onExamModeChange: (active: boolean) => void;
}

export const ExamCenter: React.FC<ExamCenterProps> = ({
  student,
  token,
  subjects,
  modules,
  questions,
  exams,
  isEffectivelyOnline,
  onExamCompleted,
  onExamModeChange,
}) => {
  const [examType, setExamType] = useState<ExamType>('chapter');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'math');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');

  // Active exam state
  const [activePaper, setActivePaper] = useState<{
    title: string;
    durationMinutes: number;
    questions: ExamQuestion[];
  } | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [starting, setStarting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<ExamAttempt | null>(null);
  const [reviewedHistoryExam, setReviewedHistoryExam] = useState<ExamAttempt | null>(null);

  const timerRef = useRef<number | null>(null);
  const totalDurationRef = useRef<number>(0);

  useEffect(() => {
    if (modules.length > 0 && !modules.some((m) => m.id === selectedModuleId)) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules]);

  useEffect(() => {
    return () => {
      onExamModeChange(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const submitExam = async (autoSubmitted = false) => {
    if (!activePaper) return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const spent = Math.max(1, totalDurationRef.current - secondsLeft);
    const attempt = evaluateExamPaper({
      id: `exam-${student.id}-${Date.now()}`,
      student,
      examType,
      title: activePaper.title,
      subjectId: examType !== 'mock_class' ? selectedSubjectId : undefined,
      moduleId: examType === 'chapter' ? selectedModuleId : undefined,
      durationMinutes: activePaper.durationMinutes,
      timeSpentSeconds: spent,
      autoSubmitted,
      questions: activePaper.questions,
      responses,
      synced: false,
    });

    setActivePaper(null);
    onExamModeChange(false);
    setSubmittedResult(attempt);
    await onExamCompleted(attempt);
  };

  useEffect(() => {
    if (!activePaper) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [activePaper]);

  const startExam = async () => {
    setStarting(true);
    setSubmittedResult(null);
    setReviewedHistoryExam(null);
    try {
      let paper: { title: string; durationMinutes: number; questions: ExamQuestion[] } | null = null;
      if (isEffectivelyOnline && token) {
        try {
          const res = await fetch('/api/exams/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              examType,
              subjectId: selectedSubjectId,
              moduleId: selectedModuleId,
            }),
          });
          if (res.ok) {
            paper = await res.json();
          }
        } catch {
          // Offline fallback below
        }
      }

      if (!paper) {
        paper = generateExamPaper({
          classLevel: student.classLevel,
          examType,
          subjectId: selectedSubjectId,
          moduleId: selectedModuleId,
          studentId: student.id,
          modules,
          questionBank: questions,
        });
      }

      const secs = paper.durationMinutes * 60;
      totalDurationRef.current = secs;
      setSecondsLeft(secs);
      setResponses({});
      setActivePaper(paper);
      onExamModeChange(true);
    } finally {
      setStarting(false);
    }
  };

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Active Timed Examination Runner
  if (activePaper) {
    const answeredCount = activePaper.questions.filter((q) => (responses[q.id] || '').trim().length > 0).length;
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs font-bold text-indigo-700">
                Timed Assessment · Class {student.classLevel}
              </p>
              <h2 className="mt-0.5 text-xl font-extrabold text-slate-900">{activePaper.title}</h2>
              <p className="mt-1 text-xs text-slate-600 tabular-nums">
                {answeredCount} of {activePaper.questions.length} answered · Auto-submits at 00:00
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-lg font-extrabold tabular-nums ${
                  secondsLeft <= 60
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-sky-200 bg-sky-50 text-sky-900'
                }`}
              >
                <Clock className="h-4 w-4" />
                {formatClock(secondsLeft)}
              </div>
              <button
                type="button"
                onClick={() => submitExam(false)}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {activePaper.questions.map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-indigo-700">
                  Q{idx + 1} ·{' '}
                  {q.format === 'mcq'
                    ? 'Multiple Choice'
                    : q.format === 'true_false'
                    ? 'True / False'
                    : q.format === 'fill_blank'
                    ? 'Fill in the Blank'
                    : 'Short Answer'}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {q.marks} {q.marks === 1 ? 'mark' : 'marks'} · {q.topic}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">{q.prompt}</p>

              {(q.format === 'mcq' || q.format === 'true_false') && q.options ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const selected = responses[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setResponses((prev) => ({ ...prev, [q.id]: opt }))}
                        className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? 'border-sky-600 bg-sky-50 font-semibold text-sky-950'
                            : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : q.format === 'fill_blank' ? (
                <input
                  type="text"
                  value={responses[q.id] || ''}
                  onChange={(e) => setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type the missing word or value..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-600 focus:outline-none"
                />
              ) : (
                <textarea
                  rows={2}
                  value={responses[q.id] || ''}
                  onChange={(e) => setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Write a brief clear answer using key terms from the module..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-sky-600 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => submitExam(false)}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-sm"
          >
            Submit Examination &amp; View Results
          </button>
        </div>
      </div>
    );
  }

  const displayedResult = submittedResult || reviewedHistoryExam;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Smart Assessment &amp; Examination Preparation
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate randomized multi-format question papers (MCQ, True/False, Fill-in-the-Blank, Short Answer) with countdown timer &amp; explanations.
        </p>
      </div>

      {/* Exam Generator Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500" />
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                {
                  id: 'chapter',
                  title: 'Chapter-Wise Test',
                  desc: '8 questions · 8 mins · Single module focus',
                },
                {
                  id: 'subject',
                  title: 'Subject-Wise Assessment',
                  desc: '10 questions · 12 mins · All 4 modules',
                },
                {
                  id: 'mock_class',
                  title: 'Full-Class Mock Exam',
                  desc: `12 questions · 15 mins · All 6 Class ${student.classLevel} subjects`,
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExamType(opt.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  examType === opt.id
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-sm font-bold">{opt.title}</div>
                <div className="mt-1 text-xs text-slate-600">{opt.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {examType !== 'mock_class' && (
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-medium text-slate-700">Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSelectedSubjectId(sid);
                    const firstMod = modules.find((m) => m.subjectId === sid);
                    if (firstMod) setSelectedModuleId(firstMod.id);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {examType === 'chapter' && (
              <div className="min-w-[240px] flex-1">
                <label className="block text-xs font-medium text-slate-700">Select Module</label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {modules
                    .filter((m) => m.subjectId === selectedSubjectId)
                    .sort((a, b) => a.moduleNumber - b.moduleNumber)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        M{m.moduleNumber}: {m.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={startExam}
              disabled={starting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {starting ? 'Preparing Paper...' : 'Start Timed Exam'}
            </button>
          </div>
        </div>
      </div>

      {/* Exam Result & Explanations View */}
      {displayedResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-bold text-emerald-700">
                {displayedResult.autoSubmitted ? 'Auto-Submitted on Timer Expiry' : 'Examination Evaluated'}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-slate-900">{displayedResult.title}</h2>
            </div>
            <div className="flex items-center gap-6 font-mono tabular-nums">
              <div>
                <div className="text-xs text-slate-500">Marks</div>
                <div className="text-xl font-bold text-slate-900">
                  {displayedResult.marksObtained}/{displayedResult.totalMarks}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Score</div>
                <div
                  className={`text-2xl font-extrabold ${
                    displayedResult.percentage >= 75
                      ? 'text-emerald-700'
                      : displayedResult.percentage >= 50
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {displayedResult.percentage}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmittedResult(null);
                  setReviewedHistoryExam(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-sans text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {displayedResult.answers.map((ans, idx) => (
              <div
                key={ans.questionId}
                className={`rounded-xl border p-4 ${
                  ans.isCorrect
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {ans.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Question {idx + 1} · {ans.topic}
                  </span>
                  <span className="font-mono tabular-nums">
                    {ans.marksAwarded}/{ans.maxMarks} marks
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Your Answer: </span>
                    <span className="font-semibold text-slate-900">{ans.studentResponse}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Correct Answer: </span>
                    <span className="font-semibold text-emerald-800">{ans.correctAnswer}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-700">
                  <strong>Explanation:</strong> {ans.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separate Examination History */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Examination History ({exams.length})</h2>
          </div>
          <span className="text-xs text-slate-500">Stored separately from daily practice</span>
        </div>

        {exams.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="mx-auto h-9 w-9 text-indigo-500" />
            <p className="mt-2 text-sm font-semibold text-slate-900">No Examinations Attempted Yet</p>
            <p className="mt-1 text-xs text-slate-600">
              Choose Chapter-Wise, Subject-Wise, or Full-Class Mock above to take your first timed exam.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Examination</th>
                  <th className="px-4 py-3 text-right">Marks</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Time</th>
                  <th className="px-4 py-3">Sync</th>
                  <th className="px-5 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{ex.title}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(ex.completedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {ex.marksObtained}/{ex.totalMarks}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                      <span
                        className={
                          ex.percentage >= 75
                            ? 'text-emerald-700'
                            : ex.percentage >= 50
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }
                      >
                        {ex.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {Math.floor(ex.timeSpentSeconds / 60)}m {ex.timeSpentSeconds % 60}s
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={ex.synced ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                        {ex.synced ? 'Synced' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedResult(null);
                          setReviewedHistoryExam(ex);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Review
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
};
