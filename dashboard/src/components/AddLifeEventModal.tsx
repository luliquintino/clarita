'use client';

import { useState } from 'react';
import { X, Loader2, Star } from 'lucide-react';
import { format } from 'date-fns';
import { lifeEventsApi, type CreateLifeEventInput } from '@/lib/api';

const CATEGORIES = [
  { value: 'relationship', label: 'Relacionamento' },
  { value: 'work', label: 'Trabalho' },
  { value: 'health', label: 'Saúde' },
  { value: 'family', label: 'Família' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'loss', label: 'Perda' },
  { value: 'achievement', label: 'Conquista' },
  { value: 'other', label: 'Outro' },
] as const;

// Mapeia impacto simplificado (UI) para impact_level numérico (1-10)
const IMPACT_OPTIONS = [
  { value: 2, label: 'Negativo' },
  { value: 5, label: 'Neutro' },
  { value: 8, label: 'Positivo' },
];

interface AddLifeEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddLifeEventModal({ open, onClose, onCreated }: AddLifeEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CreateLifeEventInput['category']>('other');
  const [impactLevel, setImpactLevel] = useState<number>(5);
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('other');
    setImpactLevel(5);
    setEventDate(format(new Date(), 'yyyy-MM-dd'));
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await lifeEventsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        impact_level: impactLevel,
        event_date: eventDate,
      });
      reset();
      onCreated();
      onClose();
    } catch {
      setError('Erro ao salvar momento. Tente novamente.');
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
            <div className="w-9 h-9 rounded-xl bg-clarita-blue-50 flex items-center justify-center">
              <Star size={18} className="text-clarita-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Registrar Momento</h2>
          </div>
          <button onClick={handleClose} aria-label="Fechar" className="btn-ghost p-2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label htmlFor="life-event-title" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              id="life-event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Comecei nova terapia"
              maxLength={300}
              className="input-field w-full"
              disabled={saving}
            />
          </div>

          {/* Categoria e Data em linha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="life-event-category" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                id="life-event-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CreateLifeEventInput['category'])}
                className="input-field w-full"
                disabled={saving}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="life-event-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Data
              </label>
              <input
                id="life-event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input-field w-full"
                disabled={saving}
              />
            </div>
          </div>

          {/* Impacto */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Impacto
            </label>
            <div className="flex gap-2">
              {IMPACT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setImpactLevel(opt.value)}
                  disabled={saving}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all duration-200
                    ${impactLevel === opt.value
                      ? 'border-transparent bg-clarita-green-50 text-clarita-green-600 shadow-sm ring-2 ring-clarita-green-200'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="life-event-description" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Descrição <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <textarea
              id="life-event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o momento com mais detalhes..."
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
              disabled={saving || !title.trim()}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Salvando...' : 'Salvar momento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
