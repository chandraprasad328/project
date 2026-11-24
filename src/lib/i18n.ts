import { SupportedLanguage } from '../shared/types';

export interface UILabels {
  dashboard: string;
  subjectsModules: string;
  examsPrep: string;
  assignments: string;
  practiceHistory: string;
  offlinePacks: string;
  signOut: string;
  continueLearning: string;
  dailyGoals: string;
  weeklySummary: string;
  yourSubjects: string;
  startFirstModule: string;
  browseSubjects: string;
  readAloud: string;
  stopReading: string;
  startPractice: string;
  studyNotes: string;
  keyGlossary: string;
  weakAreas: string;
  recentPractice: string;
  classLeaderboard: string;
  badgesMilestones: string;
  accessibilitySettings: string;
}

const LABELS: Record<SupportedLanguage, UILabels> = {
  en: {
    dashboard: 'Dashboard',
    subjectsModules: 'Subjects & Modules',
    examsPrep: 'Exams & Mock Tests',
    assignments: 'Homework',
    practiceHistory: 'History',
    offlinePacks: 'Offline Packs',
    signOut: 'Sign Out',
    continueLearning: 'Continue Learning',
    dailyGoals: 'Daily Learning Goals',
    weeklySummary: 'Weekly Learning Summary',
    yourSubjects: 'Your 6 Subjects',
    startFirstModule: 'Start First Module',
    browseSubjects: 'Browse All 6 Subjects',
    readAloud: 'Listen to Lesson',
    stopReading: 'Stop Audio',
    startPractice: 'Start Module Practice',
    studyNotes: 'Study Notes',
    keyGlossary: 'Key Terms Explained Simply',
    weakAreas: 'Weak Areas & Personalized Recommendations',
    recentPractice: 'Recent Practice Sessions',
    classLeaderboard: 'Class Progress Board',
    badgesMilestones: 'Badges & Milestones',
    accessibilitySettings: 'Language & Accessibility',
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    subjectsModules: 'ವಿಷಯಗಳು ಮತ್ತು ಘಟಕಗಳು',
    examsPrep: 'ಪರೀಕ್ಷೆ ಮತ್ತು ಅಭ್ಯಾಸ',
    assignments: 'ಮನೆಕೆಲಸ',
    practiceHistory: 'ಅಭ್ಯಾಸ ಇತಿಹಾಸ',
    offlinePacks: 'ಆಫ್‌ಲೈನ್ ಪ್ಯಾಕ್‌ಗಳು',
    signOut: 'ಲಾಗ್ ಔಟ್',
    continueLearning: 'ಕಲಿಕೆಯನ್ನು ಮುಂದುವರಿಸಿ',
    dailyGoals: 'ದೈನಂದಿನ ಕಲಿಕೆಯ ಗುರಿಗಳು',
    weeklySummary: 'ವಾರದ ಕಲಿಕಾ ಸಾರಾಂಶ',
    yourSubjects: 'ನಿಮ್ಮ 6 ವಿಷಯಗಳು',
    startFirstModule: 'ಮೊದಲ ಘಟಕ ಪ್ರಾರಂಭಿಸಿ',
    browseSubjects: 'ಎಲ್ಲಾ 6 ವಿಷಯಗಳನ್ನು ನೋಡಿ',
    readAloud: 'ಪಾಠವನ್ನು ಕೇಳಿ',
    stopReading: 'ಆಡಿಯೋ ನಿಲ್ಲಿಸಿ',
    startPractice: 'ಘಟಕ ಅಭ್ಯಾಸ ಪ್ರಾರಂಭಿಸಿ',
    studyNotes: 'ಅಧ್ಯಯನ ಟಿಪ್ಪಣಿಗಳು',
    keyGlossary: 'ಪ್ರಮುಖ ಪದಗಳ ಸರಳ ವಿವರಣೆ',
    weakAreas: 'ಸುಧಾರಣೆ ಬೇಕಾದ ವಿಷಯಗಳು',
    recentPractice: 'ಇತ್ತೀಚಿನ ಅಭ್ಯಾಸಗಳು',
    classLeaderboard: 'ತರಗತಿ ಪ್ರಗತಿ ಪಟ್ಟಿ',
    badgesMilestones: 'ಬ್ಯಾಡ್ಜ್‌ಗಳು ಮತ್ತು ಮೈಲಿಗಲ್ಲುಗಳು',
    accessibilitySettings: 'ಭಾಷೆ ಮತ್ತು ಸುಲಭ ಓದು',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    subjectsModules: 'विषय और मॉड्यूल',
    examsPrep: 'परीक्षा और मॉक टेस्ट',
    assignments: 'गृहकार्य',
    practiceHistory: 'अभ्यास इतिहास',
    offlinePacks: 'ऑफ़लाइन पैक',
    signOut: 'लॉग आउट',
    continueLearning: 'सीखना जारी रखें',
    dailyGoals: 'दैनिक सीखने के लक्ष्य',
    weeklySummary: 'साप्ताहिक सीखने का सारांश',
    yourSubjects: 'आपके 6 विषय',
    startFirstModule: 'पहला मॉड्यूल शुरू करें',
    browseSubjects: 'सभी 6 विषय देखें',
    readAloud: 'पाठ सुनें',
    stopReading: 'ऑडियो रोकें',
    startPractice: 'मॉड्यूल अभ्यास शुरू करें',
    studyNotes: 'अध्ययन नोट्स',
    keyGlossary: 'मुख्य शब्दों की सरल व्याख्या',
    weakAreas: 'सुधार के क्षेत्र और सुझाव',
    recentPractice: 'हाल के अभ्यास सत्र',
    classLeaderboard: 'कक्षा प्रगति तालिका',
    badgesMilestones: 'बैज और उपलब्धियाँ',
    accessibilitySettings: 'भाषा और पठनीयता',
  },
};

export function getUILabels(lang: SupportedLanguage): UILabels {
  return LABELS[lang] || LABELS.en;
}

export interface GlossaryTerm {
  term: string;
  en: string;
  kn: string;
  hi: string;
}

export const ACADEMIC_GLOSSARY: Record<string, GlossaryTerm[]> = {
  math: [
    {
      term: 'Variable / Ratio / Equation',
      en: 'A letter (like x) or comparison between numbers showing how two quantities balance or relate.',
      kn: 'ಚರಾಂಶ ಅಥವಾ ಅನುಪಾತ: ಎರಡು ಸಂಖ್ಯೆಗಳ ನಡುವಿನ ಸಂಬಂಧ ಅಥವಾ ಸಮತೋಲನವನ್ನು ತೋರಿಸುವ ಗಣಿತದ ನಿಯಮ.',
      hi: 'चर या अनुपात: संख्याओं के बीच संतुलन या संबंध दिखाने वाला गणितीय नियम।',
    },
    {
      term: 'Perimeter & Area',
      en: 'Perimeter is the boundary distance around a shape; Area is the space covered inside it.',
      kn: 'ಸುತ್ತಳತೆ ಎಂದರೆ ಆಕೃತಿಯ ಹೊರ ಅಂಚಿನ ಉದ್ದ; ವಿಸ್ತೀರ್ಣ ಎಂದರೆ ಒಳಗಿನ ಜಾಗ.',
      hi: 'परिमाप किसी आकृति की बाहरी सीमा की लंबाई है; क्षेत्रफल उसके अंदर की जगह है।',
    },
  ],
  science: [
    {
      term: 'Hypothesis & Experiment',
      en: 'A testable scientific guess checked carefully using controlled observations and measurements.',
      kn: 'ಪರಿಕಲ್ಪನೆ ಮತ್ತು ಪ್ರಯೋಗ: ಅಳತೆ ಮತ್ತು ವೀಕ್ಷಣೆಯ ಮೂಲಕ ಪರೀಕ್ಷಿಸುವ ವೈಜ್ಞಾನಿಕ ಊಹೆ.',
      hi: 'परिकल्पना और प्रयोग: माप और अवलोकन द्वारा जाँचा जाने वाला वैज्ञानिक अनुमान।',
    },
    {
      term: 'Condensation & Photosynthesis',
      en: 'Condensation turns vapour into droplets; Photosynthesis is how green plants make food using sunlight.',
      kn: 'ಸಾಂದ್ರೀಕರಣವು ಆವಿಯನ್ನು ಹನಿಯಾಗಿಸುತ್ತದೆ; ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆಯಿಂದ ಸಸ್ಯಗಳು ಸೂರ್ಯನ ಬೆಳಕಿನಲ್ಲಿ ಆಹಾರ ತಯಾರಿಸುತ್ತವೆ.',
      hi: 'संघनन भाप को बूँदों में बदलता है; प्रकाश संश्लेषण से पौधे धूप में भोजन बनाते हैं।',
    },
  ],
  english: [
    {
      term: 'Noun, Verb & Clause',
      en: 'Nouns name things, verbs express actions, and clauses combine a subject and verb to build sentences.',
      kn: 'ನಾಮಪದವು ಹೆಸರು, ಕ್ರಿಯಾಪದವು ಕೆಲಸ, ಮತ್ತು ಉಪವಾಕ್ಯವು ವಾಕ್ಯದ ಅರ್ಥಪೂರ್ಣ ಭಾಗ.',
      hi: 'संज्ञा नाम बताती है, क्रिया काम दिखाती है, और उपवाक्य वाक्य का सार्थक हिस्सा होता है।',
    },
  ],
  social: [
    {
      term: 'Constitution & Panchayati Raj',
      en: 'The supreme rulebook protecting citizens’ rights, paired with local village self-government.',
      kn: 'ಸಂವಿಧಾನವು ನಾಗರಿಕರ ಹಕ್ಕುಗಳನ್ನು ರಕ್ಷಿಸುವ ಮೂಲ ನಿಯಮ; ಗ್ರಾಮ ಪಂಚಾಯತಿ ಸ್ಥಳೀಯ ಆಡಳಿತ.',
      hi: 'संविधान नागरिकों के अधिकारों की रक्षा करने वाला सर्वोच्च नियम है; ग्राम पंचायत स्थानीय शासन है।',
    },
  ],
  hindi: [
    {
      term: 'संज्ञा, वचन एवं पूर्ण विराम',
      en: 'Sangya names people/places, Vachan shows singular/plural, and Purna Viram (।) ends a Hindi sentence.',
      kn: 'ಸಂಜ್ಞೆ ಎಂದರೆ ನಾಮಪದ, ವಚನ ಎಂದರೆ ಏಕವಚನ/ಬಹುವಚನ, ಮತ್ತು ಪೂರ್ಣ ವಿರಾಮ (।) ವಾಕ್ಯದ ಅಂತ್ಯ.',
      hi: 'संज्ञा नाम बताती है, वचन संख्या (एक/अनेक) दिखाता है, और पूर्ण विराम (।) वाक्य पूरा करता है।',
    },
  ],
  computer: [
    {
      term: 'Algorithm & Offline Sync',
      en: 'An algorithm is a step-by-step recipe; Offline Sync saves work locally first and uploads when online.',
      kn: 'ಅಲ್ಗಾರಿದಮ್ ಎಂದರೆ ಹಂತ-ಹಂತದ ಸೂಚನೆ; ಆಫ್‌ಲೈನ್ ಸಿಂಕ್ ಎಂದರೆ ಮೊದಲು ಸಾಧನದಲ್ಲಿ ಉಳಿಸಿ ನಂತರ ಸರ್ವರ್‌ಗೆ ಕಳುಹಿಸುವುದು.',
      hi: 'एल्गोरिदम चरण-दर-चरण निर्देश है; ऑफ़लाइन सिंक पहले डिवाइस में सहेजता है और इंटरनेट आने पर अपलोड करता है।',
    },
  ],
};

export function getGlossaryForSubject(subjectId: string): GlossaryTerm[] {
  if (subjectId === 'evs' || subjectId === 'phychem' || subjectId === 'biology') {
    return ACADEMIC_GLOSSARY.science;
  }
  if (subjectId === 'logic') {
    return ACADEMIC_GLOSSARY.computer;
  }
  return ACADEMIC_GLOSSARY[subjectId] || ACADEMIC_GLOSSARY.math;
}
