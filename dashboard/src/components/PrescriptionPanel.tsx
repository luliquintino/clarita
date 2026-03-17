'use client';

import { useState, useEffect } from 'react';
import { Pill, Plus, FileText, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { prescriptionsApi, Prescription } from '@/lib/api';

interface PrescriptionPanelProps {
  patientId: string;
  role: string;
}

interface MedicationEntry {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const EMPTY_MED: MedicationEntry = { name: '', dosage: '', frequency: '', duration: '', instructions: '' };

export default function PrescriptionPanel({ patientId, role }: PrescriptionPanelProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [medications, setMedications] = useState<MedicationEntry[]>([{ ...EMPTY_MED }]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isPsychiatrist = role === 'psychiatrist';

  useEffect(() => {
    loadPrescriptions();
  }, [patientId]);

  async function loadPrescriptions() {
    setLoading(true);
    try {
      const data = await prescriptionsApi.list(patientId);
      setPrescriptions(data.prescriptions || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function addMedication() {
    setMedications([...medications, { ...EMPTY_MED }]);
  }

  function removeMedication(index: number) {
    setMedications(medications.filter((_, i) => i !== index));
  }

  function updateMedication(index: number, field: keyof MedicationEntry, value: string) {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  }

  async function handleCreate() {
    const validMeds = medications.filter((m) => m.name.trim() && m.dosage.trim() && m.frequency.trim());
    if (validMeds.length === 0) return;
    setSaving(true);
    try {
      await prescriptionsApi.create({ patient_id: patientId, medications: validMeds });
      setMedications([{ ...EMPTY_MED }]);
      setView('list');
      await loadPrescriptions();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Nova Prescrição</h3>
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-800"><X className="w-5 h-5" /></button>
        </div>

        {medications.map((med, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-600">Medicamento {i + 1}</span>
              {medications.length > 1 && (
                <button onClick={() => removeMedication(i)} className="text-red-500 hover:text-red-600 text-xs">Remover</button>
              )}
            </div>
            <input
              type="text"
              placeholder="Nome do medicamento"
              value={med.name}
              onChange={(e) => updateMedication(i, 'name', e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Dosagem (ex: 20mg)"
                value={med.dosage}
                onChange={(e) => updateMedication(i, 'dosage', e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="text"
                placeholder="Frequência (ex: 1x/dia)"
                value={med.frequency}
                onChange={(e) => updateMedication(i, 'frequency', e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Duração (ex: 30 dias)"
                value={med.duration}
                onChange={(e) => updateMedication(i, 'duration', e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="text"
                placeholder="Instruções"
                value={med.instructions}
                onChange={(e) => updateMedication(i, 'instructions', e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        ))}

        <button onClick={addMedication} className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Adicionar medicamento
        </button>

        <button
          onClick={handleCreate}
          disabled={saving || !medications.some((m) => m.name.trim() && m.dosage.trim() && m.frequency.trim())}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Gerar Prescrição
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Pill className="w-5 h-5 text-amber-400" />
          Prescrições
        </h3>
        {isPsychiatrist && (
          <button
            onClick={() => setView('create')}
            className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Prescrição
          </button>
        )}
      </div>

      {!isPsychiatrist && (
        <p className="text-xs text-gray-400 italic">Apenas psiquiatras podem criar prescrições.</p>
      )}

      {prescriptions.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Nenhuma prescrição registrada.</p>
      ) : (
        <div className="space-y-2">
          {prescriptions.map((p) => (
            <div key={p.id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-gray-800 font-medium">
                    Prescrição — {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr(a). {p.professional_first_name} {p.professional_last_name}
                    {' • '}{(Array.isArray(p.medications_data) ? p.medications_data : []).length} medicamento(s)
                    {' • '}<span className={p.status === 'local' ? 'text-amber-600' : 'text-green-600'}>{p.status}</span>
                  </p>
                </div>
                {expandedId === p.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedId === p.id && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-3 space-y-2">
                  {(Array.isArray(p.medications_data) ? p.medications_data : []).map((m, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-lg p-3">
                      <p className="text-gray-800 font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.dosage} — {m.frequency}</p>
                      {m.duration && <p className="text-xs text-gray-400">Duração: {m.duration}</p>}
                      {m.instructions && <p className="text-xs text-gray-400">Instruções: {m.instructions}</p>}
                    </div>
                  ))}
                  {p.pdf_url && (
                    <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                      <FileText className="w-4 h-4" /> Ver PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
