'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, UserPlus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PatientList from '@/components/PatientList';
import DisplayIdBadge from '@/components/DisplayIdBadge';
import InvitationDialog from '@/components/InvitationDialog';
import PendingInvitations from '@/components/PendingInvitations';
import OnboardingWizard from '@/components/OnboardingWizard';
import {
  patientsApi,
  alertsApi,
  authApi,
  invitationsApi,
  isAuthenticated,
  getUserRoleFromToken,
  getToken,
} from '@/lib/api';
import type { Patient, PatientListItem, AuthUser, Invitation } from '@/lib/api';

// Mock data for development/demo
const mockPatients: Patient[] = [
  {
    id: '1',
    full_name: 'Ana Silva',
    age: 32,
    date_of_birth: '1993-06-15',
    gender: 'female',
    email: 'ana.silva@email.com',
    phone: '+55 11 99999-0001',
    emergency_contact: '+55 11 98888-0001',
    diagnosis: ['Major Depressive Disorder', 'Generalized Anxiety'],
    status: 'active',
    last_check_in: '2026-03-03T14:30:00Z',
    mood_trend: [4, 5, 3, 4, 6, 5, 7, 6, 7, 8],
    active_alerts: 2,
    mental_clarity_score: 62,
    assigned_professional_id: 'prof-1',
    created_at: '2025-08-01T10:00:00Z',
  },
  {
    id: '2',
    full_name: 'Carlos Mendes',
    age: 45,
    date_of_birth: '1980-11-22',
    gender: 'male',
    email: 'carlos.m@email.com',
    phone: '+55 11 99999-0002',
    emergency_contact: '+55 11 98888-0002',
    diagnosis: ['Bipolar II', 'Insomnia'],
    status: 'active',
    last_check_in: '2026-03-02T09:15:00Z',
    mood_trend: [6, 8, 4, 3, 5, 7, 9, 6, 4, 5],
    active_alerts: 1,
    mental_clarity_score: 48,
    assigned_professional_id: 'prof-1',
    created_at: '2025-05-10T10:00:00Z',
  },
  {
    id: '3',
    full_name: 'Beatriz Oliveira',
    age: 28,
    date_of_birth: '1997-03-08',
    gender: 'female',
    email: 'bea.oliveira@email.com',
    phone: '+55 11 99999-0003',
    emergency_contact: '+55 11 98888-0003',
    diagnosis: ['PTSD'],
    status: 'active',
    last_check_in: '2026-03-04T08:45:00Z',
    mood_trend: [3, 3, 4, 5, 4, 5, 6, 6, 7, 7],
    active_alerts: 0,
    mental_clarity_score: 71,
    assigned_professional_id: 'prof-1',
    created_at: '2025-10-20T10:00:00Z',
  },
  {
    id: '4',
    full_name: 'Roberto Santos',
    age: 55,
    date_of_birth: '1970-07-19',
    gender: 'male',
    email: 'roberto.s@email.com',
    phone: '+55 11 99999-0004',
    emergency_contact: '+55 11 98888-0004',
    diagnosis: ['Generalized Anxiety', 'Panic Disorder'],
    status: 'active',
    last_check_in: '2026-03-01T16:20:00Z',
    mood_trend: [5, 4, 4, 3, 3, 4, 5, 5, 6, 5],
    active_alerts: 3,
    mental_clarity_score: 38,
    assigned_professional_id: 'prof-1',
    created_at: '2025-02-14T10:00:00Z',
  },
  {
    id: '5',
    full_name: 'Julia Costa',
    age: 22,
    date_of_birth: '2003-12-01',
    gender: 'female',
    email: 'julia.costa@email.com',
    phone: '+55 11 99999-0005',
    emergency_contact: '+55 11 98888-0005',
    diagnosis: ['Social Anxiety'],
    status: 'active',
    last_check_in: '2026-03-04T10:00:00Z',
    mood_trend: [5, 6, 6, 7, 7, 8, 7, 8, 8, 9],
    active_alerts: 0,
    mental_clarity_score: 82,
    assigned_professional_id: 'prof-1',
    created_at: '2025-11-05T10:00:00Z',
  },
  {
    id: '6',
    full_name: 'Fernando Lima',
    age: 39,
    date_of_birth: '1986-09-25',
    gender: 'male',
    email: 'fernando.l@email.com',
    phone: '+55 11 99999-0006',
    emergency_contact: '+55 11 98888-0006',
    diagnosis: ['Major Depressive Disorder'],
    status: 'inactive',
    last_check_in: '2026-02-15T12:00:00Z',
    mood_trend: [3, 2, 3, 2, 3, 3, 4, 3, 3, 4],
    active_alerts: 1,
    mental_clarity_score: 35,
    assigned_professional_id: 'prof-1',
    created_at: '2025-06-18T10:00:00Z',
  },
];

export default function PatientsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [patientsRes, alertsRes] = await Promise.allSettled([
        patientsApi.list(),
        alertsApi.list({ status: 'active' }),
      ]);

      if (patientsRes.status === 'fulfilled') {
        const data = patientsRes.value;
        // Transform backend response to Patient shape for PatientList
        const mapped: Patient[] = (data.patients || []).map((p: PatientListItem) => ({
          id: p.id,
          full_name: `${p.first_name} ${p.last_name}`,
          age: p.date_of_birth
            ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000)
            : 0,
          date_of_birth: p.date_of_birth || '',
          gender: p.gender || '',
          email: p.email,
          phone: p.phone || '',
          emergency_contact: '',
          diagnosis: [],
          status: (p.relationship_status === 'active' ? 'active' : 'inactive') as Patient['status'],
          last_check_in: p.last_check_in || null,
          mood_trend: Array.isArray(p.mood_trend) ? p.mood_trend : [],
          active_alerts: p.active_alerts ? Number(p.active_alerts) : 0,
          mental_clarity_score: null,
          assigned_professional_id: '',
          created_at: p.created_at,
        }));
        setPatients(mapped);
      } else {
        // Use mock data as fallback for development
        setPatients(mockPatients);
      }

      if (alertsRes.status === 'fulfilled') {
        // Backend returns { alerts: [...], pagination: {...} }
        const alertData = alertsRes.value as unknown as { alerts?: unknown[]; length?: number };
        setAlertCount(
          alertData.alerts?.length ??
            (Array.isArray(alertData) ? (alertData as unknown[]).length : 0)
        );
      } else {
        setAlertCount(mockPatients.reduce((sum, p) => sum + p.active_alerts, 0));
      }
    } catch {
      setPatients(mockPatients);
      setAlertCount(mockPatients.reduce((sum, p) => sum + p.active_alerts, 0));
    } finally {
      setLoading(false);
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
    await Promise.all([loadInvitations(), loadData()]);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      // Allow access for development - in production, redirect to login
      // router.replace("/login");
      // return;
    }
    const role = getUserRoleFromToken();
    if (role === 'patient') {
      router.replace('/patient-home');
      return;
    }
    // Load user profile for display_id and check onboarding status
    authApi
      .me()
      .then((res) => {
        setUser(res.user);
        const profile = res.profile;
        if (profile && profile.onboarding_completed === false) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {});
    loadData();
    loadInvitations();
  }, [router]);

  return (
    <div className="min-h-screen">
      <Sidebar alertCount={alertCount} />

      <main className="ml-[240px] p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/30 shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
                  {user?.display_id && (
                    <DisplayIdBadge displayId={user.display_id} label="Seu ID:" size="sm" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">Gerencie e monitore seus pacientes</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowInviteDialog(true)} className="btn-primary">
                  <UserPlus size={16} />
                  Convidar Paciente
                </button>
                <button onClick={loadData} className="btn-secondary" disabled={loading}>
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {/* Pending Invitations */}
          {(pendingInvitations.length > 0 || sentInvitations.length > 0) && user && (
            <PendingInvitations
              received={pendingInvitations}
              sent={sentInvitations}
              onUpdate={handleInvitationsUpdate}
              currentUserId={user.id}
            />
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-clarita-green-400" />
            </div>
          ) : error ? (
            <div className="card text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={loadData} className="btn-primary">
                Tentar novamente
              </button>
            </div>
          ) : (
            <PatientList patients={patients} />
          )}
        </div>

        {/* Invitation Dialog */}
        <InvitationDialog
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onInvitationSent={handleInvitationsUpdate}
          senderRole={user?.role || 'psychologist'}
        />
      </main>

      {/* Onboarding Wizard */}
      {showOnboarding && user && (
        <OnboardingWizard
          userName={user.first_name}
          onComplete={() => setShowOnboarding(false)}
          token={getToken() || ''}
          apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}
        />
      )}
    </div>
  );
}
