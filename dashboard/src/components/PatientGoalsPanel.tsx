'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Clock, Check, X, Loader2, Trophy, Pause, Calendar, User } from 'lucide-react';
import type { Goal } from '@/lib/api';

interface PatientGoalsPanelProps {
  goals: Goal[];
  loading: boolean;
  onRespond: (goalId: string, action: 'accept' | 'reject', reason?: string) => Promise<void>;
}

type TabKey = 'pending' | 'active' | 'rejected';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  in_progress: {
    label: 'Em andamento',
    color: 'text-clarita-blue-500',
    icon: <Target size={12} />,
  },
  paused: { label: 'Pausada', color: 'text-yellow-500', icon: <Pause size={12} /> },
  achieved: { label: 'Conquistada', color: 'text-clarita-green-600', icon: <Trophy size={12} /> },
  cancelled: { label: 'Cancelada', color: 'text-gray-400', icon: <X size={12} /> },
};

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'badge-green';
    case 'paused':
      return 'badge-yellow';
    case 'achieved':
      return 'badge-green';
    case 'cancelled':
      return 'badge text-gray-400 bg-gray-100 border border-gray-200/50';
    default:
      return 'badge-green';
  }
}

export default function PatientGoalsPanel({ goals, loading, onRespond }: PatientGoalsPanelProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');

  const pending = goals.filter((g) => g.patient_status === 'pending');
  const active = goals.filter((g) => g.patient_status === 'accepted' && g.status !== 'cancelled');
  const rejected = goals.filter((g) => g.patient_status === 'rejected');

  const handleAccept = async (goalId: string) => {
    setRespondingId(goalId);
    try {
      await onRespond(goalId, 'accept');
    } finally {
      setRespondingId(null);
    }
  };

  const handleReject = async (goalId: string) => {
    setRespondingId(goalId);
    try {
      await onRespond(goalId, 'reject', rejectReason || undefined);
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setRespondingId(null);
    }
  };

  // Auto-select the first tab that has content
  const effectiveTab = (() => {
    if (activeTab === 'pending' && pending.length > 0) return 'pending';
    if (activeTab === 'active' && active.length > 0) return 'active';
    if (activeTab === 'rejected' && rejected.length > 0) return 'rejected';
    if (pending.length > 0) return 'pending';
    if (active.length > 0) return 'active';
    if (rejected.length > 0) return 'rejected';
    return activeTab;
  })();

  if (loading) {
    return (
      <div className="card section-purple animate-fade-in">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-clarita-purple-100 to-clarita-purple-50 rounded-xl flex items-center justify-center">
            <Target size={16} className="text-clarita-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Minhas Metas</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-clarita-purple-400" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="card section-purple animate-fade-in">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-clarita-purple-100 to-clarita-purple-50 rounded-xl flex items-center justify-center">
            <Target size={16} className="text-clarita-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Minhas Metas</h3>
        </div>
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-clarita-purple-100 to-clarita-purple-50 rounded-2xl flex items-center justify-center">
            <Target size={28} className="text-clarita-purple-300" />
          </div>
          <p className="text-gray-600 font-medium">Suas metas estao a caminho!</p>
          <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">
            Seus profissionais criarao metas para acompanhar seu progresso. Volte em breve!
          </p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'pending', label: 'Pendentes', count: pending.length },
    { key: 'active', label: 'Ativas', count: active.length },
    { key: 'rejected', label: 'Recusadas', count: rejected.length },
  ];

  return (
    <div className="card section-purple animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 bg-gradient-to-br from-clarita-purple-100 to-clarita-purple-50 rounded-xl flex items-center justify-center">
          <Target size={16} className="text-clarita-purple-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Minhas Metas</h3>
        <span className="badge-purple ml-auto">
          {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
        </span>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-5 border-b border-clarita-purple-100/50 pb-px">
        {tabs.map((tab) => {
          if (tab.count === 0) return null;
          const isActive = effectiveTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                isActive
                  ? 'border-clarita-purple-500 text-clarita-purple-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-clarita-purple-100 text-clarita-purple-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {/* Pending Goals */}
        {effectiveTab === 'pending' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock size={14} className="text-clarita-purple-400" />
              <p className="text-xs uppercase tracking-wider text-clarita-purple-500 font-semibold">
                Novas metas para avaliar
              </p>
            </div>
            <div className="space-y-3">
              {pending.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 space-y-3 animate-fade-in"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-purple">
                        <Clock size={10} />
                        Pendente
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-800">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        Criada por {goal.created_by_first_name} {goal.created_by_last_name}
                      </span>
                      {goal.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Ate{' '}
                          {format(new Date(goal.target_date), "d 'de' MMMM yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>

                  {rejectingId === goal.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motivo da recusa (opcional) — ex: 'Acho essa meta muito dificil agora'"
                        className="input-field text-sm min-h-[70px] resize-none"
                        maxLength={2000}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(goal.id)}
                          disabled={respondingId === goal.id}
                          className="btn-danger text-sm flex items-center gap-1.5 px-4 py-2"
                        >
                          {respondingId === goal.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          Confirmar recusa
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="btn-secondary text-sm px-4 py-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(goal.id)}
                        disabled={respondingId === goal.id}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                      >
                        {respondingId === goal.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Aceitar meta
                      </button>
                      <button
                        onClick={() => setRejectingId(goal.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 text-red-500 bg-red-50/80 border border-red-200/50 hover:bg-red-100/80 hover:border-red-300/60"
                      >
                        <X size={14} />
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Goals */}
        {effectiveTab === 'active' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-1.5 mb-3">
              <Check size={14} className="text-clarita-green-500" />
              <p className="text-xs uppercase tracking-wider text-clarita-green-600 font-semibold">
                Metas ativas
              </p>
            </div>
            <div className="space-y-3">
              {active.map((goal) => {
                const cfg = statusConfig[goal.status] || statusConfig.in_progress;
                return (
                  <div
                    key={goal.id}
                    className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 animate-fade-in"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={getStatusBadgeClasses(goal.status)}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          {goal.target_date && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Calendar size={10} />
                              {format(new Date(goal.target_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                        <h4
                          className={`font-medium text-gray-800 ${goal.status === 'achieved' ? 'line-through text-gray-500' : ''}`}
                        >
                          {goal.title}
                        </h4>
                        {goal.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                        {goal.achieved_at && (
                          <p className="text-[10px] text-clarita-green-500 mt-1 flex items-center gap-1">
                            <Trophy size={10} />
                            Conquistada em{' '}
                            {format(new Date(goal.achieved_at), "d 'de' MMMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rejected Goals */}
        {effectiveTab === 'rejected' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-1.5 mb-3">
              <X size={14} className="text-gray-400" />
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Metas recusadas
              </p>
            </div>
            <div className="space-y-3">
              {rejected.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 opacity-70 animate-fade-in"
                >
                  <h4 className="font-medium text-gray-500 text-sm line-through">{goal.title}</h4>
                  {goal.rejection_reason && (
                    <div className="mt-1.5 p-2 bg-red-50/60 rounded-lg">
                      <p className="text-xs text-red-500">
                        <span className="font-medium">Motivo:</span> {goal.rejection_reason}
                      </p>
                    </div>
                  )}
                  {goal.responded_at && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Recusada em{' '}
                      {format(new Date(goal.responded_at), "d 'de' MMMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
