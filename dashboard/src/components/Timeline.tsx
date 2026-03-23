'use client';

import { useState, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Heart,
  Star,
  Pill,
  AlertTriangle,
  ClipboardCheck,
  X,
} from 'lucide-react';
import type { TimelineEntry } from '@/lib/api';

interface TimelineProps {
  entries: TimelineEntry[];
  loading?: boolean;
}

type TimeRange = '7d' | '30d' | '90d';

const timeRangeLabels: Record<TimeRange, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
};

// Category lane assignments (Y values)
const categoryLanes: Record<string, number> = {
  assessment: 5,
  emotional_log: 4,
  life_event: 3,
  medication_change: 2,
  symptom: 1,
  symptom_report: 1,
};

const laneLabels: Record<number, string> = {
  1: 'Sintoma',
  2: 'Medicamento',
  3: 'Evento',
  4: 'Emocional',
  5: 'Avaliação',
};

const categoryColors: Record<string, string> = {
  emotional_log: '#14b8a6',
  life_event: '#3b82f6',
  medication_change: '#8b5cf6',
  symptom: '#f97316',
  symptom_report: '#f97316',
  assessment: '#7c3aed',
};

const categoryConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; badgeClass: string }
> = {
  emotional_log: {
    icon: <Heart size={14} />,
    label: 'Registro Emocional',
    color: '#14b8a6',
    badgeClass: 'badge-green',
  },
  life_event: {
    icon: <Star size={14} />,
    label: 'Evento de Vida',
    color: '#3b82f6',
    badgeClass: 'badge-blue',
  },
  medication_change: {
    icon: <Pill size={14} />,
    label: 'Medicamento',
    color: '#8b5cf6',
    badgeClass: 'badge-purple',
  },
  symptom: {
    icon: <AlertTriangle size={14} />,
    label: 'Sintoma',
    color: '#f97316',
    badgeClass: 'badge-orange',
  },
  symptom_report: {
    icon: <AlertTriangle size={14} />,
    label: 'Sintoma',
    color: '#f97316',
    badgeClass: 'badge-orange',
  },
  assessment: {
    icon: <ClipboardCheck size={14} />,
    label: 'Avaliação',
    color: '#7c3aed',
    badgeClass: 'badge-teal',
  },
};

function getSeverityBadgeClass(severity: string): string {
  if (severity === 'critical') return 'badge-red';
  if (severity === 'high') return 'badge-orange';
  if (severity === 'medium') return 'badge-yellow';
  return 'badge-blue';
}

const severityBorderColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-clarita-blue-300',
};

// ---------------------------------------------------------------------------
// Correlation computation
// ---------------------------------------------------------------------------

interface EmotionalWindow {
  mood: number;
  anxiety: number;
  energy: number;
  count: number;
}

export interface EventCorrelation {
  event: TimelineEntry;
  before: EmotionalWindow;
  after: EmotionalWindow;
  delta: { mood: number; anxiety: number; energy: number };
}

function computeCorrelations(entries: TimelineEntry[], windowDays: number): EventCorrelation[] {
  const MS_PER_DAY = 86400000;
  const windowMs = windowDays * MS_PER_DAY;

  const lifeEvents = entries.filter((e) => e.type === 'life_event');
  const emotionalLogs = entries.filter((e) => e.type === 'emotional_log');

  const correlations: EventCorrelation[] = [];

  for (const event of lifeEvents) {
    const eventTime = new Date(event.timestamp).getTime();

    const beforeLogs = emotionalLogs.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= eventTime - windowMs && t < eventTime;
    });

    const afterLogs = emotionalLogs.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t > eventTime && t <= eventTime + windowMs;
    });

    // Require at least 2 records on each side to avoid noise
    if (beforeLogs.length < 2 || afterLogs.length < 2) continue;

    const avg = (logs: TimelineEntry[], key: string): number => {
      const vals = logs
        .map((e) => Number((e.metadata as Record<string, unknown>)?.[key] ?? NaN))
        .filter((v) => !isNaN(v));
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };

    const before: EmotionalWindow = {
      mood: avg(beforeLogs, 'mood_score'),
      anxiety: avg(beforeLogs, 'anxiety_score'),
      energy: avg(beforeLogs, 'energy_score'),
      count: beforeLogs.length,
    };

    const after: EmotionalWindow = {
      mood: avg(afterLogs, 'mood_score'),
      anxiety: avg(afterLogs, 'anxiety_score'),
      energy: avg(afterLogs, 'energy_score'),
      count: afterLogs.length,
    };

    correlations.push({
      event,
      before,
      after,
      delta: {
        mood: after.mood - before.mood,
        anxiety: after.anxiety - before.anxiety,
        energy: after.energy - before.energy,
      },
    });
  }

  // Sort by absolute sum of deltas descending (most impactful first)
  return correlations.sort(
    (a, b) =>
      Math.abs(b.delta.mood) + Math.abs(b.delta.anxiety) + Math.abs(b.delta.energy) -
      (Math.abs(a.delta.mood) + Math.abs(a.delta.anxiety) + Math.abs(a.delta.energy))
  );
}

interface ChartPoint {
  x: number;
  y: number;
  entry: TimelineEntry;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartPoint;
  }>;
}

function TimelineTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const entry = point.entry;
  const config = categoryConfig[entry.type];

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 px-4 py-3 max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className={`${config?.badgeClass ?? 'badge-blue'} text-[10px]`}>
          {config?.label ?? entry.type}
        </span>
        {entry.severity && (
          <span className={`${getSeverityBadgeClass(entry.severity)} text-[10px]`}>
            {entry.severity}
          </span>
        )}
      </div>
      <p className="font-medium text-gray-800 text-sm">{entry.title}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {format(new Date(entry.timestamp), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
      </p>
    </div>
  );
}

// Custom dot shape for the scatter chart
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  selectedId?: string | null;
}) {
  const { cx, cy, payload, selectedId } = props;
  if (!cx || !cy || !payload) return null;

  const entry = payload.entry;
  const color = categoryColors[entry.type] ?? '#9ca3af';
  const isSelected = selectedId === entry.id;
  const isSevere = entry.severity === 'critical' || entry.severity === 'high';
  const r = isSevere ? 9 : 7;

  return (
    <g>
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.4}
        />
      )}
      {/* Severity outer ring */}
      {isSevere && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
      />
    </g>
  );
}

export default function Timeline({ entries, loading = false }: TimelineProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    emotional_log: true,
    life_event: true,
    medication_change: true,
    symptom: true,
    assessment: true,
  });
  const [selectedEvent, setSelectedEvent] = useState<TimelineEntry | null>(null);

  const toggleCategory = (key: string) => {
    setVisibleCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter by time range
  const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const cutoff = subDays(new Date(), rangeDays);

  const filtered = entries
    .filter((e) => isAfter(new Date(e.timestamp), cutoff))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Group by visible categories and create chart data
  const uniqueCategories = ['emotional_log', 'life_event', 'medication_change', 'symptom', 'assessment'];

  const chartDataByCategory: Record<string, ChartPoint[]> = {};
  for (const cat of uniqueCategories) {
    if (!visibleCategories[cat]) continue;
    chartDataByCategory[cat] = filtered
      .filter((e) => {
        // symptom_report maps to symptom lane
        const effectiveType = e.type === 'symptom_report' ? 'symptom' : e.type;
        return effectiveType === cat;
      })
      .map((e) => ({
        x: new Date(e.timestamp).getTime(),
        y: categoryLanes[e.type] ?? 1,
        entry: e,
      }));
  }

  const handleDotClick = useCallback((_: unknown, _index: unknown, dataPayload?: { payload?: ChartPoint }) => {
    if (dataPayload?.payload?.entry) {
      setSelectedEvent(dataPayload.payload.entry);
    }
  }, []);

  // Compute domain for X axis
  const allTimestamps = filtered.map((e) => new Date(e.timestamp).getTime());
  const minTime = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now() - rangeDays * 86400000;
  const maxTime = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now();
  const padding = (maxTime - minTime) * 0.05 || 86400000;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card animate-pulse flex gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with title and time range selector */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title mb-0">Linha do Tempo</h3>

          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-gray-200/40">
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

        {/* Category toggle pills */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {uniqueCategories.map((cat) => {
            const config = categoryConfig[cat];
            const isVisible = visibleCategories[cat];

            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
                  ${
                    isVisible
                      ? 'bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200/50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/30'
                  }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-opacity duration-300
                    ${isVisible ? 'opacity-100' : 'opacity-30'}`}
                  style={{ backgroundColor: config?.color }}
                />
                <span>{config?.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scatter chart */}
        {filtered.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[minTime - padding, maxTime + padding]}
                tickFormatter={(val: number) => format(new Date(val), 'd MMM', { locale: ptBR })}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 6]}
                ticks={[1, 2, 3, 4, 5]}
                tickFormatter={(val: number) => laneLabels[val] ?? ''}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<TimelineTooltip />} />

              {uniqueCategories.map((cat) => {
                const data = chartDataByCategory[cat];
                if (!data || data.length === 0) return null;
                const color = categoryColors[cat];

                return (
                  <Scatter
                    key={cat}
                    data={data}
                    onClick={handleDotClick as never}
                    shape={(props: unknown) => {
                      const p = props as { cx?: number; cy?: number; payload?: ChartPoint };
                      return (
                        <CustomDot
                          cx={p.cx}
                          cy={p.cy}
                          payload={p.payload}
                          selectedId={selectedEvent?.id ?? null}
                        />
                      );
                    }}
                  >
                    {data.map((point) => (
                      <Cell
                        key={point.entry.id}
                        fill={color}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Scatter>
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Nenhum evento na linha do tempo para este período
          </div>
        )}

        {/* Lane legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-200/40">
          {uniqueCategories.filter((c) => visibleCategories[c]).map((cat) => {
            const config = categoryConfig[cat];
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config?.color }}
                />
                <span className="text-xs text-gray-500">{config?.label}</span>
              </div>
            );
          })}
        </div>

        {/* Event list */}
        {filtered.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200/40">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {filtered.length} evento{filtered.length !== 1 ? 's' : ''} no período
            </h4>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {[...filtered]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((entry) => (
                  <EventListItem
                    key={entry.id}
                    entry={entry}
                    onSelect={setSelectedEvent}
                    isSelected={selectedEvent?.id === entry.id}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected event detail card */}
      {selectedEvent && (
        <div className="animate-scale-in">
          <SelectedEventCard
            entry={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      )}
    </div>
  );
}

function EventListItem({
  entry,
  onSelect,
  isSelected,
}: {
  entry: TimelineEntry;
  onSelect: (e: TimelineEntry) => void;
  isSelected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = categoryConfig[entry.type] ?? {
    icon: <ClipboardCheck size={14} />,
    label: entry.type.replace(/_/g, ' '),
    color: '#9ca3af',
    badgeClass: 'badge-blue',
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-2xl transition-all duration-200 cursor-pointer
        ${isSelected ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50/60'}
        ${entry.severity === 'critical' || entry.severity === 'high' ? 'border-l-2 border-red-400 pl-2' : ''}`}
      onClick={() => { onSelect(entry); setExpanded(!expanded); }}
    >
      <div
        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white mt-0.5"
        style={{ backgroundColor: config.color }}
      >
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${config.badgeClass} text-[10px]`}>{config.label}</span>
          {entry.severity && (
            <span className={`${getSeverityBadgeClass(entry.severity)} text-[10px]`}>
              {entry.severity}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
            {format(new Date(entry.timestamp), "d MMM · HH:mm", { locale: ptBR })}
          </span>
        </div>
        <p className="font-medium text-gray-800 text-sm mt-0.5">{entry.title}</p>
        {entry.description && (
          <p className={`text-xs text-gray-500 mt-0.5 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {entry.description}
          </p>
        )}
      </div>
    </div>
  );
}

function SelectedEventCard({
  entry,
  onClose,
}: {
  entry: TimelineEntry;
  onClose: () => void;
}) {
  const config = categoryConfig[entry.type] ?? {
    icon: <ClipboardCheck size={14} />,
    label: entry.type.replace(/_/g, ' '),
    color: '#9ca3af',
    badgeClass: 'badge-blue',
  };

  return (
    <div
      className={`card border-l-4 ${
        entry.severity ? severityBorderColors[entry.severity] : 'border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`${config.badgeClass} text-[10px]`}>{config.label}</span>
              {entry.severity && (
                <span className={`${getSeverityBadgeClass(entry.severity)} text-[10px]`}>
                  {entry.severity}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(new Date(entry.timestamp), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <h4 className="font-semibold text-gray-800 text-base mt-3">{entry.title}</h4>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{entry.description}</p>
    </div>
  );
}
