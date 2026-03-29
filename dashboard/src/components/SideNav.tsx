'use client';

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NAV_ITEMS, type PatientSection } from './nav-items';
import type { AuthUser } from '@/lib/api';

interface SideNavProps {
  user: AuthUser | null;
  active: PatientSection;
  onChange: (section: PatientSection) => void;
  badges?: Partial<Record<PatientSection, number>>;
  onLogout: () => void;
}

export default function SideNav({ user, active, onChange, badges = {}, onLogout }: SideNavProps) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 z-30 glass border-r border-white/30">
      {/* Logo + user */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/20">
        <Image src="/logo-clarita.png" alt="Clarita" width={32} height={25} className="drop-shadow-sm flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {user?.first_name || 'Paciente'}
          </p>
          <p className="text-xs text-gray-400">Minha conta</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, labelKey, icon: Icon, color, activeColor, activeBg }) => {
          const isActive = active === key;
          const badge = badges[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`
                relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 border text-left
                ${isActive
                  ? `${activeColor} ${activeBg} shadow-sm`
                  : `${color} bg-transparent border-transparent hover:bg-gray-50`
                }
              `}
            >
              <Icon size={18} className={isActive ? activeColor : color} />
              <span>{t(labelKey)}</span>
              {badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold bg-gradient-to-r from-clarita-purple-400 to-clarita-green-400 text-white rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/20 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all border border-transparent"
        >
          <LogOut size={18} />
          {tAuth('logout')}
        </button>
      </div>
    </aside>
  );
}
