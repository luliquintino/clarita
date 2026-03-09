'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';
import { removeToken, patientsApi, chatApi } from '@/lib/api';
import PatientCircle from './PatientCircle';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarPatient {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
}

interface SidebarProps {
  alertCount?: number;
}

export default function Sidebar({ alertCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [patients, setPatients] = useState<SidebarPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    loadPatients();
    loadChatUnread();
    const interval = setInterval(loadChatUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const data = await patientsApi.list();
      const raw = data as any;
      const patientsList: SidebarPatient[] = (Array.isArray(raw) ? raw : (raw?.patients ?? []))
        .map((p: Record<string, unknown>) => ({
          id: p.id as string,
          first_name: p.first_name as string,
          last_name: p.last_name as string,
          avatar_url: (p.avatar_url || null) as string | null,
        }))
        .sort((a: SidebarPatient, b: SidebarPatient) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'pt-BR')
        );
      setPatients(patientsList);
    } catch {
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  };

  const loadChatUnread = async () => {
    try {
      const data = await chatApi.getUnreadCount();
      const raw = data as any;
      setChatUnread(raw?.unread_count ?? 0);
    } catch {
      // Silent fail
    }
  };

  const activePatientId = pathname.startsWith('/patients/') ? pathname.split('/')[2] : null;

  const navItems: NavItem[] = [
    {
      label: 'Pacientes',
      href: '/patients',
      icon: <Users size={20} />,
    },
    {
      label: 'Alertas',
      href: '/alerts',
      icon: <Bell size={20} />,
      badge: alertCount,
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: <MessageCircle size={20} />,
      badge: chatUnread,
    },
    {
      label: 'Perfil',
      href: '/profile',
      icon: <User size={20} />,
    },
  ];

  const handleLogout = () => {
    removeToken();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full
        bg-white/70 backdrop-blur-xl border-r border-white/30
        flex flex-col transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/30">
        <Image
          src="/logo-clarita.png"
          alt="Clarita"
          width={44}
          height={36}
          className="rounded-xl flex-shrink-0 drop-shadow-md"
        />
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-slate-700 tracking-tight">Clarita</h1>
            <p className="text-[10px] text-gray-400 -mt-0.5">Profissional</p>
          </div>
        )}
      </div>

      {/* Patient list */}
      <div className="px-3 pt-4 pb-2 overflow-y-auto max-h-[40vh]">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 px-3 animate-fade-in">
            Pacientes
          </p>
        )}
        <div className="space-y-1">
          {patientsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
          ) : patients.length === 0 ? (
            <p className={`text-xs text-gray-400 ${collapsed ? 'text-center' : 'px-3'}`}>
              {collapsed ? '\u2014' : 'Nenhum paciente'}
            </p>
          ) : (
            patients.map((patient) => (
              <PatientCircle
                key={patient.id}
                patient={patient}
                isActive={activePatientId === patient.id}
                collapsed={collapsed}
                onClick={() => router.push(`/patients/${patient.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/30" />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/patients'
              ? pathname === '/patients'
              : pathname === item.href || pathname.startsWith(item.href + '/');

          const activeClasses =
            'bg-clarita-green-50/50 border-l-4 border-l-clarita-green-400 text-clarita-green-700 font-medium';
          const inactiveClasses =
            'text-gray-500 hover:bg-white/50 hover:text-gray-700 border-l-4 border-l-transparent';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive ? activeClasses : inactiveClasses}
                ${collapsed ? 'justify-center border-l-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0 relative">
                {item.icon}
                {/* Collapsed badge (icon-overlaid) */}
                {item.badge != null && item.badge > 0 && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gradient-to-r from-red-500 to-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-subtle shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>

              {!collapsed && <span className="flex-1 animate-fade-in">{item.label}</span>}

              {/* Expanded badge */}
              {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-500 to-red-400 text-white shadow-sm animate-pulse-subtle">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
            text-gray-400 hover:bg-red-50/80 hover:text-red-500 w-full
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span className="animate-fade-in">Sair</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-xl text-gray-400 hover:bg-white/50 hover:text-gray-600 transition-all duration-200"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
