'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Edit3, Trash2, Save, X, Loader2, Lock, Search } from 'lucide-react';
import { medicalRecordsApi, MedicalRecord } from '@/lib/api';

interface MedicalRecordsPanelProps {
  patientId: string;
}

export default function MedicalRecordsPanel({ patientId }: MedicalRecordsPanelProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    loadRecords();
  }, [patientId]);

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await medicalRecordsApi.list(patientId);
      setRecords(data.records || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setCategory('');
    setTags('');
  }

  function startEdit(record: MedicalRecord) {
    setSelectedRecord(record);
    setTitle(record.title);
    setContent(record.content);
    setRecordDate(record.record_date);
    setCategory(record.category || '');
    setTags(record.tags?.join(', ') || '');
    setView('edit');
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const data = {
        title,
        content,
        record_date: recordDate,
        category: category || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };

      if (view === 'edit' && selectedRecord) {
        await medicalRecordsApi.update(selectedRecord.id, data);
      } else {
        await medicalRecordsApi.create({ ...data, patient_id: patientId });
      }

      resetForm();
      setView('list');
      setSelectedRecord(null);
      await loadRecords();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await medicalRecordsApi.delete(id);
      setView('list');
      setSelectedRecord(null);
      await loadRecords();
    } catch {
      // silent
    }
  }

  const filteredRecords = records.filter((r) => {
    const matchesSearch = !searchTerm || r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(records.map((r) => r.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  // Create / Edit form
  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">
            {view === 'edit' ? 'Editar Registro' : 'Novo Registro'}
          </h3>
          <button
            onClick={() => { setView('list'); resetForm(); setSelectedRecord(null); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        />

        <div className="flex gap-3">
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="border border-gray-200 rounded-xl p-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
          />
          <input
            type="text"
            placeholder="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
          />
        </div>

        <textarea
          placeholder="Conteúdo do registro..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 resize-none min-h-[200px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
          rows={10}
        />

        <input
          type="text"
          placeholder="Tags (separadas por vírgula)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        />

        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40 font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {view === 'edit' ? 'Salvar Alterações' : 'Criar Registro'}
        </button>
      </div>
    );
  }

  // Detail view
  if (view === 'detail' && selectedRecord) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          onClick={() => { setView('list'); setSelectedRecord(null); }}
          className="text-sm text-rose-500 hover:text-rose-600 font-medium"
        >
          ← Voltar
        </button>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">{selectedRecord.title}</h3>
          <div className="flex gap-2">
            <button onClick={() => startEdit(selectedRecord)} className="text-gray-400 hover:text-gray-700 transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(selectedRecord.id)} className="text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{new Date(selectedRecord.record_date).toLocaleDateString('pt-BR')}</span>
          {selectedRecord.category && (
            <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">{selectedRecord.category}</span>
          )}
        </div>
        {selectedRecord.tags && selectedRecord.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedRecord.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm whitespace-pre-wrap font-mono">
          {selectedRecord.content}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-rose-500" />
          Prontuário Privado
        </h3>
        <button
          onClick={() => { resetForm(); setView('create'); }}
          className="text-sm bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Registro
        </button>
      </div>

      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
        <Lock className="w-4 h-4 flex-shrink-0 text-rose-500" />
        <span>Prontuário privado — somente você pode ver estes registros.</span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <option value="">Todas categorias</option>
            {categories.map((c) => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((r) => (
            <button
              key={r.id}
              onClick={() => { setSelectedRecord(r); setView('detail'); }}
              className="w-full bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-xl p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium text-sm">{r.title}</span>
                {r.category && (
                  <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">{r.category}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(r.record_date).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.content}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
