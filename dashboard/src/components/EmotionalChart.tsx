'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import type { EmotionalLog } from '@/lib/api';

interface EmotionalChartProps {
  data: EmotionalLog[];
  loading?: boolean;
}

type TimeRange = '7d' | '30d' | '90d';

const timeRangeLabels: Record<TimeRange, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
};

const lineColors = {
  mood: '#14b8a6',
  anxiety: '#f97316',
  energy: '#3b82f6',
  sleep_quality: '#8b5cf6',
};

const lineLabels: Record<string, string> = {
  mood: 'humor',
  anxiety: 'ansiedade',
  energy: 'energia',
  sleep_quality: 'qualidade do sono',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-soft-lg border border-white/40 px-4 py-3">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-gray-600 capitalize">
            {lineLabels[item.name] ?? item.name.replace('_', ' ')}:
          </span>
          <span className="font-medium text-gray-800">{item.value}/10</span>
        </div>
      ))}
    </div>
  );
}

export default function EmotionalChart({ data, loading = false }: EmotionalChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [visibleLines, setVisibleLines] = useState({
    mood: true,
    anxiety: true,
    energy: true,
    sleep_quality: false,
  });

  const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const cutoff = subDays(new Date(), rangeDays);

  const filtered = data
    .filter((log) => isAfter(new Date(log.timestamp), cutoff))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const chartData = filtered.map((log) => ({
    date: format(new Date(log.timestamp), 'MMM d'),
    mood: log.mood,
    anxiety: log.anxiety,
    energy: log.energy,
    sleep_quality: log.sleep_quality,
  }));

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="h-8 bg-clarita-beige-100 rounded-full w-48 mb-4 animate-pulse" />
        <div className="h-64 bg-clarita-beige-50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title mb-0">Tendencias Emocionais</h3>

        {/* Pill-style time range selector */}
        <div className="flex items-center gap-1 bg-white/40 backdrop-blur-sm rounded-full p-1 border border-white/30">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300
                ${
                  timeRange === range
                    ? 'bg-clarita-green-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Line toggle pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(Object.entries(lineColors) as [keyof typeof lineColors, string][]).map(([key, color]) => {
          const isVisible = visibleLines[key as keyof typeof visibleLines];

          return (
            <button
              key={key}
              onClick={() => toggleLine(key as keyof typeof visibleLines)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
                ${
                  isVisible
                    ? 'bg-white/60 backdrop-blur-sm shadow-sm border border-white/40'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/30'
                }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-opacity duration-300
                  ${isVisible ? 'opacity-100' : 'opacity-30'}`}
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{lineLabels[key] ?? String(key).replace('_', ' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e7e5e4' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e7e5e4' }}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleLines.mood && (
              <Line
                type="monotone"
                dataKey="mood"
                stroke={lineColors.mood}
                strokeWidth={2.5}
                dot={{ r: 3, fill: lineColors.mood }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleLines.anxiety && (
              <Line
                type="monotone"
                dataKey="anxiety"
                stroke={lineColors.anxiety}
                strokeWidth={2.5}
                dot={{ r: 3, fill: lineColors.anxiety }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleLines.energy && (
              <Line
                type="monotone"
                dataKey="energy"
                stroke={lineColors.energy}
                strokeWidth={2.5}
                dot={{ r: 3, fill: lineColors.energy }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleLines.sleep_quality && (
              <Line
                type="monotone"
                dataKey="sleep_quality"
                stroke={lineColors.sleep_quality}
                strokeWidth={2.5}
                dot={{ r: 3, fill: lineColors.sleep_quality }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Sem dados emocionais disponiveis para este periodo
        </div>
      )}
    </div>
  );
}
