'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  SortAsc,
  SortDesc,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Users,
  Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Patient } from '@/lib/api';

interface PatientListProps {
  patients: Patient[];
}

type SortField = 'name' | 'last_check_in' | 'alerts' | 'score';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortField, string> = {
  name: 'Nome',
  last_check_in: 'Último acesso',
  alerts: 'Alertas',
  score: 'Pontuação',
};

function getMoodColor(score: number | null): string {
  if (score === null) return 'border-l-gray-300';
  if (score >= 7) return 'border-l-clarita-green-400';
  if (score >= 4) return 'border-l-yellow-400';
  return 'border-l-red-400';
}

function getMoodRingColor(score: number | null): string {
  if (score === null) return 'ring-gray-300';
  if (score >= 7) return 'ring-clarita-green-400';
  if (score >= 4) return 'ring-yellow-400';
  return 'ring-red-400';
}

function getLatestMoodScore(moodTrend: number[]): number | null {
  if (!moodTrend || moodTrend.length === 0) return null;
  return moodTrend[moodTrend.length - 1];
}

function MoodSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 10);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const trend = data[data.length - 1] - data[0];

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={trend >= 0 ? '#22c55e' : '#f59e0b'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {trend > 0 ? (
        <TrendingUp size={14} className="text-clarita-green-500" />
      ) : trend < 0 ? (
        <TrendingDown size={14} className="text-orange-500" />
      ) : (
        <Minus size={14} className="text-gray-400" />
      )}
    </div>
  );
}

export default function PatientList({ patients }: PatientListProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...patients];

    // Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(lower) ||
          p.email?.toLowerCase().includes(lower) ||
          p.diagnosis?.some((d) => d.toLowerCase().includes(lower))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'name':
          return a.full_name.localeCompare(b.full_name) * dir;
        case 'last_check_in':
          return (a.last_check_in || '').localeCompare(b.last_check_in || '') * dir;
        case 'alerts':
          return (a.active_alerts - b.active_alerts) * dir;
        case 'score':
          return ((a.mental_clarity_score || 0) - (b.mental_clarity_score || 0)) * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [patients, search, sortField, sortDir, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pacientes por nome, email ou diagnóstico..."
          className="w-full pl-12 pr-4 py-3.5 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl
                     text-gray-800 placeholder-gray-400 transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-clarita-green-200/70 focus:border-clarita-green-300
                     focus:bg-white/80 text-[15px]"
        />
      </div>

      {/* Sort Controls & Status Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Ordenar:</span>
          {(['name', 'last_check_in', 'alerts', 'score'] as SortField[]).map((field) => {
            const isActive = sortField === field;
            return (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
                    ${
                      isActive
                        ? 'bg-white/70 backdrop-blur-sm text-clarita-green-600 shadow-sm border border-clarita-green-200/50'
                        : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'
                    }`}
              >
                <span className="flex items-center gap-1">
                  {SORT_LABELS[field]}
                  {field === 'score' && (
                    <span className="relative group/tip">
                      <Info size={11} className="text-gray-400 group-hover/tip:text-clarita-purple-400 transition-colors" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-800 text-white text-[11px] rounded-xl px-3 py-2 shadow-lg opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity duration-200 z-20 leading-relaxed whitespace-normal text-left">
                        Índice de Clareza Mental — calculado com base nos check-ins de humor, sono, energia e ansiedade do paciente.
                      </span>
                    </span>
                  )}
                  {isActive &&
                    (sortDir === 'asc' ? (
                      <SortAsc size={12} />
                    ) : (
                      <SortDesc size={12} />
                    ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white/60 backdrop-blur-sm border border-white/30 rounded-full
                       text-xs text-gray-600 transition-all duration-300
                       focus:outline-none focus:ring-2 focus:ring-clarita-green-200/70"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="discharged">Alta</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {filtered.length} paciente{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((patient) => {
          const latestMood = getLatestMoodScore(patient.mood_trend);
          const initials = patient.full_name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <div
                className={`bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30
                  hover:bg-white/80 transition-all duration-300 hover:-translate-y-0.5
                  cursor-pointer group border-l-4 ${getMoodColor(latestMood)}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                      text-sm font-bold bg-clarita-beige-100 text-gray-600
                      ring-2 ring-offset-1 ${getMoodRingColor(latestMood)}
                      group-hover:bg-clarita-green-100 group-hover:text-clarita-green-700 transition-colors`}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate group-hover:text-clarita-green-600 transition-colors">
                      {patient.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {patient.age} anos
                      {patient.diagnosis?.length > 0 && (
                        <span className="ml-1.5 text-gray-400">
                          &middot; {patient.diagnosis[0]}
                          {patient.diagnosis.length > 1 && ` +${patient.diagnosis.length - 1}`}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Alert Badge */}
                  {patient.active_alerts > 0 && (
                    <span
                      className={`flex items-center gap-1 flex-shrink-0 ml-1
                        ${patient.active_alerts >= 3 ? 'badge-red' : 'badge-orange'}`}
                    >
                      <AlertCircle size={12} />
                      {patient.active_alerts}
                    </span>
                  )}
                </div>

                {/* Mood trend */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Tendência de humor</p>
                  <MoodSparkline data={patient.mood_trend} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/40">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar size={12} />
                    {patient.last_check_in
                      ? formatDistanceToNow(new Date(patient.last_check_in), {
                          addSuffix: true,
                        })
                      : 'Sem check-ins'}
                  </div>

                  {patient.mental_clarity_score !== null && (
                    <div className="relative group flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          patient.mental_clarity_score >= 70
                            ? 'bg-clarita-green-400'
                            : patient.mental_clarity_score >= 40
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                        }`}
                      />
                      <span className="text-xs font-medium text-gray-600">
                        {patient.mental_clarity_score}%
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-2 w-56 bg-gray-800 text-white text-[11px] rounded-xl px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10 leading-relaxed">
                        <p className="font-semibold mb-1">Clareza Mental</p>
                        <p>Índice calculado com base nos check-ins do paciente: humor, sono, energia e ansiedade. Quanto maior, melhor o bem-estar geral.</p>
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-clarita-green-400 inline-block" /> ≥ 70% Bom</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 40–69% Moderado</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt; 40% Atenção</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <span
                    className={`badge text-[10px] ${
                      patient.status === 'active'
                        ? 'bg-clarita-green-100 text-clarita-green-600'
                        : patient.status === 'inactive'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-clarita-blue-100 text-clarita-blue-500'
                    }`}
                  >
                    {patient.status}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/60 backdrop-blur-sm border border-white/30 mb-4">
            <Users size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Nenhum paciente encontrado</p>
          <p className="text-gray-400 text-sm">
            {search ? 'Tente ajustar os termos da busca' : 'Convide pacientes para começar'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost text-xs mt-3">
              Limpar busca
            </button>
          )}
        </div>
      )}
    </div>
  );
}
