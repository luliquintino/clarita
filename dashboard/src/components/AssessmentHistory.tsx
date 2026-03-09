'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import { ClipboardCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Assessment } from '@/lib/api';

interface AssessmentHistoryProps {
  assessments: Assessment[];
  loading?: boolean;
}

type AssessmentType = 'PHQ-9' | 'GAD-7';

const phq9Zones = [
  { y1: 0, y2: 4, fill: 'rgba(20, 184, 166, 0.08)', label: 'Minimo', color: '#14b8a6' },
  { y1: 5, y2: 9, fill: 'rgba(234, 179, 8, 0.08)', label: 'Leve', color: '#ca8a04' },
  { y1: 10, y2: 14, fill: 'rgba(249, 115, 22, 0.08)', label: 'Moderado', color: '#f97316' },
  {
    y1: 15,
    y2: 19,
    fill: 'rgba(239, 68, 68, 0.08)',
    label: 'Moderadamente Grave',
    color: '#ef4444',
  },
  { y1: 20, y2: 27, fill: 'rgba(220, 38, 38, 0.10)', label: 'Grave', color: '#dc2626' },
];

const gad7Zones = [
  { y1: 0, y2: 4, fill: 'rgba(20, 184, 166, 0.08)', label: 'Minimo', color: '#14b8a6' },
  { y1: 5, y2: 9, fill: 'rgba(234, 179, 8, 0.08)', label: 'Leve', color: '#ca8a04' },
  { y1: 10, y2: 14, fill: 'rgba(249, 115, 22, 0.08)', label: 'Moderado', color: '#f97316' },
  { y1: 15, y2: 21, fill: 'rgba(220, 38, 38, 0.10)', label: 'Grave', color: '#dc2626' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      date: string;
      score: number;
      severity: string;
    };
  }>;
}

function AssessmentTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-soft-lg border border-white/40 px-4 py-3">
      <p className="text-xs font-medium text-gray-500 mb-1">{data.date}</p>
      <p className="text-lg font-bold text-gray-800">{data.score}</p>
      <p className="text-xs text-gray-500 capitalize">{data.severity}</p>
    </div>
  );
}

export default function AssessmentHistory({
  assessments,
  loading = false,
}: AssessmentHistoryProps) {
  const [activeType, setActiveType] = useState<AssessmentType>('PHQ-9');

  const filteredAssessments = assessments
    .filter((a) => a.type === activeType)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const chartData = filteredAssessments.map((a) => ({
    date: format(new Date(a.timestamp), 'MMM d'),
    fullDate: format(new Date(a.timestamp), 'MMM d, yyyy'),
    score: a.score,
    severity: a.severity,
  }));

  const zones = activeType === 'PHQ-9' ? phq9Zones : gad7Zones;
  const maxScore = activeType === 'PHQ-9' ? 27 : 21;

  const lineColor = activeType === 'PHQ-9' ? '#3b82f6' : '#8b5cf6';
  const gradientId = activeType === 'PHQ-9' ? 'phq9Gradient' : 'gad7Gradient';

  const latestScore =
    filteredAssessments.length > 0
      ? filteredAssessments[filteredAssessments.length - 1].score
      : null;
  const previousScore =
    filteredAssessments.length > 1
      ? filteredAssessments[filteredAssessments.length - 2].score
      : null;

  const trend = latestScore !== null && previousScore !== null ? latestScore - previousScore : 0;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 bg-clarita-beige-100 rounded-full w-48 animate-pulse" />
        <div className="card">
          <div className="h-64 bg-clarita-beige-50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Type selector cards */}
      <div className="flex items-center gap-4">
        {(['PHQ-9', 'GAD-7'] as AssessmentType[]).map((type) => {
          const count = assessments.filter((a) => a.type === type).length;
          const isActive = activeType === type;
          const iconBg = type === 'PHQ-9' ? 'bg-clarita-blue-100' : 'bg-clarita-purple-100';
          const iconColor = type === 'PHQ-9' ? 'text-clarita-blue-500' : 'text-clarita-purple-500';

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`card flex items-center gap-3 transition-all duration-300 ${
                isActive
                  ? 'ring-2 ring-clarita-green-300 border-clarita-green-200/60'
                  : 'hover:border-white/60'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                <ClipboardCheck size={18} className={iconColor} />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-800 text-sm">{type}</h4>
                <p className="text-xs text-gray-400">
                  {type === 'PHQ-9' ? 'Depressao' : 'Ansiedade'} &middot; {count} registros
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Latest score and trend */}
      {latestScore !== null && (
        <div className="card">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Ultima Pontuacao</p>
              <p className="text-3xl font-bold text-gray-800">{latestScore}</p>
              <p className="text-sm text-gray-500 capitalize">
                {filteredAssessments[filteredAssessments.length - 1]?.severity}
              </p>
            </div>

            {previousScore !== null && (
              <div className="flex items-center gap-2">
                {trend < 0 ? (
                  <>
                    <TrendingDown size={20} className="text-clarita-green-500" />
                    <span className="text-sm font-medium text-clarita-green-600">
                      {Math.abs(trend)} pontos menor
                    </span>
                  </>
                ) : trend > 0 ? (
                  <>
                    <TrendingUp size={20} className="text-red-500" />
                    <span className="text-sm font-medium text-red-600">{trend} pontos maior</span>
                  </>
                ) : (
                  <>
                    <Minus size={20} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Sem alteracao</span>
                  </>
                )}
                <span className="text-xs text-gray-400">vs anterior</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart with severity zones */}
      <div className="card">
        <h3 className="section-title">Historico de Pontuacao {activeType}</h3>

        {chartData.length > 0 ? (
          <div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />

                {/* Softer severity zone backgrounds */}
                {zones.map((zone) => (
                  <ReferenceArea
                    key={zone.label}
                    y1={zone.y1}
                    y2={zone.y2}
                    fill={zone.fill}
                    fillOpacity={1}
                  />
                ))}

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e7e5e4' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, maxScore]}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e7e5e4' }}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<AssessmentTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={lineColor}
                  strokeWidth={3}
                  fill={`url(#${gradientId})`}
                  dot={{
                    r: 5,
                    fill: lineColor,
                    strokeWidth: 2,
                    stroke: '#fff',
                  }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Zone legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/30">
              {zones.map((zone) => (
                <div key={zone.label} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm border border-white/50"
                    style={{ backgroundColor: zone.color, opacity: 0.25 }}
                  />
                  <span className="text-xs text-gray-500">
                    {zone.label} ({zone.y1}-{zone.y2})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Nenhuma avaliacao {activeType} registrada ainda
          </div>
        )}
      </div>
    </div>
  );
}
