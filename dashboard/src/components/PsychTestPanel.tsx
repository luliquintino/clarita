'use client';

import { useState, useEffect } from 'react';
import { Brain, Send, Clock, CheckCircle2, AlertTriangle, Loader2, ChevronRight, ChevronLeft, BarChart3 } from 'lucide-react';
import { psychTestsApi, PsychTest, TestSession } from '@/lib/api';

interface PsychTestPanelProps {
  patientId?: string;
  role: string;
}

export default function PsychTestPanel({ patientId, role }: PsychTestPanelProps) {
  const [catalog, setCatalog] = useState<PsychTest[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'assign' | 'take' | 'result'>('list');
  const [selectedTest, setSelectedTest] = useState<PsychTest | null>(null);
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);
  const [sending, setSending] = useState(false);

  // Test-taking state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  const isPatient = role === 'patient';

  useEffect(() => {
    loadData();
  }, [patientId, role]);

  async function loadData() {
    setLoading(true);
    try {
      if (isPatient) {
        const data = await psychTestsApi.getPending();
        setSessions(data.sessions || []);
      } else {
        const [catalogData, sessionsData] = await Promise.all([
          psychTestsApi.getCatalog(),
          patientId ? psychTestsApi.getPatientHistory(patientId) : Promise.resolve({ sessions: [], pagination: { page: 1, limit: 20, total: 0 } }),
        ]);
        setCatalog(catalogData.tests || []);
        setSessions(sessionsData.sessions || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(testId: string) {
    if (!patientId) return;
    setSending(true);
    try {
      await psychTestsApi.assign({ test_id: testId, patient_id: patientId });
      setView('list');
      await loadData();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  async function handleStartTest(session: TestSession) {
    try {
      const data = await psychTestsApi.getSession(session.id);
      setSelectedSession(data.session);
      setCurrentQuestion(0);
      setAnswers({});
      setView('take');
    } catch {
      // silent
    }
  }

  async function handleSubmitTest() {
    if (!selectedSession) return;
    setSubmitting(true);
    try {
      const data = await psychTestsApi.submitAnswers(selectedSession.id, answers);
      setResult(data);
      setView('result');
      await loadData();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewResult(session: TestSession) {
    try {
      const data = await psychTestsApi.getSession(session.id);
      setSelectedSession(data.session);
      setResult({ session: data.session, score: { total_score: data.session.total_score }, ai_analysis: data.session.ai_analysis });
      setView('result');
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  // Test-taking view (patient)
  if (view === 'take' && selectedSession) {
    const questions = selectedSession.test_questions || [];
    const question = questions[currentQuestion];
    const totalQuestions = questions.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{selectedSession.test_name}</h3>
          <span className="text-xs text-gray-400">{currentQuestion + 1} / {totalQuestions}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {question && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
            <p className="text-gray-900 font-medium">{question.text}</p>
            <div className="space-y-2">
              {(question.options || [
                { label: 'Nenhuma vez', value: 0 },
                { label: 'Vários dias', value: 1 },
                { label: 'Mais da metade dos dias', value: 2 },
                { label: 'Quase todos os dias', value: 3 },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers({ ...answers, [String(currentQuestion)]: opt.value })}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    answers[String(currentQuestion)] === opt.value
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-900 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          {currentQuestion < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[String(currentQuestion)] === undefined}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 disabled:opacity-30"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitTest}
              disabled={submitting || Object.keys(answers).length < totalQuestions}
              className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finalizar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Result view
  if (view === 'result' && result) {
    const session = result.session;
    const analysis = result.ai_analysis || session?.ai_analysis;
    const dsmMapping = session?.dsm_mapping || [];

    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => { setView('list'); setResult(null); setSelectedSession(null); }} className="text-sm text-indigo-600 hover:text-indigo-500">
          ← Voltar
        </button>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{session?.test_name || 'Resultado'}</h3>
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
            Escore: {result.score?.total_score ?? session?.total_score}
          </span>
        </div>

        {analysis && (
          <div className="space-y-4">
            {analysis.summary && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" /> Resumo
                </h4>
                <p className="text-gray-700 text-sm">{analysis.summary}</p>
              </div>
            )}

            {analysis.clinical_observations && analysis.clinical_observations.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Observações Clínicas
                </h4>
                <ul className="space-y-1">
                  {analysis.clinical_observations.map((obs: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span> {obs}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.patterns && analysis.patterns.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Padrões Identificados</h4>
                {analysis.patterns.map((p: { type: string; count: number; items?: string[] }, i: number) => (
                  <div key={i} className="text-sm text-gray-600">
                    <p className="font-medium">{p.count} itens com pontuação elevada</p>
                    {p.items && (
                      <ul className="mt-1 space-y-0.5">
                        {p.items.slice(0, 5).map((item, j) => (
                          <li key={j} className="text-xs text-gray-400 ml-4">— {item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {dsmMapping && dsmMapping.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Mapeamento DSM</h4>
                <div className="space-y-2">
                  {dsmMapping.map((d: { code: string; name: string; relevance: string }, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-900 text-sm font-medium">{d.code}</span>
                        <span className="text-gray-500 text-sm ml-2">{d.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        d.relevance === 'high' ? 'bg-red-50 text-red-700' :
                        d.relevance === 'moderate' ? 'bg-amber-50 text-amber-700' :
                        'bg-green-50 text-green-700'
                      }`}>
                        {d.relevance === 'high' ? 'Alta' : d.relevance === 'moderate' ? 'Moderada' : 'Baixa'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-indigo-700 mb-2">Recomendações</h4>
                <ul className="space-y-1">
                  {analysis.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-indigo-400 mt-1 flex-shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Assign view (professional)
  if (view === 'assign') {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setView('list')} className="text-sm text-indigo-600 hover:text-indigo-500">← Voltar</button>
        <h3 className="text-lg font-semibold text-gray-900">Catálogo de Testes</h3>
        {catalog.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhum teste disponível. Execute o seed de dados.</p>
        ) : (
          <div className="space-y-2">
            {catalog.map((test) => (
              <div key={test.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-gray-900 font-medium">{test.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{test.category} • {test.questions?.length || 0} questões</p>
                    {test.description && <p className="text-sm text-gray-400 mt-1">{test.description}</p>}
                  </div>
                  <button
                    onClick={() => handleAssign(test.id)}
                    disabled={sending}
                    className="flex-shrink-0 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors"
                  >
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Atribuir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          {isPatient ? 'Testes Pendentes' : 'Testes Psicológicos'}
        </h3>
        {!isPatient && (
          <button
            onClick={() => setView('assign')}
            className="text-sm bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Send className="w-4 h-4" /> Atribuir Teste
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          {isPatient ? 'Nenhum teste pendente.' : 'Nenhum teste atribuído para este paciente.'}
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (isPatient && (s.status === 'pending' || s.status === 'in_progress')) {
                  handleStartTest(s);
                } else if (s.status === 'completed') {
                  handleViewResult(s);
                }
              }}
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-900 font-medium">{s.test_name}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.test_category}
                    {s.assigned_by_first_name && ` • Atribuído por Dr(a). ${s.assigned_by_first_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === 'completed' && s.total_score !== null && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {s.total_score} pts
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === 'completed' ? 'bg-green-50 text-green-700' :
                    s.status === 'expired' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {s.status === 'completed' ? 'Concluído' : s.status === 'expired' ? 'Expirado' : 'Pendente'}
                  </span>
                </div>
              </div>
              {s.deadline && s.status !== 'completed' && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Prazo: {new Date(s.deadline).toLocaleDateString('pt-BR')}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
