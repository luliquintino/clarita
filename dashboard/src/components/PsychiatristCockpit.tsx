'use client';

import { useState, useEffect } from 'react';
import { Loader2, Pill, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  prescriptionsApi,
  alertsApi,
  symptomsApi,
  type Prescription,
  type Alert,
  type PatientSymptom,
} from '@/lib/api';

interface PsychiatristCockpitProps {
  patientId: string;
}

export default function PsychiatristCockpit({ patientId }: PsychiatristCockpitProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [symptoms, setSymptoms] = useState<PatientSymptom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [presRes, alertRes, sympRes] = await Promise.allSettled([
          prescriptionsApi.list(patientId),
          alertsApi.list({ patient_id: patientId }),
          symptomsApi.listForPatient(patientId),
        ]);

        if (presRes.status === 'fulfilled') {
          const raw = presRes.value as { prescriptions: Prescription[] };
          setPrescriptions(raw?.prescriptions ?? []);
        }
        if (alertRes.status === 'fulfilled') {
          const raw = alertRes.value as Alert[];
          setAlerts(Array.isArray(raw) ? raw : []);
        }
        if (sympRes.status === 'fulfilled') {
          const raw = sympRes.value as { patient_symptoms: PatientSymptom[] };
          setSymptoms(raw?.patient_symptoms ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-clarita-blue-400" />
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const activePrescriptions = prescriptions.filter((p) => p.status === 'active');
  const recentSymptoms = symptoms.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={18} className="text-clarita-blue-500" />
        <h2 className="text-lg font-semibold text-gray-800">Prontuário Clínico</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bloco 1 — Prescrições ativas */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-700 text-sm">Prescrições Ativas</h3>
          </div>
          {activePrescriptions.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma prescrição ativa.</p>
          ) : (
            <ul className="space-y-2">
              {activePrescriptions.map((p) => (
                <li key={p.id} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div>
                      {p.medications_data?.map((m, i) => (
                        <div key={i}>
                          <span className="font-medium text-gray-800">{m.name}</span>
                          {m.dosage && (
                            <span className="text-gray-500"> · {m.dosage}</span>
                          )}
                          {m.frequency && (
                            <span className="text-gray-400"> · {m.frequency}</span>
                          )}
                        </div>
                      ))}
                      <span className="text-xs text-gray-400">
                        {format(parseISO(p.created_at), 'dd MMM yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bloco 2 — Alertas ativos */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="font-semibold text-gray-700 text-sm">Alertas Clínicos</h3>
          </div>
          {activeAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={14} />
              Sem alertas ativos
            </div>
          ) : (
            <ul className="space-y-2">
              {activeAlerts.map((a) => (
                <li key={a.id} className="text-sm">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.severity === 'critical' || a.severity === 'high'
                        ? 'bg-red-50 text-red-700'
                        : a.severity === 'medium'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {a.title}
                  </span>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-1">{a.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bloco 3 — Sintomas recentes */}
        <div className="card p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-700 text-sm">Sintomas Recentes</h3>
          </div>
          {recentSymptoms.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum sintoma relatado recentemente.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSymptoms.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5"
                >
                  <span className="text-sm text-gray-700">
                    {(s as PatientSymptom & { symptom_name?: string }).symptom_name ?? s.symptom_id}
                  </span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-lg ${
                      s.severity >= 8
                        ? 'bg-red-100 text-red-700'
                        : s.severity >= 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {s.severity}/10
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(parseISO(s.reported_at), 'dd MMM', { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
