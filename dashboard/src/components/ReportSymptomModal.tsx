'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
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
  const [symptomId, setSymptomId] = useState('');
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
    setSymptomId('');
    setSeverity(5);
    setNotes('');
    setReportedAt(format(new Date(), 'yyyy-MM-dd'));
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomId) {
      setError('Selecione um sintoma');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await symptomsApi.report({
        symptom_id: symptomId,
        severity,
        notes: notes.trim() || undefined,
        reported_at: new Date(reportedAt).toISOString(),
      });
      reset();
      onCreated();
      onClose();
    } catch {
      setError('Erro ao salvar sintoma. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <AlertCircle size={18} className="text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Relatar Sintoma</h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar"
            className="btn-ghost p-2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Sintoma */}
          <div>
            <label htmlFor="symptom-select" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Sintoma <span className="text-red-400">*</span>
            </label>
            {loadingSymptoms ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </div>
            ) : (
              <select
                id="symptom-select"
                value={symptomId}
                onChange={(e) => setSymptomId(e.target.value)}
                className="input-field w-full"
                disabled={saving}
              >
                <option value="">Selecione um sintoma</option>
                {symptoms.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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
              rows={3}
              maxLength={5000}
              className="input-field w-full resize-none"
              disabled={saving}
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="btn-ghost flex-1 py-2.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !symptomId}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Salvando...' : 'Relatar sintoma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
