'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, BookOpen, Moon } from 'lucide-react';
import type { JournalEntryData } from '@/lib/api';

interface JournalHistoryProps {
  entries: JournalEntryData[];
  loading?: boolean;
}

const moodConfig: Record<string, { emoji: string; bg: string; label: string }> = {
  low: { emoji: '😔', bg: 'bg-red-100', label: 'Difícil' },
  neutral: { emoji: '😐', bg: 'bg-yellow-100', label: 'Neutro' },
  good: { emoji: '😊', bg: 'bg-clarita-green-100', label: 'Bem' },
};

function getMoodLevel(score: number): string {
  if (score <= 3) return 'low';
  if (score <= 6) return 'neutral';
  return 'good';
}

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {label}: {value}
    </span>
  );
}

export default function JournalHistory({ entries, loading = false }: JournalHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="card section-blue animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={20} className="text-clarita-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Histórico</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card section-blue text-center py-12 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 bg-clarita-blue-50 rounded-full flex items-center justify-center">
          <BookOpen size={28} className="text-clarita-blue-400" />
        </div>
        <p className="text-gray-600 font-medium">Seu diário está esperando por você</p>
        <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">
          Cada registro é um passo na sua jornada de autoconhecimento. Comece seu primeiro check-in
          acima!
        </p>
      </div>
    );
  }

  return (
    <div className="card section-blue animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={20} className="text-clarita-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">Histórico</h3>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const date = new Date(entry.logged_at || entry.created_at);
          const mood = moodConfig[getMoodLevel(entry.mood_score)];

          return (
            <div
              key={entry.id}
              className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 cursor-pointer hover:bg-white/60 transition-all duration-200"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 ${mood.bg} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-xl">{mood.emoji}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <ScoreBadge
                        label="Humor"
                        value={entry.mood_score}
                        color="bg-clarita-green-100 text-clarita-green-600"
                      />
                      <ScoreBadge
                        label="Ansiedade"
                        value={entry.anxiety_score}
                        color="bg-orange-100 text-orange-600"
                      />
                      <ScoreBadge
                        label="Energia"
                        value={entry.energy_score}
                        color="bg-clarita-blue-50 text-clarita-blue-500"
                      />
                      {entry.sleep_hours && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Moon size={10} />
                          {entry.sleep_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {entry.journal_entry && (
                  <span className="text-gray-400">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                )}
              </div>

              {entry.journal_entry && (
                <div className="mt-3 pt-3 border-t border-white/30">
                  <p
                    className={`text-sm text-gray-600 leading-relaxed ${
                      isExpanded ? '' : 'line-clamp-2'
                    }`}
                  >
                    {entry.journal_entry}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
