"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Loader2,
  Smile,
  Target,
  BookOpen,
  Users,
  FileText,
} from "lucide-react";
import Image from "next/image";
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
} from "@/lib/api";
import type { AuthUser, JournalEntryData, ProfessionalInfo, Goal, Invitation } from "@/lib/api";
import JournalEntry from "@/components/JournalEntry";
import JournalHistory from "@/components/JournalHistory";
import ProfessionalTabs from "@/components/ProfessionalTabs";
import PatientGoalsPanel from "@/components/PatientGoalsPanel";
import ExamUploadPanel from "@/components/ExamUploadPanel";
import DisplayIdBadge from "@/components/DisplayIdBadge";

const tabConfig = [
  { key: "checkin" as const, label: "Check-in", icon: Smile, activeClass: "tab-green-active", color: "text-clarita-green-500" },
  { key: "goals" as const, label: "Metas", icon: Target, activeClass: "tab-purple-active", color: "text-clarita-purple-500" },
  { key: "history" as const, label: "Histórico", icon: BookOpen, activeClass: "tab-blue-active", color: "text-clarita-blue-500" },
  { key: "exams" as const, label: "Exames", icon: FileText, activeClass: "tab-green-active", color: "text-clarita-green-600" },
  { key: "professionals" as const, label: "Profissionais", icon: Users, activeClass: "tab-orange-active", color: "text-orange-500" },
];

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

  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);

  const [activeSection, setActiveSection] = useState<"checkin" | "history" | "goals" | "exams" | "professionals">("checkin");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const role = getUserRoleFromToken();
    if (role && role !== "patient") {
      router.replace("/patients");
      return;
    }
    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      const response = await authApi.me();
      if (response.user.role !== "patient") {
        router.replace("/patients");
        return;
      }

      try {
        const onboardingRes = await onboardingApi.get();
        if (!onboardingRes.profile.onboarding_completed) {
          router.replace("/onboarding");
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
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadJournals = async () => {
    setJournalsLoading(true);
    try {
      const data = await journalApi.list({ limit: 20 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const entries: JournalEntryData[] = Array.isArray(raw)
        ? raw
        : raw?.journals ?? raw?.emotional_logs ?? [];
      setJournals(entries);
    } catch {
      setJournals([]);
    } finally {
      setJournalsLoading(false);
    }
  };

  const loadProfessionals = async () => {
    setProfessionalsLoading(true);
    try {
      const data = await patientProfileApi.getMyProfessionals();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const profs: ProfessionalInfo[] = Array.isArray(raw)
        ? raw
        : raw?.professionals ?? [];
      setProfessionals(profs);
    } catch {
      setProfessionals([]);
    } finally {
      setProfessionalsLoading(false);
    }
  };

  const loadGoals = async (userId: string) => {
    setGoalsLoading(true);
    try {
      const data = await goalsApi.list(userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const goalsList: Goal[] = Array.isArray(raw) ? raw : raw?.goals ?? [];
      setGoals(goalsList);
    } catch {
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadInvitations = async () => {
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
  };

  const handleInvitationsUpdate = async () => {
    await Promise.all([loadInvitations(), loadProfessionals()]);
  };

  const handleGoalRespond = async (
    goalId: string,
    action: "accept" | "reject",
    reason?: string
  ) => {
    await goalsApi.respond(goalId, action, reason);
    if (user) await loadGoals(user.id);
  };

  const pendingGoalsCount = goals.filter((g) => g.patient_status === "pending").length;

  const handleJournalSubmit = async (data: {
    mood_score: number;
    anxiety_score: number;
    energy_score: number;
    sleep_hours?: number;
    journal_entry?: string;
  }) => {
    setSaving(true);
    try {
      await journalApi.create(data);
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
      await patientProfileApi.updatePermissions(
        user.id,
        professionalId,
        permissions
      );
      await loadProfessionals();
    },
    [user]
  );

  const handleLogout = () => {
    removeToken();
    router.push("/login");
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

  const getBadge = (key: string) => {
    if (key === "goals") return pendingGoalsCount;
    if (key === "professionals") return pendingInvitations.filter(inv => inv.invited_by !== user?.id).length;
    return 0;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass rounded-none border-b border-white/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <Image src="/logo-clarita.png" alt="Clarita" width={36} height={28} className="drop-shadow-sm" />
            <div>
              <h1 className="text-base font-semibold text-gray-800">
                Olá, {user?.first_name || "Paciente"}!
              </h1>
              <p className="text-xs text-gray-400">
                Como você está hoje?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.display_id && (
              <div className="hidden sm:block">
                <DisplayIdBadge displayId={user.display_id} size="sm" />
              </div>
            )}
            <button
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
        {/* Mobile section tabs */}
        <div className="flex md:hidden items-center gap-1.5 bg-white/50 backdrop-blur-sm rounded-2xl p-1.5 mb-6 border border-white/30">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const badge = getBadge(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-300 ${
                  activeSection === tab.key
                    ? tab.activeClass
                    : "text-gray-400"
                }`}
              >
                <Icon size={15} />
                <span className="hidden min-[400px]:inline">{tab.label}</span>
                {badge > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-gradient-to-r from-clarita-purple-400 to-clarita-green-400 text-white rounded-full">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop: two-column layout / Mobile: single column based on tab */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
          {/* Left column */}
          <div
            className={`md:col-span-3 space-y-6 ${
              activeSection !== "checkin" && activeSection !== "goals" && activeSection !== "history" && activeSection !== "exams"
                ? "hidden md:block"
                : ""
            }`}
          >
            <div className={activeSection !== "checkin" ? "hidden md:block" : ""}>
              <JournalEntry onSubmit={handleJournalSubmit} saving={saving} />
            </div>

            <div className={activeSection !== "goals" ? "hidden md:block" : ""}>
              <PatientGoalsPanel
                goals={goals}
                loading={goalsLoading}
                onRespond={handleGoalRespond}
              />
            </div>

            <div className={activeSection !== "history" ? "hidden md:block" : ""}>
              <JournalHistory entries={journals} loading={journalsLoading} />
            </div>

            <div className={activeSection !== "exams" ? "hidden md:block" : ""}>
              <ExamUploadPanel />
            </div>
          </div>

          {/* Right column */}
          <div
            className={`md:col-span-2 ${
              activeSection !== "professionals" ? "hidden md:block" : ""
            }`}
          >
            {professionalsLoading ? (
              <div className="card flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-clarita-green-400" />
              </div>
            ) : (
              <ProfessionalTabs
                professionals={professionals}
                patientId={user?.id || ""}
                onPermissionChange={handlePermissionChange}
                pendingInvitations={pendingInvitations}
                sentInvitations={sentInvitations}
                onInvitationsUpdate={handleInvitationsUpdate}
                currentUserId={user?.id || ""}
              />
            )}
          </div>
        </div>
      </main>

      <p className="text-center text-xs text-gray-400 pb-8">
        Informações protegidas &middot; Conformidade LGPD
      </p>
    </div>
  );
}
