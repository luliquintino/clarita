'use client';

import { useState, useEffect } from 'react';
import { Brain, Send, Clock, CheckCircle2, AlertTriangle, Loader2, ChevronRight, ChevronLeft, BarChart3 } from 'lucide-react';
import { psychTestsApi, PsychTest, TestSession } from '@/lib/api';

interface PsychTestPanelProps {
  patientId?: string;
  role: string;
  assessmentFilter?: 'clinical' | 'psychological';
}

export default function PsychTestPanel({ patientId, role, assessmentFilter }: PsychTestPanelProps) {
  const [catalog, setCatalog] = useState<PsychTest[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [history, setHistory] = useState<TestSession[]>([]);
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

  // Categorias de testes visíveis por papel
  // 'depression', 'anxiety', 'general' são compartilhadas por ambos
  // 'clinical' é exclusiva do psiquiatra (HAM-D, BPRS etc. — adicionados futuramente)
  // 'psychological' é exclusiva do psicólogo (SATEPSI — adicionados futuramente)
  const SHARED_CATEGORIES = ['depression', 'anxiety', 'general'];
  const allowedCategories: string[] = assessmentFilter === 'clinical'
    ? [...SHARED_CATEGORIES, 'clinical']
    : assessmentFilter === 'psychological'
      ? [...SHARED_CATEGORIES, 'psychological']
      : [...SHARED_CATEGORIES, 'clinical', 'psychological']; // sem filtro = todos

  const filteredCatalog = catalog.filter((t) =>
    allowedCategories.includes(t.category)
  );

  useEffect(() => {
    loadData();
  }, [patientId, role]);

  async function loadData() {
    setLoading(true);
    try {
      if (isPatient) {
        const [pendingData, historyData] = await Promise.allSettled([
          psychTestsApi.getPending(),
          psychTestsApi.getMyHistory(),
        ]);
        setSessions(pendingData.status === 'fulfilled' ? pendingData.value.sessions || [] : []);
        setHistory(historyData.status === 'fulfilled' ? historyData.value.sessions || [] : []);
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
      setResult({ ...data, justCompleted: true });
      setView('result');
      await loadData();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToList() {
    setView('list');
    setResult(null);
    setSelectedSession(null);
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
    const justCompleted = result.justCompleted === true;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Success banner — shown only right after submission */}
        {justCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Teste enviado com sucesso!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Seu(s) profissional(is) de saúde já receberam os resultados e foram notificados.
              </p>
            </div>
          </div>
        )}

        <button onClick={handleBackToList} className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Voltar aos testes
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

        {/* Primary CTA at the bottom */}
        <button
          onClick={handleBackToList}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {justCompleted ? 'Concluir e voltar aos testes' : 'Voltar aos testes'}
        </button>
      </div>
    );
  }

  // Assign view (professional)
  if (view === 'assign') {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setView('list')} className="text-sm text-indigo-600 hover:text-indigo-500">← Voltar</button>
        <h3 className="text-lg font-semibold text-gray-900">Catálogo de Testes</h3>
        {filteredCatalog.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhum teste disponível. Execute o seed de dados.</p>
        ) : (
          <div className="space-y-2">
            {filteredCatalog.map((test) => (
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

  // Session card — reused for pending and history
  function SessionCard({ s, isPending }: { s: TestSession; isPending: boolean }) {
    return (
      <button
        key={s.id}
        onClick={() => {
          if (isPending) {
            handleStartTest(s);
          } else {
            handleViewResult(s);
          }
        }}
        className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 text-left transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-900 font-medium">{s.test_name}</span>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.test_category}
              {s.assigned_by_first_name && ` • Dr(a). ${s.assigned_by_first_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {s.total_score !== null && s.total_score !== undefined && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {s.total_score} pts
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${
              s.status === 'completed' ? 'bg-green-50 text-green-700' :
              s.status === 'expired'   ? 'bg-red-50 text-red-700'   :
                                         'bg-amber-50 text-amber-700'
            }`}>
              {s.status === 'completed' ? 'Concluído' : s.status === 'expired' ? 'Expirado' : 'Pendente'}
            </span>
          </div>
        </div>
        {s.deadline && isPending && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Prazo: {new Date(s.deadline).toLocaleDateString('pt-BR')}
          </p>
        )}
        {!isPending && s.completed_at && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Concluído em {new Date(s.completed_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </button>
    );
  }

  // List view
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          {isPatient ? 'Meus Testes' : 'Testes Psicológicos'}
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

      {/* Pending / assigned */}
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          {isPatient ? 'Pendentes' : 'Atribuídos'}
        </h4>
        {sessions.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center bg-gray-50 rounded-xl border border-gray-100">
            {isPatient ? 'Nenhum teste pendente.' : 'Nenhum teste atribuído para este paciente.'}
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionCard key={s.id} s={s} isPending={true} />
            ))}
          </div>
        )}
      </div>

      {/* History — patients only */}
      {isPatient && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Histórico de testes realizados
          </h4>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center bg-gray-50 rounded-xl border border-gray-100">
              Nenhum teste concluído ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((s) => (
                <SessionCard key={s.id} s={s} isPending={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
