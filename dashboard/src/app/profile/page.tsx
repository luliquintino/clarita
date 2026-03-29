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
  Pencil,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import LanguageSelector from '@/components/LanguageSelector';
import { authApi, clearUserInfo, isAuthenticated } from '@/lib/api';

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

const INPUT_CLASS =
  'w-full px-3 py-1.5 rounded-xl border border-clarita-beige-200 bg-clarita-beige-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-clarita-green-400';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editingSection, setEditingSection] = useState<'account' | 'professional' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Draft state
  const [draftAccount, setDraftAccount] = useState({ first_name: '', last_name: '', phone: '' });
  const [draftProfessional, setDraftProfessional] = useState({
    specialization: '',
    institution: '',
    license_number: '',
    years_of_experience: '',
    bio: '',
  });

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

  const handleLogout = async () => {
    await authApi.logout();
    clearUserInfo();
    window.location.href = '/login';
  };

  const handleExportData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/export`, {
        credentials: 'include',
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        clearUserInfo();
        router.push('/login');
      } else {
        alert('Erro ao excluir conta. Tente novamente.');
      }
    } catch {
      alert('Erro ao excluir conta. Tente novamente.');
    }
  };

  const startEditAccount = () => {
    if (!user) return;
    setDraftAccount({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
    });
    setSaveError('');
    setEditingSection('account');
  };

  const startEditProfessional = () => {
    if (!profile) return;
    setDraftProfessional({
      specialization: profile.specialization || '',
      institution: profile.institution || '',
      license_number: profile.license_number || '',
      years_of_experience: profile.years_of_experience != null ? String(profile.years_of_experience) : '',
      bio: profile.bio || '',
    });
    setSaveError('');
    setEditingSection('professional');
  };

  const handleSave = async (section: 'account' | 'professional') => {
    setSaving(true);
    setSaveError('');
    try {
      if (section === 'account') {
        await authApi.updateMe({
          first_name: draftAccount.first_name,
          last_name: draftAccount.last_name,
          phone: draftAccount.phone || undefined,
        });
      } else {
        await authApi.updateMe({
          specialization: draftProfessional.specialization || undefined,
          institution: draftProfessional.institution || undefined,
          license_number: draftProfessional.license_number || undefined,
          bio: draftProfessional.bio || undefined,
          years_of_experience: draftProfessional.years_of_experience
            ? Number(draftProfessional.years_of_experience)
            : undefined,
        });
      }
      await loadProfile();
      setEditingSection(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      setSaveError(message);
    } finally {
      setSaving(false);
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

              {/* Account info card */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Informações da conta
                  </h2>
                  {editingSection !== 'account' && (
                    <button
                      onClick={startEditAccount}
                      className="btn-ghost text-sm flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                  )}
                </div>

                {editingSection === 'account' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                        <input
                          className={INPUT_CLASS}
                          value={draftAccount.first_name}
                          onChange={(e) => setDraftAccount((d) => ({ ...d, first_name: e.target.value }))}
                          placeholder="Nome"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Sobrenome</label>
                        <input
                          className={INPUT_CLASS}
                          value={draftAccount.last_name}
                          onChange={(e) => setDraftAccount((d) => ({ ...d, last_name: e.target.value }))}
                          placeholder="Sobrenome"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Telefone</label>
                      <input
                        className={INPUT_CLASS}
                        value={draftAccount.phone}
                        onChange={(e) => setDraftAccount((d) => ({ ...d, phone: e.target.value }))}
                        placeholder="Telefone"
                        type="tel"
                      />
                    </div>
                    {/* Non-editable fields shown as read-only */}
                    <InfoRow icon={<Mail size={16} />} label="E-mail" value={user.email} />
                    <InfoRow icon={<Hash size={16} />} label="ID de exibição" value={user.display_id} />
                    {memberSince !== '—' && (
                      <InfoRow icon={<Calendar size={16} />} label="Membro desde" value={memberSince} />
                    )}
                    {/* Save / Cancel */}
                    <div className="flex items-center gap-2 pt-3 border-t border-clarita-beige-100/60 mt-3">
                      {saveError && <p className="text-xs text-red-500 flex-1">{saveError}</p>}
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSave('account')}
                        disabled={saving}
                        className="px-4 py-1.5 text-sm bg-clarita-green-500 hover:bg-clarita-green-600 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {saving && <Loader2 size={12} className="animate-spin" />}
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <InfoRow icon={<Mail size={16} />} label="E-mail" value={user.email} />
                    {user.phone && (
                      <InfoRow icon={<Phone size={16} />} label="Telefone" value={user.phone} />
                    )}
                    <InfoRow icon={<Hash size={16} />} label="ID de exibição" value={user.display_id} />
                    {memberSince !== '—' && (
                      <InfoRow icon={<Calendar size={16} />} label="Membro desde" value={memberSince} />
                    )}
                  </div>
                )}
              </div>

              {/* Professional profile */}
              {profile && (user.role === 'psychologist' || user.role === 'psychiatrist') && (
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Perfil profissional
                    </h2>
                    {editingSection !== 'professional' && (
                      <button
                        onClick={startEditProfessional}
                        className="btn-ghost text-sm flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                    )}
                  </div>

                  {editingSection === 'professional' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Número de registro</label>
                        <input
                          className={INPUT_CLASS}
                          value={draftProfessional.license_number}
                          onChange={(e) =>
                            setDraftProfessional((d) => ({ ...d, license_number: e.target.value }))
                          }
                          placeholder="Número de registro"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Especialização</label>
                        <input
                          className={INPUT_CLASS}
                          value={draftProfessional.specialization}
                          onChange={(e) =>
                            setDraftProfessional((d) => ({ ...d, specialization: e.target.value }))
                          }
                          placeholder="Especialização"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Instituição</label>
                        <input
                          className={INPUT_CLASS}
                          value={draftProfessional.institution}
                          onChange={(e) =>
                            setDraftProfessional((d) => ({ ...d, institution: e.target.value }))
                          }
                          placeholder="Instituição"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Anos de experiência</label>
                        <input
                          className={INPUT_CLASS}
                          value={draftProfessional.years_of_experience}
                          onChange={(e) =>
                            setDraftProfessional((d) => ({ ...d, years_of_experience: e.target.value }))
                          }
                          placeholder="Anos de experiência"
                          type="number"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Biografia</label>
                        <textarea
                          className={`${INPUT_CLASS} resize-none`}
                          value={draftProfessional.bio}
                          onChange={(e) =>
                            setDraftProfessional((d) => ({ ...d, bio: e.target.value }))
                          }
                          placeholder="Escreva uma breve biografia..."
                          rows={4}
                        />
                      </div>
                      {/* Save / Cancel */}
                      <div className="flex items-center gap-2 pt-3 border-t border-clarita-beige-100/60 mt-3">
                        {saveError && <p className="text-xs text-red-500 flex-1">{saveError}</p>}
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSave('professional')}
                          disabled={saving}
                          className="px-4 py-1.5 text-sm bg-clarita-green-500 hover:bg-clarita-green-600 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {saving && <Loader2 size={12} className="animate-spin" />}
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              )}

              {/* Language */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <LanguageSelector />
              </div>

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
