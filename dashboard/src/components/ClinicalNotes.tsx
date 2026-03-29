'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  FileText,
  Eye,
  Stethoscope,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import type { ClinicalNote } from '@/lib/api';

interface ClinicalNotesProps {
  notes: ClinicalNote[];
  patientId: string;
  onSave: (data: { type: string; title: string; content: string }) => Promise<void>;
  onUpdate: (
    noteId: string,
    data: { type?: string; title?: string; content?: string }
  ) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

const noteTypeConfigBase: Record<
  string,
  {
    icon: React.ReactNode;
    badgeClass: string;
    activeBg: string;
    activeText: string;
  }
> = {
  session: {
    icon: <FileText size={14} />,
    badgeClass: 'badge-green',
    activeBg: 'bg-clarita-green-100 ring-2 ring-offset-1 ring-clarita-green-300/30',
    activeText: 'text-clarita-green-700',
  },
  observation: {
    icon: <Eye size={14} />,
    badgeClass: 'badge-blue',
    activeBg: 'bg-clarita-blue-100 ring-2 ring-offset-1 ring-clarita-blue-300/30',
    activeText: 'text-clarita-blue-500',
  },
  treatment_plan: {
    icon: <ClipboardList size={14} />,
    badgeClass: 'badge-purple',
    activeBg: 'bg-purple-100 ring-2 ring-offset-1 ring-purple-300/30',
    activeText: 'text-purple-600',
  },
  progress: {
    icon: <TrendingUp size={14} />,
    badgeClass: 'badge-orange',
    activeBg: 'bg-orange-100 ring-2 ring-offset-1 ring-orange-300/30',
    activeText: 'text-orange-600',
  },
};

export default function ClinicalNotes({
  notes,
  patientId,
  onSave,
  onUpdate,
  onDelete,
}: ClinicalNotesProps) {
  const t = useTranslations('clinical_notes');
  const tNoteTypes = useTranslations('note_types');

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formType, setFormType] = useState('session');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [isTitleAutoFilled, setIsTitleAutoFilled] = useState(false);

  const typeLabels: Record<string, string> = {
    session: tNoteTypes('session'),
    observation: tNoteTypes('observation'),
    treatment_plan: tNoteTypes('treatment_plan'),
    progress: tNoteTypes('progress'),
  };

  const noteTypeConfig = Object.fromEntries(
    Object.entries(noteTypeConfigBase).map(([key, val]) => [
      key,
      { ...val, label: typeLabels[key] ?? key },
    ])
  );

  function autoFillTitle(type: string) {
    const label = typeLabels[type] ?? type;
    const dateStr = format(new Date(), 'dd/MM/yyyy');
    setFormTitle(`${label} — ${dateStr}`);
    setIsTitleAutoFilled(true);
  }

  const resetForm = () => {
    setFormType('session');
    setFormTitle('');
    setFormContent('');
    setIsTitleAutoFilled(false);
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (note: ClinicalNote) => {
    setEditingId(note.id);
    setFormType(note.type);
    setFormTitle(note.title);
    setFormContent(note.content);
    setIsTitleAutoFilled(false);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        await onUpdate(editingId, {
          type: formType,
          title: formTitle,
          content: formContent,
        });
      } else {
        await onSave({
          type: formType,
          title: formTitle,
          content: formContent,
        });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await onDelete(noteId);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const toggleExpand = (noteId: string) => {
    setExpandedId((prev) => (prev === noteId ? null : noteId));
  };

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title mb-0">{t('title')}</h3>
        {!isCreating && !editingId && (
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingId(null);
              autoFillTitle(formType);
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            {t('new_note')}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-clarita-green-200/50 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-800">
                {editingId ? t('edit_note') : t('new_note')}
              </h4>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Note type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('type_label')}</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(noteTypeConfig).map(([type, config]) => {
                    const isSelected = formType === type;

                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setFormType(type);
                          if (isTitleAutoFilled || !formTitle.trim()) {
                            autoFillTitle(type);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300
                          ${
                            isSelected
                              ? `${config.activeBg} ${config.activeText}`
                              : 'bg-white/30 text-gray-500 hover:bg-white/50'
                          }`}
                      >
                        {config.icon}
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('title_label')}</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    setIsTitleAutoFilled(false);
                  }}
                  className="input-field"
                  placeholder={t('title_placeholder')}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('content_label')}</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="input-field min-h-[200px] resize-y"
                  placeholder={t('content_placeholder')}
                  rows={8}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !formTitle.trim() || !formContent.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  {saving ? t('saving') : editingId ? t('update_note') : t('save_note')}
                </button>
                <button onClick={resetForm} className="btn-ghost">
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="space-y-3">
          {notes.map((note) => {
            const config = noteTypeConfig[note.type] ?? noteTypeConfig.session;
            const isExpanded = expandedId === note.id;
            const isLong = note.content.length > 200;

            return (
              <div
                key={note.id}
                className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 animate-fade-in transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={config.badgeClass}>
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </span>
                    <span className="text-xs text-gray-400">{t('by_professional', { name: note.professional_name })}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1.5 text-gray-400 hover:text-clarita-green-500 hover:bg-clarita-green-50/50 rounded-xl transition-colors"
                      title={t('edit_note')}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-colors"
                      title={t('delete_note')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="font-semibold text-gray-800 mb-1">{note.title}</h4>

                {/* Expandable content with smooth transition */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded || !isLong ? 'max-h-[2000px]' : 'max-h-[4.5rem]'
                  }`}
                >
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>

                {isLong && (
                  <button
                    onClick={() => toggleExpand(note.id)}
                    className="text-xs text-clarita-green-500 hover:text-clarita-green-600 font-medium mt-1 transition-colors"
                  >
                    {isExpanded ? t('see_less') : t('see_more')}
                  </button>
                )}

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/30">
                  <span className="text-xs text-gray-400">
                    {t('created_at', { date: format(new Date(note.created_at), 'dd/MM/yyyy HH:mm') })}
                  </span>
                  {note.updated_at !== note.created_at && (
                    <span className="text-xs text-gray-400">
                      &middot; {t('updated_at', { date: format(new Date(note.updated_at), 'dd/MM/yyyy HH:mm') })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {notes.length === 0 && !isCreating && (
          <div className="text-center py-12">
            <Stethoscope size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">{t('no_notes')}</p>
            <button
              onClick={() => setIsCreating(true)}
              className="btn-ghost text-xs mt-2 text-clarita-green-500"
            >
              {t('create_first_note')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
