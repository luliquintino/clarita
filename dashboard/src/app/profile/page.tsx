'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  BadgeCheck,
  Building2,
  Stethoscope,
  Calendar,
  Hash,
  Loader2,
  LogOut,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { authApi, removeToken, isAuthenticated, getToken } from '@/lib/api';

interface Profile {
  license_number?: string;
  specialization?: string;
  institution?: string;
  bio?: string;
  years_of_experience?: number;
}

interface UserData {
  id: string;
  email: string;
  role: 'patient' | 'psychologist' | 'psychiatrist';
  first_name: string;
  last_name: string;
  phone?: string;
  display_id: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  psychologist: 'Psicóloga(o)',
  psychiatrist: 'Psiquiatra',
  patient: 'Paciente',
};

const ROLE_COLORS: Record<string, string> = {
  psychologist: 'from-clarita-green-100 to-clarita-green-50 text-clarita-green-700',
  psychiatrist: 'from-clarita-blue-100 to-clarita-blue-50 text-clarita-blue-700',
  patient: 'from-purple-100 to-purple-50 text-purple-700',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDeleteConfirm(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showDeleteConfirm]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await authApi.me();
      const raw = data as any;
      setUser(raw.user);
      setProfile(raw.profile ?? null);
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    window.location.href = '/login';
  };

  const handleExportData = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clarita-meus-dados.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      alert('Erro ao exportar dados.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeToken();
        router.push('/login');
      } else {
        alert('Erro ao excluir conta. Tente novamente.');
      }
    } catch {
      alert('Erro ao excluir conta. Tente novamente.');
    }
  };

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '';

  const memberSince = (() => {
    if (!user?.created_at) return '—';
    const d = new Date(user.created_at);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="min-h-screen bg-clarita-beige-50">
      <Sidebar />

      <main className="ml-[240px] p-8">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={32} className="animate-spin text-clarita-green-400" />
            </div>
          ) : !user ? null : (
            <div className="space-y-5 animate-fade-in">
              {/* Avatar card */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8">
                <div className="flex items-start gap-6">
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold
                      bg-gradient-to-br ${ROLE_COLORS[user.role] ?? 'from-gray-100 to-gray-50 text-gray-600'}
                      shadow-soft flex-shrink-0`}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h1 className="text-2xl font-bold text-gray-800">
                        {user.first_name} {user.last_name}
                      </h1>
                      <button
                        onClick={handleLogout}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm text-gray-400
                          hover:bg-red-50 hover:text-red-500 transition-all duration-200 border border-white/30
                          hover:border-red-200/50"
                      >
                        <LogOut size={15} />
                        Sair
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                          bg-gradient-to-r ${ROLE_COLORS[user.role] ?? 'from-gray-100 to-gray-50 text-gray-600'}`}
                      >
                        <Stethoscope size={12} />
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info cards */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Informações da conta
                </h2>
                <div className="space-y-4">
                  <InfoRow
                    icon={<Mail size={16} />}
                    label="E-mail"
                    value={user.email}
                  />
                  {user.phone && (
                    <InfoRow
                      icon={<Phone size={16} />}
                      label="Telefone"
                      value={user.phone}
                    />
                  )}
                  <InfoRow
                    icon={<Hash size={16} />}
                    label="ID de exibição"
                    value={user.display_id}
                  />
                  {memberSince !== '—' && (
                    <InfoRow
                      icon={<Calendar size={16} />}
                      label="Membro desde"
                      value={memberSince}
                    />
                  )}
                </div>
              </div>

              {/* Professional profile */}
              {profile && (user.role === 'psychologist' || user.role === 'psychiatrist') && (
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Perfil profissional
                  </h2>
                  <div className="space-y-4">
                    {profile.license_number && (
                      <InfoRow
                        icon={<BadgeCheck size={16} />}
                        label="Número de registro"
                        value={profile.license_number}
                      />
                    )}
                    {profile.specialization && (
                      <InfoRow
                        icon={<Stethoscope size={16} />}
                        label="Especialização"
                        value={profile.specialization}
                      />
                    )}
                    {profile.institution && (
                      <InfoRow
                        icon={<Building2 size={16} />}
                        label="Instituição"
                        value={profile.institution}
                      />
                    )}
                    {profile.years_of_experience != null && (
                      <InfoRow
                        icon={<User size={16} />}
                        label="Anos de experiência"
                        value={`${profile.years_of_experience} anos`}
                      />
                    )}
                    {profile.bio && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-400 mb-1.5">Biografia</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dados e Privacidade */}
              <section className="bg-white rounded-xl p-6 border border-red-100">
                <h3 className="font-semibold text-gray-800 mb-1">Dados e Privacidade</h3>
                <p className="text-sm text-gray-500 mb-4">Gerencie seus dados conforme a LGPD.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                  >
                    Exportar meus dados
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Excluir minha conta
                  </button>
                </div>
                {showDeleteConfirm && (
                  <div role="alertdialog" className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 mb-3">
                      Esta ação é permanente. Seus dados pessoais serão anonimizados. Tem certeza?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Confirmar exclusão
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-sm px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-clarita-beige-100/80 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-700 truncate">{value}</p>
      </div>
    </div>
  );
}
