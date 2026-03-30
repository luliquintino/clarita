'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Send, ChevronDown, ChevronUp, CheckCircle2, Clock, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { anamnesisApi, AnamnesisTemplate, AnamnesisResponse } from '@/lib/api';

interface AnamnesisPanelProps {
  patientId?: string;
  role: string;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Texto livre' },
  { value: 'scale', label: 'Escala (1-10)' },
  { value: 'multiple_choice', label: 'Múltipla escolha' },
  { value: 'yes_no', label: 'Sim / Não' },
  { value: 'date', label: 'Data' },
];

export default function AnamnesisPanel({ patientId, role }: AnamnesisPanelProps) {
  const t = useTranslations('patients');
  const [templates, setTemplates] = useState<AnamnesisTemplate[]>([]);
  const [responses, setResponses] = useState<AnamnesisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'create' | 'respond'>('list');
  const [selectedResponse, setSelectedResponse] = useState<AnamnesisResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AnamnesisTemplate | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Create template state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQuestions, setNewQuestions] = useState<Array<{ question_text: string; question_type: string; options: string; is_required: boolean }>>([
    { question_text: '', question_type: 'text', options: '', is_required: true },
  ]);

  // Patient response state
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [patientId, role]);

  async function loadData() {
    setLoading(true);
    try {
      if (role === 'patient') {
        const data = await anamnesisApi.getPending();
        setResponses(data.responses || []);
      } else {
        const [templatesData, responsesData] = await Promise.all([
          anamnesisApi.getTemplates(),
          patientId ? anamnesisApi.getPatientResponses(patientId) : Promise.resolve({ responses: [] }),
        ]);
        setTemplates(templatesData.templates || []);
        setResponses(responsesData.responses || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemplate() {
    if (!newTitle.trim() || newQuestions.some((q) => !q.question_text.trim())) return;
    setSending(true);
    try {
      const questions = newQuestions.map((q, i) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'multiple_choice' && q.options ? q.options.split(',').map((o) => o.trim()) : null,
        display_order: i + 1,
        is_required: q.is_required,
      }));
      await anamnesisApi.createTemplate({ title: newTitle, description: newDescription || undefined, questions });
      setNewTitle('');
      setNewDescription('');
      setNewQuestions([{ question_text: '', question_type: 'text', options: '', is_required: true }]);
      setActiveView('list');
      await loadData();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  async function handleSendToPatient(templateId: string) {
    if (!patientId) return;
    setSending(true);
    try {
      await anamnesisApi.sendToPatient({ template_id: templateId, patient_id: patientId });
      await loadData();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  async function handleSubmitResponse(responseId: string) {
    setSubmitting(true);
    try {
      await anamnesisApi.submitResponse(responseId, answers);
      setAnswers({});
      setSelectedResponse(null);
      setActiveView('list');
      await loadData();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewResponse(resp: AnamnesisResponse) {
    try {
      const data = await anamnesisApi.getResponse(resp.id);
      setSelectedResponse(data.response);
      if (data.response.template_id) {
        const tplData = await anamnesisApi.getTemplate(data.response.template_id);
        setSelectedTemplate(tplData.template);
      }
      setActiveView('respond');
      if (role === 'patient' && data.response.status === 'pending') {
        setAnswers({});
      }
    } catch {
      // silent
    }
  }

  function addQuestion() {
    setNewQuestions([...newQuestions, { question_text: '', question_type: 'text', options: '', is_required: true }]);
  }

  function removeQuestion(index: number) {
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: string, value: string | boolean) {
    const updated = [...newQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setNewQuestions(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
      </div>
    );
  }

  // Patient view: respond to pending anamneses
  if (role === 'patient') {
    if (activeView === 'respond' && selectedResponse && selectedTemplate) {
      const questions = selectedTemplate.questions || [];
      const isCompleted = selectedResponse.status === 'completed';
      return (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => { setActiveView('list'); setSelectedResponse(null); }}
            className="text-sm text-clarita-green-600 hover:text-clarita-green-700 font-medium"
          >
            ← Voltar
          </button>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/30 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">{selectedTemplate.title}</h3>
                {selectedTemplate.description && (
                  <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
                )}
              </div>
              <span className={`flex-shrink-0 ml-3 text-xs px-2.5 py-1 rounded-full font-medium ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {isCompleted ? 'Respondida' : 'Pendente'}
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id || i} className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                  <p className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    {i + 1}. {q.question_text}
                    {q.is_required && !isCompleted && <span className="text-red-400 ml-1">*</span>}
                  </p>
                  {isCompleted ? (
                    <p className="text-sm text-gray-800 font-medium">
                      {String(selectedResponse.answers?.[String(i)] ?? '—')}
                    </p>
                  ) : q.question_type === 'text' ? (
                    <textarea
                      className="input-field min-h-[80px] resize-none"
                      rows={3}
                      value={String(answers[String(i)] || '')}
                      onChange={(e) => setAnswers({ ...answers, [String(i)]: e.target.value })}
                    />
                  ) : q.question_type === 'scale' ? (
                    <div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={Number(answers[String(i)] || 5)}
                        onChange={(e) => setAnswers({ ...answers, [String(i)]: parseInt(e.target.value, 10) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1</span>
                        <span className="font-medium text-clarita-green-600">{String(answers[String(i)] || 5)}</span>
                        <span>10</span>
                      </div>
                    </div>
                  ) : q.question_type === 'yes_no' ? (
                    <div className="flex gap-3">
                      {['Sim', 'Não'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [String(i)]: opt })}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            answers[String(i)] === opt
                              ? 'bg-clarita-green-100 border-clarita-green-300 text-clarita-green-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : q.question_type === 'multiple_choice' ? (
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(q.options) ? q.options : []).map((opt: string) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [String(i)]: opt })}
                          className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                            answers[String(i)] === opt
                              ? 'bg-clarita-green-100 border-clarita-green-300 text-clarita-green-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {String(opt)}
                        </button>
                      ))}
                    </div>
                  ) : q.question_type === 'date' ? (
                    <input
                      type="date"
                      className="input-field w-auto"
                      value={String(answers[String(i)] || '')}
                      onChange={(e) => setAnswers({ ...answers, [String(i)]: e.target.value })}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {!isCompleted && (
              <button
                type="button"
                onClick={() => handleSubmitResponse(selectedResponse.id)}
                disabled={submitting}
                className="btn-primary mt-5 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Enviar Respostas
              </button>
            )}
          </div>
        </div>
      );
    }

    // Patient list view
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={20} className="text-teal-500" />
          <h3 className="text-lg font-semibold text-gray-800">Anamneses</h3>
        </div>

        {responses.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-14 h-14 mx-auto mb-3 bg-teal-50 rounded-full flex items-center justify-center">
              <ClipboardList size={24} className="text-teal-400" />
            </div>
            <p className="text-gray-600 font-medium">Nenhuma anamnese pendente</p>
            <p className="text-sm text-gray-400 mt-1">
              Seu profissional de saúde enviará questionários por aqui.
            </p>
          </div>
        ) : (
          responses.map((r) => {
            const isCompleted = r.status === 'completed';
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleViewResponse(r)}
                className="w-full bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30 shadow-sm text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {r.template_title || 'Anamnese'}
                    </p>
                    {r.deadline && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Prazo: {new Date(r.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                    isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isCompleted ? 'Respondida' : 'Pendente'}
                  </span>
                </div>
                {isCompleted && (
                  <p className="text-xs text-clarita-green-600 mt-2 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} /> Toque para ver suas respostas
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    );
  }

  // Professional view
  if (activeView === 'create') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Novo Template de Anamnese</h3>
          <button onClick={() => setActiveView('list')} className="text-sm text-teal-600 hover:text-teal-700">Cancelar</button>
        </div>

        <input
          type="text"
          placeholder="Título do template"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400"
        />
        <textarea
          placeholder="Descrição (opcional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 resize-none"
          rows={2}
        />

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-500">Perguntas</h4>
          {newQuestions.map((q, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-6">{i + 1}.</span>
                <input
                  type="text"
                  placeholder="Texto da pergunta"
                  value={q.question_text}
                  onChange={(e) => updateQuestion(i, 'question_text', e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-sm placeholder-gray-400"
                />
                {newQuestions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} className="text-red-400/60 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 pl-8">
                <select
                  value={q.question_type}
                  onChange={(e) => updateQuestion(i, 'question_type', e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg p-1.5 text-gray-800 text-xs"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={q.is_required}
                    onChange={(e) => updateQuestion(i, 'is_required', e.target.checked)}
                    className="accent-teal-400"
                  />
                  Obrigatória
                </label>
              </div>
              {q.question_type === 'multiple_choice' && (
                <input
                  type="text"
                  placeholder="Opções separadas por vírgula"
                  value={q.options}
                  onChange={(e) => updateQuestion(i, 'options', e.target.value)}
                  className="ml-8 bg-white border border-gray-200 rounded-lg p-2 text-gray-800 text-xs placeholder-gray-400 w-[calc(100%-2rem)]"
                />
              )}
            </div>
          ))}
          <button onClick={addQuestion} className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Adicionar pergunta
          </button>
        </div>

        <button
          onClick={handleCreateTemplate}
          disabled={sending || !newTitle.trim()}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Salvar Template
        </button>
      </div>
    );
  }

  if (activeView === 'respond' && selectedResponse && selectedTemplate) {
    const questions = selectedTemplate.questions || [];
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => { setActiveView('list'); setSelectedResponse(null); }} className="text-sm text-teal-600 hover:text-teal-700">
          ← Voltar
        </button>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{selectedTemplate.title}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${selectedResponse.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {selectedResponse.status === 'completed' ? 'Respondida' : 'Pendente'}
          </span>
        </div>
        {selectedResponse.patient_first_name && (
          <p className="text-sm text-gray-500">{t('patient_label')}: {selectedResponse.patient_first_name} {selectedResponse.patient_last_name}</p>
        )}
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id || i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">{i + 1}. {q.question_text}</p>
              <p className="text-gray-500 text-sm">{String(selectedResponse.answers?.[String(i)] ?? '—')}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List view (professional)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-teal-600" />
          Anamnese
        </h3>
        <button
          onClick={() => setActiveView('create')}
          className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Template
        </button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Meus Templates</h4>
          {templates.map((t) => (
            <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-gray-800 font-medium">{t.title}</span>
                  {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                </div>
                {expandedTemplate === t.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedTemplate === t.id && patientId && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                  <button
                    onClick={() => handleSendToPatient(t.id)}
                    disabled={sending}
                    className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Enviar para paciente
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Responses */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Respostas</h4>
        {responses.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhuma resposta ainda.</p>
        ) : (
          responses.map((r) => (
            <button
              key={r.id}
              onClick={() => handleViewResponse(r)}
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium">{r.template_title || 'Anamnese'}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {r.status === 'completed' ? 'Respondida' : 'Pendente'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
