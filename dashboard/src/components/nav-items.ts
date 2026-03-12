import {
  Home,
  FileText,
  Pill,
  FlaskConical,
  ClipboardList,
  Target,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export type PatientSection =
  | 'home'
  | 'exams'
  | 'prescriptions'
  | 'tests'
  | 'anamnesis'
  | 'goals'
  | 'history';

export const NAV_ITEMS: Array<{
  key: PatientSection;
  label: string;
  icon: LucideIcon;
  color: string;
  activeColor: string;
  activeBg: string;
}> = [
  {
    key: 'home',
    label: 'Home',
    icon: Home,
    color: 'text-gray-400',
    activeColor: 'text-clarita-green-600',
    activeBg: 'bg-clarita-green-50 border-clarita-green-200',
  },
  {
    key: 'exams',
    label: 'Exames',
    icon: FileText,
    color: 'text-gray-400',
    activeColor: 'text-clarita-green-700',
    activeBg: 'bg-green-50 border-green-200',
  },
  {
    key: 'prescriptions',
    label: 'Prescrições',
    icon: Pill,
    color: 'text-gray-400',
    activeColor: 'text-indigo-600',
    activeBg: 'bg-indigo-50 border-indigo-200',
  },
  {
    key: 'tests',
    label: 'Testes',
    icon: FlaskConical,
    color: 'text-gray-400',
    activeColor: 'text-indigo-500',
    activeBg: 'bg-indigo-50 border-indigo-100',
  },
  {
    key: 'anamnesis',
    label: 'Anamnese',
    icon: ClipboardList,
    color: 'text-gray-400',
    activeColor: 'text-teal-600',
    activeBg: 'bg-teal-50 border-teal-200',
  },
  {
    key: 'goals',
    label: 'Metas',
    icon: Target,
    color: 'text-gray-400',
    activeColor: 'text-clarita-purple-600',
    activeBg: 'bg-purple-50 border-purple-200',
  },
  {
    key: 'history',
    label: 'Histórico',
    icon: BookOpen,
    color: 'text-gray-400',
    activeColor: 'text-blue-600',
    activeBg: 'bg-blue-50 border-blue-200',
  },
];
