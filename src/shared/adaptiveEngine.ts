import { getSubjectsForClass } from './curriculumData';
import {
  Difficulty,
  LearningModule,
  ModulePerformanceSummary,
  PracticeAttempt,
  QuestionAnswerRecord,
  QuestionItem,
  StudentAnalyticsReport,
  StudentSummaryForTeacher,
  SubjectPerformanceSummary,
  TeacherClassAnalytics,
  UserProfile,
} from './types';

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let seed = hashString(seedStr);
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export interface AdaptiveSelectionResult {
  questions: QuestionItem[];
  targetModeLabel: string;
  targetDifficulty: Difficulty | 'adaptive';
}

/**
 * Strictly selects questions ONLY from the chosen moduleId.
 * Adapts difficulty based on the student's prior module accuracy,
 * avoids recently attempted questions wherever possible, and produces
 * unique question combinations per student + session.
 */
export function selectAdaptiveQuestions(params: {
  moduleId: string;
  studentId: string;
  questionBank: QuestionItem[];
  attemptHistory: PracticeAttempt[];
  count?: number;
  sessionNonce?: string;
  forcedDifficulty?: Difficulty | 'adaptive';
}): AdaptiveSelectionResult {
  const {
    moduleId,
    studentId,
    questionBank,
    attemptHistory,
    count = 6,
    sessionNonce = String(Date.now()),
    forcedDifficulty = 'adaptive',
  } = params;

  // Strict module-scoped isolation: NEVER pull from other modules
  const modulePool = questionBank.filter((q) => q.moduleId === moduleId);
  if (modulePool.length === 0) {
    return { questions: [], targetModeLabel: 'Adaptive', targetDifficulty: 'adaptive' };
  }

  const moduleAttempts = attemptHistory
    .filter((a) => a.studentId === studentId && a.moduleId === moduleId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  // Determine recent accuracy on this module
  const recentAccuracy = moduleAttempts.length > 0 ? moduleAttempts[0].percentage : null;
  const recentlyAttemptedIds = new Set<string>();
  moduleAttempts.slice(0, 2).forEach((a) => {
    a.answers.forEach((ans) => recentlyAttemptedIds.add(ans.questionId));
  });

  // Determine difficulty weights
  let weights: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 1 };
  let targetModeLabel = 'Balanced Adaptive';

  if (forcedDifficulty !== 'adaptive') {
    if (forcedDifficulty === 'easy') {
      weights = { easy: 4, medium: 2, hard: 0 };
      targetModeLabel = 'Foundation (Easy)';
    } else if (forcedDifficulty === 'medium') {
      weights = { easy: 1, medium: 4, hard: 1 };
      targetModeLabel = 'Standard (Medium)';
    } else {
      weights = { easy: 0, medium: 2, hard: 4 };
      targetModeLabel = 'Challenge (Hard)';
    }
  } else if (recentAccuracy !== null) {
    if (recentAccuracy >= 80) {
      weights = { easy: 1, medium: 2, hard: 3 };
      targetModeLabel = 'Challenge Mode (High Accuracy)';
    } else if (recentAccuracy >= 50) {
      weights = { easy: 2, medium: 3, hard: 1 };
      targetModeLabel = 'Reinforcement Mode';
    } else {
      weights = { easy: 4, medium: 2, hard: 0 };
      targetModeLabel = 'Foundation Recovery (Easier Questions)';
    }
  }

  const seedBase = `${studentId}:${moduleId}:${sessionNonce}:${moduleAttempts.length}`;

  // Partition into unseen vs recently seen
  const unseen = modulePool.filter((q) => !recentlyAttemptedIds.has(q.id));
  const seen = modulePool.filter((q) => recentlyAttemptedIds.has(q.id));

  const pickByDifficulty = (pool: QuestionItem[], diff: Difficulty, needed: number, chosenIds: Set<string>): QuestionItem[] => {
    const filtered = seededShuffle(
      pool.filter((q) => q.difficulty === diff && !chosenIds.has(q.id)),
      `${seedBase}:${diff}`
    );
    const picked = filtered.slice(0, needed);
    picked.forEach((p) => chosenIds.add(p.id));
    return picked;
  };

  const chosenIds = new Set<string>();
  const selected: QuestionItem[] = [];

  const targetCount = Math.min(count, modulePool.length);

  // Pass 1: pick from unseen pool matching desired difficulty counts
  (['easy', 'medium', 'hard'] as Difficulty[]).forEach((diff) => {
    const need = weights[diff];
    if (need > 0 && selected.length < targetCount) {
      const got = pickByDifficulty(unseen, diff, Math.min(need, targetCount - selected.length), chosenIds);
      selected.push(...got);
    }
  });

  // Pass 2: fill remaining slots from any unseen question in this module
  if (selected.length < targetCount) {
    const remainingUnseen = seededShuffle(
      unseen.filter((q) => !chosenIds.has(q.id)),
      `${seedBase}:unseen-fill`
    );
    for (const item of remainingUnseen) {
      if (selected.length >= targetCount) break;
      chosenIds.add(item.id);
      selected.push(item);
    }
  }

  // Pass 3: only if unseen pool is exhausted, fill from older seen questions in same module
  if (selected.length < targetCount) {
    const remainingSeen = seededShuffle(
      seen.filter((q) => !chosenIds.has(q.id)),
      `${seedBase}:seen-fill`
    );
    for (const item of remainingSeen) {
      if (selected.length >= targetCount) break;
      chosenIds.add(item.id);
      selected.push(item);
    }
  }

  // Final deterministic shuffle per student+session
  return {
    questions: seededShuffle(selected, `${seedBase}:final`),
    targetModeLabel,
    targetDifficulty: forcedDifficulty,
  };
}

export function evaluatePracticeAttempt(params: {
  id: string;
  student: UserProfile;
  module: LearningModule;
  questions: QuestionItem[];
  selectedIndices: number[];
  difficultyTarget: Difficulty | 'adaptive';
  synced: boolean;
}): PracticeAttempt {
  const { id, student, module, questions, selectedIndices, difficultyTarget, synced } = params;

  const answers: QuestionAnswerRecord[] = questions.map((q, idx) => {
    const selectedIndex = selectedIndices[idx] ?? -1;
    const isCorrect = selectedIndex === q.correctIndex;
    return {
      questionId: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
    };
  });

  const totalQuestions = answers.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const incorrectCount = totalQuestions - correctCount;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Topics where student made mistakes
  const missedTopicCounts = new Map<string, number>();
  answers.forEach((a) => {
    if (!a.isCorrect) {
      missedTopicCounts.set(a.topic, (missedTopicCounts.get(a.topic) ?? 0) + 1);
    }
  });
  const weakTopics = Array.from(missedTopicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  let recommendedAction: PracticeAttempt['recommendedAction'] = 'practice_more';
  let recommendationText = '';

  if (percentage >= 85) {
    recommendedAction = 'advance';
    recommendationText = `Strong mastery (${percentage}%)! You are ready to progress to more challenging Hard-level questions or move on to the next module.`;
  } else if (percentage >= 50) {
    recommendedAction = 'practice_more';
    recommendationText = `Good progress (${percentage}%). Complete one more adaptive practice round focusing on ${weakTopics[0] ?? 'missed items'} to lock in 85%+ mastery.`;
  } else {
    recommendedAction = 'revisit_explanation';
    recommendationText = `Let's strengthen your foundation (${percentage}%). Revisit the module explanations and worked examples, then retry an Easy-level practice session.`;
  }

  return {
    id,
    studentId: student.id,
    studentName: student.name,
    classLevel: student.classLevel,
    subjectId: module.subjectId,
    subjectName: module.subjectName,
    moduleId: module.id,
    moduleTitle: module.title,
    difficultyTarget,
    answers,
    totalQuestions,
    correctCount,
    incorrectCount,
    percentage,
    weakTopics,
    recommendedAction,
    recommendationText,
    completedAt: new Date().toISOString(),
    synced,
  };
}

export function computeStudentAnalytics(
  studentId: string,
  classLevel: number,
  attempts: PracticeAttempt[],
  allModules: LearningModule[]
): StudentAnalyticsReport {
  const studentAttempts = attempts
    .filter((a) => a.studentId === studentId && a.classLevel === classLevel)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const subjectsInfo = getSubjectsForClass(classLevel);
  const classModules = allModules.filter((m) => m.classLevel === classLevel);

  const subjectSummaries: SubjectPerformanceSummary[] = subjectsInfo.map((subj) => {
    const subjModules = classModules
      .filter((m) => m.subjectId === subj.id)
      .sort((a, b) => a.moduleNumber - b.moduleNumber);

    const moduleSummaries: ModulePerformanceSummary[] = subjModules.map((mod) => {
      const modAttempts = studentAttempts.filter((a) => a.moduleId === mod.id);
      if (modAttempts.length === 0) {
        return {
          moduleId: mod.id,
          moduleNumber: mod.moduleNumber,
          moduleTitle: mod.title,
          subjectId: subj.id,
          subjectName: subj.name,
          attemptsCount: 0,
          latestAccuracy: null,
          averageAccuracy: null,
          status: 'Not Started',
          recommendation: 'Read the module learning material and complete your first practice session.',
          recommendedAction: 'start',
        };
      }

      const latestAccuracy = modAttempts[0].percentage;
      const averageAccuracy = Math.round(
        modAttempts.reduce((sum, a) => sum + a.percentage, 0) / modAttempts.length
      );

      let status: ModulePerformanceSummary['status'] = 'Developing';
      let recommendation = 'Complete an additional practice set to push accuracy above 80%.';
      let recommendedAction: ModulePerformanceSummary['recommendedAction'] = 'practice_more';

      if (latestAccuracy >= 80) {
        status = 'Strong';
        recommendation = 'Progressing well — attempt Hard challenge questions or advance to the next module.';
        recommendedAction = 'advance';
      } else if (latestAccuracy < 50) {
        status = 'Needs Revision';
        recommendation = 'Revisit the module explanations and examples, then practice Easy-level questions.';
        recommendedAction = 'revisit_explanation';
      }

      return {
        moduleId: mod.id,
        moduleNumber: mod.moduleNumber,
        moduleTitle: mod.title,
        subjectId: subj.id,
        subjectName: subj.name,
        attemptsCount: modAttempts.length,
        latestAccuracy,
        averageAccuracy,
        status,
        recommendation,
        recommendedAction,
      };
    });

    const attemptedMods = moduleSummaries.filter((m) => m.averageAccuracy !== null);
    const subjectAvg =
      attemptedMods.length > 0
        ? Math.round(attemptedMods.reduce((s, m) => s + (m.averageAccuracy ?? 0), 0) / attemptedMods.length)
        : null;

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      completedModules: attemptedMods.length,
      totalModules: 4,
      averageAccuracy: subjectAvg,
      modules: moduleSummaries,
    };
  });

  const allModSummaries = subjectSummaries.flatMap((s) => s.modules);
  const completedCount = allModSummaries.filter((m) => m.attemptsCount > 0).length;
  const overallProgressPercent = allModSummaries.length > 0 ? Math.round((completedCount / allModSummaries.length) * 100) : 0;

  const overallAccuracy =
    studentAttempts.length > 0
      ? Math.round(studentAttempts.reduce((s, a) => s + a.percentage, 0) / studentAttempts.length)
      : null;

  const weakModules = allModSummaries
    .filter((m) => m.latestAccuracy !== null && m.latestAccuracy < 65)
    .sort((a, b) => (a.latestAccuracy ?? 0) - (b.latestAccuracy ?? 0));

  const strongModules = allModSummaries
    .filter((m) => m.latestAccuracy !== null && m.latestAccuracy >= 80)
    .sort((a, b) => (b.latestAccuracy ?? 0) - (a.latestAccuracy ?? 0));

  const recommendedToRevise = allModSummaries
    .filter((m) => m.status === 'Needs Revision' || m.status === 'Developing')
    .sort((a, b) => (a.latestAccuracy ?? 100) - (b.latestAccuracy ?? 100))
    .slice(0, 6);

  const continueMod =
    recommendedToRevise[0] ||
    allModSummaries.find((m) => m.status === 'Not Started') ||
    allModSummaries[0];

  return {
    studentId,
    classLevel,
    overallProgressPercent,
    overallAccuracy,
    totalPracticeSessions: studentAttempts.length,
    subjects: subjectSummaries,
    weakModules,
    strongModules,
    recommendedToRevise,
    continueModuleId: continueMod ? continueMod.moduleId : null,
  };
}

export function computeTeacherClassAnalytics(
  classLevel: number,
  students: UserProfile[],
  attempts: PracticeAttempt[],
  allModules: LearningModule[]
): TeacherClassAnalytics {
  const classStudents = students.filter((s) => s.role === 'student' && s.classLevel === classLevel);
  const classAttempts = attempts.filter((a) => a.classLevel === classLevel);
  const classModules = allModules.filter((m) => m.classLevel === classLevel);
  const subjectsInfo = getSubjectsForClass(classLevel);

  const studentSummaries: StudentSummaryForTeacher[] = classStudents.map((st) => {
    const stAttempts = classAttempts
      .filter((a) => a.studentId === st.id)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    const uniqueMods = new Set(stAttempts.map((a) => a.moduleId));
    const overallAccuracy =
      stAttempts.length > 0
        ? Math.round(stAttempts.reduce((s, a) => s + a.percentage, 0) / stAttempts.length)
        : null;

    let trend: StudentSummaryForTeacher['trend'] = 'new';
    if (stAttempts.length >= 2) {
      const half = Math.floor(stAttempts.length / 2);
      const earlyAvg = stAttempts.slice(0, half).reduce((s, a) => s + a.percentage, 0) / half;
      const recentAvg = stAttempts.slice(half).reduce((s, a) => s + a.percentage, 0) / (stAttempts.length - half);
      if (recentAvg - earlyAvg >= 8) trend = 'improving';
      else if ((overallAccuracy ?? 100) < 55 || earlyAvg - recentAvg >= 10) trend = 'needs_attention';
      else trend = 'steady';
    } else if (stAttempts.length === 1) {
      trend = (overallAccuracy ?? 100) < 55 ? 'needs_attention' : 'steady';
    }

    let weakestModule: string | null = null;
    if (stAttempts.length > 0) {
      const byMod = new Map<string, { title: string; sum: number; count: number }>();
      stAttempts.forEach((a) => {
        const prev = byMod.get(a.moduleId) || { title: a.moduleTitle, sum: 0, count: 0 };
        byMod.set(a.moduleId, { title: a.moduleTitle, sum: prev.sum + a.percentage, count: prev.count + 1 });
      });
      let lowest = 101;
      byMod.forEach((v) => {
        const avg = v.sum / v.count;
        if (avg < lowest) {
          lowest = avg;
          weakestModule = `${v.title} (${Math.round(avg)}%)`;
        }
      });
    }

    return {
      studentId: st.id,
      name: st.name,
      username: st.username,
      studentCode: st.studentCode,
      section: st.section,
      classLevel: st.classLevel,
      totalAttempts: stAttempts.length,
      completedModules: uniqueMods.size,
      overallAccuracy,
      trend,
      weakestModule,
    };
  });

  const activeStudents = studentSummaries.filter((s) => s.totalAttempts > 0).length;
  const classAverageAccuracy =
    classAttempts.length > 0
      ? Math.round(classAttempts.reduce((s, a) => s + a.percentage, 0) / classAttempts.length)
      : null;

  const studentsFallingBehind = studentSummaries.filter(
    (s) => s.trend === 'needs_attention' || (s.overallAccuracy !== null && s.overallAccuracy < 60)
  );
  const studentsImproving = studentSummaries.filter((s) => s.trend === 'improving');

  const lowPerformingModules = classModules
    .map((m) => {
      const modAttempts = classAttempts.filter((a) => a.moduleId === m.id);
      if (modAttempts.length === 0) return null;
      const avg = Math.round(modAttempts.reduce((s, a) => s + a.percentage, 0) / modAttempts.length);
      return {
        moduleId: m.id,
        moduleTitle: m.title,
        subjectName: m.subjectName,
        averageAccuracy: avg,
        attemptsCount: modAttempts.length,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.averageAccuracy < 72)
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
    .slice(0, 6);

  const subjectsNeedingAttention = subjectsInfo
    .map((subj) => {
      const sAttempts = classAttempts.filter((a) => a.subjectId === subj.id);
      const avg =
        sAttempts.length > 0
          ? Math.round(sAttempts.reduce((s, a) => s + a.percentage, 0) / sAttempts.length)
          : null;
      return {
        subjectId: subj.id,
        subjectName: subj.name,
        averageAccuracy: avg,
        attemptsCount: sAttempts.length,
      };
    })
    .sort((a, b) => (a.averageAccuracy ?? 999) - (b.averageAccuracy ?? 999));

  const topicMissCounts = new Map<string, number>();
  classAttempts.forEach((a) => {
    a.answers.forEach((ans) => {
      if (!ans.isCorrect && ans.topic) {
        topicMissCounts.set(ans.topic, (topicMissCounts.get(ans.topic) ?? 0) + 1);
      }
    });
  });
  const frequentlyMisunderstoodTopics = Array.from(topicMissCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topic, missCount]) => ({ topic, missCount }));

  return {
    classLevel,
    totalStudents: classStudents.length,
    activeStudents,
    classAverageAccuracy,
    studentsFallingBehind,
    studentsImproving,
    allStudents: studentSummaries,
    lowPerformingModules,
    subjectsNeedingAttention,
    frequentlyMisunderstoodTopics,
  };
}
