"use client";

import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Brain,
  Shield,
} from "lucide-react";
import type { Insight } from "@/lib/api";

interface InsightsPanelProps {
  insights: Insight[];
  loading?: boolean;
}

const impactConfig: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  high: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Alto Impacto",
  },
  medium: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Médio Impacto",
  },
  low: {
    color: "text-clarita-blue-500",
    bgColor: "bg-clarita-blue-100",
    label: "Baixo Impacto",
  },
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "text-clarita-green-600 bg-clarita-green-100"
      : pct >= 60
      ? "text-yellow-600 bg-yellow-100"
      : "text-gray-500 bg-gray-100";

  return (
    <span className={`badge text-[10px] ${color}`}>
      {pct}% confiança
    </span>
  );
}

export default function InsightsPanel({
  insights,
  loading = false,
}: InsightsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="card text-center py-12">
        <Brain size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Nenhum insight de IA disponível ainda</p>
        <p className="text-xs text-gray-400 mt-1">
          Insights são gerados conforme mais dados ficam disponíveis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-clarita-green-500" />
        <h3 className="section-title mb-0">Insights de IA</h3>
      </div>

      {insights.map((insight) => {
        const impact = impactConfig[insight.impact] || impactConfig.low;

        return (
          <div key={insight.id} className="card animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-clarita-green-100 to-clarita-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-clarita-green-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {insight.title}
                  </h4>
                  <ConfidenceBadge confidence={insight.confidence} />
                  <span
                    className={`badge text-[10px] ${impact.bgColor} ${impact.color}`}
                  >
                    {impact.label}
                  </span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {insight.description}
                </p>

                {/* Recommendations */}
                {insight.recommendations.length > 0 && (
                  <div className="bg-clarita-beige-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                      <Shield size={12} />
                      Recomendações
                    </p>
                    <ul className="space-y-1.5">
                      {insight.recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-gray-700"
                        >
                          <ArrowRight
                            size={14}
                            className="text-clarita-green-400 flex-shrink-0 mt-0.5"
                          />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-2">
                  Gerado pela CLARITA IA &middot; {insight.type}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
