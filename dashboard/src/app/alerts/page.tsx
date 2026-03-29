'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Bell, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Sidebar from '@/components/Sidebar';

import AlertsPanel from '@/components/AlertsPanel';
import { alertsApi, isAuthenticated } from '@/lib/api';
import type { Alert } from '@/lib/api';

// Mock alerts for development
const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    patient_id: '1',
    patient_name: 'Ana Silva',
    type: 'mood_drop',
    title: 'Declínio significativo de humor detectado',
    description:
      'A pontuação de humor do paciente caiu 40% nos últimos 3 dias. Atenção imediata recomendada.',
    severity: 'critical',
    status: 'active',
    created_at: '2026-03-04T08:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: 'alert-2',
    patient_id: '4',
    patient_name: 'Roberto Santos',
    type: 'missed_checkin',
    title: 'Check-ins agendados perdidos',
    description: 'Paciente perdeu 3 check-ins diários consecutivos. Último check-in foi há 4 dias.',
    severity: 'high',
    status: 'active',
    created_at: '2026-03-03T12:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: 'alert-3',
    patient_id: '4',
    patient_name: 'Roberto Santos',
    type: 'anxiety_spike',
    title: 'Níveis de ansiedade elevados',
    description:
      'Pontuação GAD-7 aumentou de 8 para 15 na última avaliação. Pontuação indica ansiedade moderada a grave.',
    severity: 'high',
    status: 'active',
    created_at: '2026-03-02T10:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: 'alert-4',
    patient_id: '2',
    patient_name: 'Carlos Mendes',
    type: 'medication_adherence',
    title: 'Baixa adesão ao medicamento',
    description:
      'A taxa de adesão ao medicamento do paciente caiu para 45% esta semana. Considere discutir barreiras à adesão.',
    severity: 'medium',
    status: 'active',
    created_at: '2026-03-03T16:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: 'alert-5',
    patient_id: '1',
    patient_name: 'Ana Silva',
    type: 'sleep_pattern',
    title: 'Padrões de sono alterados',
    description:
      'Pontuações de qualidade do sono estão consistentemente abaixo de 3/10 na última semana.',
    severity: 'medium',
    status: 'active',
    created_at: '2026-03-03T09:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: 'alert-6',
    patient_id: '4',
    patient_name: 'Roberto Santos',
    type: 'assessment_due',
    title: 'Avaliação PHQ-9 atrasada',
    description:
      'Avaliação mensal PHQ-9 está atrasada em 5 dias. Considere agendar durante a próxima sessão.',
    severity: 'low',
    status: 'active',
    created_at: '2026-03-01T08:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: 'alert-7',
    patient_id: '6',
    patient_name: 'Fernando Lima',
    type: 'inactivity',
    title: 'Paciente inativo por 2 semanas',
    description:
      'Paciente não interagiu com a plataforma por mais de 14 dias. Considere entrar em contato.',
    severity: 'low',
    status: 'active',
    created_at: '2026-02-28T10:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
  },
];

export default function AlertsPage() {
  const t = useTranslations('alerts');
  const tPatients = useTranslations('patients');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertsApi.list();
      // Backend wraps response: { alerts: [...] }
      const raw = data as any;
      const alertsArray: Record<string, unknown>[] = Array.isArray(raw) ? raw : (raw?.alerts ?? []);
      const mapped: Alert[] = alertsArray.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        patient_id: a.patient_id as string,
        patient_name: a.patient_name
          ? (a.patient_name as string)
          : a.patient_first_name
            ? `${a.patient_first_name} ${a.patient_last_name}`
            : '',
        type: (a.alert_type || a.type || '') as string,
        title: (a.title || '') as string,
        description: (a.description || '') as string,
        severity: (a.severity || 'medium') as Alert['severity'],
        status: a.is_acknowledged ? ('acknowledged' as const) : ('active' as const),
        created_at: (a.created_at || '') as string,
        acknowledged_at: (a.acknowledged_at || null) as string | null,
        acknowledged_by: a.acknowledged_by_first_name
          ? `${a.acknowledged_by_first_name} ${a.acknowledged_by_last_name}`
          : ((a.acknowledged_by || null) as string | null),
      }));
      setAlerts(mapped);
    } catch {
      setAlerts(mockAlerts);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertsApi.acknowledge(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'acknowledged' as const, acknowledged_at: new Date().toISOString() }
            : a
        )
      );
    } catch {
      // Optimistic update for demo
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'acknowledged' as const, acknowledged_at: new Date().toISOString() }
            : a
        )
      );
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const activeCount = alerts.filter((a) => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-clarita-beige-50">
      <Sidebar alertCount={activeCount} />

      <main className="ml-[240px] p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header — glassmorphism card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6 mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 via-orange-50 to-yellow-50 shadow-soft">
                  <ShieldAlert size={24} className="text-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {t('monitor_respond')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50/60 border border-red-200/40">
                    <Bell size={14} className="text-red-500" />
                    <span className="text-sm font-semibold text-red-600">
                      {activeCount} {activeCount === 1 ? t('active_one') : t('active_many')}
                    </span>
                  </div>
                )}
                <button
                  onClick={loadAlerts}
                  className="btn-secondary flex items-center gap-2 rounded-2xl"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  {tPatients('refresh')}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-soft flex items-center justify-center py-24 animate-fade-in">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-clarita-green-400" />
                <p className="text-sm text-gray-400">{t('loading')}</p>
              </div>
            </div>
          ) : (
            <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} showPatientName={true} />
          )}
        </div>
      </main>
    </div>
  );
}
