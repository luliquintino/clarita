"use client";

import { useState } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Info,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Dna,
  Lock,
  Building2,
  ShieldCheck,
  Hospital,
  FlaskConical,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import type {
  DigitalTwin,
  DigitalTwinCorrelation,
  DigitalTwinPrediction,
  DigitalTwinVariableState,
  TreatmentResponse,
} from "@/lib/api";
import { digitalTwinApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Variable labels
// ---------------------------------------------------------------------------

const VAR_LABELS: Record<string, string> = {
  mood: "Humor",
  anxiety: "Ansiedade",
  energy: "Energia",
  sleep_quality: "Qualidade do Sono",
  sleep_hours: "Horas de Sono",
  med_adherence: "Adesão à Medicação",
};

const VAR_COLORS: Record<string, string> = {
  mood: "#22c55e",
  anxiety: "#f59e0b",
  energy: "#60a5fa",
  sleep_quality: "#a78bfa",
  sleep_hours: "#8b5cf6",
  med_adherence: "#14b8a6",
};

// For anxiety, higher = worse
const INVERTED_VARS = new Set(["anxiety"]);

function isImproving(trend: string, variable: string): boolean {
  return trend === "improving";
}

function isWorsening(trend: string, variable: string): boolean {
  return trend === "worsening";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DigitalTwinPanelProps {
  twin: DigitalTwin | null;
  patientId: string;
}

export default function DigitalTwinPanel({
  twin,
  patientId,
}: DigitalTwinPanelProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await digitalTwinApi.refresh(patientId);
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  };

  // Empty state
  if (!twin) {
    return (
      <div className="space-y-6">
        <div className="card text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-clarita-green-50 rounded-2xl mb-4">
            <Brain size={32} className="text-clarita-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Gêmeo Digital em Construção
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            O gêmeo digital precisa de pelo menos 14 dias de dados emocionais
            para construir o modelo mental do paciente. Continue monitorando para
            desbloquear previsões, correlações e análise de tratamento.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Tentar Gerar
          </button>
        </div>

        <MentalGenomePreview />
        <FutureArchitectureCards />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-clarita-green-50 rounded-xl">
            <Brain size={20} className="text-clarita-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Gêmeo Digital Mental
            </h3>
            <p className="text-xs text-gray-400">
              Baseado em {twin.data_points_used} dias de dados &middot;
              Confiança: {Math.round(twin.confidence_overall * 100)}%
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-ghost text-sm inline-flex items-center gap-1.5"
        >
          {refreshing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Atualizar
        </button>
      </div>

      {/* Variable State Cards */}
      <VariableStateCards
        currentState={twin.current_state}
        baseline={twin.baseline}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Network */}
        <CorrelationNetwork correlations={twin.correlations} />

        {/* Predictions */}
        <PredictionTimeline predictions={twin.predictions} />
      </div>

      {/* Treatment Response */}
      {twin.treatment_responses.length > 0 && (
        <TreatmentResponseChart responses={twin.treatment_responses} />
      )}

      {/* Mental Genome - Coming Soon */}
      <MentalGenomePreview />

      {/* Future Architecture - Coming Soon */}
      <FutureArchitectureCards />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variable State Cards
// ---------------------------------------------------------------------------

function VariableStateCards({
  currentState,
  baseline,
}: {
  currentState: Record<string, DigitalTwinVariableState>;
  baseline: Record<
    string,
    { mean: number; std: number; established_at: string; data_points: number }
  >;
}) {
  const vars = Object.entries(currentState).filter(
    ([key]) => key in VAR_LABELS
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {vars.map(([key, state]) => {
        const label = VAR_LABELS[key] || key;
        const color = VAR_COLORS[key] || "#6b7280";
        const base = baseline[key];
        const diff = base
          ? Math.round((state.current - base.mean) * 10) / 10
          : null;
        const improving = isImproving(state.trend, key);
        const worsening = isWorsening(state.trend, key);

        // Mini sparkline data from avg values
        const sparkData = [
          { v: state.avg_30d },
          { v: (state.avg_30d + state.avg_7d) / 2 },
          { v: state.avg_7d },
          { v: (state.avg_7d + state.current) / 2 },
          { v: state.current },
        ];

        return (
          <div key={key} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              {state.trend === "stable" && (
                <Minus size={14} className="text-gray-400" />
              )}
              {improving && (
                <TrendingUp size={14} className="text-clarita-green-500" />
              )}
              {worsening && (
                <TrendingDown size={14} className="text-red-500" />
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-gray-800">
                  {state.current.toFixed(1)}
                </span>
                {diff !== null && (
                  <span
                    className={`text-xs ml-1.5 font-medium ${
                      improving
                        ? "text-clarita-green-600"
                        : worsening
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff} vs base
                  </span>
                )}
              </div>

              <div className="w-16 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="text-xs text-gray-400 mt-1">
              7d: {state.avg_7d.toFixed(1)} &middot; 30d:{" "}
              {state.avg_30d.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Correlation Network (SVG)
// ---------------------------------------------------------------------------

function CorrelationNetwork({
  correlations,
}: {
  correlations: DigitalTwinCorrelation[];
}) {
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  if (correlations.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-400">
          Correlações serão detectadas com mais dados
        </p>
      </div>
    );
  }

  // Collect unique variables
  const varsSet = new Set<string>();
  correlations.forEach((c) => {
    varsSet.add(c.variable_a);
    varsSet.add(c.variable_b);
  });
  const variables = Array.from(varsSet);

  // Position nodes in a circle
  const cx = 150;
  const cy = 130;
  const radius = 90;
  const nodePositions: Record<string, { x: number; y: number }> = {};
  variables.forEach((v, i) => {
    const angle = (2 * Math.PI * i) / variables.length - Math.PI / 2;
    nodePositions[v] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div className="card p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-clarita-green-500" />
        Correlações Aprendidas
      </h4>

      <svg viewBox="0 0 300 260" className="w-full max-w-md mx-auto">
        {/* Edges */}
        {correlations.map((corr, i) => {
          const a = nodePositions[corr.variable_a];
          const b = nodePositions[corr.variable_b];
          if (!a || !b) return null;

          const thickness = Math.max(1.5, Math.abs(corr.pearson_r) * 5);
          const color =
            corr.direction === "positive" ? "#22c55e" : "#f59e0b";
          const isHovered = hoveredEdge === i;

          return (
            <g key={`edge-${i}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth={isHovered ? thickness + 1 : thickness}
                strokeOpacity={isHovered ? 1 : 0.5}
                onMouseEnter={() => setHoveredEdge(i)}
                onMouseLeave={() => setHoveredEdge(null)}
                className="cursor-pointer"
                strokeLinecap="round"
              />
              {/* Invisible wider line for easier hover */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={12}
                onMouseEnter={() => setHoveredEdge(i)}
                onMouseLeave={() => setHoveredEdge(null)}
                className="cursor-pointer"
              />
            </g>
          );
        })}

        {/* Nodes */}
        {variables.map((v) => {
          const pos = nodePositions[v];
          const label = VAR_LABELS[v] || v;
          const color = VAR_COLORS[v] || "#6b7280";

          return (
            <g key={v}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={18}
                fill="white"
                stroke={color}
                strokeWidth={2.5}
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fontWeight="600"
                fill={color}
              >
                {label.length > 8 ? label.slice(0, 7) + "…" : label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hovered edge label */}
      <div className="h-12 flex items-center justify-center">
        {hoveredEdge !== null && correlations[hoveredEdge] && (
          <p className="text-xs text-gray-600 text-center animate-fade-in px-4">
            {correlations[hoveredEdge].label_pt}
            <span className="text-gray-400 ml-1">
              (r = {correlations[hoveredEdge].pearson_r.toFixed(2)})
            </span>
          </p>
        )}
        {hoveredEdge === null && (
          <p className="text-xs text-gray-400">
            Passe o mouse sobre uma conexão para ver detalhes
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prediction Timeline
// ---------------------------------------------------------------------------

function PredictionTimeline({
  predictions,
}: {
  predictions: DigitalTwinPrediction[];
}) {
  if (predictions.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-400">
          Sem previsões no momento — tendências estáveis
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-clarita-green-500" />
        Previsões Comportamentais
      </h4>

      <div className="px-3 py-2 bg-clarita-beige-50 rounded-lg mb-3 flex items-start gap-2">
        <Info size={14} className="text-gray-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500">
          Previsões baseadas em padrões históricos, não diagnósticos.
        </p>
      </div>

      <div className="space-y-3">
        {predictions.map((pred, i) => {
          const label = VAR_LABELS[pred.variable] || pred.variable;
          const riskColors = {
            low: "bg-clarita-green-50 text-clarita-green-700 border-clarita-green-200",
            moderate: "bg-yellow-50 text-yellow-700 border-yellow-200",
            high: "bg-red-50 text-red-700 border-red-200",
          };
          const riskLabels = {
            low: "Baixo",
            moderate: "Moderado",
            high: "Alto",
          };

          return (
            <div
              key={i}
              className="px-4 py-3 bg-white border border-clarita-beige-200/50 rounded-xl"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {pred.prediction === "increase" ? (
                    <ArrowUpRight
                      size={16}
                      className={
                        INVERTED_VARS.has(pred.variable)
                          ? "text-red-500"
                          : "text-clarita-green-500"
                      }
                    />
                  ) : (
                    <ArrowDownRight
                      size={16}
                      className={
                        INVERTED_VARS.has(pred.variable)
                          ? "text-clarita-green-500"
                          : "text-red-500"
                      }
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    riskColors[pred.risk_level]
                  }`}
                >
                  Risco {riskLabels[pred.risk_level]}
                </span>
              </div>
              <p className="text-xs text-gray-500">{pred.reasoning}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-400">
                  Confiança: {Math.round(pred.confidence * 100)}%
                </span>
                <span className="text-xs text-gray-400">
                  Horizonte: {pred.horizon_days} dias
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Treatment Response Chart
// ---------------------------------------------------------------------------

function TreatmentResponseChart({
  responses,
}: {
  responses: TreatmentResponse[];
}) {
  const statusConfig = {
    positive_response: {
      icon: CheckCircle,
      color: "text-clarita-green-500",
      label: "Resposta Positiva",
      bg: "bg-clarita-green-50",
    },
    negative_response: {
      icon: XCircle,
      color: "text-red-500",
      label: "Resposta Negativa",
      bg: "bg-red-50",
    },
    neutral: {
      icon: Minus,
      color: "text-gray-400",
      label: "Neutro",
      bg: "bg-gray-50",
    },
    pending: {
      icon: Clock,
      color: "text-yellow-500",
      label: "Avaliando",
      bg: "bg-yellow-50",
    },
  };

  return (
    <div className="card p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <AlertTriangle size={16} className="text-clarita-green-500" />
        Resposta ao Tratamento
      </h4>

      <div className="space-y-4">
        {responses.map((resp, i) => {
          const config = statusConfig[resp.status] || statusConfig.neutral;
          const StatusIcon = config.icon;

          // Build chart data from metrics
          const chartData = Object.keys(resp.metrics_before).map((key) => ({
            name: VAR_LABELS[key] || key,
            antes: resp.metrics_before[key],
            depois: resp.metrics_after[key],
            change: resp.change_pct[key],
          }));

          return (
            <div
              key={i}
              className="border border-clarita-beige-200/50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {resp.intervention_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {resp.intervention_date} &middot;{" "}
                    {resp.evaluation_window_days} dias de avaliação
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg}`}
                >
                  <StatusIcon size={14} className={config.color} />
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={2}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={25}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [
                          value.toFixed(1),
                          name === "antes" ? "Antes" : "Depois",
                        ]}
                      />
                      <Bar dataKey="antes" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="antes" />
                      <Bar dataKey="depois" fill="#22c55e" radius={[4, 4, 0, 0]} name="depois" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Percentage changes */}
              <div className="flex gap-3 mt-2 flex-wrap">
                {Object.entries(resp.change_pct).map(([key, pct]) => {
                  const inv = INVERTED_VARS.has(key);
                  const good = inv ? pct < 0 : pct > 0;
                  return (
                    <span
                      key={key}
                      className={`text-xs font-medium ${
                        good ? "text-clarita-green-600" : "text-red-500"
                      }`}
                    >
                      {VAR_LABELS[key] || key}:{" "}
                      {pct > 0 ? "+" : ""}
                      {pct.toFixed(1)}%
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mental Genome Preview (Coming Soon)
// ---------------------------------------------------------------------------

const GENOME_DIMENSIONS = [
  {
    key: "emotional_regulation",
    label: "Regulação Emocional",
    description:
      "Capacidade de modular respostas emocionais e manter estabilidade frente a estímulos",
    icon: "RE",
    color: "#22c55e",
  },
  {
    key: "stress_sensitivity",
    label: "Sensibilidade ao Estresse",
    description:
      "Grau de reatividade a eventos estressores e velocidade de recuperação",
    icon: "SE",
    color: "#f59e0b",
  },
  {
    key: "energy_patterns",
    label: "Padrões de Energia",
    description:
      "Ritmo circadiano de energia, picos e vales ao longo do dia e da semana",
    icon: "PE",
    color: "#60a5fa",
  },
  {
    key: "sleep_influence",
    label: "Influência do Sono",
    description:
      "Impacto da qualidade e duração do sono no funcionamento emocional e cognitivo",
    icon: "IS",
    color: "#a78bfa",
  },
  {
    key: "treatment_response",
    label: "Resposta ao Tratamento",
    description:
      "Perfil de resposta a intervenções farmacológicas e psicoterapêuticas",
    icon: "RT",
    color: "#14b8a6",
  },
];

function MentalGenomePreview() {
  const cx = 100;
  const cy = 100;
  const r = 70;
  const points = GENOME_DIMENSIONS.map((_, i) => {
    const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  // Static simulated values for the preview
  const previewScales = [0.65, 0.45, 0.7, 0.55, 0.5];
  const innerPoints = GENOME_DIMENSIONS.map((_, i) => {
    const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
    const ir = r * previewScales[i];
    return { x: cx + ir * Math.cos(angle), y: cy + ir * Math.sin(angle) };
  });
  const polygonInner = innerPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-clarita-green-50 border border-clarita-green-200 rounded-full">
        <Lock size={12} className="text-clarita-green-600" />
        <span className="text-xs font-semibold text-clarita-green-700">
          Em Breve
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-clarita-green-100 to-clarita-green-50 rounded-xl">
          <Dna size={20} className="text-clarita-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Genoma Mental
          </h3>
          <p className="text-xs text-gray-400">
            Perfil psicológico em 5 dimensões que evolui com o tempo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar preview (blurred) */}
        <div className="relative flex items-center justify-center">
          <div className="filter blur-[2px] opacity-60">
            <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto">
              {[0.33, 0.66, 1].map((scale) => (
                <polygon
                  key={scale}
                  points={points
                    .map(
                      (p) =>
                        `${cx + (p.x - cx) * scale},${cy + (p.y - cy) * scale}`
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={0.8}
                />
              ))}
              {points.map((p, i) => (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={p.x}
                  y2={p.y}
                  stroke="#e5e7eb"
                  strokeWidth={0.8}
                />
              ))}
              <polygon
                points={polygonInner}
                fill="#22c55e"
                fillOpacity={0.15}
                stroke="#22c55e"
                strokeWidth={2}
                strokeOpacity={0.6}
              />
              {innerPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill="#22c55e"
                  fillOpacity={0.8}
                />
              ))}
              {points.map((p, i) => {
                const labelOffset = 14;
                const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
                const lx = cx + (r + labelOffset) * Math.cos(angle);
                const ly = cy + (r + labelOffset) * Math.sin(angle);
                return (
                  <text
                    key={i}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="6.5"
                    fontWeight="600"
                    fill={GENOME_DIMENSIONS[i].color}
                  >
                    {GENOME_DIMENSIONS[i].icon}
                  </text>
                );
              })}
            </svg>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-clarita-beige-200/50">
              <p className="text-xs font-semibold text-gray-600 text-center">
                Visualização em radar
                <br />
                <span className="text-gray-400 font-normal">em desenvolvimento</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dimension cards */}
        <div className="space-y-2.5">
          {GENOME_DIMENSIONS.map((dim) => (
            <div
              key={dim.key}
              className="flex items-start gap-3 px-3 py-2.5 bg-clarita-beige-50/50 rounded-xl opacity-70"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: dim.color }}
              >
                {dim.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">
                  {dim.label}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {dim.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 px-4 py-3 bg-clarita-beige-50 rounded-xl">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          O Genoma Mental será um vetor psicológico único por paciente,
          calculado a partir dos dados acumulados pelo Gêmeo Digital.
          Cada dimensão evolui com o tempo, criando um perfil dinâmico
          que ajuda profissionais a personalizar o tratamento.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Future Architecture Cards (Coming Soon)
// ---------------------------------------------------------------------------

const FUTURE_FEATURES = [
  {
    key: "clinics",
    label: "Clínicas",
    description:
      "Dashboard agregado com visão panorâmica de todos os pacientes, métricas de eficácia e gestão de equipe",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    key: "health_plans",
    label: "Planos de Saúde",
    description:
      "Integração com operadoras para monitoramento populacional, redução de internações e análise de custo-efetividade",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    key: "hospitals",
    label: "Hospitais",
    description:
      "Módulo hospitalar para acompanhamento de pacientes internados, transição de cuidados e prevenção de readmissão",
    icon: Hospital,
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    key: "research",
    label: "Pesquisa Científica",
    description:
      "Plataforma de dados anonimizados para pesquisa em saúde mental, estudos longitudinais e descoberta de biomarcadores digitais",
    icon: FlaskConical,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

function FutureArchitectureCards() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-clarita-beige-100 rounded-xl">
            <Sparkles size={20} className="text-clarita-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Ecossistema CLARITA
            </h3>
            <p className="text-xs text-gray-400">
              Funcionalidades em desenvolvimento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-clarita-green-50 border border-clarita-green-200 rounded-full">
          <Lock size={12} className="text-clarita-green-600" />
          <span className="text-xs font-semibold text-clarita-green-700">
            Em Breve
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FUTURE_FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.key}
              className="px-4 py-4 border border-clarita-beige-200/50 rounded-xl bg-white/50 opacity-75 hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className={`w-8 h-8 ${feat.bg} rounded-lg flex items-center justify-center`}
                >
                  <Icon size={16} className={feat.color} />
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {feat.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
