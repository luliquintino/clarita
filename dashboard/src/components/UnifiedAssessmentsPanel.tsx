'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { psychTestsApi, Assessment, PsychTest, TestSession } from '@/lib/api';
import AssessmentHistory from '@/components/AssessmentHistory';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UnifiedAssessmentsPanelProps {
  patientId: string;
  assessments: Assessment[]; // Legacy PHQ-9/GAD-7 from old assessments table
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEGACY_TESTS = ['PHQ-9', 'GAD-7'] as const;
type LegacyTest = (typeof LEGACY_TESTS)[number];

function isLegacyTest(name: string | null): name is LegacyTest {
  return name === 'PHQ-9' || name === 'GAD-7';
}

function statusLabel(status: TestSession['status']): string {
  switch (status) {
    case 'completed':
      return 'Concluído';
    case 'expired':
      return 'Expirado';
    case 'in_progress':
      return 'Em andamento';
    default:
      return 'Pendente';
  }
}

function statusClasses(status: TestSession['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700';
    case 'expired':
      return 'bg-red-50 text-red-700';
    case 'in_progress':
      return 'bg-blue-50 text-blue-700';
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'clinical':
      return 'Clínico';
    case 'psychological':
      return 'Psicológico';
    case 'depression':
      return 'Depressão';
    case 'anxiety':
      return 'Ansiedade';
    case 'general':
      return 'Geral';
    case 'personality':
      return 'Personalidade';
    default:
      return cat;
  }
}

function categoryBadgeClasses(cat: string): string {
  switch (cat) {
    case 'clinical':
      return 'bg-indigo-50 text-indigo-700';
    case 'psychological':
      return 'bg-teal-50 text-teal-700';
    case 'personality':
      return 'bg-purple-50 text-purple-700';
    case 'depression':
      return 'bg-blue-50 text-blue-700';
    case 'anxiety':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/** Extract a human-readable result string from a completed session. */
function sessionResult(session: TestSession): string | null {
  if (session.status !== 'completed') return null;

  // AI analysis label (personality types, etc.)
  const analysis = session.ai_analysis as Record<string, unknown> | null;
  if (analysis) {
    if (typeof analysis.label === 'string' && analysis.label) return analysis.label;
    const resultObj = analysis.result as Record<string, unknown> | undefined;
    if (resultObj && typeof resultObj.label === 'string' && resultObj.label) return resultObj.label;
    const scoresObj = analysis.scores as Record<string, unknown> | undefined;
    if (scoresObj && typeof scoresObj.label === 'string' && scoresObj.label) return scoresObj.label;
    if (typeof analysis.personality_type === 'string' && analysis.personality_type)
      return analysis.personality_type;
    if (typeof analysis.interpretation === 'string' && analysis.interpretation)
      return analysis.interpretation;
  }

  // Fallback: total score
  if (session.total_score !== null && session.total_score !== undefined) {
    return `${session.total_score} pts`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UnifiedAssessmentsPanel({
  patientId,
  assessments,
}: UnifiedAssessmentsPanelProps) {
  const [catalog, setCatalog] = useState<PsychTest[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTestId, setAssignTestId] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ----- Data loading -------------------------------------------------------

  const loadData = async (cancelled: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const [catalogData, sessionsData] = await Promise.all([
        psychTestsApi.getCatalog(),
        psychTestsApi.getPatientHistory(patientId),
      ]);
      if (!cancelled.current) {
        setCatalog(catalogData.tests || []);
        setSessions(sessionsData.sessions || []);
      }
    } catch {
      if (!cancelled.current) {
        setError('Não foi possível carregar as avaliações.');
      }
    } finally {
      if (!cancelled.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const cancelled = { current: false };
    setSelectedTest(null);
    loadData(cancelled);
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // ----- Assign handler -----------------------------------------------------

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTestId) return;
    setAssigning(true);
    try {
      await psychTestsApi.assign({
        test_id: assignTestId,
        patient_id: patientId,
        deadline: assignDeadline || undefined,
      });
      setShowAssignForm(false);
      setAssignTestId('');
      setAssignDeadline('');
      const cancelled = { current: false };
      await loadData(cancelled);
    } catch {
      setError('Não foi possível atribuir o teste. Tente novamente.');
    } finally {
      setAssigning(false);
    }
  }

  // ----- Derived data -------------------------------------------------------

  /**
   * Build virtual "catalog entries" for legacy PHQ-9 and GAD-7 so they appear
   * in the left column alongside real psych tests from the catalog.
   */
  const legacyEntries: Array<{
    id: string; // virtual id = test name
    name: LegacyTest;
    category: string;
    completedCount: number;
  }> = LEGACY_TESTS.map((t) => ({
    id: t,
    name: t,
    category: t === 'PHQ-9' ? 'depression' : 'anxiety',
    completedCount: assessments.filter((a) => a.type === t).length,
  }));

  /** Count completed psych-test sessions per test name. */
  function completedCountForTest(testName: string): number {
    return sessions.filter((s) => s.test_name === testName && s.status === 'completed').length;
  }

  /** Sessions belonging to the currently selected (non-legacy) test. */
  const filteredSessions = selectedTest
    ? sessions.filter((s) => s.test_name === selectedTest)
    : [];

  // ----- Loading state ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  // ----- Render -------------------------------------------------------------

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    <div className="flex gap-6 min-h-[480px]">
      {/* ============================================================
          LEFT COLUMN — Test selector cards
      ============================================================ */}
      <div className="w-1/3 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400" />
          Escalas &amp; Testes
        </h3>

        {/* Legacy PHQ-9 / GAD-7 */}
        {legacyEntries.map((entry) => {
          const isActive = selectedTest === entry.name;
          return (
            <button
              key={entry.id}
              onClick={() => setSelectedTest(isActive ? null : entry.name)}
              className={`text-left rounded-xl border p-3 transition-all duration-200 ${
                isActive
                  ? 'ring-2 ring-indigo-300 border-indigo-200 bg-indigo-50/60'
                  : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      entry.name === 'PHQ-9' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}
                  >
                    <ClipboardCheck
                      size={14}
                      className={entry.name === 'PHQ-9' ? 'text-blue-500' : 'text-purple-500'}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400 truncate">{categoryLabel(entry.category)}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {entry.completedCount} reg.
                </span>
              </div>
            </button>
          );
        })}

        {/* Psych test catalog */}
        {catalog.length > 0 && (
          <div className="mt-1 border-t border-gray-100 pt-2 flex flex-col gap-2">
            {catalog.map((test) => {
              const isActive = selectedTest === test.name;
              const count = completedCountForTest(test.name);
              return (
                <button
                  key={test.id}
                  onClick={() => setSelectedTest(isActive ? null : test.name)}
                  className={`text-left rounded-xl border p-3 transition-all duration-200 ${
                    isActive
                      ? 'ring-2 ring-indigo-300 border-indigo-200 bg-indigo-50/60'
                      : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-50">
                        <Brain size={14} className="text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{test.name}</p>
                        <span
                          className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${categoryBadgeClasses(test.category)}`}
                        >
                          {categoryLabel(test.category)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{count} reg.</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {catalog.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Nenhum teste no catálogo.
          </p>
        )}

        {/* ---- Atribuir teste button ---- */}
        <div className="mt-auto pt-4">
          {!showAssignForm ? (
            <button
              onClick={() => setShowAssignForm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              Atribuir teste ao paciente
            </button>
          ) : (
            <form
              onSubmit={handleAssign}
              className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3"
            >
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <Send className="w-3 h-3 text-indigo-400" />
                Atribuir teste
              </p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Teste</label>
                <select
                  value={assignTestId}
                  onChange={(e) => setAssignTestId(e.target.value)}
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="">Selecionar...</option>
                  {catalog.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Prazo (opcional)
                </label>
                <input
                  type="date"
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={assigning || !assignTestId}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  {assigning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignForm(false);
                    setAssignTestId('');
                    setAssignDeadline('');
                  }}
                  className="text-sm text-gray-400 hover:text-gray-600 px-2"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ============================================================
          RIGHT COLUMN — Session history / chart
      ============================================================ */}
      <div className="flex-1 min-w-0">
        {selectedTest === null ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <Brain className="w-8 h-8 text-gray-200" />
            <p>Selecione uma escala ou teste para ver o histórico</p>
          </div>
        ) : isLegacyTest(selectedTest) ? (
          /* ---- Legacy PHQ-9 / GAD-7: delegate to AssessmentHistory ---- */
          <AssessmentHistory
            assessments={assessments.filter((a) => a.type === selectedTest)}
          />
        ) : (
          /* ---- Psych test sessions table ---- */
          <PsychSessionsView
            testName={selectedTest}
            sessions={filteredSessions}
            expandedSession={expandedSession}
            setExpandedSession={setExpandedSession}
          />
        )}
      </div>
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PsychSessionsView — table for non-legacy psych tests
// ---------------------------------------------------------------------------

interface PsychSessionsViewProps {
  testName: string;
  sessions: TestSession[];
  expandedSession: string | null;
  setExpandedSession: (id: string | null) => void;
}

function PsychSessionsView({
  testName,
  sessions,
  expandedSession,
  setExpandedSession,
}: PsychSessionsViewProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 py-12">
        <ClipboardCheck className="w-8 h-8 text-gray-200" />
        <p>Nenhuma sessão registrada para {testName}</p>
      </div>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Brain className="w-4 h-4 text-indigo-400" />
        {testName}
        <span className="text-xs font-normal text-gray-400">— {sessions.length} sessões</span>
      </h3>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Data</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">
                Resultado
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((session) => {
              const isExpanded = expandedSession === session.id;
              const result = sessionResult(session);
              const analysis = session.ai_analysis as Record<string, unknown> | null;
              const summary =
                analysis && typeof analysis.summary === 'string' ? analysis.summary : null;

              return (
                <React.Fragment key={session.id}>
                  <tr className="bg-white hover:bg-gray-50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 text-gray-700">
                      {format(new Date(session.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusClasses(session.status)}`}
                      >
                        {session.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {(session.status === 'pending' || session.status === 'in_progress') && (
                          <Clock className="w-3 h-3" />
                        )}
                        {session.status === 'expired' && <AlertTriangle className="w-3 h-3" />}
                        {statusLabel(session.status)}
                      </span>
                    </td>

                    {/* Result */}
                    <td className="px-4 py-3 text-gray-700">
                      {result ?? (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Expand toggle */}
                    <td className="px-4 py-3 text-right">
                      {session.status === 'completed' && (
                        <button
                          onClick={() =>
                            setExpandedSession(isExpanded ? null : session.id)
                          }
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
                        >
                          Ver detalhes
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="bg-indigo-50/40">
                      <td colSpan={4} className="px-4 py-3">
                        {summary ? (
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <p className="text-xs font-semibold text-indigo-700 mb-1">
                              Análise IA
                            </p>
                            <p>{summary}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">
                            Nenhuma análise disponível para esta sessão.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
