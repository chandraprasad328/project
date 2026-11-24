export interface SubjectPalette {
  topBar: string;
  softBg: string;
  softBorder: string;
  iconBg: string;
  iconText: string;
  accentText: string;
  progressFill: string;
  activeTab: string;
}

const PALETTES: Record<string, SubjectPalette> = {
  math: {
    topBar: 'bg-sky-600',
    softBg: 'bg-sky-50/70',
    softBorder: 'border-sky-200',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-700',
    accentText: 'text-sky-700',
    progressFill: 'bg-sky-600',
    activeTab: 'border-sky-600 bg-sky-50 text-sky-950',
  },
  science: {
    topBar: 'bg-emerald-600',
    softBg: 'bg-emerald-50/70',
    softBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    accentText: 'text-emerald-700',
    progressFill: 'bg-emerald-600',
    activeTab: 'border-emerald-600 bg-emerald-50 text-emerald-950',
  },
  phychem: {
    topBar: 'bg-cyan-600',
    softBg: 'bg-cyan-50/70',
    softBorder: 'border-cyan-200',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-700',
    accentText: 'text-cyan-700',
    progressFill: 'bg-cyan-600',
    activeTab: 'border-cyan-600 bg-cyan-50 text-cyan-950',
  },
  biology: {
    topBar: 'bg-teal-600',
    softBg: 'bg-teal-50/70',
    softBorder: 'border-teal-200',
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-700',
    accentText: 'text-teal-700',
    progressFill: 'bg-teal-600',
    activeTab: 'border-teal-600 bg-teal-50 text-teal-950',
  },
  evs: {
    topBar: 'bg-emerald-600',
    softBg: 'bg-emerald-50/70',
    softBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    accentText: 'text-emerald-700',
    progressFill: 'bg-emerald-600',
    activeTab: 'border-emerald-600 bg-emerald-50 text-emerald-950',
  },
  english: {
    topBar: 'bg-violet-600',
    softBg: 'bg-violet-50/70',
    softBorder: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700',
    accentText: 'text-violet-700',
    progressFill: 'bg-violet-600',
    activeTab: 'border-violet-600 bg-violet-50 text-violet-950',
  },
  social: {
    topBar: 'bg-amber-600',
    softBg: 'bg-amber-50/70',
    softBorder: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    accentText: 'text-amber-700',
    progressFill: 'bg-amber-600',
    activeTab: 'border-amber-600 bg-amber-50 text-amber-950',
  },
  hindi: {
    topBar: 'bg-orange-600',
    softBg: 'bg-orange-50/70',
    softBorder: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-700',
    accentText: 'text-orange-700',
    progressFill: 'bg-orange-600',
    activeTab: 'border-orange-600 bg-orange-50 text-orange-950',
  },
  computer: {
    topBar: 'bg-indigo-600',
    softBg: 'bg-indigo-50/70',
    softBorder: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-700',
    accentText: 'text-indigo-700',
    progressFill: 'bg-indigo-600',
    activeTab: 'border-indigo-600 bg-indigo-50 text-indigo-950',
  },
  logic: {
    topBar: 'bg-indigo-600',
    softBg: 'bg-indigo-50/70',
    softBorder: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-700',
    accentText: 'text-indigo-700',
    progressFill: 'bg-indigo-600',
    activeTab: 'border-indigo-600 bg-indigo-50 text-indigo-950',
  },
};

export function getSubjectPalette(subjectId: string): SubjectPalette {
  return PALETTES[subjectId] || PALETTES.math;
}
