'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pill, Loader2, FileText, User, AlertCircle } from 'lucide-react';
import { prescriptionsApi } from '@/lib/api';
import type { Prescription } from '@/lib/api';

export default function MyPrescriptionsPanel() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await prescriptionsApi.getMy();
      setPrescriptions(res.prescriptions ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-clarita-green-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card p-6 flex items-center gap-2 text-amber-600">
        <AlertCircle size={18} />
        <p className="text-sm">Não foi possível carregar suas prescrições.</p>
        <button type="button" onClick={loadPrescriptions} className="text-sm underline ml-auto">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
          <Pill size={22} className="text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">Nenhuma prescrição encontrada</p>
        <p className="text-xs text-gray-400 mt-1">Seu psiquiatra ainda não gerou prescrições</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800 px-1">Minhas Prescrições</h2>
      {prescriptions.map((p) => {
        const profName = p.professional_first_name
          ? `${p.professional_first_name} ${p.professional_last_name}`
          : 'Psiquiatra';
        const meds = p.medications_data ?? [];

        return (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <FileText size={15} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User size={11} />
                    <span>{profName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medication list */}
            {meds.length > 0 && (
              <div className="space-y-1.5">
                {meds.map((med, i) => (
                  <div
                    key={med.name ?? i}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{med.name}</p>
                      <p className="text-xs text-gray-400">{med.dosage} · {med.frequency}</p>
                    </div>
                    {med.duration && (
                      <span className="text-xs text-gray-400">{med.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
