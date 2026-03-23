'use client';

import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Activity,
  Moon,
  Zap,
  Heart,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DigitalTwin } from '@/lib/api';
import { digitalTwinApi } from '@/lib/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VAR_LABEL: Record<string, string> = {
  mood: 'Humor',
  anxiety: 'Ansiedade',
  energy: 'Energia',
  sleep_quality: 'Sono',
};

const VAR_ICON: Record<string, React.ReactNode> = {
  mood: <Heart size={14} />,
  anxiety: <AlertTriangle size={14} />,
  energy: <Zap size={14} />,
  sleep_quality: <Moon size={14} />,
};

const VAR_COLOR: Record<string, string> = {
  mood: '#22c55e',
  anxiety: '#f59e0b',
  energy: '#60a5fa',
  sleep_quality: '#a78bfa',
};

const RISK_VAR: Record<string, (v: number) => boolean> = {
  mood: (v) => v <= 3,
  anxiety: (v) => v >= 7,
  energy: (v) => v <= 3,
  sleep_quality: (v) => v <= 3,
};

const PRIORITY_VARS = ['mood', 'anxiety', 'energy', 'sleep_quality'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'improving')
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-600">
        <TrendingUp size={10} /> Melhora
      </span>
    );
  if (trend === 'worsening')
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500">
        <TrendingDown size={10} /> Piora
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-400">
      <Minus size={10} /> Estável
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={90} height={90} viewBox="0 0 90 90" className="rotate-[-90deg]" aria-hidden="true">
      <circle cx={45} cy={45} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={8} />
      <circle
        cx={45}
        cy={45}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DigitalTwinPanelProps {
  twin: DigitalTwin | null;
  patientId: string;
  onRefreshed?: (twin: DigitalTwin) => void;
}

export default function DigitalTwinPanel({ twin, patientId, onRefreshed }: DigitalTwinPanelProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await digitalTwinApi.refresh(patientId);
      if (result && onRefreshed) {
        onRefreshed(result);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Empty state
  if (!twin) {
    return (
      <div className="card text-center py-12 animate-fade-in">
        <Brain size={40} className="mx-auto text-gray-300 mb-4" />
        <p className="text-sm font-medium text-gray-600 mb-1">Gêmeo Digital não disponível</p>
        <p className="text-xs text-gray-400 mb-5">
          O paciente precisa de ao menos 3 check-ins para gerar o gêmeo digital.
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary text-sm mx-auto flex items-center gap-2"
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {refreshing ? 'Gerando...' : 'Gerar Gêmeo Digital'}
        </button>
      </div>
    );
  }

  const score = twin.clinical_score;
  const overallTrend = twin.overall_trend ?? 'stable';
  const scoreColor =
    score !== null && score >= 70
      ? 'text-green-600'
      : score !== null && score >= 40
        ? 'text-amber-500'
        : 'text-red-500';

  const trendText =
    overallTrend === 'improving'
      ? 'Quadro em melhora nos últimos 14 dias'
      : overallTrend === 'worsening'
        ? 'Quadro em piora nos últimos 14 dias'
        : 'Quadro estável nos últimos 14 dias';

  const makeSparkline = (state: { current: number; avg_30d: number; slope_14d: number }) =>
    Array.from({ length: 7 }, (_, i) => ({
      v: Math.min(10, Math.max(1, state.current + state.slope_14d * (i - 6))),
    }));

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ================================================================== */}
      {/* BLOCO 1 — Retrato                                                  */}
      {/* ================================================================== */}
      <div className="card section-purple relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-clarita-purple-400 via-clarita-green-400 to-clarita-blue-400" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-clarita-purple-100 flex items-center justify-center">
              <Brain size={16} className="text-clarita-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Gêmeo Digital</h3>
            <span className="badge-purple text-[10px]">IA</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost p-2 text-gray-500 hover:text-gray-700"
            aria-label="Atualizar gêmeo digital"
            title="Atualizar"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-6 mb-4">
          {score !== null ? (
            <div className="relative flex-shrink-0">
              <ScoreRing score={score} />
              <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
                <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-[9px] text-gray-400 mt-0.5">/ 100</span>
              </div>
            </div>
          ) : (
            <div className="w-[90px] h-[90px] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Activity size={24} className="text-gray-300" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {score !== null && (
              <p className="text-2xl font-bold text-gray-800 mb-0.5">
                Score <span className={scoreColor}>{score}</span>
                <span className="text-sm text-gray-400 font-normal">/100</span>
              </p>
            )}
            <p className="text-sm text-gray-600 font-medium">{trendText}</p>
            <p className="text-xs text-gray-400 mt-1">
              {twin.data_points_used} dados · confiança {Math.round(twin.confidence_overall * 100)}%
              {' · '}
              {format(new Date(twin.computed_at), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {twin.diagnoses && twin.diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {twin.diagnoses.map((d) => (
              <span
                key={d.icd_code}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                  d.certainty === 'confirmed'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className="font-mono">{d.icd_code}</span>
                <span className="opacity-60">·</span>
                <span>{d.certainty === 'confirmed' ? 'Confirmado' : 'Suspeito'}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* BLOCO 2 — Variáveis                                                */}
      {/* ================================================================== */}
      {Object.keys(twin.current_state).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {PRIORITY_VARS.filter((v) => twin.current_state[v]).map((variable) => {
            const state = twin.current_state[variable];
            const isRisk = RISK_VAR[variable]?.(state.current);
            const color = VAR_COLOR[variable];
            const sparkData = makeSparkline(state);

            return (
              <div
                key={variable}
                className={`card p-3 border-2 transition-all duration-300 ${
                  isRisk ? 'border-red-200 bg-red-50/40' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color }} className="opacity-70">
                      {VAR_ICON[variable]}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">{VAR_LABEL[variable]}</span>
                    {isRisk && <AlertTriangle size={10} className="text-red-400" />}
                  </div>
                  <TrendBadge trend={state.trend} />
                </div>

                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-800">{state.current}</span>
                  <div className="w-16 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={isRisk ? '#ef4444' : color}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* BLOCO 3 — Detalhes técnicos (expansível)                           */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-clarita-purple-400" />
            Detalhes técnicos
          </span>
          {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {detailsOpen && (
          <div className="mt-4 space-y-5 animate-fade-in">

            {/* Correlações */}
            {twin.correlations && twin.correlations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Correlações detectadas
                </p>
                <div className="space-y-2">
                  {twin.correlations.slice(0, 4).map((c) => (
                    <div key={`${c.variable_a}-${c.variable_b}`} className="flex items-center gap-3">
                      <div
                        className={`w-10 text-center text-xs font-bold rounded-lg py-0.5 ${
                          c.direction === 'positive'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.direction === 'positive' ? '+' : '−'}
                        {Math.abs(c.pearson_r).toFixed(2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{c.label_pt}</p>
                        <p className="text-[10px] text-gray-400">
                          {c.strength === 'strong' ? 'Forte' : c.strength === 'moderate' ? 'Moderada' : 'Leve'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predições */}
            {twin.predictions && twin.predictions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Tendência 7 dias
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {twin.predictions.slice(0, 4).map((p) => (
                    <div
                      key={p.variable}
                      className={`rounded-xl p-2.5 text-center border ${
                        p.risk_level === 'high'
                          ? 'bg-red-50 border-red-200'
                          : p.risk_level === 'moderate'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <p className="text-[10px] text-gray-500 mb-0.5">
                        {VAR_LABEL[p.variable] ?? p.variable}
                      </p>
                      <p className="text-xs font-bold text-gray-700">
                        {p.prediction === 'increase' ? '↑ Alta' : p.prediction === 'decrease' ? '↓ Baixa' : '→ Estável'}
                      </p>
                      <p className="text-[9px] text-gray-400">{Math.round(p.confidence * 100)}% conf.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testes psicológicos recentes */}
            {twin.test_results_summary && twin.test_results_summary.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Testes recentes
                </p>
                <div className="space-y-1.5">
                  {twin.test_results_summary.map((t) => (
                    <div key={`${t.instrument}-${t.completed_at}`} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{t.instrument}</span>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="font-mono font-bold">{t.total_score}</span>
                        {t.severity && (
                          <span className="badge text-[9px] bg-gray-100 text-gray-500">{t.severity}</span>
                        )}
                        <span className="text-gray-400">
                          {format(new Date(t.completed_at), 'd/MM', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback quando não há detalhes */}
            {(!twin.correlations || twin.correlations.length === 0) &&
             (!twin.predictions || twin.predictions.length === 0) &&
             (!twin.test_results_summary || twin.test_results_summary.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-2">
                Dados insuficientes para análise detalhada. São necessários ao menos 14 check-ins para correlações.
              </p>
            )}

            {/* Confiança do modelo */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Confiança do modelo · v{twin.model_version}</span>
                <span className="font-medium">{Math.round(twin.confidence_overall * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full mt-1">
                <div
                  className="h-1 rounded-full bg-clarita-purple-400"
                  style={{ width: `${twin.confidence_overall * 100}%` }}
                />
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
