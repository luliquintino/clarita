'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Target,
  Trophy,
  Pause,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  X,
  Clock,
} from 'lucide-react';
import type { Goal } from '@/lib/api';

interface GoalsPanelProps {
  goals: Goal[];
  loading?: boolean;
  readOnly?: boolean;
  patientId: string;
  onCreateGoal?: (data: {
    patient_id: string;
    title: string;
    description?: string;
    target_date?: string;
  }) => Promise<void>;
  onAchieveGoal?: (goalId: string) => Promise<void>;
  onUpdateGoal?: (
    goalId: string,
    data: Partial<Pick<Goal, 'title' | 'description' | 'status' | 'target_date'>>
  ) => Promise<void>;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  in_progress: {
    label: 'Em andamento',
    icon: <Target size={14} />,
    badgeClass: 'badge-blue',
  },
  achieved: {
    label: 'Conquistada',
    icon: <Trophy size={14} />,
    badgeClass: 'badge-green',
  },
  paused: {
    label: 'Pausada',
    icon: <Pause size={14} />,
    badgeClass: 'badge-yellow',
  },
  cancelled: {
    label: 'Cancelada',
    icon: <X size={14} />,
    badgeClass: 'bg-gray-100 text-gray-400 badge',
  },
};

export default function GoalsPanel({
  goals,
  loading = false,
  readOnly = false,
  patientId,
  onCreateGoal,
  onAchieveGoal,
  onUpdateGoal,
}: GoalsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  const pendingAcceptance = goals.filter((g) => g.patient_status === 'pending');
  const inProgress = goals.filter(
    (g) => g.patient_status === 'accepted' && (g.status === 'in_progress' || g.status === 'paused')
  );
  const achieved = goals.filter((g) => g.patient_status === 'accepted' && g.status === 'achieved');
  const rejected = goals.filter((g) => g.patient_status === 'rejected');

  const handleCreate = async () => {
    if (!newTitle.trim() || !onCreateGoal) return;
    setSaving(true);
    try {
      await onCreateGoal({
        patient_id: patientId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        target_date: newTargetDate || undefined,
      });
      setNewTitle('');
      setNewDescription('');
      setNewTargetDate('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAchieve = async (goalId: string) => {
    if (!onAchieveGoal) return;
    await onAchieveGoal(goalId);
  };

  if (loading) {
    return (
      <div className="card section-purple">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-clarita-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-clarita-purple-100 flex items-center justify-center">
            <Target size={16} className="text-clarita-purple-500" />
          </div>
          Metas
        </h3>
        {!readOnly && onCreateGoal && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm flex items-center gap-1 py-2 px-4"
          >
            <Plus size={14} />
            Nova meta
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border-2 border-clarita-purple-200/60 animate-scale-in">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Nova meta</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título da meta"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="input-field"
              maxLength={300}
            />
            <textarea
              placeholder="Descrição (opcional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              maxLength={5000}
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data alvo (opcional)</label>
              <input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || saving}
                className="btn-primary text-sm flex items-center gap-1"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Criando...' : 'Criar meta'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending patient acceptance */}
      {pendingAcceptance.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-yellow-600 font-semibold mb-2 flex items-center gap-1">
            <Clock size={12} />
            Aguardando paciente ({pendingAcceptance.length})
          </p>
          <div className="space-y-2">
            {pendingAcceptance.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                readOnly={true}
                expanded={expandedId === goal.id}
                onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
            Em andamento ({inProgress.length})
          </p>
          <div className="space-y-2">
            {inProgress.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                readOnly={readOnly}
                expanded={expandedId === goal.id}
                onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                onAchieve={() => handleAchieve(goal.id)}
                onUpdateGoal={onUpdateGoal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Achieved */}
      {achieved.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 flex items-center gap-1">
            <Trophy size={12} className="text-clarita-green-500" />
            Conquistas ({achieved.length})
          </p>
          <div className="space-y-2">
            {achieved.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                readOnly={true}
                expanded={expandedId === goal.id}
                onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rejected by patient */}
      {rejected.length > 0 && (
        <div>
          <button
            onClick={() => setShowRejected(!showRejected)}
            className="btn-ghost flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            {showRejected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <X size={12} className="text-red-400" />
            Recusadas pelo paciente ({rejected.length})
          </button>
          {showRejected && (
            <div className="space-y-2 mt-2 animate-fade-in">
              {rejected.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  readOnly={true}
                  expanded={expandedId === goal.id}
                  onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="card text-center py-8">
          <Target size={32} className="mx-auto text-clarita-purple-200 mb-3" />
          <p className="text-gray-500">Nenhuma meta definida</p>
          {!readOnly && (
            <p className="text-sm text-gray-400 mt-1">
              Crie metas para acompanhar o progresso do paciente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  readOnly,
  expanded,
  onToggle,
  onAchieve,
  onUpdateGoal,
}: {
  goal: Goal;
  readOnly: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAchieve?: () => void;
  onUpdateGoal?: (
    goalId: string,
    data: Partial<Pick<Goal, 'title' | 'description' | 'status' | 'target_date'>>
  ) => Promise<void>;
}) {
  const config = statusConfig[goal.status] || statusConfig.in_progress;

  return (
    <div
      className={`bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30 cursor-pointer transition-all duration-300 hover:bg-white/60 hover:shadow-soft animate-fade-in ${
        goal.status === 'achieved' ? 'opacity-80' : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <PatientStatusBadge goal={goal} config={config} />
            {goal.target_date && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Calendar size={10} />
                {format(new Date(goal.target_date), 'dd/MM/yyyy')}
              </span>
            )}
          </div>
          <h4
            className={`font-medium ${goal.status === 'achieved' ? 'text-gray-500 line-through' : 'text-gray-800'}`}
          >
            {goal.title}
          </h4>
          {goal.achieved_at && (
            <p className="text-xs text-clarita-green-500 mt-1">
              Conquistada em{' '}
              {format(new Date(goal.achieved_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {!readOnly &&
            goal.status === 'in_progress' &&
            goal.patient_status === 'accepted' &&
            onAchieve && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAchieve();
                }}
                className="badge-green flex items-center gap-1 px-2 py-1 text-xs hover:shadow-glow-green transition-shadow"
                title="Marcar como conquista"
              >
                <Trophy size={12} />
                Conquistar
              </button>
            )}
          <span className="text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/30 animate-fade-in">
          {goal.description && <p className="text-sm text-gray-600 mb-2">{goal.description}</p>}
          {goal.patient_status === 'rejected' && goal.rejection_reason && (
            <div className="p-2.5 bg-red-50/80 rounded-xl mb-2 border border-red-100/50">
              <p className="text-xs text-red-600">
                <span className="font-semibold">Motivo da recusa:</span> {goal.rejection_reason}
              </p>
            </div>
          )}
          {goal.patient_status === 'rejected' && goal.responded_at && (
            <p className="text-xs text-red-400 mb-2">
              Recusada em{' '}
              {format(new Date(goal.responded_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Criada por {goal.created_by_first_name} {goal.created_by_last_name}
            {' · '}
            {format(new Date(goal.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {!readOnly &&
            goal.status === 'in_progress' &&
            goal.patient_status === 'accepted' &&
            onUpdateGoal && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateGoal(goal.id, { status: 'paused' });
                  }}
                  className="btn-ghost text-xs text-yellow-600"
                >
                  Pausar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateGoal(goal.id, { status: 'cancelled' });
                  }}
                  className="btn-ghost text-xs text-gray-400"
                >
                  Cancelar
                </button>
              </div>
            )}
          {!readOnly &&
            goal.status === 'paused' &&
            goal.patient_status === 'accepted' &&
            onUpdateGoal && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateGoal(goal.id, { status: 'in_progress' });
                  }}
                  className="btn-ghost text-xs text-clarita-blue-500"
                >
                  Retomar
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function PatientStatusBadge({
  goal,
  config,
}: {
  goal: Goal;
  config: { label: string; icon: React.ReactNode; badgeClass: string };
}) {
  if (goal.patient_status === 'pending') {
    return (
      <span className="badge-yellow text-xs">
        <Clock size={12} />
        Aguardando paciente
      </span>
    );
  }

  if (goal.patient_status === 'rejected') {
    return (
      <span className="badge-red text-xs">
        <X size={12} />
        Recusada pelo paciente
      </span>
    );
  }

  return (
    <span className={`${config.badgeClass} text-xs`}>
      {config.icon}
      {config.label}
    </span>
  );
}
