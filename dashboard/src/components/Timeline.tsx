'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Heart, Star, Pill, AlertTriangle, ClipboardCheck, Filter } from 'lucide-react';
import type { TimelineEntry } from '@/lib/api';

interface TimelineProps {
  entries: TimelineEntry[];
  loading?: boolean;
}

const typeConfig: Record<
  TimelineEntry['type'],
  { icon: React.ReactNode; dotColor: string; badgeClass: string; label: string }
> = {
  emotional_log: {
    icon: <Heart size={16} />,
    dotColor: 'bg-clarita-green-400 shadow-glow-green',
    badgeClass: 'badge-green',
    label: 'Registro Emocional',
  },
  life_event: {
    icon: <Star size={16} />,
    dotColor: 'bg-clarita-blue-400 shadow-glow-blue',
    badgeClass: 'badge-blue',
    label: 'Evento de Vida',
  },
  medication_change: {
    icon: <Pill size={16} />,
    dotColor: 'bg-clarita-purple-400 shadow-glow-purple',
    badgeClass: 'badge-purple',
    label: 'Medicamento',
  },
  symptom: {
    icon: <AlertTriangle size={16} />,
    dotColor: 'bg-orange-400 shadow-glow-orange',
    badgeClass: 'badge-orange',
    label: 'Sintoma',
  },
  assessment: {
    icon: <ClipboardCheck size={16} />,
    dotColor: 'bg-clarita-purple-500 shadow-glow-purple',
    badgeClass: 'badge-teal',
    label: 'Avaliação',
  },
  symptom_report: {
    icon: <AlertTriangle size={16} />,
    dotColor: 'bg-orange-400 shadow-glow-orange',
    badgeClass: 'badge-orange',
    label: 'Sintoma',
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

export default function Timeline({ entries, loading = false }: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const allTypes = [
    'all',
    'emotional_log',
    'life_event',
    'medication_change',
    'symptom_report',
    'assessment',
  ];

  const filtered =
    activeFilter === 'all' ? entries : entries.filter((e) => e.type === activeFilter);

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
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        {allTypes.map((type) => {
          const config = type === 'all' ? null : typeConfig[type as TimelineEntry['type']];
          const isActive = activeFilter === type;

          let buttonClass = 'text-gray-500 hover:bg-white/40';
          if (isActive && config) {
            buttonClass = config.badgeClass;
          } else if (isActive) {
            buttonClass = 'bg-white/70 backdrop-blur-sm text-gray-700 shadow-soft';
          }

          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${buttonClass}`}
            >
              {type === 'all' ? 'Todos' : config?.label}
            </button>
          );
        })}
      </div>

      {/* Timeline entries */}
      <div className="relative">
        {/* Gradient vertical line (teal to purple) */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-clarita-green-400 via-clarita-purple-300 to-clarita-purple-400" />

        <div className="space-y-3">
          {filtered.map((entry) => {
            const config = typeConfig[entry.type] ?? {
              icon: <ClipboardCheck size={16} />,
              dotColor: 'bg-gray-400',
              badgeClass: 'badge-blue',
              label: entry.type.replace(/_/g, ' '),
            };

            return (
              <div key={entry.id} className="relative pl-12 animate-fade-in">
                {/* Colored dot on the line */}
                <div
                  className={`absolute left-[12px] top-5 w-6 h-6 rounded-full flex items-center justify-center ${config.dotColor} text-white z-10 ring-4 ring-white/60`}
                >
                  {config.icon}
                </div>

                {/* Card */}
                <div
                  className={`bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 transition-all duration-300 hover:bg-white/60 hover:shadow-soft border-l-4 ${
                    entry.severity ? severityBorderColors[entry.severity] : 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`${config.badgeClass} text-[10px]`}>{config.label}</span>
                      {entry.severity && (
                        <span className={`${getSeverityBadgeClass(entry.severity)} text-[10px]`}>
                          {entry.severity}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>

                  <h4 className="font-medium text-gray-800 text-sm">{entry.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Nenhuma entrada na linha do tempo encontrada</p>
        </div>
      )}
    </div>
  );
}
