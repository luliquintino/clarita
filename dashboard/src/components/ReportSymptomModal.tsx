'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { symptomsApi, type Symptom } from '@/lib/api';

interface ReportSymptomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ReportSymptomModal({ open, onClose, onCreated }: ReportSymptomModalProps) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loadingSymptoms, setLoadingSymptoms] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [reportedAt, setReportedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoadingSymptoms(true);
    symptomsApi.list()
      .then((res) => {
        const raw = res as any;
        setSymptoms(Array.isArray(raw) ? raw : (raw?.symptoms ?? []));
      })
      .catch(() => setError('Erro ao carregar sintomas.'))
      .finally(() => setLoadingSymptoms(false));
  }, [open]);

  const reset = () => {
    setSelectedIds(new Set());
    setSeverity(5);
    setNotes('');
    setReportedAt(format(new Date(), 'yyyy-MM-dd'));
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleSymptom = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('Selecione pelo menos um sintoma');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const reportedAtISO = new Date(reportedAt).toISOString();
      await Promise.all(
        Array.from(selectedIds).map((symptom_id) =>
          symptomsApi.report({
            symptom_id,
            severity,
            notes: notes.trim() || undefined,
            reported_at: reportedAtISO,
          })
        )
      );
      reset();
      onCreated();
      onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Group symptoms by category
  const grouped = symptoms.reduce<Record<string, Symptom[]>>((acc, s) => {
    const cat = s.category ?? 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    mood: 'Humor',
    anxiety: 'Ansiedade',
    sleep: 'Sono',
    cognitive: 'Cognitivo',
    physical: 'Físico',
    behavioral: 'Comportamento',
    Outros: 'Outros',
  };

  const count = selectedIds.size;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <AlertCircle size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Relatar Sintomas</h2>
              {count > 0 && (
                <p className="text-xs text-orange-500 font-medium">{count} selecionado{count > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <button onClick={handleClose} aria-label="Fechar" className="btn-ghost p-2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Symptom chips */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Sintomas <span className="text-red-400">*</span>
              </p>
              {loadingSymptoms ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando...
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                        {categoryLabels[cat] ?? cat}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((s) => {
                          const selected = selectedIds.has(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSymptom(s.id)}
                              disabled={saving}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ${
                                selected
                                  ? 'bg-orange-500 border-orange-500 text-white font-medium shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                              }`}
                            >
                              {selected && <Check size={12} />}
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Intensidade */}
            <div>
              <label htmlFor="symptom-severity" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Intensidade: <span className="text-gray-700 font-bold">{severity}/10</span>
              </label>
              <input
                id="symptom-severity"
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-orange-500"
                disabled={saving}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>Leve</span>
                <span>Moderado</span>
                <span>Intenso</span>
              </div>
            </div>

            {/* Data */}
            <div>
              <label htmlFor="symptom-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Data
              </label>
              <input
                id="symptom-date"
                type="date"
                value={reportedAt}
                onChange={(e) => setReportedAt(e.target.value)}
                className="input-field w-full"
                disabled={saving}
              />
            </div>

            {/* Observações */}
            <div>
              <label htmlFor="symptom-notes" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Observações <span className="text-gray-300 font-normal">(opcional)</span>
              </label>
              <textarea
                id="symptom-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva como está se sentindo..."
                rows={2}
                maxLength={5000}
                className="input-field w-full resize-none"
                disabled={saving}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={handleClose} disabled={saving} className="btn-ghost flex-1 py-2.5">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || count === 0}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Salvando...' : count > 0 ? `Relatar ${count} sintoma${count > 1 ? 's' : ''}` : 'Relatar sintomas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
