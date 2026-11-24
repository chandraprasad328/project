import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { evaluatePracticeAttempt, selectAdaptiveQuestions } from '../shared/adaptiveEngine';
import {
  Difficulty,
  LearningModule,
  PracticeAttempt,
  QuestionItem,
  UserProfile,
} from '../shared/types';

interface PracticeSessionProps {
  student: UserProfile;
  token: string;
  module: LearningModule;
  moduleQuestions: QuestionItem[];
  attemptHistory: PracticeAttempt[];
  isEffectivelyOnline: boolean;
  initialDifficulty?: Difficulty | 'adaptive';
  onActiveQuestionChange: (question: QuestionItem | null) => void;
  onAskTutorHint: (prompt: string) => void;
  onAttemptCompleted: (attempt: PracticeAttempt) => Promise<void>;
  onBackToModule: () => void;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  student,
  token,
  module,
  moduleQuestions,
  attemptHistory,
  isEffectivelyOnline,
  initialDifficulty = 'adaptive',
  onActiveQuestionChange,
  onAskTutorHint,
  onAttemptCompleted,
  onBackToModule,
}) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [modeLabel, setModeLabel] = useState<string>('Adaptive');
  const [difficultyTarget, setDifficultyTarget] = useState<Difficulty | 'adaptive'>(initialDifficulty);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Record<number, number>>({});
  const [showLocalHint, setShowLocalHint] = useState(false);
  const [result, setResult] = useState<PracticeAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  const startSession = async (forcedDiff: Difficulty | 'adaptive') => {
    setLoading(true);
    setResult(null);
    setCurrentIdx(0);
    setSelectedIndices({});
    setShowLocalHint(false);
    setDifficultyTarget(forcedDiff);

    if (isEffectivelyOnline) {
      try {
        const res = await fetch('/api/practice/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            moduleId: module.id,
            count: 6,
            forcedDifficulty: forcedDiff,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
          setModeLabel(data.targetModeLabel || 'Adaptive');
          setLoading(false);
          return;
        }
      } catch {
        // Fallback to local adaptive engine seamlessly
      }
    }

    const localSelection = selectAdaptiveQuestions({
      moduleId: module.id,
      studentId: student.id,
      questionBank: moduleQuestions,
      attemptHistory,
      count: 6,
      sessionNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      forcedDifficulty: forcedDiff,
    });
    setQuestions(localSelection.questions);
    setModeLabel(localSelection.targetModeLabel);
    setLoading(false);
  };

  useEffect(() => {
    startSession(initialDifficulty);
    return () => {
      onActiveQuestionChange(null);
    };
  }, [module.id]);

  useEffect(() => {
    if (!result && questions[currentIdx]) {
      onActiveQuestionChange(questions[currentIdx]);
    } else {
      onActiveQuestionChange(null);
    }
  }, [currentIdx, questions, result]);

  const handleFinish = async () => {
    const answerList = questions.map((_, idx) => selectedIndices[idx] ?? -1);
    const evaluated = evaluatePracticeAttempt({
      id: `att-${student.id}-${Date.now()}`,
      student,
      module,
      questions,
      selectedIndices: answerList,
      difficultyTarget,
      synced: false,
    });
    setResult(evaluated);
    onActiveQuestionChange(null);
    await onAttemptCompleted(evaluated);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">
          Preparing your personalized question set for {module.title}...
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <h3 className="text-lg font-bold text-slate-900">No Questions Available Yet</h3>
        <p className="mt-1 text-sm text-slate-600">
          This module currently has no questions in the question bank.
        </p>
        <button
          type="button"
          onClick={onBackToModule}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Module
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-6">
        {/* Post-Practice Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Practice Complete · {module.subjectName} · Module {module.moduleNumber}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{module.title}</h2>
            </div>
            <div className="text-right">
              <div
                className={`font-mono text-3xl font-bold tabular-nums ${
                  result.percentage >= 80
                    ? 'text-emerald-700'
                    : result.percentage >= 50
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {result.percentage}%
              </div>
              <div className="text-xs font-medium text-slate-500">
                {result.percentage >= 80
                  ? 'Strong Mastery'
                  : result.percentage >= 50
                  ? 'Developing'
                  : 'Needs Revision'}
              </div>
            </div>
          </div>

          {/* Required 4 Metrics */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Total Attempted</div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {result.totalQuestions}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="text-xs text-emerald-700">Correct Answers</div>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
                {result.correctCount}
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
              <div className="text-xs text-red-700">Incorrect Answers</div>
              <div className="mt-1 font-mono text-2xl font-bold text-red-800 tabular-nums">
                {result.incorrectCount}
              </div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
              <div className="text-xs text-sky-700">Overall Percentage</div>
              <div className="mt-1 font-mono text-2xl font-bold text-sky-900 tabular-nums">
                {result.percentage}%
              </div>
            </div>
          </div>

          {/* Adaptive Recommendation & Topics to Improve */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Adaptive Recommendation</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {result.recommendationText}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Recommended Revision Material: {module.learningMaterial[0]?.heading || module.title}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Topics That Need Improvement</h3>
              {result.weakTopics.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {result.weakTopics.map((topic) => (
                    <li key={topic} className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All tested topics in this module were answered accurately!
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBackToModule}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Revisit Module Explanations
            </button>
            <button
              type="button"
              onClick={() =>
                startSession(
                  result.percentage >= 85 ? 'hard' : result.percentage < 50 ? 'easy' : 'adaptive'
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {result.percentage >= 85
                ? 'Try Harder Challenge Set'
                : result.percentage < 50
                ? 'Retry Easy Foundation Set'
                : 'New Adaptive Practice Set'}
            </button>
          </div>
        </div>

        {/* Question-by-Question Review */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-bold text-slate-900">Question Review & Explanations</h3>
          <div className="mt-4 divide-y divide-slate-100">
            {questions.map((q, idx) => {
              const ans = result.answers[idx];
              return (
                <div key={q.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Q{idx + 1} · {q.topic} · Difficulty: {q.difficulty.toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{q.prompt}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                        ans?.isCorrect ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {ans?.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" /> Incorrect
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <div>
                      Your answer:{' '}
                      <span className="font-medium text-slate-900">
                        {ans?.selectedIndex >= 0 ? q.options[ans.selectedIndex] : 'Skipped'}
                      </span>
                      {' · '}
                      Correct answer:{' '}
                      <span className="font-semibold text-emerald-700">
                        {q.options[q.correctIndex]}
                      </span>
                    </div>
                    <div className="text-slate-600">Explanation: {q.explanation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const chosenOption = selectedIndices[currentIdx];
  const answeredCount = Object.keys(selectedIndices).length;

  return (
    <div className="space-y-4">
      {/* Top Practice Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToModule}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Practice
          </button>
          <span className="text-slate-300" aria-hidden="true">
            |
          </span>
          <span className="text-sm font-bold text-slate-900">
            {module.subjectName} · Module {module.moduleNumber}: {module.title}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>{modeLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            Question {currentIdx + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Progress Strip */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-200"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 to-indigo-600" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              Topic: {currentQ.topic} · Difficulty:{' '}
              <strong
                className={
                  currentQ.difficulty === 'easy'
                    ? 'text-emerald-700'
                    : currentQ.difficulty === 'medium'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }
              >
                {currentQ.difficulty.toUpperCase()}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLocalHint((v) => !v)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                {showLocalHint ? 'Hide Quick Hint' : 'Show Quick Hint'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onAskTutorHint(
                    `Give me a step-by-step hint (without telling the answer) for this question: "${currentQ.prompt}"`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Ask Doubt Tutor
              </button>
            </div>
          </div>

          <h3 className="mt-4 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
            {currentQ.prompt}
          </h3>

          {showLocalHint && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              <strong>Hint:</strong> {currentQ.hint}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = chosenOption === optIdx;
              const letter = ['A', 'B', 'C', 'D'][optIdx];
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() =>
                    setSelectedIndices((prev) => ({
                      ...prev,
                      [currentIdx]: optIdx,
                    }))
                  }
                  className={`flex w-full items-center gap-3.5 rounded-xl border p-4 text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/30'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-300 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="font-medium">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => {
                setCurrentIdx((i) => Math.max(0, i - 1));
                setShowLocalHint(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-xs text-slate-500 tabular-nums">
              {answeredCount} of {questions.length} answered
            </span>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentIdx((i) => i + 1);
                  setShowLocalHint(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Submit Practice ({answeredCount}/{questions.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
