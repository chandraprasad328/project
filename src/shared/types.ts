export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type SupportedLanguage = 'en' | 'kn' | 'hi';

export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  classLevel: number; // 1-10 for students; 0 for teacher/parent/admin
  section?: string; // e.g. 'A', 'B'
  studentCode?: string; // Student ID e.g. LL-STU-101
  teacherCode?: string; // Teacher ID e.g. LL-TEA-01
  email?: string;
  assignedClasses: number[]; // for teachers (e.g. [1..10])
  linkedStudentIds?: string[]; // for parents
  preferredLanguage: SupportedLanguage;
  status: AccountStatus;
  isDemo?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface StudySection {
  heading: string;
  explanation: string;
  keyRule: string;
  example: string;
}

export interface ModuleFAQ {
  question: string;
  keywords: string[];
  answer: string;
  stepByStep: string[];
}

export interface LearningModule {
  id: string; // e.g. c6-math-m1
  classLevel: number; // 1..10
  subjectId: string;
  subjectName: string;
  moduleNumber: 1 | 2 | 3 | 4;
  title: string;
  summary: string;
  estimatedMinutes: number;
  learningMaterial: StudySection[];
  moduleExplanation: string;
  faqs: ModuleFAQ[];
  verifiedByAdmin?: boolean;
  updatedAt?: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
  shortName: string;
  accentColor: string;
  description: string;
}

export interface QuestionItem {
  id: string;
  classLevel: number;
  subjectId: string;
  moduleId: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number; // 0..3
  hint: string;
  explanation: string;
  createdByTeacher?: boolean;
}

export interface QuestionAnswerRecord {
  questionId: string;
  topic: string;
  difficulty: Difficulty;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}

export interface PracticeAttempt {
  id: string;
  studentId: string;
  studentName: string;
  classLevel: number;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleTitle: string;
  difficultyTarget: Difficulty | 'adaptive';
  answers: QuestionAnswerRecord[];
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  weakTopics: string[];
  recommendedAction: 'advance' | 'practice_more' | 'revisit_explanation';
  recommendationText: string;
  completedAt: string;
  synced: boolean;
}

// 8.4 Multi-format Examination Types
export type ExamQuestionFormat = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer';
export type ExamType = 'chapter' | 'subject' | 'mock_class';

export interface ExamQuestion {
  id: string;
  format: ExamQuestionFormat;
  moduleId: string;
  subjectId: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptedKeywords?: string[];
  explanation: string;
  marks: number;
}

export interface ExamAnswerRecord {
  questionId: string;
  studentResponse: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  topic: string;
  explanation: string;
}

export interface ExamAttempt {
  id: string;
  studentId: string;
  studentName: string;
  classLevel: number;
  examType: ExamType;
  title: string;
  subjectId?: string;
  moduleId?: string;
  durationMinutes: number;
  timeSpentSeconds: number;
  autoSubmitted: boolean;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  answers: ExamAnswerRecord[];
  completedAt: string;
  synced: boolean;
}

// 8.7 Teacher Productivity: Assignments & Custom Quizzes
export interface AssignmentItem {
  id: string;
  teacherId: string;
  teacherName: string;
  classLevel: number;
  section: string;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  instructions: string;
  dueDate: string;
  targetStudentId: string; // 'ALL_CLASS' or studentId
  createdAt: string;
}

export interface CustomQuizItem {
  id: string;
  teacherId: string;
  teacherName: string;
  classLevel: number;
  subjectId: string;
  moduleId: string;
  title: string;
  targetStudentId: string; // 'ALL_CLASS' or studentId
  questionIds: string[];
  createdAt: string;
}

export interface TeacherRecommendation {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string; // or 'ALL_CLASS'
  classLevel: number;
  subjectId: string;
  moduleId: string;
  moduleTitle: string;
  note: string;
  createdAt: string;
}

// 8.1 & 8.10 Gamification, Daily Goals & Weekly Summary
export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export interface DailyGoal {
  id: string;
  title: string;
  completed: boolean;
  targetModuleId?: string;
}

export interface WeeklySummary {
  sessionsThisWeek: number;
  modulesCompletedThisWeek: number;
  averageAccuracy: number | null;
  improvementDelta: number | null;
  focusAreas: string[];
}

export interface StudentGamification {
  xp: number;
  milestone: 'Beginner' | 'Explorer' | 'Achiever' | 'Master';
  nextMilestoneXp: number;
  streakDays: number;
  activeDates: string[];
  badges: BadgeItem[];
  dailyGoals: DailyGoal[];
  weeklySummary: WeeklySummary;
}

export interface LeaderboardEntry {
  rank: number;
  displayLabel: string; // Privacy-safe initials / first name
  isCurrentUser: boolean;
  xp: number;
  milestone: string;
  accuracy: number | null;
}

export interface ModulePerformanceSummary {
  moduleId: string;
  moduleNumber: 1 | 2 | 3 | 4;
  moduleTitle: string;
  subjectId: string;
  subjectName: string;
  attemptsCount: number;
  latestAccuracy: number | null;
  averageAccuracy: number | null;
  status: 'Not Started' | 'Needs Revision' | 'Developing' | 'Strong';
  recommendation: string;
  recommendedAction: 'start' | 'revisit_explanation' | 'practice_more' | 'advance';
}

export interface SubjectPerformanceSummary {
  subjectId: string;
  subjectName: string;
  completedModules: number;
  totalModules: 4;
  averageAccuracy: number | null;
  modules: ModulePerformanceSummary[];
}

export interface StudentAnalyticsReport {
  studentId: string;
  classLevel: number;
  overallProgressPercent: number;
  overallAccuracy: number | null;
  totalPracticeSessions: number;
  subjects: SubjectPerformanceSummary[];
  weakModules: ModulePerformanceSummary[];
  strongModules: ModulePerformanceSummary[];
  recommendedToRevise: ModulePerformanceSummary[];
  continueModuleId: string | null;
}

export interface StudentSummaryForTeacher {
  studentId: string;
  name: string;
  username: string;
  studentCode?: string;
  section?: string;
  classLevel: number;
  totalAttempts: number;
  completedModules: number;
  overallAccuracy: number | null;
  trend: 'improving' | 'steady' | 'needs_attention' | 'new';
  weakestModule: string | null;
}

export interface TeacherClassAnalytics {
  classLevel: number;
  totalStudents: number;
  activeStudents: number;
  classAverageAccuracy: number | null;
  studentsFallingBehind: StudentSummaryForTeacher[];
  studentsImproving: StudentSummaryForTeacher[];
  allStudents: StudentSummaryForTeacher[];
  lowPerformingModules: Array<{
    moduleId: string;
    moduleTitle: string;
    subjectName: string;
    averageAccuracy: number;
    attemptsCount: number;
  }>;
  subjectsNeedingAttention: Array<{
    subjectId: string;
    subjectName: string;
    averageAccuracy: number | null;
    attemptsCount: number;
  }>;
  frequentlyMisunderstoodTopics: Array<{
    topic: string;
    missCount: number;
  }>;
}

export interface ParentNotification {
  id: string;
  studentId: string;
  studentName: string;
  type: 'milestone' | 'support_needed';
  message: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'anonymous';
  action: string;
  details: string;
  timestamp: string;
}

export interface DoubtChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode: 'online-ai' | 'offline-cache';
  language: SupportedLanguage;
  contextLabel?: string;
  timestamp: string;
}

export interface AccessibilityPrefs {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  dyslexiaFont: boolean;
  lightweightMode: boolean;
}
