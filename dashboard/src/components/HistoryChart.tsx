'use client';

import { useState, useMemo, useId } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { JournalEntryData } from '@/lib/api';

interface HistoryChartProps {
  entries: JournalEntryData[];
}

type Period = 7 | 30 | 90;

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.3) return <Minus size={14} className="text-gray-400" />;
  if (diff > 0) return <TrendingUp size={14} className="text-green-500" />;
  return <TrendingDown size={14} className="text-red-400" />;
}

const PERIODS: Period[] = [7, 30, 90];

export default function HistoryChart({ entries }: HistoryChartProps) {
  const [period, setPeriod] = useState<Period>(30);
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');

  const { chartData, currentAvgs, previousAvgs } = useMemo(() => {
    const now = new Date();
    const cutoff = subDays(now, period);
    const prevCutoff = subDays(now, period * 2);

    const current = entries.filter((e) => {
      const d = parseISO(e.logged_at || e.created_at);
      return isAfter(d, cutoff);
    });

    const previous = entries.filter((e) => {
      const d = parseISO(e.logged_at || e.created_at);
      return isAfter(d, prevCutoff) && !isAfter(d, cutoff);
    });

    const chartData = [...current]
      .sort((a, b) =>
        parseISO(a.logged_at || a.created_at).getTime() -
        parseISO(b.logged_at || b.created_at).getTime()
      )
      .map((e) => ({
        date: format(parseISO(e.logged_at || e.created_at), 'd MMM', { locale: ptBR }),
        Humor: e.mood_score,
        Ansiedade: e.anxiety_score,
        Energia: e.energy_score,
      }));

    const currentAvgs = {
      mood: avg(current.map((e) => e.mood_score)),
      anxiety: avg(current.map((e) => e.anxiety_score)),
      energy: avg(current.map((e) => e.energy_score)),
    };

    const previousAvgs = {
      mood: avg(previous.map((e) => e.mood_score)),
      anxiety: avg(previous.map((e) => e.anxiety_score)),
      energy: avg(previous.map((e) => e.energy_score)),
    };

    return { chartData, currentAvgs, previousAvgs };
  }, [entries, period]);

  if (entries.length === 0) return null;

  return (
    <div className="card section-blue space-y-5 animate-fade-in">
      {/* Header + period selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-semibold text-gray-800">Evolução</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                period === p
                  ? 'bg-clarita-blue-100 text-clarita-blue-500 border-clarita-blue-200'
                  : 'bg-white/40 text-gray-500 border-gray-200 hover:bg-white/60'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Area chart */}
      {chartData.length > 1 ? (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`${uid}-gHumor`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF78" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4CAF78" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${uid}-gAnsiedade`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${uid}-gEnergia`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb', background: 'rgba(255,255,255,0.95)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Humor" stroke="#4CAF78" strokeWidth={2} fill={`url(#${uid}-gHumor)`} dot={false} />
              <Area type="monotone" dataKey="Ansiedade" stroke="#F97316" strokeWidth={2} fill={`url(#${uid}-gAnsiedade)`} dot={false} />
              <Area type="monotone" dataKey="Energia" stroke="#60A5FA" strokeWidth={2} fill={`url(#${uid}-gEnergia)`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          Registre mais check-ins para ver o gráfico.
        </p>
      )}

      {/* Averages */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Humor médio', current: currentAvgs.mood, previous: previousAvgs.mood, color: 'text-clarita-green-600' },
          { label: 'Ansiedade média', current: currentAvgs.anxiety, previous: previousAvgs.anxiety, color: 'text-orange-500' },
          { label: 'Energia média', current: currentAvgs.energy, previous: previousAvgs.energy, color: 'text-clarita-blue-500' },
        ].map(({ label, current, previous, color }) => (
          <div key={label} className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 border border-white/30 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{current || '—'}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendIcon current={current} previous={previous} />
              <span className="text-xs text-gray-400">vs anterior</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
