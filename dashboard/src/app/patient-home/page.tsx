'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Star, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import {
  authApi,
  removeToken,
  isAuthenticated,
  getUserRoleFromToken,
  getToken,
  journalApi,
  patientProfileApi,
  goalsApi,
  invitationsApi,
  onboardingApi,
  patientMedicationsApi,
  medicationLogsApi,
} from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { AuthUser, JournalEntryData, ProfessionalInfo, Goal, Invitation, PatientMedication } from '@/lib/api';
import JournalEntry from '@/components/JournalEntry';
import JournalHistory from '@/components/JournalHistory';
import HistoryChart from '@/components/HistoryChart';
import ProfessionalTabs from '@/components/ProfessionalTabs';
import PatientGoalsPanel from '@/components/PatientGoalsPanel';
import ExamUploadPanel from '@/components/ExamUploadPanel';
import DisplayIdBadge from '@/components/DisplayIdBadge';
import AnamnesisPanel from '@/components/AnamnesisPanel';
import PsychTestPanel from '@/components/PsychTestPanel';
import BottomNav from '@/components/BottomNav';
import SideNav from '@/components/SideNav';
import { type PatientSection } from '@/components/nav-items';
import AddLifeEventModal from '@/components/AddLifeEventModal';
import ReportSymptomModal from '@/components/ReportSymptomModal';
import MedicationCheckCard from '@/components/MedicationCheckCard';
import MyPrescriptionsPanel from '@/components/MyPrescriptionsPanel';

export default function PatientHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [journals, setJournals] = useState<JournalEntryData[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [professionals, setProfessionals] = useState<ProfessionalInfo[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(true);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [medications, setMedications] = useState<PatientMedication[]>([]);

  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);

  const [activeSection, setActiveSection] = useState<PatientSection>('home');
  const [showLifeEventModal, setShowLifeEventModal] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);

  const { permission, subscribed, loading: pushLoading, subscribe } = usePushNotifications(getToken());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const role = getUserRoleFromToken();
    if (role && role !== 'patient') {
      router.replace('/patients');
      return;
    }
    loadProfile();
  }, [router]);

  const loadJournals = async () => {
    setJournalsLoading(true);
    try {
      const data = await journalApi.list({ limit: 20 });
      const raw = data as any;
      const entries: JournalEntryData[] = Array.isArray(raw)
        ? raw
        : (raw?.journals ?? raw?.emotional_logs ?? []);
      setJournals(entries);
    } catch {
      setJournals([]);
    } finally {
      setJournalsLoading(false);
    }
  };

  const loadProfessionals = useCallback(async () => {
    setProfessionalsLoading(true);
    try {
      const data = await patientProfileApi.getMyProfessionals();
      const raw = data as any;
      const profs: ProfessionalInfo[] = Array.isArray(raw) ? raw : (raw?.professionals ?? []);
      setProfessionals(profs);
    } catch {
      setProfessionals([]);
    } finally {
      setProfessionalsLoading(false);
    }
  }, []);

  const loadGoals = async (userId: string) => {
    setGoalsLoading(true);
    try {
      const data = await goalsApi.list(userId);
      const raw = data as any;
      const goalsList: Goal[] = Array.isArray(raw) ? raw : (raw?.goals ?? []);
      setGoals(goalsList);
    } catch {
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadInvitations = useCallback(async () => {
    try {
      const [pendingData, sentData] = await Promise.all([
        invitationsApi.listPending(),
        invitationsApi.listSent(),
      ]);
      setPendingInvitations(pendingData.invitations || []);
      setSentInvitations(sentData.invitations || []);
    } catch {
      setPendingInvitations([]);
      setSentInvitations([]);
    }
  }, []);

  const loadMedications = useCallback(async () => {
    try {
      const res = await patientMedicationsApi.listMine('active');
      setMedications(res.patient_medications ?? []);
    } catch {
      setMedications([]);
    }
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authApi.me();
      if (response.user.role !== 'patient') {
        router.replace('/patients');
        return;
      }

      try {
        const onboardingRes = await onboardingApi.get();
        if (!onboardingRes.profile.onboarding_completed) {
          router.replace('/onboarding');
          return;
        }
      } catch {
        // If onboarding check fails, continue to home
      }

      setUser(response.user);
      loadJournals();
      loadProfessionals();
      loadGoals(response.user.id);
      loadInvitations();
      loadMedications();
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationsUpdate = useCallback(async () => {
    await Promise.all([loadInvitations(), loadProfessionals()]);
  }, [loadInvitations, loadProfessionals]);

  const handleGoalRespond = async (
    goalId: string,
    action: 'accept' | 'reject',
    reason?: string
  ) => {
    await goalsApi.respond(goalId, action, reason);
    if (user) await loadGoals(user.id);
  };

  const handleJournalSubmit = async (data: {
    mood_score: number;
    anxiety_score: number;
    energy_score: number;
    sleep_hours?: number;
    journal_entry?: string;
    medication_logs?: Array<{ patient_medication_id: string; skipped: boolean }>;
  }) => {
    setSaving(true);
    try {
      const { medication_logs, ...journalData } = data;
      await journalApi.create(journalData);
      if (medication_logs && medication_logs.length > 0) {
        await Promise.all(
          medication_logs.map((log) => medicationLogsApi.log(log.patient_medication_id, log.skipped))
        );
      }
      await loadJournals();
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = useCallback(
    async (
      professionalId: string,
      permissions: Array<{ permission_type: string; granted: boolean }>
    ) => {
      if (!user) return;
      await patientProfileApi.updatePermissions(user.id, professionalId, permissions);
      await loadProfessionals();
    },
    [user, loadProfessionals]
  );

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-clarita-green-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const pendingGoalsCount = goals.filter((g) => g.patient_status === 'pending').length;
  const pendingInvitationsCount = pendingInvitations.filter(
    (inv) => inv.invited_by !== user?.id
  ).length;

  const navBadges: Partial<Record<PatientSection, number>> = {
    goals: pendingGoalsCount > 0 ? pendingGoalsCount : undefined,
    home: pendingInvitationsCount > 0 ? pendingInvitationsCount : undefined,
  };

  return (
    <div className="min-h-screen md:flex md:flex-row">
      {/* Desktop sidebar */}
      <SideNav
        user={user}
        active={activeSection}
        onChange={setActiveSection}
        badges={navBadges}
        onLogout={handleLogout}
      />

      {/* Page content column */}
      <div className="flex-1 min-w-0 md:ml-56 pb-24 md:pb-8">
        {/* Mobile-only header */}
        <header className="md:hidden sticky top-0 z-30 glass rounded-none border-b border-white/30">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-clarita.png"
                alt="Clarita"
                width={36}
                height={28}
                className="drop-shadow-sm"
              />
              <div>
                <h1 className="text-base font-semibold text-gray-800">
                  Olá, {user?.first_name || 'Paciente'}!
                </h1>
                <p className="text-xs text-gray-400">Como você está hoje?</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user?.display_id && (
                <DisplayIdBadge displayId={user.display_id} size="sm" />
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {/* ── HOME ── */}
          {activeSection === 'home' && (
            <>
            {permission === 'default' && !subscribed && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="font-medium text-green-800 text-sm">Ativar lembretes de check-in 🔔</p>
                  <p className="text-xs text-green-600 mt-0.5">Receba um lembrete diário para registrar como você está.</p>
                </div>
                <button
                  type="button"
                  onClick={subscribe}
                  disabled={pushLoading}
                  className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {pushLoading ? 'Ativando...' : 'Ativar'}
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
              {/* Left: check-in */}
              <div className="md:col-span-3 space-y-4">
                {/* Ações Rápidas */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowSymptomModal(true)}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-2xl transition-all duration-200 text-center"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                      <AlertCircle size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Relatar Sintoma</p>
                      <p className="text-[11px] text-gray-500 leading-tight">Como você está se sentindo?</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowLifeEventModal(true)}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 rounded-2xl transition-all duration-200 text-center"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Star size={18} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">+ Momento</p>
                      <p className="text-[11px] text-gray-500 leading-tight">Registre algo importante</p>
                    </div>
                  </button>
                </div>
                <JournalEntry onSubmit={handleJournalSubmit} saving={saving} medications={medications} />
              </div>

              {/* Right: professionals */}
              <div className="md:col-span-2">
                {professionalsLoading ? (
                  <div className="card flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-clarita-green-400" />
                  </div>
                ) : (
                  <ProfessionalTabs
                    professionals={professionals}
                    patientId={user?.id || ''}
                    onPermissionChange={handlePermissionChange}
                    pendingInvitations={pendingInvitations}
                    sentInvitations={sentInvitations}
                    onInvitationsUpdate={handleInvitationsUpdate}
                    currentUserId={user?.id || ''}
                  />
                )}
              </div>
            </div>
            </>
          )}

          {/* ── EXAMES ── */}
          {activeSection === 'exams' && <ExamUploadPanel />}

          {/* ── TESTES ── */}
          {activeSection === 'tests' && <PsychTestPanel role="patient" />}

          {/* ── ANAMNESE ── */}
          {activeSection === 'anamnesis' && <AnamnesisPanel role="patient" />}

          {/* ── METAS ── */}
          {activeSection === 'goals' && (
            <PatientGoalsPanel
              goals={goals}
              loading={goalsLoading}
              onRespond={handleGoalRespond}
            />
          )}

          {/* ── MEDICAMENTOS ── */}
          {activeSection === 'medications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Medicações Ativas</h2>
                <MedicationCheckCard />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Minhas Prescrições</h2>
                <MyPrescriptionsPanel />
              </div>
            </div>
          )}

          {/* ── HISTÓRICO ── */}
          {activeSection === 'history' && (
            <div className="space-y-6">
              <HistoryChart entries={journals} />
              <JournalHistory entries={journals} loading={journalsLoading} />
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pt-6 pb-2">
            Informações protegidas &middot; Conformidade LGPD
          </p>
        </main>

        {/* Mobile BottomNav */}
        <BottomNav
          active={activeSection}
          onChange={setActiveSection}
          badges={navBadges}
        />
      </div>

      <AddLifeEventModal
        open={showLifeEventModal}
        onClose={() => setShowLifeEventModal(false)}
        onCreated={() => {
          // A timeline do profissional buscará eventos atualizados no próximo load
        }}
      />
      <ReportSymptomModal
        open={showSymptomModal}
        onClose={() => setShowSymptomModal(false)}
        onCreated={() => {/* symptom appears on professional's timeline on next load */}}
      />
    </div>
  );
}
