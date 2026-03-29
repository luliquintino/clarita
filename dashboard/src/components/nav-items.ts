import {
  Home,
  FileText,
  FlaskConical,
  ClipboardList,
  Target,
  BookOpen,
  Pill,
  type LucideIcon,
} from 'lucide-react';

export type PatientSection =
  | 'home'
  | 'exams'
  | 'tests'
  | 'anamnesis'
  | 'goals'
  | 'history'
  | 'medications';

export const NAV_ITEMS: Array<{
  key: PatientSection;
  labelKey: PatientSection;
  icon: LucideIcon;
  color: string;
  activeColor: string;
  activeBg: string;
}> = [
  {
    key: 'home',
    labelKey: 'home',
    icon: Home,
    color: 'text-gray-400',
    activeColor: 'text-clarita-green-600',
    activeBg: 'bg-clarita-green-50 border-clarita-green-200',
  },
  {
    key: 'exams',
    labelKey: 'exams',
    icon: FileText,
    color: 'text-gray-400',
    activeColor: 'text-clarita-green-700',
    activeBg: 'bg-green-50 border-green-200',
  },
  {
    key: 'tests',
    labelKey: 'tests',
    icon: FlaskConical,
    color: 'text-gray-400',
    activeColor: 'text-indigo-500',
    activeBg: 'bg-indigo-50 border-indigo-100',
  },
  {
    key: 'anamnesis',
    labelKey: 'anamnesis',
    icon: ClipboardList,
    color: 'text-gray-400',
    activeColor: 'text-teal-600',
    activeBg: 'bg-teal-50 border-teal-200',
  },
  {
    key: 'goals',
    labelKey: 'goals',
    icon: Target,
    color: 'text-gray-400',
    activeColor: 'text-clarita-purple-600',
    activeBg: 'bg-purple-50 border-purple-200',
  },
  {
    key: 'history',
    labelKey: 'history',
    icon: BookOpen,
    color: 'text-gray-400',
    activeColor: 'text-blue-600',
    activeBg: 'bg-blue-50 border-blue-200',
  },
  {
    key: 'medications',
    labelKey: 'medications',
    icon: Pill,
    color: 'text-gray-400',
    activeColor: 'text-amber-600',
    activeBg: 'bg-amber-50 border-amber-200',
  },
];
