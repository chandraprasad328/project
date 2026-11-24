import { LearningModule, QuestionItem, SupportedLanguage } from '../shared/types';

export interface OfflineDoubtParams {
  query: string;
  classLevel: number;
  activeModule: LearningModule | null;
  language: SupportedLanguage;
  isPracticeMode: boolean;
  isExamMode?: boolean;
  currentPracticeQuestion: QuestionItem | null;
}

const LANG_PREFIX: Record<SupportedLanguage, { offlineNote: string; hintLead: string; stepsLead: string }> = {
  en: {
    offlineNote: 'Offline Module Guide',
    hintLead: 'Guided Hint (No Direct Answer)',
    stepsLead: 'Step-by-step explanation',
  },
  kn: {
    offlineNote: 'ಆಫ್‌ಲೈನ್ ಪಾಠ ಮಾರ್ಗದರ್ಶಿ (Kannada)',
    hintLead: 'ಸುಳಿವು (ಉತ್ತರವನ್ನು ನೇರವಾಗಿ ನೀಡುವುದಿಲ್ಲ)',
    stepsLead: 'ಹಂತ-ಹಂತದ ವಿವರಣೆ',
  },
  hi: {
    offlineNote: 'ऑफ़लाइन मॉड्यूल मार्गदर्शिका (Hindi)',
    hintLead: 'संकेत (सीधा उत्तर नहीं)',
    stepsLead: 'चरण-दर-चरण व्याख्या',
  },
};

export function generateOfflineDoubtReply(params: OfflineDoubtParams): string {
  const { query, classLevel, activeModule, language, isPracticeMode, isExamMode, currentPracticeQuestion } = params;
  const labels = LANG_PREFIX[language];
  const qLower = query.toLowerCase();

  // Strict exam anti-cheat guard
  if (isExamMode) {
    return `[${labels.offlineNote} · Assessment Guard]\n\nDirect answers and hints are paused during a timed examination so your assessment stays fair. Once you submit the exam, every question's step-by-step explanation will be unlocked!`;
  }

  // Practice mode: give progressive hints without revealing answers
  if (isPracticeMode && currentPracticeQuestion) {
    const steps = [
      `1. Focus Topic: ${currentPracticeQuestion.topic} (${currentPracticeQuestion.difficulty.toUpperCase()} level)`,
      `2. Progressive Hint: ${currentPracticeQuestion.hint}`,
      activeModule?.learningMaterial[0]
        ? `3. Core Module Rule: ${activeModule.learningMaterial[0].keyRule}`
        : `3. Read each option carefully and eliminate choices that violate the core rule.`,
    ];
    return `[${labels.offlineNote} · ${labels.hintLead}]\n\nHere is a progressive hint without revealing the answer:\n\n${steps.join('\n')}\n\nTry applying Step 2 and see which option fits!`;
  }

  if (!activeModule) {
    return `[${labels.offlineNote}]\n\nYou are viewing Class ${classLevel}. Open any subject and module to read cached explanations, examples, and FAQs offline.`;
  }

  if (qLower.includes('example') || qLower.includes('everyday')) {
    const examples = activeModule.learningMaterial.map((s, i) => `${i + 1}. ${s.heading}: ${s.example}`);
    return `[${labels.offlineNote} · Everyday Examples for ${activeModule.title}]\n\n${examples.join('\n\n')}`;
  }

  if (qLower.includes('simply') || qLower.includes('simple') || qLower.includes('easy')) {
    const sec = activeModule.learningMaterial[0];
    return `[${labels.offlineNote} · Simple Explanation]\n\nThink of ${activeModule.title} like this:\n• Main Idea: ${sec?.keyRule || activeModule.summary}\n• Everyday Picture: ${sec?.example || activeModule.moduleExplanation}`;
  }

  // Match against cached FAQs
  let bestFaqScore = 0;
  let bestFaq = activeModule.faqs[0];
  for (const faq of activeModule.faqs) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (qLower.includes(kw.toLowerCase())) score += 2;
    }
    const words = faq.question.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && qLower.includes(w)) score += 1;
    }
    if (score > bestFaqScore) {
      bestFaqScore = score;
      bestFaq = faq;
    }
  }

  if (bestFaq && bestFaqScore >= 2) {
    const stepLines = bestFaq.stepByStep.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    return `[${labels.offlineNote} · ${activeModule.title}]\n\n${bestFaq.answer}\n\n${labels.stepsLead}:\n${stepLines}`;
  }

  // Match against learning material sections
  let bestSection = activeModule.learningMaterial[0];
  let bestSecScore = 0;
  for (const sec of activeModule.learningMaterial) {
    const combined = `${sec.heading} ${sec.explanation} ${sec.keyRule} ${sec.example}`.toLowerCase();
    const tokens = qLower.split(/\s+/).filter((t) => t.length > 3);
    let score = 0;
    for (const t of tokens) {
      if (combined.includes(t)) score += 1;
    }
    if (score > bestSecScore) {
      bestSecScore = score;
      bestSection = sec;
    }
  }

  if (bestSection) {
    return `[${labels.offlineNote} · ${activeModule.subjectName} — ${activeModule.title}]\n\n${bestSection.explanation}\n\nKey Rule: ${bestSection.keyRule}\n\nExample: ${bestSection.example}`;
  }

  return `[${labels.offlineNote} · ${activeModule.title}]\n\n${activeModule.moduleExplanation}`;
}
