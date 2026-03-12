'use client';

import { Home, FileText, Pill, FlaskConical, ClipboardList, Target, BookOpen, type LucideIcon } from 'lucide-react';

export type PatientSection =
  | 'home'
  | 'exams'
  | 'prescriptions'
  | 'tests'
  | 'anamnesis'
  | 'goals'
  | 'history';

interface BottomNavProps {
  active: PatientSection;
  onChange: (section: PatientSection) => void;
  badges?: Partial<Record<PatientSection, number>>;
}

const NAV_ITEMS: Array<{
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

export default function BottomNav({ active, onChange, badges = {} }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/40 shadow-lg">
      <div
        className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon, color, activeColor, activeBg }) => {
          const isActive = active === key;
          const badge = badges[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`
                relative flex-shrink-0 flex flex-col items-center justify-center gap-0.5
                min-w-[64px] px-2 py-2 rounded-2xl text-[10px] font-medium
                transition-all duration-200 border
                ${isActive
                  ? `${activeColor} ${activeBg} shadow-sm`
                  : `${color} bg-transparent border-transparent`
                }
              `}
            >
              <Icon size={20} className={isActive ? activeColor : color} />
              <span>{label}</span>
              {badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-gradient-to-r from-clarita-purple-400 to-clarita-green-400 text-white rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
