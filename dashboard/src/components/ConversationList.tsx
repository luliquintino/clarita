'use client';

import { Brain, Stethoscope } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Conversation } from '@/lib/api';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  currentUserId: string;
  onSelect: (conv: Conversation) => void;
}

const roleIcons: Record<string, React.ReactNode> = {
  psychologist: <Brain size={14} className="text-clarita-purple-500" />,
  psychiatrist: <Stethoscope size={14} className="text-clarita-green-500" />,
};

const roleRingColor: Record<string, string> = {
  psychologist: 'ring-clarita-purple-400',
  psychiatrist: 'ring-clarita-green-400',
};

const roleAvatarGradient: Record<string, string> = {
  psychologist: 'from-clarita-purple-100 to-clarita-purple-50',
  psychiatrist: 'from-clarita-green-100 to-clarita-green-50',
};

export default function ConversationList({
  conversations,
  activeId,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-6 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-soft flex items-center justify-center mx-auto mb-4">
          <Brain size={24} className="text-clarita-purple-300" />
        </div>
        <p className="text-gray-500 text-sm font-medium">Nenhuma conversa ainda</p>
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
          Inicie uma conversa a partir da página de um paciente compartilhado.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {conversations.map((conv) => {
        const isActive = activeId === conv.id;
        const timeAgo = conv.last_message_at
          ? formatDistanceToNow(new Date(conv.last_message_at), {
              addSuffix: true,
              locale: ptBR,
            })
          : '';
        const isMyLastMessage = conv.last_message_sender_id === currentUserId;
        const ringColor = roleRingColor[conv.other_role] || 'ring-clarita-beige-300';
        const avatarGradient =
          roleAvatarGradient[conv.other_role] || 'from-clarita-beige-200 to-clarita-beige-100';

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full text-left px-3.5 py-3 rounded-2xl transition-all duration-300 group
              ${
                isActive
                  ? 'bg-white/80 backdrop-blur-sm shadow-soft border border-clarita-green-200/60'
                  : 'hover:bg-white/50 hover:backdrop-blur-sm hover:shadow-soft hover:-translate-y-0.5 border border-transparent'
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar with role-colored ring */}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600 ring-2 ${ringColor} ring-offset-2 ring-offset-white/70 transition-shadow duration-300 group-hover:shadow-md`}
                >
                  {conv.other_first_name[0]}
                  {conv.other_last_name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {roleIcons[conv.other_role]}
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {conv.other_first_name} {conv.other_last_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    sobre {conv.patient_first_name} {conv.patient_last_name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                {timeAgo && (
                  <span className="text-[10px] text-gray-400 font-medium">{timeAgo}</span>
                )}
                {conv.unread_count > 0 && (
                  <span
                    className="min-w-[22px] h-[22px] px-1.5 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)' }}
                  >
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </div>
            </div>

            {conv.last_message && (
              <p
                className={`text-xs mt-1.5 line-clamp-1 pl-[52px] ${conv.unread_count > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}`}
              >
                {isMyLastMessage ? 'Você: ' : ''}
                {conv.last_message}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
