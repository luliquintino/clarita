'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import type { PatientSummary } from '@/lib/api';

interface AISummaryCardProps {
  summaries: PatientSummary[];
  loading?: boolean;
  onGenerate?: (days: 7 | 30) => void;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'melhora') return <TrendingUp size={14} className="text-clarita-green-500" />;
  if (trend === 'declínio') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
}

export default function AISummaryCard({
  summaries,
  loading = false,
  onGenerate,
}: AISummaryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [generatingPeriod, setGeneratingPeriod] = useState<7 | 30 | null>(null);

  const displaySummaries = showAll ? summaries : summaries.slice(0, 1);

  if (loading) {
    return (
      <div className="card section-purple">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-clarita-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="card section-purple relative overflow-hidden animate-fade-in">
      {/* Gradient border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-clarita-purple-400 via-clarita-green-400 to-clarita-blue-400" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-clarita-purple-100 flex items-center justify-center">
            <Sparkles size={16} className="text-clarita-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            Resumo <span className="text-gradient font-bold">IA</span>
          </h3>
          <span className="badge-purple text-[10px]">Gerado por IA</span>
        </div>
        <div className="flex items-center gap-2">
          {onGenerate && (
            <div className="flex items-center gap-2">
              {([7, 30] as const).map((days) => {
                const label = days === 7 ? 'Última semana' : 'Último mês';
                const isGenerating = generatingPeriod === days;
                const isDisabled = generatingPeriod !== null && generatingPeriod !== days;
                return (
                  <button
                    key={days}
                    onClick={async () => {
                      setGeneratingPeriod(days);
                      try {
                        await onGenerate(days);
                      } finally {
                        setGeneratingPeriod(null);
                      }
                    }}
                    disabled={isGenerating || isDisabled}
                    className={`btn-primary text-xs py-2 px-3 flex items-center gap-1
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isGenerating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {isGenerating ? 'Gerando...' : label}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost p-2 text-gray-500 hover:text-gray-700"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="animate-fade-in">
          {summaries.length === 0 ? (
            <div className="text-center py-6">
              <Sparkles size={32} className="mx-auto text-clarita-purple-200 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum resumo gerado ainda</p>
              <p className="text-xs text-gray-500 mt-1">
                Clique em &quot;Gerar novo&quot; para criar um resumo dos dados recentes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displaySummaries.map((summary) => (
                <div key={summary.id} className="space-y-3 animate-scale-in">
                  {/* Period badge */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      {format(new Date(summary.period_start), 'd MMM', { locale: ptBR })} -{' '}
                      {format(new Date(summary.period_end), 'd MMM yyyy', { locale: ptBR })}
                    </span>
                    <span>·</span>
                    <span>
                      Gerado{' '}
                      {format(new Date(summary.generated_at), 'd/MM HH:mm', { locale: ptBR })}
                    </span>
                  </div>

                  {/* Summary metrics */}
                  {summary.data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard
                        label="Humor"
                        value={summary.data.avg_mood}
                        max={10}
                        color="clarita-green"
                        extra={
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <TrendIcon trend={summary.data.mood_trend} />
                            {summary.data.mood_trend}
                          </span>
                        }
                      />
                      <MetricCard
                        label="Ansiedade"
                        value={summary.data.avg_anxiety}
                        max={10}
                        color="orange"
                        warning={summary.data.avg_anxiety >= 7}
                      />
                      <MetricCard
                        label="Energia"
                        value={summary.data.avg_energy}
                        max={10}
                        color="clarita-blue"
                      />
                      <MetricCard
                        label="Sono"
                        value={summary.data.avg_sleep || 0}
                        max={10}
                        suffix="h"
                        color="clarita-purple"
                        warning={summary.data.avg_sleep !== null && summary.data.avg_sleep < 6}
                      />
                    </div>
                  )}

                  {/* Summary text */}
                  <SummaryText text={summary.summary_text} />
                </div>
              ))}

              {/* Show more */}
              {summaries.length > 1 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="btn-ghost text-xs text-clarita-purple-500 hover:text-clarita-purple-600"
                >
                  {showAll
                    ? 'Mostrar menos'
                    : `Ver ${summaries.length - 1} resumo${summaries.length - 1 > 1 ? 's' : ''} anterior${summaries.length - 1 > 1 ? 'es' : ''}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryText({ text }: { text: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60">
      <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
        {text.split('\n').map((line, i) => {
          const isWarning = line.startsWith('\u26A0\uFE0F');
          const parts: React.ReactNode[] = [];
          const boldPattern = /\*\*(.*?)\*\*/g;
          let lastIndex = 0;
          let match;

          while ((match = boldPattern.exec(line)) !== null) {
            if (match.index > lastIndex) {
              parts.push(line.slice(lastIndex, match.index));
            }
            parts.push(<strong key={match.index}>{match[1]}</strong>);
            lastIndex = boldPattern.lastIndex;
          }

          if (lastIndex < line.length) {
            parts.push(line.slice(lastIndex));
          }

          return (
            <p key={i} className={isWarning ? 'text-orange-600 font-medium mt-2' : ''}>
              {parts}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  max,
  color,
  suffix = '',
  warning = false,
  extra,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
  warning?: boolean;
  extra?: React.ReactNode;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/60 transition-all duration-300 hover:bg-white/90">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </span>
        {warning && <AlertTriangle size={10} className="text-orange-400" />}
      </div>
      <p className="text-lg font-bold text-gray-800">
        {value}
        {suffix && <span className="text-xs text-gray-500 font-normal">{suffix}</span>}
      </p>
      <div className="w-full h-1 bg-gray-100 rounded-full mt-1">
        <div className={`h-1 rounded-full bg-${color}-400`} style={{ width: `${percentage}%` }} />
      </div>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}
