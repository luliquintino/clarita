'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import Image from 'next/image';
import {
  authApi,
  removeToken,
  isAuthenticated,
  getUserRoleFromToken,
  journalApi,
  patientProfileApi,
  goalsApi,
  invitationsApi,
  onboardingApi,
  patientMedicationsApi,
  medicationLogsApi,
} from '@/lib/api';
import type { AuthUser, JournalEntryData, ProfessionalInfo, Goal, Invitation, PatientMedication } from '@/lib/api';
import JournalEntry from '@/components/JournalEntry';
import JournalHistory from '@/components/JournalHistory';
import ProfessionalTabs from '@/components/ProfessionalTabs';
import PatientGoalsPanel from '@/components/PatientGoalsPanel';
import ExamUploadPanel from '@/components/ExamUploadPanel';
import DisplayIdBadge from '@/components/DisplayIdBadge';
import AnamnesisPanel from '@/components/AnamnesisPanel';
import PsychTestPanel from '@/components/PsychTestPanel';
import MyPrescriptionsPanel from '@/components/MyPrescriptionsPanel';
import BottomNav from '@/components/BottomNav';
import SideNav from '@/components/SideNav';
import { type PatientSection } from '@/components/nav-items';

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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
              {/* Left: check-in + medication */}
              <div className="md:col-span-3 space-y-4">
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
          )}

          {/* ── EXAMES ── */}
          {activeSection === 'exams' && <ExamUploadPanel />}

          {/* ── PRESCRIÇÕES ── */}
          {activeSection === 'prescriptions' && <MyPrescriptionsPanel />}

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

          {/* ── HISTÓRICO ── */}
          {activeSection === 'history' && (
            <JournalHistory entries={journals} loading={journalsLoading} />
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
    </div>
  );
}
