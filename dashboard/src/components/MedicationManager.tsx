'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Pill, Plus, X, Save, AlertTriangle, CheckCircle, Clock, Ban } from 'lucide-react';
import type { Medication } from '@/lib/api';

interface MedicationManagerProps {
  medications: Medication[];
  patientId: string;
  role: 'psychiatrist' | 'psychologist' | 'therapist';
  onPrescribe?: (data: {
    name: string;
    dosage: string;
    frequency: string;
    notes?: string;
  }) => Promise<void>;
  onAdjust?: (
    medicationId: string,
    data: { dosage?: string; frequency?: string; notes?: string }
  ) => Promise<void>;
  onDiscontinue?: (medicationId: string) => Promise<void>;
}

function AdherenceBar({ rate }: { rate: number }) {
  let color = 'bg-red-400';
  if (rate >= 80) {
    color = 'bg-clarita-green-400';
  } else if (rate >= 60) {
    color = 'bg-yellow-400';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-10 text-right">{rate}%</span>
    </div>
  );
}

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    borderColor: string;
    badgeClass: string;
    label: string;
  }
> = {
  active: {
    icon: <CheckCircle size={14} />,
    borderColor: 'border-l-clarita-green-400',
    badgeClass: 'badge-green',
    label: 'Ativo',
  },
  adjusted: {
    icon: <Clock size={14} />,
    borderColor: 'border-l-yellow-400',
    badgeClass: 'badge-yellow',
    label: 'Ajustado',
  },
  discontinued: {
    icon: <Ban size={14} />,
    borderColor: 'border-l-gray-300',
    badgeClass: 'badge bg-gray-100 text-gray-500 border border-gray-200/50',
    label: 'Descontinuado',
  },
};

export default function MedicationManager({
  medications,
  patientId,
  role,
  onPrescribe,
  onAdjust,
  onDiscontinue,
}: MedicationManagerProps) {
  const [showPrescribeForm, setShowPrescribeForm] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medNotes, setMedNotes] = useState('');

  const [adjDosage, setAdjDosage] = useState('');
  const [adjFrequency, setAdjFrequency] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  const isPrescriber = role === 'psychiatrist';

  const resetPrescribeForm = () => {
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setMedNotes('');
    setShowPrescribeForm(false);
  };

  const resetAdjustForm = () => {
    setAdjDosage('');
    setAdjFrequency('');
    setAdjNotes('');
    setAdjustingId(null);
  };

  const handlePrescribe = async () => {
    if (!medName.trim() || !medDosage.trim() || !medFrequency.trim()) return;
    if (!onPrescribe) return;
    setSaving(true);
    try {
      await onPrescribe({
        name: medName,
        dosage: medDosage,
        frequency: medFrequency,
        notes: medNotes || undefined,
      });
      resetPrescribeForm();
    } catch (err) {
      console.error('Failed to prescribe:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustingId || !onAdjust) return;
    setSaving(true);
    try {
      await onAdjust(adjustingId, {
        dosage: adjDosage || undefined,
        frequency: adjFrequency || undefined,
        notes: adjNotes || undefined,
      });
      resetAdjustForm();
    } catch (err) {
      console.error('Failed to adjust medication:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscontinue = async (medId: string) => {
    if (!onDiscontinue) return;
    if (!confirm('Tem certeza de que deseja descontinuar este medicamento?')) return;
    try {
      await onDiscontinue(medId);
    } catch (err) {
      console.error('Failed to discontinue:', err);
    }
  };

  const startAdjust = (med: Medication) => {
    setAdjustingId(med.id);
    setAdjDosage(med.dosage);
    setAdjFrequency(med.frequency);
    setAdjNotes('');
    setShowPrescribeForm(false);
  };

  const activeMeds = medications.filter((m) => m.status === 'active');
  const pastMeds = medications.filter((m) => m.status !== 'active');

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title mb-0">Medicamentos</h3>
        {isPrescriber && !showPrescribeForm && (
          <button
            onClick={() => {
              setShowPrescribeForm(true);
              resetAdjustForm();
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Prescrever
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Prescribe form (psychiatrist only) */}
        {showPrescribeForm && isPrescriber && (
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-clarita-purple-200/50 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-800">Nova Prescricao</h4>
              <button
                onClick={resetPrescribeForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do Medicamento
                </label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="input-field"
                  placeholder="ex.: Sertralina"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dosagem</label>
                <input
                  type="text"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  className="input-field"
                  placeholder="ex.: 50mg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequencia</label>
                <input
                  type="text"
                  value={medFrequency}
                  onChange={(e) => setMedFrequency(e.target.value)}
                  className="input-field"
                  placeholder="ex.: Uma vez ao dia"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Observacoes (opcional)
              </label>
              <textarea
                value={medNotes}
                onChange={(e) => setMedNotes(e.target.value)}
                className="input-field"
                rows={2}
                placeholder="Observacoes adicionais..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrescribe}
                disabled={saving || !medName.trim() || !medDosage.trim() || !medFrequency.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                {saving ? 'Prescrevendo...' : 'Prescrever Medicamento'}
              </button>
              <button onClick={resetPrescribeForm} className="btn-ghost">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Active medications */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Medicamentos Ativos ({activeMeds.length})
          </h4>
          <div className="space-y-3">
            {activeMeds.map((med) => {
              const sConfig = statusConfig[med.status];

              return (
                <div
                  key={med.id}
                  className={`bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 border-l-4 ${sConfig.borderColor} animate-fade-in`}
                >
                  {/* Adjust form inline */}
                  {adjustingId === med.id && isPrescriber ? (
                    <div className="space-y-4 animate-scale-in">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800">Ajustar: {med.name}</h4>
                        <button
                          onClick={resetAdjustForm}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nova Dosagem
                          </label>
                          <input
                            type="text"
                            value={adjDosage}
                            onChange={(e) => setAdjDosage(e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nova Frequencia
                          </label>
                          <input
                            type="text"
                            value={adjFrequency}
                            onChange={(e) => setAdjFrequency(e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Notas do Ajuste
                        </label>
                        <textarea
                          value={adjNotes}
                          onChange={(e) => setAdjNotes(e.target.value)}
                          className="input-field"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleAdjust}
                          disabled={saving}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          <Save size={14} />
                          {saving ? 'Salvando...' : 'Salvar Ajuste'}
                        </button>
                        <button onClick={resetAdjustForm} className="btn-ghost text-sm">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-clarita-purple-100 rounded-xl flex items-center justify-center">
                            <Pill size={16} className="text-clarita-purple-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{med.name}</h4>
                            <p className="text-sm text-gray-500">
                              {med.dosage} &middot; {med.frequency}
                            </p>
                          </div>
                        </div>
                        <span className={sConfig.badgeClass}>
                          {sConfig.icon}
                          <span className="ml-1">{sConfig.label}</span>
                        </span>
                      </div>

                      {/* Adherence */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Adesao</p>
                        <AdherenceBar rate={med.adherence_rate} />
                      </div>

                      {/* Side effects */}
                      {med.side_effects.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle size={12} className="text-clarita-orange-400" />
                            <p className="text-xs text-gray-500">Efeitos colaterais</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {med.side_effects.map((effect) => (
                              <span key={effect} className="badge-orange text-[10px]">
                                {effect}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/30">
                        <span className="text-xs text-gray-400">
                          Prescrito por {med.prescribed_by} em{' '}
                          {format(new Date(med.prescribed_date), 'MMM d, yyyy')}
                        </span>

                        {isPrescriber && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => startAdjust(med)} className="btn-ghost text-xs">
                              Ajustar
                            </button>
                            <button
                              onClick={() => handleDiscontinue(med.id)}
                              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-xl hover:bg-red-50/50 transition-colors"
                            >
                              Descontinuar
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {activeMeds.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum medicamento ativo</p>
            )}
          </div>
        </div>

        {/* Past medications */}
        {pastMeds.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              Medicamentos Anteriores ({pastMeds.length})
            </h4>
            <div className="space-y-2">
              {pastMeds.map((med) => {
                const sConfig = statusConfig[med.status];

                return (
                  <div
                    key={med.id}
                    className={`bg-white/25 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 border-l-4 ${sConfig.borderColor} opacity-60`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {med.name} ({med.dosage})
                        </span>
                      </div>
                      <span className={`${sConfig.badgeClass} text-[10px]`}>{sConfig.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
