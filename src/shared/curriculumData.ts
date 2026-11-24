import { generateMathModuleQuestions } from './mathQuestions';
import { Difficulty, LearningModule, ModuleFAQ, QuestionItem, StudySection, SubjectInfo } from './types';

interface SubjectBlueprint {
  id: string;
  name: string;
  shortName: string;
  accentColor: string;
  description: string;
}

const PRIMARY_SUBJECTS: SubjectBlueprint[] = [
  { id: 'math', name: 'Mathematics', shortName: 'Math', accentColor: '#0284C7', description: 'Numbers, operations, patterns, and everyday shapes.' },
  { id: 'english', name: 'English', shortName: 'English', accentColor: '#7C3AED', description: 'Reading comprehension, grammar, vocabulary, and expression.' },
  { id: 'evs', name: 'Environmental Studies', shortName: 'EVS', accentColor: '#059669', description: 'Nature, family, health, water, and our surroundings.' },
  { id: 'science', name: 'General Science', shortName: 'Science', accentColor: '#0D9488', description: 'Curiosity about plants, animals, weather, and simple machines.' },
  { id: 'hindi', name: 'Hindi Language', shortName: 'Hindi', accentColor: '#D97706', description: 'Swar, vyanjan, vocabulary, sentence formation, and stories.' },
  { id: 'logic', name: 'Digital & Logical Thinking', shortName: 'Logic', accentColor: '#4F46E5', description: 'Puzzles, sequencing, computer basics, and safe habits.' },
];

const MIDDLE_SUBJECTS: SubjectBlueprint[] = [
  { id: 'math', name: 'Mathematics', shortName: 'Math', accentColor: '#0284C7', description: 'Integers, algebra, geometry, percentages, and data.' },
  { id: 'science', name: 'Science', shortName: 'Science', accentColor: '#059669', description: 'Matter, force, nutrition, light, electricity, and ecosystems.' },
  { id: 'english', name: 'English', shortName: 'English', accentColor: '#7C3AED', description: 'Grammar mastery, comprehension, composition, and literature.' },
  { id: 'social', name: 'Social Studies', shortName: 'Social', accentColor: '#B45309', description: 'Ancient & medieval history, geography, and civic life.' },
  { id: 'hindi', name: 'Hindi', shortName: 'Hindi', accentColor: '#D97706', description: 'Vyakaran, muhavare, gadya, and creative writing.' },
  { id: 'computer', name: 'Computer Science', shortName: 'CS', accentColor: '#4F46E5', description: 'Algorithms, spreadsheets, HTML, logic gates, and safety.' },
];

const SECONDARY_SUBJECTS: SubjectBlueprint[] = [
  { id: 'math', name: 'Mathematics', shortName: 'Math', accentColor: '#0284C7', description: 'Polynomials, quadratics, trigonometry, geometry, and probability.' },
  { id: 'phychem', name: 'Physical & Chemical Science', shortName: 'Phy & Chem', accentColor: '#0284C7', description: 'Motion, laws of force, atomic structure, reactions, and optics.' },
  { id: 'biology', name: 'Biology & Life Sciences', shortName: 'Biology', accentColor: '#059669', description: 'Cells, tissues, life processes, heredity, and ecosystems.' },
  { id: 'english', name: 'English Literature & Grammar', shortName: 'English', accentColor: '#7C3AED', description: 'Clauses, voice, analytical writing, and literary analysis.' },
  { id: 'social', name: 'Social Science', shortName: 'Social Sci', accentColor: '#B45309', description: 'Modern history, democratic politics, economics, and resources.' },
  { id: 'computer', name: 'Computer Applications', shortName: 'Computing', accentColor: '#4F46E5', description: 'Python basics, SQL, networking, cybersecurity, and web design.' },
];

export function getSubjectsForClass(classLevel: number): SubjectInfo[] {
  if (classLevel <= 5) return PRIMARY_SUBJECTS;
  if (classLevel <= 8) return MIDDLE_SUBJECTS;
  return SECONDARY_SUBJECTS;
}

interface TopicSpec {
  title: string;
  summary: string;
  concepts: Array<{ heading: string; explanation: string; keyRule: string; example: string }>;
  walkthrough: string;
  faqs: ModuleFAQ[];
  questions: Array<{
    topic: string;
    difficulty: Difficulty;
    prompt: string;
    options: [string, string, string, string];
    correctIndex: number;
    hint: string;
    explanation: string;
  }>;
}

const MATH_MODULE_TITLES: Record<number, [string, string, string, string]> = {
  1: ['Counting & Number Patterns 1–50', 'Addition Made Visual', 'Subtraction & Take-Away Stories', 'Basic 2D Shapes & Corners'],
  2: ['Tens & Ones Place Value', 'Two-Digit Addition Strategies', 'Two-Digit Subtraction & Regrouping', 'Repeated Addition & Grouping'],
  3: ['Three-Digit Numbers & Expanded Form', 'Multiplication Tables & Facts', 'Equal Sharing & Division', 'Introduction to Fractions'],
  4: ['Large Numbers & Four Operations', 'Factors, Multiples & Prime Ideas', 'Perimeter of Polygons', 'Time & Unit Conversions'],
  5: ['Operations on Fractions', 'Decimals & Tenths/Hundredths', 'Understanding Percentages', 'Area & Volume Foundations'],
  6: ['Integers & the Number Line', 'Ratio, Proportion & Unitary Method', 'Introduction to Algebra & Equations', 'Angles, Lines & Triangles'],
  7: ['Linear Equations in One Variable', 'Profit, Loss & Percentage Change', 'Circles & Circumference', 'Data Handling & Mean'],
  8: ['Laws of Exponents & Powers', 'Algebraic Identities & Factoring', 'Mensuration of Rhombus & Trapezium', 'Compound Interest Applications'],
  9: ['Polynomials & Remainder Theorem', 'Coordinate Geometry in 2D Plane', "Heron's Formula for Triangle Area", 'Surface Area of Cones & Spheres'],
  10: ['Quadratic Equations & Roots', 'Arithmetic Progressions (AP)', 'Trigonometric Ratios & Identities', 'Probability & Statistical Models'],
};

const SUBJECT_MODULES_MAP: Record<string, Record<number, [string, string, string, string]>> = {
  english: {
    1: ['Phonics & CVC Word Families', 'Naming Words (Nouns)', 'Simple Action Words (Verbs)', 'Short Picture Sentences'],
    2: ['Singular & Plural Nouns', 'Pronouns & Describing Words', 'Present & Past Action Words', 'Punctuation & Capital Letters'],
    3: ['Types of Nouns & Articles', 'Adjectives & Degrees of Comparison', 'Simple Tenses in Daily Life', 'Reading Short Stories'],
    4: ['Conjunctions & Sentence Joining', 'Adverbs of Manner & Time', 'Prepositions of Place', 'Paragraph Writing Basics'],
    5: ['Subject-Verb Agreement', 'Continuous & Perfect Tenses', 'Synonyms, Antonyms & Idioms', 'Formal & Informal Letters'],
    6: ['Parts of Speech Deep Dive', 'Active & Passive Voice Intro', 'Direct & Indirect Speech Basics', 'Comprehension & Inference'],
    7: ['Phrases, Clauses & Sentences', 'Modals & Conditionals', 'Transformation of Sentences', 'Notice & Report Writing'],
    8: ['Finite & Non-Finite Verbs', 'Complex & Compound Sentences', 'Figures of Speech in Poetry', 'Analytical Paragraph Writing'],
    9: ['Determiners & Reported Speech', 'Editing & Omission Mastery', 'Literary Theme & Tone Analysis', 'Formal Article Writing'],
    10: ['Synthesis of Clauses', 'Advanced Voice & Narration', 'Critical Reading Comprehension', 'Board-Style Analytical Essays'],
  },
  evs: {
    1: ['My Body & Healthy Habits', 'Plants Around Our Home', 'Domestic & Wild Animals', 'Water & Clean Air'],
    2: ['Our Neighbourhood & Helpers', 'Food We Eat & Nutrition', 'Seasons & Weather Changes', 'Means of Transport'],
    3: ['Parts of a Plant & Germination', 'Animal Habitats & Food Habits', 'Sources & Conservation of Water', 'Maps, Directions & Landmarks'],
    4: ['Community & Public Services', 'Farming from Field to Plate', 'Shelters Across India', 'Waste Management & Recycling'],
    5: ['Super Senses in Animals', 'Seed Dispersal & Forests', 'Water Cycle & Rainwater Harvesting', 'Natural Disasters & First Aid'],
  },
  science: {
    1: ['Living vs Non-Living Things', 'Five Senses in Action', 'Day, Night & Sky Objects', 'Push & Pull Forces'],
    2: ['States of Matter Around Us', 'How Plants Make Food Intro', 'Shadows & Sources of Light', 'Safety & Simple Tools'],
    3: ['Measurement of Length & Mass', 'Soil Types & Rocks', 'Air Pressure & Wind', 'Sound & Vibration Basics'],
    4: ['Adaptations in Plants & Animals', 'Digestion & Balanced Diet', 'Force, Work & Simple Machines', 'Solar System & Planets'],
    5: ['Human Skeletal & Nervous Systems', 'States of Matter & Reversible Changes', 'Friction & Gravity', 'Light, Reflection & Shadows'],
    6: ['Components of Food & Deficiency', 'Separation of Substances', 'Motion, Distance & Measurement', 'Electric Circuits & Magnets'],
    7: ['Nutrition in Plants & Animals', 'Heat, Temperature & Conduction', 'Acids, Bases & Indicators', 'Light Mirrors & Lenses'],
    8: ['Microorganisms: Friend & Foe', 'Force, Pressure & Friction', 'Combustion, Flame & Fuels', 'Chemical Effects of Electric Current'],
  },
  phychem: {
    9: ['Motion, Velocity & Graphs', "Newton's Laws of Motion", 'Atoms, Molecules & Mole Concept', 'Structure of the Atom'],
    10: ['Chemical Reactions & Equations', 'Acids, Bases & Salts', 'Light: Reflection & Refraction', 'Electricity & Magnetic Effects'],
  },
  biology: {
    9: ['Fundamental Unit of Life: Cell', 'Plant & Animal Tissues', 'Diversity & Classification', 'Improvement in Food Resources'],
    10: ['Life Processes: Nutrition & Respiration', 'Control & Coordination', 'How Do Organisms Reproduce?', 'Heredity & Our Environment'],
  },
  social: {
    6: ['Earliest Cities & Civilizations', 'Latitudes, Longitudes & Globes', 'Local Government & Panchayati Raj', 'Diversity & Rural Livelihoods'],
    7: ['Medieval Kingdoms & Culture', 'Inside Our Earth & Atmosphere', 'State Government & Media', 'Markets Around Us'],
    8: ['Colonialism & Indian Freedom Struggle', 'Natural Resources: Land & Soil', 'The Indian Constitution & Rights', 'Judiciary & Social Justice'],
    9: ['French Revolution & Modern World', 'Physical Features of India', 'Constitutional Design & Elections', 'Poverty & Food Security'],
    10: ['Nationalism in India', 'Resources, Agriculture & Minerals', 'Power Sharing & Federalism', 'Sectors of Economy & Money'],
  },
  hindi: {
    1: ['Swar & Matra Recognition', 'Vyanjan & Two-Letter Words', 'Fruits, Colors & Family Words', 'Simple Picture Sentences'],
    2: ['Three & Four-Letter Words', 'Sanyuktakshar & Matra Practice', 'Days, Months & Counting', 'Short Moral Stories'],
    3: ['Sangya (Nouns) & Ling (Gender)', 'Vachan (Singular-Plural)', 'Sarvanam (Pronouns)', 'Short Paragraph Reading'],
    4: ['Visheshan (Adjectives)', 'Kriya (Verbs) & Kaal (Tense)', 'Vilom & Paryayvachi Words', 'Story Comprehension'],
    5: ['Karak & Sentence Structure', 'Muhavare (Idioms) in Context', 'Anek Shabdon Ke Liye Ek Shabd', 'Patra Lekhan (Letter Writing)'],
    6: ['Upsarg & Pratyay', 'Sandhi & Samas Introduction', 'Bhasha, Lipi & Vyakaran', 'Gadyansh Reading Skills'],
    7: ['Samas & Vakya Bhed', 'Alankar Introduction', 'Muhavare & Lokoktiyan', 'Anucched Lekhan'],
    8: ['Vachya (Voice in Hindi)', 'Pad Parichay Basics', 'Kavita Bhavarth Analysis', 'Samvad & Vigyapan Lekhan'],
  },
  logic: {
    1: ['Patterns with Shapes & Colors', 'Sorting & Grouping Objects', 'Parts of a Computer', 'Safe Screen Habits'],
    2: ['Number & Visual Sequences', 'Step-by-Step Instructions', 'Keyboard & Mouse Skills', 'Digital Etiquette'],
    3: ['Grid Paths & Directions', 'Input, Process & Output', 'Files, Folders & Saving Offline', 'Logical Odd-One-Out'],
    4: ['Flowcharts & Sequence Logic', 'Hardware vs Software', 'Word Processing & Formatting', 'Password & Privacy Basics'],
    5: ['Conditionals (If-Then Thinking)', 'Loops & Pattern Repetition', 'Spreadsheet Tables & Charts', 'Verifying Information Safely'],
  },
  computer: {
    6: ['Number Systems & Binary Intro', 'Flowcharts & Pseudocode', 'Spreadsheets & Formulas', 'Internet & Offline Sync Basics'],
    7: ['HTML Structure & Semantic Tags', 'CSS Styling & Box Model', 'Algorithms & Tracing Loops', 'Cybersecurity & Phishing Defense'],
    8: ['JavaScript Variables & Conditionals', 'Functions & Arrays', 'Relational Data Tables', 'Networking & Cloud vs Local'],
    9: ['Python Data Types & Loops', 'Lists, Dictionaries & Functions', 'Operating Systems & File Storage', 'Digital Footprints & Encryption'],
    10: ['Modular Python & Problem Solving', 'SQL Queries & Filtering', 'Computer Networks & Protocols', 'Offline-First Web Architecture'],
  },
};

function getModuleTitle(classLevel: number, subjectId: string, moduleNum: 1 | 2 | 3 | 4): string {
  if (subjectId === 'math') {
    return MATH_MODULE_TITLES[classLevel][moduleNum - 1];
  }
  const map = SUBJECT_MODULES_MAP[subjectId];
  if (map && map[classLevel]) {
    return map[classLevel][moduleNum - 1];
  }
  return `Module ${moduleNum}: Core Concepts`;
}

function buildMathStudySections(classLevel: number, moduleNum: 1 | 2 | 3 | 4, title: string): StudySection[] {
  if (classLevel <= 5) {
    return [
      {
        heading: `Understanding ${title}`,
        explanation: `In Class ${classLevel}, ${title} builds your everyday number sense using visual groups, concrete objects, and clear step-by-step patterns.`,
        keyRule: `Always check place values (ones, tens, hundreds) or equal parts before computing.`,
        example: `Example: Break complex numbers into tens and ones—for instance, 24 = 20 + 4—to verify your calculation quickly.`,
      },
      {
        heading: 'Step-by-Step Method',
        explanation: `Read the word problem carefully, underline the given numbers, choose the right operation (+, -, ×, ÷), and check whether your answer makes sense.`,
        keyRule: `Estimate first: your final answer should be close to your mental estimate.`,
        example: `If 3 baskets have 5 apples each, repeated addition 5 + 5 + 5 = 15 matches 3 × 5 = 15.`,
      },
      {
        heading: 'Common Mistakes to Avoid',
        explanation: `Students often mix up columns when regrouping or forget the unit (cm, m, minutes, ₹) in word problems.`,
        keyRule: `Write units clearly and align digits vertically from the ones place.`,
        example: `In perimeter, add all sides around the boundary rather than multiplying length × breadth.`,
      },
    ];
  }
  return [
    {
      heading: `Core Principles of ${title}`,
      explanation: `This Class ${classLevel} module introduces structured mathematical reasoning for ${title}, connecting definitions directly to problem-solving workflows.`,
      keyRule: `State the governing formula or theorem explicitly before substituting numerical values.`,
      example: `Identify known variables first, isolate the unknown step by step, and verify by substituting back.`,
    },
    {
      heading: 'Algebraic & Geometric Precision',
      explanation: `Track signs (+ / -), units, and boundary conditions at every intermediate step so small arithmetic slips do not compound.`,
      keyRule: `Maintain balance across both sides of an equation or verify angle/triangle sums.`,
      example: `Check edge cases: e.g., in ratios, scale both terms by the same non-zero multiplier.`,
    },
    {
      heading: 'Exam & Practice Strategy',
      explanation: `Look for structural shortcuts such as standard identities, prime factors, or exact fractional forms instead of rounding prematurely.`,
      keyRule: `Keep values exact (fractions or π) until the final step.`,
      example: `Using (a + b)(a - b) = a² - b² computes 103 × 97 as 100² - 3² = 9991 in seconds.`,
    },
  ];
}

function buildSubjectSpec(classLevel: number, subject: SubjectInfo, moduleNum: 1 | 2 | 3 | 4): TopicSpec {
  const title = getModuleTitle(classLevel, subject.id, moduleNum);
  const gradeBand = classLevel <= 5 ? 'Primary Foundation' : classLevel <= 8 ? 'Middle School' : 'Secondary Board Prep';

  if (subject.id === 'math') {
    const concepts = buildMathStudySections(classLevel, moduleNum, title);
    return {
      title,
      summary: `${gradeBand} Mathematics module covering ${title} with worked examples and adaptive practice.`,
      concepts,
      walkthrough: `Start by reading the three concept blocks for ${title}. Pay special attention to the key rules and worked examples, then launch the adaptive practice session. Questions adapt to your accuracy—scoring above 80% unlocks harder challenges, while lower scores guide you through foundational steps.`,
      faqs: [
        {
          question: `What is the main formula or rule in ${title}?`,
          keywords: ['formula', 'rule', 'method', 'how', 'solve', 'main', title.toLowerCase()],
          answer: `${concepts[0].keyRule} ${concepts[0].example}`,
          stepByStep: [concepts[0].explanation, concepts[1].keyRule, concepts[2].example],
        },
        {
          question: `Why do students make mistakes in ${title}?`,
          keywords: ['mistake', 'wrong', 'error', 'confuse', 'careful', 'check'],
          answer: concepts[2].explanation,
          stepByStep: [concepts[2].keyRule, concepts[1].example],
        },
        {
          question: `Can you give me a quick example for ${title}?`,
          keywords: ['example', 'sample', 'show', 'practice', 'demo'],
          answer: `${concepts[0].example} Also remember: ${concepts[1].example}`,
          stepByStep: ['Write down the given values.', 'Apply the key rule cleanly.', 'Double-check signs and units.'],
        },
      ],
      questions: [],
    };
  }

  // Domain-authentic curated content & 9 distinct questions per module for non-math subjects
  const subjectSeeds = generateNonMathContent(classLevel, subject, moduleNum, title);
  return subjectSeeds;
}

function generateNonMathContent(classLevel: number, subject: SubjectInfo, moduleNum: 1 | 2 | 3 | 4, title: string): TopicSpec {
  const tier = classLevel <= 5 ? 'primary' : classLevel <= 8 ? 'middle' : 'secondary';

  // Rich domain-specific concepts and 9 strictly module-scoped questions per subject/module
  const bankMap: Record<string, () => TopicSpec> = {
    english: () => {
      const focusPoints = [
        ['Identifying words and structure', 'Recognizing patterns in sentences', 'Applying grammar rules accurately'],
        ['Building clear vocabulary in context', 'Connecting ideas with precision', 'Editing errors with confidence'],
      ][moduleNum % 2];

      const concepts: StudySection[] = [
        {
          heading: `Core Idea: ${title}`,
          explanation: `In Class ${classLevel} English, "${title}" helps you read accurately and write clearly. Notice how each word's role determines punctuation, meaning, and tone.`,
          keyRule: focusPoints[0],
          example: `Check the subject and verb first in any sentence to confirm who performs the action.`,
        },
        {
          heading: 'Patterns & Usage Rules',
          explanation: `Strong writers check tense consistency, accurate connectors, and clear word choice before finalizing an answer.`,
          keyRule: focusPoints[1],
          example: `Compare: "She reads daily" (habitual present) vs "She read yesterday" (completed past).`,
        },
        {
          heading: 'Reading & Editing Checklist',
          explanation: `Always read the complete sentence aloud mentally to catch missing articles, mismatched plurals, or misplaced modifiers.`,
          keyRule: focusPoints[2],
          example: `Look for signal words like "yesterday", "since", "although", or "because" to pick the exact form.`,
        },
      ];

      const qBankByModule: Array<{
        topic: string;
        difficulty: Difficulty;
        prompt: string;
        options: [string, string, string, string];
        correctIndex: number;
        hint: string;
        explanation: string;
      }> =
        moduleNum === 1
          ? [
              {
                topic: `${title} - Fundamentals`,
                difficulty: 'easy',
                prompt: `In the study of "${title}" (Class ${classLevel}), which sentence is grammatically complete and correctly punctuated?`,
                options: ['The bright sun rises in the east.', 'bright sun rises in east.', 'Rises the east in bright sun.', 'The bright sun rise in east'],
                correctIndex: 0,
                hint: 'A complete sentence begins with a capital letter, has a matching subject-verb pair, and ends with a full stop.',
                explanation: '"The bright sun rises in the east." has proper capitalization, subject-verb agreement ("sun rises"), and ending punctuation.',
              },
              {
                topic: `${title} - Word Recognition`,
                difficulty: 'easy',
                prompt: 'Which word in the sentence "Riya carefully stacked three wooden books" acts as a naming word (noun)?',
                options: ['carefully', 'stacked', 'books', 'three'],
                correctIndex: 2,
                hint: 'A noun names a person, place, animal, or thing.',
                explanation: '"Books" is a thing (common noun); "carefully" is an adverb, "stacked" is a verb, and "three" is a number adjective.',
              },
              {
                topic: `${title} - Sound & Structure`,
                difficulty: 'easy',
                prompt: 'Choose the option where all words belong to the same grammatical category (all nouns):',
                options: ['river, mountain, bridge', 'run, jump, quickly', 'happy, blue, softly', 'and, but, under'],
                correctIndex: 0,
                hint: 'Look for three words that all name places or objects.',
                explanation: 'River, mountain, and bridge are all naming words (nouns).',
              },
              {
                topic: `${title} - Usage`,
                difficulty: 'medium',
                prompt: 'Select the sentence that uses an article ("a", "an", or "the") correctly:',
                options: ['He carried an umbrella during the storm.', 'He carried a umbrella during the storm.', 'She saw an mountain near a river.', 'They ate a apple after lunch.'],
                correctIndex: 0,
                hint: 'Use "an" before words starting with a vowel sound.',
                explanation: '"Umbrella" begins with a vowel sound, so "an umbrella" is correct.',
              },
              {
                topic: `${title} - Context Clues`,
                difficulty: 'medium',
                prompt: 'In "${title}", why do we examine surrounding words before choosing a word meaning?',
                options: ['Context clues show how the word functions in the sentence', 'Longer words always mean the opposite', 'Punctuation replaces the subject', 'Only the last word matters'],
                correctIndex: 0,
                hint: 'Words around an unfamiliar term give clues about its role and meaning.',
                explanation: 'Context clues reveal whether a word is an action, description, or object and narrow down its exact meaning.',
              },
              {
                topic: `${title} - Sentence Mechanics`,
                difficulty: 'medium',
                prompt: 'Which revision improves clarity in: "Meera went to the library she borrowed a science book"?',
                options: ['Meera went to the library, and she borrowed a science book.', 'Meera went to the library borrowed science book.', 'Went Meera library she borrowed.', 'Meera library went she borrowed book.'],
                correctIndex: 0,
                hint: 'Two complete thoughts need a comma + conjunction (or a full stop) between them.',
                explanation: 'Joining two independent clauses with ", and" eliminates the run-on sentence cleanly.',
              },
              {
                topic: `${title} - Applied Analysis`,
                difficulty: 'hard',
                prompt: 'Identify the sentence where the word "light" is used as a verb rather than a noun or adjective:',
                options: ['Please light the lamp before dusk.', 'The morning light filled the room.', 'This backpack feels very light.', 'Turn off the hallway light.'],
                correctIndex: 0,
                hint: 'Ask which sentence uses "light" as an action you perform.',
                explanation: 'In "Please light the lamp", "light" expresses the action of kindling/turning on the lamp.',
              },
              {
                topic: `${title} - Precision`,
                difficulty: 'hard',
                prompt: 'Which option demonstrates parallel structure in English writing?',
                options: ['She likes reading novels, sketching landscapes, and solving puzzles.', 'She likes reading novels, to sketch landscapes, and puzzles.', 'She likes read novels, sketching, and to solve puzzles.', 'She likes novels reading, sketch, and solving.'],
                correctIndex: 0,
                hint: 'All items in a list should follow the same grammatical pattern (-ing form).',
                explanation: '"reading...", "sketching...", and "solving..." all use consistent gerund (-ing) forms.',
              },
              {
                topic: `${title} - Synthesis`,
                difficulty: 'hard',
                prompt: 'Choose the most concise and accurate rewrite of: "Due to the fact that it rained heavily, the match was postponed."',
                options: ['Because it rained heavily, the match was postponed.', 'In spite of rain heavily, match postponed.', 'Due to raining fact, match postponed.', 'Because heavily rain, the match was postponed.'],
                correctIndex: 0,
                hint: 'Replace wordy phrases like "Due to the fact that" with a single clear conjunction.',
                explanation: '"Because" expresses cause directly without unnecessary filler words.',
              },
            ]
          : moduleNum === 2
          ? [
              {
                topic: `${title} - Agreement`,
                difficulty: 'easy',
                prompt: 'Choose the correct verb to complete: "Every student in the classroom ___ a notebook."',
                options: ['has', 'have', 'are having', 'were'],
                correctIndex: 0,
                hint: '"Every student" is singular.',
                explanation: 'Singular subjects like "Every student" take the singular verb "has".',
              },
              {
                topic: `${title} - Vocabulary`,
                difficulty: 'easy',
                prompt: 'Which word is closest in meaning (synonym) to "diligent"?',
                options: ['Hardworking', 'Careless', 'Sleepy', 'Noisy'],
                correctIndex: 0,
                hint: 'Think of a student who puts steady effort into every module.',
                explanation: '"Diligent" means showing careful and persistent effort—hardworking.',
              },
              {
                topic: `${title} - Pronouns`,
                difficulty: 'easy',
                prompt: 'Fill in the blank: "Kiran and I finished the project by ___."',
                options: ['ourselves', 'myself', 'themselves', 'yourself'],
                correctIndex: 0,
                hint: '"Kiran and I" together equal "we".',
                explanation: 'The reflexive pronoun matching "we" (Kiran and I) is "ourselves".',
              },
              {
                topic: `${title} - Tenses`,
                difficulty: 'medium',
                prompt: 'Which sentence correctly expresses an action that started in the past and continues now?',
                options: ['We have studied this topic since Monday.', 'We study this topic yesterday.', 'We will studied this topic since Monday.', 'We are study this topic since Monday.'],
                correctIndex: 0,
                hint: 'Look for "have/has + past participle" paired with "since".',
                explanation: 'Present perfect ("have studied ... since Monday") connects past start to the present.',
              },
              {
                topic: `${title} - Modifiers`,
                difficulty: 'medium',
                prompt: 'Identify the adjective in: "The curious Fox watched the quiet valley."',
                options: ['curious', 'watched', 'valley', 'the'],
                correctIndex: 0,
                hint: 'An adjective describes a noun.',
                explanation: '"Curious" describes the noun "Fox" (and "quiet" describes "valley").',
              },
              {
                topic: `${title} - Connectors`,
                difficulty: 'medium',
                prompt: 'Select the best conjunction: "The bus arrived late, ___ we still reached school on time."',
                options: ['yet', 'because', 'unless', 'since'],
                correctIndex: 0,
                hint: 'The second idea contrasts with the first idea.',
                explanation: '"Yet" signals contrast between arriving late and still reaching on time.',
              },
              {
                topic: `${title} - Voice & Structure`,
                difficulty: 'hard',
                prompt: 'Which sentence is written in the active voice?',
                options: ['The science teacher demonstrated the prism experiment.', 'The prism experiment was demonstrated by the science teacher.', 'A new schedule was announced by the principal.', 'The homework sheets were collected early.'],
                correctIndex: 0,
                hint: 'In active voice, the doer of the action is the grammatical subject.',
                explanation: 'The teacher performs the action "demonstrated", making it active voice.',
              },
              {
                topic: `${title} - Figurative Language`,
                difficulty: 'hard',
                prompt: 'Which line contains a simile?',
                options: ['Her explanation was as clear as crystal.', 'The wind whispered secrets through the pines.', 'Time is a thief that steals careless hours.', 'Ten thousand stars danced above.'],
                correctIndex: 0,
                hint: 'A simile compares two unlike things using "like" or "as".',
                explanation: '"as clear as crystal" uses "as ... as" to compare clarity to crystal.',
              },
              {
                topic: `${title} - Editing`,
                difficulty: 'hard',
                prompt: 'Spot the error-free sentence:',
                options: ['Neither of the answers was completely accurate.', 'Neither of the answers were completely accurate.', 'Neither of the answer were accurate.', 'Neither answers was accuracy.'],
                correctIndex: 0,
                hint: '"Neither" takes a singular verb even when followed by "of the [plural noun]".',
                explanation: '"Neither" is singular, so "was" is the correct verb.',
              },
            ]
          : moduleNum === 3
          ? [
              {
                topic: `${title} - Comprehension`,
                difficulty: 'easy',
                prompt: 'When reading a passage, what is the "main idea"?',
                options: ['The central point the entire passage explains', 'The very first word in the title', 'Only the longest sentence', 'A random detail at the end'],
                correctIndex: 0,
                hint: 'Think of the big message that all supporting sentences connect to.',
                explanation: 'The main idea summarizes what the passage is mostly about.',
              },
              {
                topic: `${title} - Antonyms`,
                difficulty: 'easy',
                prompt: 'Which word is the opposite (antonym) of "scarce"?',
                options: ['Abundant', 'Rare', 'Tiny', 'Empty'],
                correctIndex: 0,
                hint: 'If something is scarce, there is very little of it.',
                explanation: '"Abundant" means existing in large quantities—the opposite of "scarce".',
              },
              {
                topic: `${title} - Punctuation`,
                difficulty: 'easy',
                prompt: 'Which punctuation mark shows strong surprise or excitement at the end of a sentence?',
                options: ['Exclamation mark (!)', 'Comma (,)', 'Semicolon (;)', 'Hyphen (-)'],
                correctIndex: 0,
                hint: 'Used after exclamatory sentences like "What a wonderful discovery!"',
                explanation: 'An exclamation mark expresses strong emotion or surprise.',
              },
              {
                topic: `${title} - Sentence Types`,
                difficulty: 'medium',
                prompt: 'What type of sentence is "Please review Module 3 before tomorrow\'s quiz"?',
                options: ['Imperative', 'Interrogative', 'Exclamatory', 'Fragment'],
                correctIndex: 0,
                hint: 'It gives a polite request or instruction.',
                explanation: 'Imperative sentences issue requests, advice, or commands.',
              },
              {
                topic: `${title} - Prepositions`,
                difficulty: 'medium',
                prompt: 'Choose the correct preposition: "The library is situated ___ the science lab and the art room."',
                options: ['between', 'among', 'into', 'onto'],
                correctIndex: 0,
                hint: 'Use this preposition when referring to two distinct places.',
                explanation: '"Between" is used for two items; "among" is used for three or more.',
              },
              {
                topic: `${title} - Inference`,
                difficulty: 'medium',
                prompt: 'If a story says "Neha checked her compass twice as fog rolled across the ridge," what can we infer?',
                options: ['Visibility was low, so she needed to navigate carefully', 'She forgot how to read numbers', 'It was a hot summer noon', 'She was inside a classroom'],
                correctIndex: 0,
                hint: 'Combine the clue "fog rolled across" with "checked her compass".',
                explanation: 'Fog reduces visibility, explaining why she verified her direction with a compass.',
              },
              {
                topic: `${title} - Clauses`,
                difficulty: 'hard',
                prompt: 'In "Although the trail was steep, the hikers reached the summit," identify the subordinate clause:',
                options: ['Although the trail was steep', 'the hikers reached the summit', 'reached the summit', 'the hikers'],
                correctIndex: 0,
                hint: 'A subordinate clause begins with a subordinating conjunction and cannot stand alone.',
                explanation: '"Although the trail was steep" depends on the main clause to complete its thought.',
              },
              {
                topic: `${title} - Tone`,
                difficulty: 'hard',
                prompt: 'Which word best describes the tone of a notice reminding students to conserve water during summer?',
                options: ['Earnest and persuasive', 'Sarcastic and mocking', 'Playful and fictional', 'Indifferent'],
                correctIndex: 0,
                hint: 'School notices encouraging good habits are serious and motivating.',
                explanation: 'An earnest, persuasive tone encourages responsible action clearly.',
              },
              {
                topic: `${title} - Indirect Speech`,
                difficulty: 'hard',
                prompt: 'Convert to indirect speech: Teacher said, "Water boils at 100°C."',
                options: ['The teacher said that water boils at 100°C.', 'The teacher said that water boiled at 100°C.', 'The teacher asked if water boiled.', 'The teacher told water to boil.'],
                correctIndex: 0,
                hint: 'Universal scientific truths do not change tense in indirect speech.',
                explanation: 'Because water boiling at 100°C is a universal fact, "boils" stays in present tense.',
              },
            ]
          : [
              {
                topic: `${title} - Writing Craft`,
                difficulty: 'easy',
                prompt: 'Which part of a well-structured paragraph introduces the main point?',
                options: ['Topic sentence', 'Closing signature', 'Footnote', 'Index'],
                correctIndex: 0,
                hint: 'It usually appears as the opening sentence of the paragraph.',
                explanation: 'The topic sentence states the paragraph’s central idea clearly.',
              },
              {
                topic: `${title} - Word Formation`,
                difficulty: 'easy',
                prompt: 'Add the correct prefix to make the opposite of "possible":',
                options: ['im-', 'un-', 'dis-', 'mis-'],
                correctIndex: 0,
                hint: 'Words beginning with "p" or "m" often take this prefix.',
                explanation: '"im-" + "possible" forms "impossible".',
              },
              {
                topic: `${title} - Reading Strategy`,
                difficulty: 'easy',
                prompt: 'Before writing a summary of a lesson, what should you do first?',
                options: ['Identify key ideas in your own words', 'Copy every sentence word for word', 'Skip the middle paragraphs', 'Only memorize punctuation'],
                correctIndex: 0,
                hint: 'A summary is brief and captures core points.',
                explanation: 'Summarizing means distilling main points concisely in your own words.',
              },
              {
                topic: `${title} - Formal Writing`,
                difficulty: 'medium',
                prompt: 'Which salutation is most appropriate in a formal letter to your school principal?',
                options: ['Respected Principal,', 'Hey there!', 'See you soon,', 'Guess what,'],
                correctIndex: 0,
                hint: 'Formal letters use respectful, polite openings.',
                explanation: '"Respected Principal," or "Dear Sir/Madam," follows formal letter etiquette.',
              },
              {
                topic: `${title} - Transitions`,
                difficulty: 'medium',
                prompt: 'Which transition word best introduces a supporting example?',
                options: ['For instance,', 'However,', 'Meanwhile,', 'In contrast,'],
                correctIndex: 0,
                hint: 'Look for a phrase synonymous with "for example".',
                explanation: '"For instance," introduces an example supporting the previous statement.',
              },
              {
                topic: `${title} - Vocabulary Precision`,
                difficulty: 'medium',
                prompt: 'What does "concise" writing mean?',
                options: ['Clear and brief without unnecessary words', 'Extremely long and repetitive', 'Written only in bullet fragments', 'Filled with slang'],
                correctIndex: 0,
                hint: 'Good summaries and reports aim to be concise.',
                explanation: 'Concise writing communicates ideas completely using only necessary words.',
              },
              {
                topic: `${title} - Critical Reading`,
                difficulty: 'hard',
                prompt: 'How does an author distinguish a "fact" from an "opinion" in an informational essay?',
                options: ['Facts can be verified with evidence; opinions express personal judgment', 'Opinions always include numbers; facts never do', 'Facts use exclamation marks', 'There is no difference'],
                correctIndex: 0,
                hint: 'Think about whether a claim can be checked against objective records.',
                explanation: 'Facts are provable using data or observation, whereas opinions reflect beliefs or preferences.',
              },
              {
                topic: `${title} - Synthesis`,
                difficulty: 'hard',
                prompt: 'Which concluding sentence best reinforces a persuasive paragraph on local libraries?',
                options: ['Investing in offline-ready community libraries empowers every learner regardless of connectivity.', 'Libraries have shelves and chairs.', 'Yesterday I saw a blue book.', 'Sometimes people like to read.'],
                correctIndex: 0,
                hint: 'A strong conclusion echoes the thesis with lasting impact.',
                explanation: 'The first option ties the evidence back to the core argument effectively.',
              },
              {
                topic: `${title} - Cohesion`,
                difficulty: 'hard',
                prompt: 'Why should writers vary sentence lengths in an analytical essay?',
                options: ['To maintain rhythm and emphasize key ideas clearly', 'To increase word count artificially', 'To avoid using periods', 'To confuse the reader'],
                correctIndex: 0,
                hint: 'Compare reading ten identical short sentences vs a thoughtful mix.',
                explanation: 'Mixing crisp short sentences with well-crafted complex sentences improves flow and emphasis.',
              },
            ];

      return {
        title,
        summary: `Class ${classLevel} English module focusing on ${title} with guided examples and comprehension drills.`,
        concepts,
        walkthrough: `Read the three study notes for ${title} carefully. Practice spotting grammar patterns and context clues, then test yourself in the module practice session.`,
        faqs: [
          {
            question: `How can I avoid mistakes in ${title}?`,
            keywords: ['mistake', 'avoid', 'grammar', 'rule', 'tip', title.toLowerCase()],
            answer: concepts[2].explanation,
            stepByStep: [concepts[0].keyRule, concepts[1].example, concepts[2].keyRule],
          },
          {
            question: `Can you show an example from ${title}?`,
            keywords: ['example', 'sentence', 'show'],
            answer: `${concepts[0].example} ${concepts[1].example}`,
            stepByStep: ['Identify the subject and verb.', 'Check tense and connector words.', 'Confirm punctuation.'],
          },
        ],
        questions: qBankByModule,
      };
    },

    science: () => buildScienceSpec(classLevel, title, moduleNum, tier),
    evs: () => buildScienceSpec(classLevel, title, moduleNum, tier),
    phychem: () => buildScienceSpec(classLevel, title, moduleNum, tier),
    biology: () => buildScienceSpec(classLevel, title, moduleNum, tier),
    social: () => buildSocialSpec(classLevel, title, moduleNum),
    hindi: () => buildHindiSpec(classLevel, title, moduleNum),
    logic: () => buildComputingSpec(classLevel, title, moduleNum),
    computer: () => buildComputingSpec(classLevel, title, moduleNum),
  };

  const builder = bankMap[subject.id] || bankMap.science;
  return builder();
}

function buildScienceSpec(classLevel: number, title: string, moduleNum: 1 | 2 | 3 | 4, tier: string): TopicSpec {
  const concepts: StudySection[] = [
    {
      heading: `Scientific Foundations: ${title}`,
      explanation: `In Class ${classLevel}, "${title}" explains how natural phenomena and physical systems work through observation, measurement, and cause-and-effect reasoning.`,
      keyRule: `Always identify the cause (input/condition) and the observable effect (outcome).`,
      example: `When observing a change in nature or a lab setup, record what stays constant and what varies.`,
    },
    {
      heading: 'Mechanism & Law',
      explanation: `Scientific explanations rely on conservation, structure-to-function relationships, and repeatable evidence rather than guesses.`,
      keyRule: `Link structure to function—how a part is built explains what job it performs.`,
      example: `Just as wide flat leaves capture sunlight efficiently, streamlined shapes reduce air or water resistance.`,
    },
    {
      heading: 'Real-World Application',
      explanation: `Connecting "${title}" to everyday life—kitchen science, local agriculture, clean energy, and health—makes concepts unforgettable.`,
      keyRule: `Verify units and safety rules whenever conducting observations or experiments.`,
      example: `Compare predictions against observed results to refine your scientific understanding.`,
    },
  ];

  const questions: TopicSpec['questions'] =
    moduleNum === 1
      ? [
          {
            topic: `${title} - Core Concepts`,
            difficulty: 'easy',
            prompt: `Which statement best describes the scientific method when studying "${title}"?`,
            options: ['Observe, form a testable hypothesis, experiment, and conclude from evidence', 'Guess once and never test it', 'Ignore measurements that look surprising', 'Copy results without observing'],
            correctIndex: 0,
            hint: 'Science depends on testing ideas against real observations.',
            explanation: 'Observation, hypothesis, controlled testing, and evidence-based conclusions form the scientific method.',
          },
          {
            topic: `${title} - Observation`,
            difficulty: 'easy',
            prompt: `In Class ${classLevel} Science (${title}), why do we repeat an experiment or observation?`,
            options: ['To confirm results are reliable and not a one-time error', 'To waste lab supplies', 'To avoid writing notes', 'Because measurements never stay similar'],
            correctIndex: 0,
            hint: 'Think about reliability and accuracy.',
            explanation: 'Repeating trials verifies consistency and reduces random measurement error.',
          },
          {
            topic: `${title} - Units`,
            difficulty: 'easy',
            prompt: 'Which standard SI unit is used to measure mass in science?',
            options: ['Kilogram (kg)', 'Metre (m)', 'Second (s)', 'Litre (L)'],
            correctIndex: 0,
            hint: 'Metre measures length, second measures time, and litre measures volume.',
            explanation: 'The kilogram (kg) is the standard SI unit of mass.',
          },
          {
            topic: `${title} - Classification`,
            difficulty: 'medium',
            prompt: `When studying "${title}", what is the difference between a physical change and a chemical change?`,
            options: ['Chemical changes form new substances; physical changes alter state or shape without new substances', 'Physical changes always produce smoke', 'Chemical changes are always reversible by freezing', 'Both are identical'],
            correctIndex: 0,
            hint: 'Think of melting ice vs burning paper.',
            explanation: 'Melting ice remains water (physical), while burning forms ash and gases (chemical).',
          },
          {
            topic: `${title} - Systems`,
            difficulty: 'medium',
            prompt: 'Why is a control setup included in a scientific investigation?',
            options: ['To provide a baseline for comparing the effect of the tested variable', 'To double the speed of reactions', 'To replace the measuring scale', 'To hide mistakes'],
            correctIndex: 0,
            hint: 'How do you know a change actually caused the outcome?',
            explanation: 'A control setup keeps everything unchanged except the one variable under test, proving cause and effect.',
          },
          {
            topic: `${title} - Energy & Matter`,
            difficulty: 'medium',
            prompt: 'Which process transfers heat directly through a solid metal spoon placed in hot soup?',
            options: ['Conduction', 'Radiation only', 'Evaporation', 'Condensation'],
            correctIndex: 0,
            hint: 'Particles in solids pass vibrations directly to neighboring particles.',
            explanation: 'Conduction transfers thermal energy through direct particle-to-particle contact in solids.',
          },
          {
            topic: `${title} - Applied Reasoning`,
            difficulty: 'hard',
            prompt: `In a study related to "${title}", if all variables except temperature are held constant and reaction rate doubles when warmed, what can be concluded?`,
            options: ['Higher temperature increases the rate under those test conditions', 'Temperature has zero effect on the system', 'Mass increased during heating', 'Volume caused the change'],
            correctIndex: 0,
            hint: 'Only one variable changed, and the output doubled.',
            explanation: 'With other factors controlled, the observed rise is attributable to temperature.',
          },
          {
            topic: `${title} - Conservation`,
            difficulty: 'hard',
            prompt: 'In a closed sealed container, if 10 g of substance A reacts completely with 15 g of substance B, what is the total mass of products?',
            options: ['25 g', '15 g', '5 g', '50 g'],
            correctIndex: 0,
            hint: 'Recall the Law of Conservation of Mass.',
            explanation: 'Mass is conserved in closed chemical reactions: 10 g + 15 g = 25 g.',
          },
          {
            topic: `${title} - Critical Analysis`,
            difficulty: 'hard',
            prompt: 'Why must scientific claims in "${title}" cite measurable evidence rather than assumptions?',
            options: ['Measurable evidence allows independent verification by others', 'Assumptions cannot be written down', 'Evidence eliminates the need for instruments', 'Numbers look decorative'],
            correctIndex: 0,
            hint: 'Think about how science builds trustworthy knowledge.',
            explanation: 'Measurable evidence lets anyone repeat and verify the conclusion objectively.',
          },
        ]
      : moduleNum === 2
      ? [
          {
            topic: `${title} - Structure & Function`,
            difficulty: 'easy',
            prompt: 'Which natural process enables green plants to prepare their own food using sunlight?',
            options: ['Photosynthesis', 'Respiration', 'Transpiration', 'Germination'],
            correctIndex: 0,
            hint: '"Photo" means light and "synthesis" means putting together.',
            explanation: 'Photosynthesis converts water and carbon dioxide into glucose and oxygen using sunlight and chlorophyll.',
          },
          {
            topic: `${title} - Matter`,
            difficulty: 'easy',
            prompt: 'Which state of matter has a fixed volume but takes the shape of its container?',
            options: ['Liquid', 'Solid', 'Gas', 'Plasma'],
            correctIndex: 0,
            hint: 'Think of pouring water from a bottle into a bowl.',
            explanation: 'Liquids have definite volume but flow to adopt their container’s shape.',
          },
          {
            topic: `${title} - Everyday Science`,
            difficulty: 'easy',
            prompt: 'What instrument is used to measure temperature accurately?',
            options: ['Thermometer', 'Barometer', 'Ammeter', 'Compass'],
            correctIndex: 0,
            hint: '"Thermo" refers to heat.',
            explanation: 'A thermometer measures temperature in °C, °F, or K.',
          },
          {
            topic: `${title} - Mixtures`,
            difficulty: 'medium',
            prompt: 'Which method separates dissolved salt from saltwater while recovering clean water?',
            options: ['Evaporation followed by condensation (distillation)', 'Handpicking', 'Winnowing', 'Magnetic separation'],
            correctIndex: 0,
            hint: 'Salt does not evaporate with water vapour.',
            explanation: 'Distillation evaporates water and condenses the pure vapour, leaving salt behind.',
          },
          {
            topic: `${title} - Forces`,
            difficulty: 'medium',
            prompt: 'Why do car tyres have tread patterns carved onto their rubber surface?',
            options: ['To increase friction and grip, especially on wet roads', 'To reduce friction to zero', 'To make the wheel lighter', 'To reflect sunlight'],
            correctIndex: 0,
            hint: 'Treads channel water away and keep contact with the road.',
            explanation: 'Tyre treads increase traction/friction and prevent skidding on wet surfaces.',
          },
          {
            topic: `${title} - Ecosystems`,
            difficulty: 'medium',
            prompt: 'Why are decomposers like fungi and bacteria essential in an ecosystem?',
            options: ['They break down dead matter and return nutrients to the soil', 'They block sunlight from reaching plants', 'They consume all oxygen on Earth', 'They prevent rainfall'],
            correctIndex: 0,
            hint: 'Without them, nutrients would stay locked in dead leaves.',
            explanation: 'Decomposers recycle organic matter into mineral nutrients plants can reuse.',
          },
          {
            topic: `${title} - Experiment Design`,
            difficulty: 'hard',
            prompt: 'When a metal ball is heated, it no longer passes through a tight metal ring that fit it when cold. Why?',
            options: ['Thermal expansion increased the ball’s volume', 'The ball gained extra atoms from air', 'Gravity pulled the ring smaller', 'Its mass doubled'],
            correctIndex: 0,
            hint: 'Particles vibrate faster and spread apart when heated.',
            explanation: 'Heating causes thermal expansion in solids, slightly increasing the ball’s diameter.',
          },
          {
            topic: `${title} - Optics & Energy`,
            difficulty: 'hard',
            prompt: 'Why does a pencil partly submerged in a glass of water appear bent at the water surface?',
            options: ['Refraction of light as it moves between water and air', 'The water dissolves the wood', 'Magnetic attraction', 'Diffraction of sound waves'],
            correctIndex: 0,
            hint: 'Light changes speed when crossing between media of different densities.',
            explanation: 'Refraction bends light rays at the water-air boundary, creating an apparent shift.',
          },
          {
            topic: `${title} - Synthesis`,
            difficulty: 'hard',
            prompt: `How does understanding "${title}" help solve practical community problems?`,
            options: ['It guides safe, evidence-based decisions in health, water, and energy use', 'It replaces all math calculations', 'It only applies inside space stations', 'It discourages testing'],
            correctIndex: 0,
            hint: 'Think of real-world engineering, hygiene, and sustainability.',
            explanation: 'Scientific literacy powers clean water filtration, energy efficiency, and public health.',
          },
        ]
      : moduleNum === 3
      ? [
          {
            topic: `${title} - Properties`,
            difficulty: 'easy',
            prompt: 'Which gas in Earth’s atmosphere is essential for human and animal respiration?',
            options: ['Oxygen', 'Nitrogen', 'Argon', 'Neon'],
            correctIndex: 0,
            hint: 'Makes up about 21% of clean dry air.',
            explanation: 'Cells use oxygen during cellular respiration to release energy.',
          },
          {
            topic: `${title} - Electricity`,
            difficulty: 'easy',
            prompt: 'Which material is a good electrical conductor?',
            options: ['Copper', 'Dry rubber', 'Plastic', 'Dry wood'],
            correctIndex: 0,
            hint: 'Electrical wires inside cables are made from this metal.',
            explanation: 'Copper has free electrons that conduct electric current efficiently; rubber and plastic are insulators.',
          },
          {
            topic: `${title} - Water Cycle`,
            difficulty: 'easy',
            prompt: 'What do we call the process where water vapour cools in the sky to form tiny cloud droplets?',
            options: ['Condensation', 'Evaporation', 'Melting', 'Freezing'],
            correctIndex: 0,
            hint: 'Gas turning back into liquid upon cooling.',
            explanation: 'Condensation transforms rising water vapour into liquid droplets that form clouds.',
          },
          {
            topic: `${title} - Acids & Bases`,
            difficulty: 'medium',
            prompt: 'Blue litmus paper turns red when dipped into lemon juice. What does this indicate?',
            options: ['Lemon juice is acidic', 'Lemon juice is strongly basic', 'Lemon juice is pure distilled water', 'Litmus paper is broken'],
            correctIndex: 0,
            hint: 'Remember: Acid turns Blue litmus Red.',
            explanation: 'Citric acid in lemon juice turns blue litmus paper red.',
          },
          {
            topic: `${title} - Motion`,
            difficulty: 'medium',
            prompt: 'If a cyclist travels 30 km in 2 hours at a steady pace, what is their average speed?',
            options: ['15 km/h', '60 km/h', '32 km/h', '28 km/h'],
            correctIndex: 0,
            hint: 'Speed = Total Distance ÷ Total Time.',
            explanation: '30 km ÷ 2 hours = 15 km/h.',
          },
          {
            topic: `${title} - Health & Nutrition`,
            difficulty: 'medium',
            prompt: 'Deficiency of Vitamin C in the diet primarily leads to which condition?',
            options: ['Scurvy (bleeding gums)', 'Rickets', 'Goitre', 'Night blindness'],
            correctIndex: 0,
            hint: 'Citrus fruits like amla and oranges prevent this.',
            explanation: 'Vitamin C deficiency causes scurvy; Vitamin D prevents rickets, iodine prevents goitre, Vitamin A prevents night blindness.',
          },
          {
            topic: `${title} - Biology & Cells`,
            difficulty: 'hard',
            prompt: 'Which organelle in a plant cell captures light energy for photosynthesis and is absent in animal cells?',
            options: ['Chloroplast', 'Mitochondrion', 'Nucleus', 'Ribosome'],
            correctIndex: 0,
            hint: 'It contains the green pigment chlorophyll.',
            explanation: 'Chloroplasts house chlorophyll and carry out photosynthesis in plant cells.',
          },
          {
            topic: `${title} - Circuits`,
            difficulty: 'hard',
            prompt: 'In a simple parallel circuit with two bulbs, what happens if one bulb fuses/breaks?',
            options: ['The second bulb stays lit because it has its own independent path', 'Both bulbs immediately go out', 'The battery reverses polarity', 'Resistance becomes infinite everywhere'],
            correctIndex: 0,
            hint: 'Each branch in a parallel circuit connects directly across the battery.',
            explanation: 'Parallel branches operate independently, so current still flows through the intact branch.',
          },
          {
            topic: `${title} - Precision`,
            difficulty: 'hard',
            prompt: `Why is "${title}" foundational for understanding ${tier} science?`,
            options: ['It links measurable physical rules with real environmental and biological systems', 'It relies purely on memorization without logic', 'It applies only to non-living rocks', 'It ignores experimental proof'],
            correctIndex: 0,
            hint: 'Think of how concepts connect across physics, chemistry, and biology.',
            explanation: 'Core principles connect across disciplines to explain real systems accurately.',
          },
        ]
      : [
          {
            topic: `${title} - Earth & Space`,
            difficulty: 'easy',
            prompt: 'What causes day and night on Earth?',
            options: ['Earth rotating on its own axis', 'Earth orbiting Mars', 'The Moon blocking the Sun every night', 'Clouds covering the Sun'],
            correctIndex: 0,
            hint: 'One complete spin takes about 24 hours.',
            explanation: 'Earth’s rotation on its axis exposes different halves to sunlight over a 24-hour cycle.',
          },
          {
            topic: `${title} - Conservation`,
            difficulty: 'easy',
            prompt: 'Which practice directly helps conserve groundwater in a school or village?',
            options: ['Rainwater harvesting', 'Leaving taps open', 'Paving over all soil', 'Burning dry leaves'],
            correctIndex: 0,
            hint: 'Capturing roof rainwater and directing it into recharge pits.',
            explanation: 'Rainwater harvesting replenishes underground aquifers and reduces runoff.',
          },
          {
            topic: `${title} - Safety`,
            difficulty: 'easy',
            prompt: 'Why should you never touch electrical switches with wet hands?',
            options: ['Tap water contains dissolved ions that conduct electricity', 'Wet hands make plastic melt', 'Switches turn cold', 'Light bulbs become heavier'],
            correctIndex: 0,
            hint: 'Think about conductivity and electric shock risk.',
            explanation: 'Impure/tap water conducts electricity, creating a severe shock hazard.',
          },
          {
            topic: `${title} - Force & Work`,
            difficulty: 'medium',
            prompt: 'In physics, when is mechanical work said to be done on an object?',
            options: ['When a force causes displacement in the direction of the force', 'Whenever you stand still holding a heavy bag', 'Only when an object cools down', 'When speed is zero'],
            correctIndex: 0,
            hint: 'Work = Force × Displacement along the force.',
            explanation: 'Without displacement, mechanical work done is zero.',
          },
          {
            topic: `${title} - Environment`,
            difficulty: 'medium',
            prompt: 'Which gas is the primary contributor to the enhanced greenhouse effect when burned from fossil fuels?',
            options: ['Carbon dioxide (CO₂)', 'Argon', 'Oxygen', 'Helium'],
            correctIndex: 0,
            hint: 'Released when coal, petrol, or diesel burns.',
            explanation: 'Excess CO₂ traps outgoing infrared heat in the atmosphere.',
          },
          {
            topic: `${title} - Separation & Purity`,
            difficulty: 'medium',
            prompt: 'Which property allows iron filings to be separated easily from sand?',
            options: ['Magnetism', 'Solubility in water', 'Color alone', 'Boiling point'],
            correctIndex: 0,
            hint: 'Iron is attracted to a magnet while sand is not.',
            explanation: 'A magnet attracts ferromagnetic iron filings cleanly out of sand.',
          },
          {
            topic: `${title} - Quantitative Reasoning`,
            difficulty: 'hard',
            prompt: 'If a resistor carries a current of 2 A under a potential difference of 12 V, what is its resistance (V = IR)?',
            options: ['6 Ω', '24 Ω', '10 Ω', '0.16 Ω'],
            correctIndex: 0,
            hint: 'Rearrange Ohm’s law: R = V / I.',
            explanation: 'R = 12 V ÷ 2 A = 6 Ω.',
          },
          {
            topic: `${title} - Ecology`,
            difficulty: 'hard',
            prompt: 'In a food chain (Grass → Grasshopper → Frog → Snake), why is only about 10% of energy passed to the next level?',
            options: ['Most energy is used for life processes and lost as heat at each level', 'Sun stops shining on frogs', 'Snakes only eat rocks', 'Energy is destroyed permanently'],
            correctIndex: 0,
            hint: 'Think of movement, respiration, and warmth at every trophic level.',
            explanation: 'Organisms expend ~90% of assimilated energy in metabolism and heat, passing ~10% upward.',
          },
          {
            topic: `${title} - Review`,
            difficulty: 'hard',
            prompt: `Which strategy best strengthens mastery of "${title}"?`,
            options: ['Solving varied easy-to-hard scenarios and explaining the why behind each step', 'Skipping diagrams', 'Ignoring failed practice attempts', 'Studying only definitions without examples'],
            correctIndex: 0,
            hint: 'Active recall and error analysis lock in concepts.',
            explanation: 'Understanding underlying causes and reviewing missed items builds durable mastery.',
          },
        ];

  return {
    title,
    summary: `Class ${classLevel} Science module on ${title} featuring clear explanations, real-world examples, and adaptive checks.`,
    concepts,
    walkthrough: `Study each section of ${title}, paying attention to cause-and-effect rules. Use the right-side doubt chatbox anytime if you want a simpler example or step-by-step hint.`,
    faqs: [
      {
        question: `What is the key concept in ${title}?`,
        keywords: ['key', 'concept', 'important', 'summary', title.toLowerCase()],
        answer: `${concepts[0].explanation} Remember: ${concepts[0].keyRule}`,
        stepByStep: [concepts[0].example, concepts[1].keyRule],
      },
      {
        question: `How does ${title} apply in daily life?`,
        keywords: ['daily', 'life', 'example', 'use', 'real'],
        answer: `${concepts[2].explanation} ${concepts[2].example}`,
        stepByStep: ['Observe the everyday phenomenon.', 'Identify the scientific rule involved.', 'Test or verify with measurement.'],
      },
    ],
    questions,
  };
}

function buildSocialSpec(classLevel: number, title: string, moduleNum: 1 | 2 | 3 | 4): TopicSpec {
  const concepts: StudySection[] = [
    {
      heading: `Historical & Civic Context: ${title}`,
      explanation: `In Class ${classLevel}, "${title}" examines how societies organize communities, govern fairly, manage geography, and build sustainable livelihoods.`,
      keyRule: `Always trace timelines (when), geography (where), and human impact (why it matters).`,
      example: `Connect local community examples—like village panchayats or water conservation—to broader national institutions.`,
    },
    {
      heading: 'Cause, Effect & Institutions',
      explanation: `Events in history and civics never happen in isolation; economic needs, laws, and geographical features shape human decisions.`,
      keyRule: `Look for constitutional values: equality, justice, participation, and accountability.`,
      example: `Compare rights with responsibilities in democratic citizenship.`,
    },
    {
      heading: 'Map & Source Reading',
      explanation: `Reading timelines, maps, and primary accounts carefully prevents confusion between periods, regions, and government roles.`,
      keyRule: `Verify the scale, legend, and timeline order before answering analytical questions.`,
      example: `Rivers and fertile plains historically supported early settlements and trade routes.`,
    },
  ];

  const questions: TopicSpec['questions'] = [
    {
      topic: `${title} - Foundations`,
      difficulty: 'easy',
      prompt: 'Which institution forms the foundation of rural local self-government in India?',
      options: ['Gram Panchayat', 'Supreme Court', 'Reserve Bank', 'Space Commission'],
      correctIndex: 0,
      hint: 'Operates at the village level under Panchayati Raj.',
      explanation: 'The Gram Panchayat manages local village governance, water, roads, and community welfare.',
    },
    {
      topic: `${title} - Geography`,
      difficulty: 'easy',
      prompt: 'Which imaginary line at 0° latitude divides Earth into the Northern and Southern Hemispheres?',
      options: ['Equator', 'Prime Meridian', 'Tropic of Capricorn', 'Arctic Circle'],
      correctIndex: 0,
      hint: 'Runs horizontally around the middle of the globe.',
      explanation: 'The Equator (0° latitude) divides Earth into Northern and Southern Hemispheres.',
    },
    {
      topic: `${title} - Civics`,
      difficulty: 'easy',
      prompt: 'Why are rules and laws essential in a community or school?',
      options: ['They protect fairness, safety, and everyone’s rights', 'They prevent people from learning', 'They exist only for decoration', 'They remove all responsibilities'],
      correctIndex: 0,
      hint: 'Imagine a road without traffic rules.',
      explanation: 'Fair laws ensure safety, resolve disputes peacefully, and protect citizen rights.',
    },
    {
      topic: `${title} - History`,
      difficulty: 'medium',
      prompt: 'Why did many ancient civilizations (such as the Indus Valley) flourish near major river valleys?',
      options: ['Rivers provided water for drinking, irrigation, fertile soil, and transport', 'Rivers froze all year', 'There was no soil anywhere else on Earth', 'Mountains could not be seen'],
      correctIndex: 0,
      hint: 'Think about agriculture and trade in early settlements.',
      explanation: 'Alluvial soil, reliable water, and boat transport enabled farming surpluses and urban growth.',
    },
    {
      topic: `${title} - Resources`,
      difficulty: 'medium',
      prompt: 'Which of the following is classified as a renewable natural resource?',
      options: ['Solar energy', 'Coal', 'Petroleum', 'Natural gas'],
      correctIndex: 0,
      hint: 'It replenishes naturally on a human timescale.',
      explanation: 'Solar energy is continuously replenished, whereas fossil fuels take millions of years to form.',
    },
    {
      topic: `${title} - Economics`,
      difficulty: 'medium',
      prompt: 'Farming, fishing, and forestry belong to which sector of the economy?',
      options: ['Primary sector', 'Secondary sector', 'Tertiary sector', 'Digital-only sector'],
      correctIndex: 0,
      hint: 'They directly extract or harvest natural products.',
      explanation: 'Activities using natural resources directly form the Primary sector.',
    },
    {
      topic: `${title} - Constitutional Values`,
      difficulty: 'hard',
      prompt: 'What does "separation of powers" in a democratic constitution achieve?',
      options: ['Prevents concentration of power by dividing authority among legislature, executive, and judiciary', 'Gives all power to one official', 'Abolishes courts', 'Eliminates elections'],
      correctIndex: 0,
      hint: 'Think of checks and balances between branches of government.',
      explanation: 'Dividing powers among three independent organs maintains accountability and protects rights.',
    },
    {
      topic: `${title} - Historical Analysis`,
      difficulty: 'hard',
      prompt: 'Why do historians cross-check inscriptions, coins, and written accounts together?',
      options: ['Comparing multiple independent sources reduces bias and confirms historical accuracy', 'Coins have longer stories than books', 'Written accounts are always identical', 'Only modern newspapers count'],
      correctIndex: 0,
      hint: 'Different sources reveal economic, political, and everyday perspectives.',
      explanation: 'Corroborating archaeological and textual sources produces reliable historical conclusions.',
    },
    {
      topic: `${title} - Applied Civics`,
      difficulty: 'hard',
      prompt: `How does studying "${title}" help students become active citizens?`,
      options: ['It builds awareness of rights, civic duties, sustainable resources, and informed participation', 'It discourages community cooperation', 'It focuses only on memorizing random dates', 'It ignores local governance'],
      correctIndex: 0,
      hint: 'Consider how knowledge shapes community participation.',
      explanation: 'Understanding governance, history, and resources empowers informed, responsible citizenship.',
    },
  ];

  // Vary question order & module emphasis by moduleNum so each module feels distinct
  const rotated = [...questions.slice(moduleNum - 1), ...questions.slice(0, moduleNum - 1)];

  return {
    title,
    summary: `Class ${classLevel} Social Studies module exploring ${title} through maps, timelines, and civic reasoning.`,
    concepts,
    walkthrough: `Explore how geography, history, and civic institutions connect in ${title}. Try explaining each key rule in your own words before starting practice.`,
    faqs: [
      {
        question: `What should I focus on in ${title}?`,
        keywords: ['focus', 'important', 'history', 'civics', 'geography', title.toLowerCase()],
        answer: `${concepts[0].explanation} ${concepts[0].keyRule}`,
        stepByStep: [concepts[1].keyRule, concepts[2].keyRule],
      },
      {
        question: `How do I remember timelines and concepts better?`,
        keywords: ['remember', 'timeline', 'date', 'map', 'study'],
        answer: 'Group events by cause and effect rather than memorizing isolated dates.',
        stepByStep: ['Identify the problem or trigger.', 'Note the key action or policy.', 'Observe the long-term outcome.'],
      },
    ],
    questions: rotated,
  };
}

function buildHindiSpec(classLevel: number, title: string, moduleNum: 1 | 2 | 3 | 4): TopicSpec {
  const concepts: StudySection[] = [
    {
      heading: `Hindi Mastery: ${title}`,
      explanation: `In Class ${classLevel}, "${title}" strengthens clear reading, correct matra and vyakaran (grammar) usage, and confident expression in Hindi.`,
      keyRule: `Pay close attention to matra placement, ling (gender), and vachan (number) agreement.`,
      example: `Example: "लड़का पढ़ता है" (singular) vs "लड़के पढ़ते हैं" (plural).`,
    },
    {
      heading: 'Shabd Bhandar & Sentence Flow',
      explanation: `Rich vocabulary—vilom (antonyms), paryayvachi (synonyms), and muhavare—makes writing expressive and precise.`,
      keyRule: `Verify the context of a sentence before selecting a synonym or idiom.`,
      example: `"आँखों का तारा" means बहुत प्यारा (very dear), used to express affection.`,
    },
    {
      heading: 'Reading & Writing Check',
      explanation: `Read Hindi passages attentively for central meaning, character traits, and proper punctuation (पूर्ण विराम '।' at sentence end).`,
      keyRule: `Always conclude Hindi declarative sentences with पूर्ण विराम (।).`,
      example: `"मैं रोज़ समय पर पढ़ता हूँ।" uses proper verb agreement and purna viram.`,
    },
  ];

  const questions: TopicSpec['questions'] = [
    {
      topic: `${title} - Vyakaran`,
      difficulty: 'easy',
      prompt: 'Which punctuation mark ends a normal declarative sentence in Hindi?',
      options: ['पूर्ण विराम (।)', 'प्रश्नवाचक चिह्न (?)', 'अल्पविराम (,)', 'योजक चिह्न (-)'],
      correctIndex: 0,
      hint: 'It looks like a vertical bar at the end of a Hindi sentence.',
      explanation: 'पूर्ण विराम (।) marks the completion of a declarative sentence in Hindi.',
    },
    {
      topic: `${title} - Shabd Gyan`,
      difficulty: 'easy',
      prompt: 'Choose the correct Vilom (opposite word) for "सत्य" (Truth):',
      options: ['असत्य', 'ईमानदारी', 'प्रकाश', 'मित्र'],
      correctIndex: 0,
      hint: 'Add the prefix "अ-" to negate सत्य.',
      explanation: 'सत्य का विलोम शब्द "असत्य" (Falsehood) होता है।',
    },
    {
      topic: `${title} - Sangya`,
      difficulty: 'easy',
      prompt: 'In the sentence "हिमालय भारत के उत्तर में है", which word is a व्यक्तिवाचक संज्ञा (Proper Noun)?',
      options: ['हिमालय', 'उत्तर', 'में', 'है'],
      correctIndex: 0,
      hint: 'A specific mountain or country name is a proper noun.',
      explanation: 'हिमालय (and भारत) name specific entities, making them व्यक्तिवाचक संज्ञा.',
    },
    {
      topic: `${title} - Ling & Vachan`,
      difficulty: 'medium',
      prompt: 'Select the correct plural form (बहुवचन) of "किताब" (Book):',
      options: ['किताबें', 'किताबों', 'किताबा', 'किताबी'],
      correctIndex: 0,
      hint: 'Feminine nouns ending in a consonant commonly take "-एँ".',
      explanation: 'एकवचन "किताब" का सही बहुवचन "किताबें" है।',
    },
    {
      topic: `${title} - Paryayvachi`,
      difficulty: 'medium',
      prompt: 'Which word is a Paryayvachi (synonym) of "सूर्य" (Sun)?',
      options: ['दिनकर', 'शशि', 'जलज', 'पवन'],
      correctIndex: 0,
      hint: 'Think of "the maker of the day" (दिन + कर).',
      explanation: 'दिनकर, रवि, और भास्कर सूर्य के पर्यायवाची हैं; शशि चंद्रमा का पर्यायवाची है।',
    },
    {
      topic: `${title} - Muhavare`,
      difficulty: 'medium',
      prompt: 'What is the meaning of the Hindi idiom "नौ दो ग्यारह होना"?',
      options: ['भाग जाना (To run away quickly)', 'गिनती सीखना', 'मदद करना', 'सो जाना'],
      correctIndex: 0,
      hint: 'Often used when a thief vanishes quickly.',
      explanation: '"नौ दो ग्यारह होना" एक प्रसिद्ध मुहावरा है जिसका अर्थ "चुपचाप भाग जाना" होता है।',
    },
    {
      topic: `${title} - Vakya Shuddhi`,
      difficulty: 'hard',
      prompt: 'Identify the grammatically pure (शुद्ध) Hindi sentence:',
      options: ['बच्चे मैदान में खेल रहे हैं।', 'बच्चे मैदान में खेल रहा है।', 'बच्चा मैदान में खेल रहे हैं।', 'बच्चों मैदान में खेल रही है।'],
      correctIndex: 0,
      hint: 'Match plural subject "बच्चे" with plural verb "खेल रहे हैं".',
      explanation: '"बच्चे" बहुवचन पुल्लिंग है, इसलिए "खेल रहे हैं" बिल्कुल शुद्ध है।',
    },
    {
      topic: `${title} - Upsarg & Pratyay`,
      difficulty: 'hard',
      prompt: 'In the word "सफलता", identify the Pratyay (suffix):',
      options: ['ता', 'स', 'फल', 'अ'],
      correctIndex: 0,
      hint: 'A suffix (प्रत्यय) attaches at the end of a root word (सफल).',
      explanation: 'मूल शब्द "सफल" में "ता" प्रत्यय जोड़ने से "सफलता" बनता है।',
    },
    {
      topic: `${title} - Comprehension`,
      difficulty: 'hard',
      prompt: 'Why is "अभ्यास" (regular practice) highlighted across Hindi literature and grammar?',
      options: ['निरंतर अभ्यास से भाषा की शुद्धता और समझ दोनों बढ़ती हैं', 'अभ्यास से शब्द भूल जाते हैं', 'व्याकरण की आवश्यकता नहीं रहती', 'पढ़ना बंद हो जाता है'],
      correctIndex: 0,
      hint: 'Think of the proverb "करत-करत अभ्यास के..."',
      explanation: 'नियमित अभ्यास से वर्तनी, व्याकरण और अभिव्यक्ति में निपुणता आती है।',
    },
  ];

  const rotated = [...questions.slice(moduleNum - 1), ...questions.slice(0, moduleNum - 1)];

  return {
    title,
    summary: `Class ${classLevel} Hindi module covering ${title} with clear examples in Devanagari and English support.`,
    concepts,
    walkthrough: `Read the Hindi grammar rule and example sentence aloud, then practice identifying correct spellings, synonyms, and sentence agreement.`,
    faqs: [
      {
        question: `How do I check Hindi sentence correctness in ${title}?`,
        keywords: ['hindi', 'sentence', 'grammar', 'vyakaran', 'check', title.toLowerCase()],
        answer: `${concepts[0].explanation} ${concepts[0].example}`,
        stepByStep: ['Check the subject (कर्ता) gender and number.', 'Match the verb (क्रिया) ending.', 'End with पूर्ण विराम (।).'],
      },
    ],
    questions: rotated,
  };
}

function buildComputingSpec(classLevel: number, title: string, moduleNum: 1 | 2 | 3 | 4): TopicSpec {
  const concepts: StudySection[] = [
    {
      heading: `Computational Thinking: ${title}`,
      explanation: `In Class ${classLevel}, "${title}" teaches you how to break big problems into clear, ordered steps that both humans and computers can follow reliably.`,
      keyRule: `Decompose a task into Input → Process → Output, and test edge cases.`,
      example: `Before writing code or formulas, trace what happens for small sample inputs on paper.`,
    },
    {
      heading: 'Logic, Patterns & Data',
      explanation: `Loops automate repeated steps, conditionals ("if-else") make decisions, and structured storage keeps information easy to retrieve offline.`,
      keyRule: `Always initialize variables before using them and handle invalid or empty inputs gracefully.`,
      example: `An offline-first app saves data locally first in IndexedDB, then syncs changes when internet returns.`,
    },
    {
      heading: 'Digital Safety & Reliability',
      explanation: `Strong passwords, verifying sources before sharing, and backing up work protect learners in both online and offline classrooms.`,
      keyRule: `Never share private passwords or personal credentials with untrusted links.`,
      example: `Use a unique passphrase and check website URLs carefully before logging in.`,
    },
  ];

  const questions: TopicSpec['questions'] = [
    {
      topic: `${title} - Algorithms`,
      difficulty: 'easy',
      prompt: 'What is an "algorithm" in computer science?',
      options: ['A clear, step-by-step set of instructions to solve a problem', 'A physical monitor screen', 'A type of printer cable', 'A broken file'],
      correctIndex: 0,
      hint: 'Think of a recipe with ordered steps.',
      explanation: 'An algorithm is a finite, ordered sequence of steps that transforms inputs into a desired output.',
    },
    {
      topic: `${title} - Input & Output`,
      difficulty: 'easy',
      prompt: 'Which device is primarily an INPUT device?',
      options: ['Keyboard', 'Monitor', 'Speaker', 'Projector'],
      correctIndex: 0,
      hint: 'Which one sends your keystrokes into the computer?',
      explanation: 'A keyboard sends user input into the computer; monitors, speakers, and projectors produce output.',
    },
    {
      topic: `${title} - Digital Safety`,
      difficulty: 'easy',
      prompt: 'Which password is the strongest and safest for a student account?',
      options: ['M@ngo72River!Book', '123456', 'password', 'student'],
      correctIndex: 0,
      hint: 'Strong passwords combine length, uppercase, lowercase, numbers, and symbols.',
      explanation: 'Long mixed-character passphrases resist guessing far better than common words or sequences.',
    },
    {
      topic: `${title} - Control Flow`,
      difficulty: 'medium',
      prompt: 'In programming, which structure repeats a block of steps automatically until a condition is met?',
      options: ['A Loop (for / while)', 'A Comment', 'A Folder Name', 'A Font Size'],
      correctIndex: 0,
      hint: 'Think of repeating a practice check 5 times.',
      explanation: 'Loops automate repetition cleanly without rewriting identical lines.',
    },
    {
      topic: `${title} - Storage & Offline`,
      difficulty: 'medium',
      prompt: 'Why do offline-first educational apps store downloaded lessons in local browser storage (IndexedDB)?',
      options: ['So students can study and practice even with zero internet connectivity', 'To erase progress on refresh', 'To make text blurry', 'To block keyboard input'],
      correctIndex: 0,
      hint: 'Think about learning in low-bandwidth or zero-internet regions.',
      explanation: 'IndexedDB persists structured lessons, questions, and answers locally for uninterrupted offline learning.',
    },
    {
      topic: `${title} - Logic`,
      difficulty: 'medium',
      prompt: 'If a conditional rule says: "IF score >= 80 THEN difficulty = Hard ELSE difficulty = Medium", what happens when score is 75?',
      options: ['difficulty becomes Medium', 'difficulty becomes Hard', 'score becomes 80', 'Nothing runs'],
      correctIndex: 0,
      hint: 'Check whether 75 >= 80 is True or False.',
      explanation: 'Since 75 >= 80 is False, the ELSE branch executes and selects Medium.',
    },
    {
      topic: `${title} - Binary & Data`,
      difficulty: 'hard',
      prompt: 'What is the decimal value of the binary number 1010₂?',
      options: ['10', '12', '8', '5'],
      correctIndex: 0,
      hint: 'Place values from right to left are 1, 2, 4, 8.',
      explanation: '1×8 + 0×4 + 1×2 + 0×1 = 8 + 2 = 10.',
    },
    {
      topic: `${title} - Debugging`,
      difficulty: 'hard',
      prompt: 'A loop meant to count from 1 to 5 stops at 4 because it wrote "while (i < 5)" starting at i = 1. What kind of bug is this?',
      options: ['Off-by-one logic error', 'Hardware power failure', 'Monitor resolution error', 'Network timeout'],
      correctIndex: 0,
      hint: 'Check the boundary condition "< 5" vs "<= 5".',
      explanation: 'Using "< 5" instead of "<= 5" misses the boundary value 5—a classic off-by-one error.',
    },
    {
      topic: `${title} - Architecture`,
      difficulty: 'hard',
      prompt: 'Why must offline practice attempts include a unique ID and timestamp before syncing with a server?',
      options: ['To prevent duplicate entries and keep student progress accurate when reconnecting', 'To slow down the browser', 'To delete earlier scores', 'To hide the subject name'],
      correctIndex: 0,
      hint: 'Think about what happens if a sync runs twice on flaky internet.',
      explanation: 'Unique IDs allow idempotent syncing so reconnections never double-count or lose student attempts.',
    },
  ];

  const rotated = [...questions.slice(moduleNum - 1), ...questions.slice(0, moduleNum - 1)];

  return {
    title,
    summary: `Class ${classLevel} Computing & Logic module on ${title} with step-by-step tracing and practical thinking checks.`,
    concepts,
    walkthrough: `Trace each rule carefully using Input → Process → Output. Practice breaking problems into smaller steps before testing your logic in the quiz.`,
    faqs: [
      {
        question: `How does offline sync work in ${title}?`,
        keywords: ['offline', 'sync', 'indexeddb', 'storage', 'logic', title.toLowerCase()],
        answer: `${concepts[1].explanation} ${concepts[1].example}`,
        stepByStep: ['Save lessons and attempts locally first.', 'Mark unsynced items cleanly.', 'Sync automatically once internet returns.'],
      },
    ],
    questions: rotated,
  };
}

// Build complete master curriculum for Class 1..10 (10 classes * 6 subjects * 4 modules = 240 modules)
export interface MasterCurriculum {
  modules: LearningModule[];
  questions: QuestionItem[];
}

function buildMasterCurriculum(): MasterCurriculum {
  const modules: LearningModule[] = [];
  const questions: QuestionItem[] = [];

  for (let classLevel = 1; classLevel <= 10; classLevel++) {
    const subjects = getSubjectsForClass(classLevel);
    for (const subject of subjects) {
      for (const moduleNumber of [1, 2, 3, 4] as const) {
        const moduleId = `c${classLevel}-${subject.id}-m${moduleNumber}`;
        const spec = buildSubjectSpec(classLevel, subject, moduleNumber);

        modules.push({
          id: moduleId,
          classLevel,
          subjectId: subject.id,
          subjectName: subject.name,
          moduleNumber,
          title: spec.title,
          summary: spec.summary,
          estimatedMinutes: 12 + classLevel * 2,
          learningMaterial: spec.concepts,
          moduleExplanation: spec.walkthrough,
          faqs: spec.faqs,
        });

        if (subject.id === 'math') {
          const mathQs = generateMathModuleQuestions(classLevel, moduleNumber, moduleId, spec.title);
          questions.push(...mathQs);
        } else {
          spec.questions.forEach((item, idx) => {
            questions.push({
              id: `${moduleId}-q${idx + 1}`,
              classLevel,
              subjectId: subject.id,
              moduleId,
              topic: item.topic,
              difficulty: item.difficulty,
              prompt: item.prompt,
              options: item.options,
              correctIndex: item.correctIndex,
              hint: item.hint,
              explanation: item.explanation,
            });
          });
        }
      }
    }
  }

  return { modules, questions };
}

export const MASTER_CURRICULUM: MasterCurriculum = buildMasterCurriculum();
