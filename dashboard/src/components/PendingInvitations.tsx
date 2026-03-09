'use client';

import React, { useState } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  Loader2,
  Mail,
  ChevronDown,
  ChevronUp,
  X,
  Send,
} from 'lucide-react';
import { invitationsApi, Invitation } from '@/lib/api';

interface PendingInvitationsProps {
  received: Invitation[];
  sent: Invitation[];
  onUpdate: () => void;
  currentUserId: string;
}

export default function PendingInvitations({
  received,
  sent,
  onUpdate,
  currentUserId,
}: PendingInvitationsProps) {
  const [responding, setResponding] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showSent, setShowSent] = useState(false);

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    setResponding(id);
    try {
      await invitationsApi.respond(id, action);
      onUpdate();
    } catch {
      // Error handling - could show a toast
    } finally {
      setResponding(null);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await invitationsApi.cancel(id);
      onUpdate();
    } catch {
      // Error handling
    } finally {
      setCancelling(null);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'psychologist':
        return 'Psic\u00f3logo(a)';
      case 'psychiatrist':
        return 'Psiquiatra';
      case 'patient':
        return 'Paciente';
      default:
        return role;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'agora mesmo';
    if (diffHours < 24) return `h\u00e1 ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `h\u00e1 ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (received.length === 0 && sent.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Received Invitations -- green-themed glassmorphism card */}
      {received.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-5 border-l-4 border-l-clarita-green-400 animate-fade-in">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-clarita-green-100 to-clarita-green-50 rounded-xl flex items-center justify-center">
              <Mail size={16} className="text-clarita-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Convites Recebidos</h3>
            <span className="badge-green">{received.length}</span>
          </div>

          <div className="space-y-3">
            {received.map((inv) => {
              const isSender = inv.invited_by === currentUserId;
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3.5 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 transition-all hover:bg-white/60"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-clarita-green-100 to-clarita-green-200 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-clarita-green-700 font-semibold text-sm">
                      {inv.other_first_name[0]}
                      {inv.other_last_name[0]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">
                      {inv.other_first_name} {inv.other_last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {roleLabel(inv.other_role)}
                      {inv.specialization && ` \u00b7 ${inv.specialization}`}
                      {' \u00b7 '}
                      <span className="font-mono">{inv.other_display_id}</span>
                    </p>
                    {inv.invitation_message && (
                      <p className="text-xs text-gray-600 mt-1 italic truncate">
                        &ldquo;{inv.invitation_message}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      <Clock size={10} className="inline mr-1" />
                      {formatDate(inv.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  {!isSender && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(inv.id, 'accept')}
                        disabled={responding === inv.id}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        {responding === inv.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserCheck size={14} />
                        )}
                        Aceitar
                      </button>
                      <button
                        onClick={() => handleRespond(inv.id, 'reject')}
                        disabled={responding === inv.id}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        <UserX size={14} />
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent Invitations -- orange-themed glassmorphism card */}
      {sent.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-5 border-l-4 border-l-orange-400 animate-fade-in">
          <button
            onClick={() => setShowSent(!showSent)}
            className="flex items-center gap-2.5 w-full text-left"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
              <Send size={14} className="text-orange-500" />
            </div>
            <span className="text-sm font-semibold text-gray-800 flex-1">Convites Enviados</span>
            <span className="badge-orange mr-2">{sent.length}</span>
            {showSent ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {showSent && (
            <div className="space-y-2.5 mt-4 animate-fade-in">
              {sent.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3.5 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 transition-all hover:bg-white/60"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-orange-600 font-semibold text-xs">
                      {inv.other_first_name[0]}
                      {inv.other_last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 text-sm">
                      {inv.other_first_name} {inv.other_last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {roleLabel(inv.other_role)}
                      {' \u00b7 '}
                      <span className="text-orange-500 font-medium">Aguardando resposta</span>
                      {' \u00b7 '}
                      {formatDate(inv.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(inv.id)}
                    disabled={cancelling === inv.id}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-200/50"
                    title="Cancelar convite"
                  >
                    {cancelling === inv.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
