'use client';

import { useTranslations } from 'next-intl';
import { NAV_ITEMS, type PatientSection } from './nav-items';

interface BottomNavProps {
  active: PatientSection;
  onChange: (section: PatientSection) => void;
  badges?: Partial<Record<PatientSection, number>>;
}

export default function BottomNav({ active, onChange, badges = {} }: BottomNavProps) {
  const t = useTranslations('nav');
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/40 shadow-lg">
      <div
        className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)', // safe area for home indicator
        }}
      >
        {NAV_ITEMS.map(({ key, labelKey, icon: Icon, color, activeColor, activeBg }) => {
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
              <span>{t(labelKey)}</span>
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
