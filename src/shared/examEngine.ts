import {
  BadgeItem,
  DailyGoal,
  ExamAnswerRecord,
  ExamAttempt,
  ExamQuestion,
  ExamType,
  LeaderboardEntry,
  LearningModule,
  PracticeAttempt,
  QuestionItem,
  StudentAnalyticsReport,
  StudentGamification,
  UserProfile,
} from './types';

function shuffleWithSeed<T>(arr: T[], seedStr: string): T[] {
  const copy = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = copy.length - 1; i > 0; i--) {
    h = (Math.imul(h >>> 0, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Generates randomized multi-format examination papers (MCQ, True/False, Fill-in-the-blank, Short Answer)
 * from the module question banks.
 */
export function generateExamPaper(params: {
  classLevel: number;
  examType: ExamType;
  subjectId?: string;
  moduleId?: string;
  studentId: string;
  modules: LearningModule[];
  questionBank: QuestionItem[];
}): { title: string; durationMinutes: number; questions: ExamQuestion[] } {
  const { classLevel, examType, subjectId, moduleId, studentId, modules, questionBank } = params;

  let pool: QuestionItem[] = [];
  let title = `Class ${classLevel} Full Mock Examination`;
  let durationMinutes = 15;
  let targetCount = 12;

  if (examType === 'chapter' && moduleId) {
    const mod = modules.find((m) => m.id === moduleId);
    pool = questionBank.filter((q) => q.moduleId === moduleId);
    title = mod ? `Chapter Test: ${mod.title}` : `Chapter Test`;
    durationMinutes = 8;
    targetCount = 8;
  } else if (examType === 'subject' && subjectId) {
    const mod = modules.find((m) => m.subjectId === subjectId && m.classLevel === classLevel);
    pool = questionBank.filter((q) => q.classLevel === classLevel && q.subjectId === subjectId);
    title = mod ? `${mod.subjectName} Subject Assessment` : `Subject Assessment`;
    durationMinutes = 12;
    targetCount = 10;
  } else {
    pool = questionBank.filter((q) => q.classLevel === classLevel);
    targetCount = 12;
    durationMinutes = 15;
  }

  const picked = shuffleWithSeed(pool, `${studentId}:${examType}:${subjectId || ''}:${moduleId || ''}:${Date.now()}`).slice(
    0,
    Math.min(targetCount, pool.length)
  );

  const examQuestions: ExamQuestion[] = picked.map((q, idx) => {
    const correctOption = q.options[q.correctIndex];
    const mod = modules.find((m) => m.id === q.moduleId);
    const modKeyword = mod?.learningMaterial[0]?.keyRule || correctOption;

    // Distribute across 4 question formats: MCQ, True/False, Fill-in-the-Blank, Short Answer
    const mod4 = idx % 4;
    if (mod4 === 0) {
      return {
        id: `exq-${q.id}-${idx}`,
        format: 'mcq',
        moduleId: q.moduleId,
        subjectId: q.subjectId,
        topic: q.topic,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: correctOption,
        explanation: q.explanation,
        marks: 2,
      };
    }

    if (mod4 === 1) {
      const makeTrue = idx % 2 === 1;
      const shownOption = makeTrue ? correctOption : q.options[(q.correctIndex + 1) % 4];
      return {
        id: `exq-${q.id}-${idx}`,
        format: 'true_false',
        moduleId: q.moduleId,
        subjectId: q.subjectId,
        topic: q.topic,
        difficulty: q.difficulty,
        prompt: `True or False: For the question "${q.prompt}", the correct answer is "${shownOption}".`,
        options: ['True', 'False'],
        correctAnswer: makeTrue ? 'True' : 'False',
        explanation: q.explanation,
        marks: 1,
      };
    }

    if (mod4 === 2) {
      const words = correctOption.split(/\s+/);
      const shortAnswerClean = words.length <= 4 ? correctOption : words.slice(0, 3).join(' ');
      return {
        id: `exq-${q.id}-${idx}`,
        format: 'fill_blank',
        moduleId: q.moduleId,
        subjectId: q.subjectId,
        topic: q.topic,
        difficulty: q.difficulty,
        prompt: `Fill in the blank: ${q.prompt} → Answer: __________`,
        correctAnswer: correctOption,
        acceptedKeywords: [
          correctOption.toLowerCase(),
          shortAnswerClean.toLowerCase(),
        ],
        explanation: q.explanation,
        marks: 2,
      };
    }

    // Short Answer format
    const keywords = [
      ...correctOption
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2),
      ...modKeyword
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 2),
    ];

    return {
      id: `exq-${q.id}-${idx}`,
      format: 'short_answer',
      moduleId: q.moduleId,
      subjectId: q.subjectId,
      topic: q.topic,
      difficulty: q.difficulty,
      prompt: `Short Answer: ${q.prompt}`,
      correctAnswer: correctOption,
      acceptedKeywords: Array.from(new Set(keywords)),
      explanation: q.explanation,
      marks: 3,
    };
  });

  return { title, durationMinutes, questions: examQuestions };
}

export function evaluateExamPaper(params: {
  id: string;
  student: UserProfile;
  examType: ExamType;
  title: string;
  subjectId?: string;
  moduleId?: string;
  durationMinutes: number;
  timeSpentSeconds: number;
  autoSubmitted: boolean;
  questions: ExamQuestion[];
  responses: Record<string, string>;
  synced: boolean;
}): ExamAttempt {
  const {
    id,
    student,
    examType,
    title,
    subjectId,
    moduleId,
    durationMinutes,
    timeSpentSeconds,
    autoSubmitted,
    questions,
    responses,
    synced,
  } = params;

  const answers: ExamAnswerRecord[] = questions.map((q) => {
    const raw = (responses[q.id] || '').trim();
    const norm = raw.toLowerCase();
    const correctNorm = q.correctAnswer.trim().toLowerCase();
    let isCorrect = false;

    if (q.format === 'mcq' || q.format === 'true_false') {
      isCorrect = norm === correctNorm;
    } else if (q.format === 'fill_blank') {
      isCorrect =
        norm === correctNorm ||
        (!!norm && (q.acceptedKeywords || []).some((kw) => norm === kw || norm.includes(kw)));
    } else {
      // Short answer: match core answer or >=1 key concept token
      const kws = q.acceptedKeywords || [];
      isCorrect =
        norm === correctNorm ||
        (norm.length >= 2 && kws.some((kw) => norm.includes(kw)));
    }

    return {
      questionId: q.id,
      studentResponse: raw || 'No response',
      correctAnswer: q.correctAnswer,
      isCorrect,
      marksAwarded: isCorrect ? q.marks : 0,
      maxMarks: q.marks,
      topic: q.topic,
      explanation: q.explanation,
    };
  });

  const marksObtained = answers.reduce((s, a) => s + a.marksAwarded, 0);
  const totalMarks = answers.reduce((s, a) => s + a.maxMarks, 0);
  const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

  return {
    id,
    studentId: student.id,
    studentName: student.name,
    classLevel: student.classLevel,
    examType,
    title,
    subjectId,
    moduleId,
    durationMinutes,
    timeSpentSeconds,
    autoSubmitted,
    marksObtained,
    totalMarks,
    percentage,
    answers,
    completedAt: new Date().toISOString(),
    synced,
  };
}

export function computeGamification(
  student: UserProfile,
  analytics: StudentAnalyticsReport,
  attempts: PracticeAttempt[],
  exams: ExamAttempt[]
): StudentGamification {
  const completedMods = analytics.subjects.reduce((s, sub) => s + sub.completedModules, 0);
  const xpFromPractice = attempts.reduce((s, a) => s + a.correctCount * 15 + 20, 0);
  const xpFromExams = exams.reduce((s, e) => s + e.marksObtained * 10 + 30, 0);
  const xp = xpFromPractice + xpFromExams;

  let milestone: StudentGamification['milestone'] = 'Beginner';
  let nextMilestoneXp = 150;
  if (xp >= 1000) {
    milestone = 'Master';
    nextMilestoneXp = 1500;
  } else if (xp >= 450) {
    milestone = 'Achiever';
    nextMilestoneXp = 1000;
  } else if (xp >= 150) {
    milestone = 'Explorer';
    nextMilestoneXp = 450;
  }

  // Unique active study dates (YYYY-MM-DD)
  const dateSet = new Set<string>();
  attempts.forEach((a) => dateSet.add(a.completedAt.slice(0, 10)));
  exams.forEach((e) => dateSet.add(e.completedAt.slice(0, 10)));
  const activeDates = Array.from(dateSet).sort();

  // Compute current consecutive streak ending today or yesterday
  let streakDays = 0;
  if (activeDates.length > 0) {
    const today = new Date();
    const checkDate = new Date(today.toISOString().slice(0, 10));
    if (!dateSet.has(checkDate.toISOString().slice(0, 10))) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }
    while (dateSet.has(checkDate.toISOString().slice(0, 10))) {
      streakDays += 1;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }
  }

  const completedAnySubject = analytics.subjects.some((s) => s.completedModules === 4);
  const improvedAccuracy =
    attempts.length >= 2 &&
    attempts[0].percentage > attempts[attempts.length - 1].percentage;

  const badges: BadgeItem[] = [
    {
      id: 'first-step',
      title: 'First Step',
      description: 'Complete your first module practice session.',
      earned: attempts.length >= 1,
    },
    {
      id: 'accuracy-ace',
      title: 'Accuracy Ace',
      description: 'Score 80% or higher on any module.',
      earned: analytics.strongModules.length >= 1,
    },
    {
      id: 'streak-starter',
      title: 'Consistent Learner',
      description: 'Maintain a multi-day study streak.',
      earned: streakDays >= 2 || activeDates.length >= 2,
    },
    {
      id: 'growth-mindset',
      title: 'Steady Improver',
      description: 'Improve your accuracy across sessions.',
      earned: improvedAccuracy,
    },
    {
      id: 'subject-finisher',
      title: 'Subject Finisher',
      description: 'Complete all 4 modules in a subject.',
      earned: completedAnySubject,
    },
    {
      id: 'exam-ready',
      title: 'Exam Explorer',
      description: 'Complete a timed chapter, subject, or mock exam.',
      earned: exams.length >= 1,
    },
  ];

  // Daily goals tailored to initial or active state
  const todayStr = new Date().toISOString().slice(0, 10);
  const practicedToday = attempts.some((a) => a.completedAt.slice(0, 10) === todayStr);
  const nextMod = analytics.subjects.flatMap((s) => s.modules).find((m) => m.attemptsCount === 0);
  const weakMod = analytics.weakModules[0];

  const dailyGoals: DailyGoal[] = [
    {
      id: 'goal-1',
      title: weakMod
        ? `Revise weak module: ${weakMod.moduleTitle}`
        : nextMod
        ? `Start ${nextMod.subjectName} — ${nextMod.moduleTitle}`
        : 'Complete 1 adaptive practice round today',
      completed: practicedToday,
      targetModuleId: weakMod?.moduleId || nextMod?.moduleId,
    },
    {
      id: 'goal-2',
      title: 'Score 80%+ on a practice session or complete 1 timed exam',
      completed: attempts.some((a) => a.completedAt.slice(0, 10) === todayStr && a.percentage >= 80) || exams.some((e) => e.completedAt.slice(0, 10) === todayStr),
    },
    {
      id: 'goal-3',
      title: `Reach ${completedMods >= 4 ? '8 modules' : 'your first module'} milestone`,
      completed: completedMods >= 1,
    },
  ];

  // Weekly Summary (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const weekAttempts = attempts.filter((a) => new Date(a.completedAt).getTime() >= sevenDaysAgo);
  const weekAvg =
    weekAttempts.length > 0
      ? Math.round(weekAttempts.reduce((s, a) => s + a.percentage, 0) / weekAttempts.length)
      : null;

  let improvementDelta: number | null = null;
  if (weekAttempts.length >= 2) {
    const sorted = [...weekAttempts].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    improvementDelta = sorted[sorted.length - 1].percentage - sorted[0].percentage;
  }

  return {
    xp,
    milestone,
    nextMilestoneXp,
    streakDays,
    activeDates,
    badges,
    dailyGoals,
    weeklySummary: {
      sessionsThisWeek: weekAttempts.length,
      modulesCompletedThisWeek: new Set(weekAttempts.map((a) => a.moduleId)).size,
      averageAccuracy: weekAvg,
      improvementDelta,
      focusAreas: analytics.weakModules.slice(0, 3).map((m) => `${m.subjectName}: ${m.moduleTitle}`),
    },
  };
}

export function computePrivacySafeLeaderboard(
  currentStudentId: string,
  classStudents: UserProfile[],
  allClassAttempts: PracticeAttempt[],
  allClassExams: ExamAttempt[]
): LeaderboardEntry[] {
  const rows = classStudents.map((st) => {
    const stAtt = allClassAttempts.filter((a) => a.studentId === st.id);
    const stEx = allClassExams.filter((e) => e.studentId === st.id);
    const xp =
      stAtt.reduce((s, a) => s + a.correctCount * 15 + 20, 0) +
      stEx.reduce((s, e) => s + e.marksObtained * 10 + 30, 0);
    const accuracy =
      stAtt.length > 0 ? Math.round(stAtt.reduce((s, a) => s + a.percentage, 0) / stAtt.length) : null;
    const milestone =
      xp >= 1000 ? 'Master' : xp >= 450 ? 'Achiever' : xp >= 150 ? 'Explorer' : 'Beginner';

    const parts = st.name.trim().split(/\s+/);
    const displayLabel =
      st.id === currentStudentId
        ? `${parts[0]} (You)`
        : `${parts[0]} ${parts[1] ? parts[1][0] + '.' : ''}`.trim();

    return {
      studentId: st.id,
      displayLabel,
      isCurrentUser: st.id === currentStudentId,
      xp,
      milestone,
      accuracy,
    };
  });

  rows.sort((a, b) => b.xp - a.xp || (b.accuracy ?? 0) - (a.accuracy ?? 0));
  return rows.map((r, i) => ({
    rank: i + 1,
    displayLabel: r.displayLabel,
    isCurrentUser: r.isCurrentUser,
    xp: r.xp,
    milestone: r.milestone,
    accuracy: r.accuracy,
  }));
}
