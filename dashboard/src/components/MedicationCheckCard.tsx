'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pill, CheckCircle2, XCircle, Loader2, Check, AlertCircle } from 'lucide-react';
import { patientMedicationsApi, medicationLogsApi } from '@/lib/api';
import type { PatientMedication, MedicationLog } from '@/lib/api';

export default function MedicationCheckCard() {
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [logging, setLogging] = useState<string | null>(null); // id being logged
  const [logError, setLogError] = useState<{ medId: string; skipped: boolean } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [medsRes, logsRes] = await Promise.all([
        patientMedicationsApi.listMine('active'),
        medicationLogsApi.getToday(),
      ]);
      setMedications(medsRes.patient_medications ?? []);
      setTodayLogs(logsRes.medication_logs ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Don't render if no active medications
  if (!loading && !loadError && medications.length === 0) return null;

  if (loading) {
    return (
      <div className="card p-4 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-clarita-green-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card p-4 flex items-center gap-2 text-amber-600">
        <AlertCircle size={16} />
        <p className="text-xs">Não foi possível carregar suas medicações.</p>
        <button type="button" onClick={loadData} className="text-xs underline ml-auto">Tentar novamente</button>
      </div>
    );
  }

  const getLogForMed = (medId: string) =>
    todayLogs.find((l) => l.patient_medication_id === medId);

  const allAnswered = medications.every((m) => !!getLogForMed(m.id));

  const handleLog = async (medId: string, skipped: boolean) => {
    if (getLogForMed(medId)) return; // already logged
    setLogging(medId);
    setLogError(null);
    try {
      await medicationLogsApi.log(medId, skipped);
      const logsRes = await medicationLogsApi.getToday();
      setTodayLogs(logsRes.medication_logs ?? []);
    } catch {
      setLogError({ medId, skipped });
    } finally {
      setLogging(null);
    }
  };

  const takenCount = medications.filter((m) => {
    const log = getLogForMed(m.id);
    return log && !log.skipped;
  }).length;

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Pill size={16} className="text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Você tomou sua medicação hoje?</h3>
          {allAnswered && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              {takenCount}/{medications.length} tomada{takenCount !== 1 ? 's' : ''} <Check size={12} />
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {medications.map((med) => {
          const log = getLogForMed(med.id);
          const isLogging = logging === med.id;
          const hasLogError = logError?.medId === med.id;

          return (
            <div key={med.id}>
              <div
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100"
              >
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{med.medication_name}</p>
                  <p className="text-xs text-gray-400">{med.dosage} · {med.frequency}</p>
                </div>

                {log ? (
                  // Already logged
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
                    log.skipped
                      ? 'bg-red-50 text-red-500 border border-red-100'
                      : 'bg-green-50 text-green-600 border border-green-100'
                  }`}>
                    {log.skipped ? (
                      <><XCircle size={13} /> Não tomei</>
                    ) : (
                      <><Check size={13} /> Tomei</>
                    )}
                  </div>
                ) : (
                  // Awaiting response
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLog(med.id, false)}
                      disabled={!!isLogging}
                      aria-label={`Sim, tomei ${med.medication_name}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {isLogging ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLog(med.id, true)}
                      disabled={!!isLogging}
                      aria-label={`Não tomei ${med.medication_name}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isLogging ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />} Não
                    </button>
                  </div>
                )}
              </div>
              {hasLogError && logError && (
                <p className="text-xs text-red-500 mt-1 px-1 flex items-center gap-1">
                  <AlertCircle size={11} /> Erro ao registrar.{' '}
                  <button
                    type="button"
                    onClick={() => handleLog(logError.medId, logError.skipped)}
                    className="underline"
                  >
                    Tente novamente.
                  </button>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
