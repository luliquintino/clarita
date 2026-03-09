'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ConversationList from '@/components/ConversationList';
import ChatPanel from '@/components/ChatPanel';
import { chatApi, authApi, isAuthenticated, getUserRoleFromToken } from '@/lib/api';
import type { Conversation } from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const role = getUserRoleFromToken();
    if (role === 'patient') {
      router.replace('/patient-home');
      return;
    }
    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      const response = await authApi.me();
      setCurrentUserId(response.user.id);
      loadConversations();
    } catch {
      router.replace('/login');
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.listConversations();
      const raw = data as any;
      const convs = Array.isArray(raw) ? raw : (raw?.conversations ?? []);
      setConversations(convs);

      // Update unread count
      const totalUnread = convs.reduce(
        (sum: number, c: Conversation) => sum + (c.unread_count || 0),
        0
      );
      setUnreadCount(totalUnread);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConv(conv);
    // Mark as read optimistically
    if (conv.unread_count > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      );
    }
  };

  const handleMessageSent = () => {
    // Refresh conversation list to update last_message
    loadConversations();
  };

  return (
    <div className="min-h-screen bg-clarita-beige-50">
      <Sidebar alertCount={unreadCount} />

      <main className="ml-[240px] h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-8 py-5 bg-white/70 backdrop-blur-xl border-b border-white/40 animate-fade-in">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-clarita-green-400 to-clarita-purple-400 flex items-center justify-center shadow-glow-green">
            <MessageCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Chat</h1>
            <p className="text-xs text-gray-400">
              Converse com outros profissionais sobre pacientes compartilhados
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-clarita-green-400" />
              <p className="text-sm text-gray-400">Carregando conversas...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Conversation list — glassmorphism sidebar */}
            <div className="w-[340px] bg-white/70 backdrop-blur-xl border-r border-white/40 overflow-y-auto flex flex-col animate-fade-in">
              <div className="px-5 py-4 border-b border-clarita-beige-100/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    Conversas
                  </p>
                  <span className="text-[11px] font-medium text-clarita-green-600 bg-clarita-green-50 px-2.5 py-0.5 rounded-full">
                    {conversations.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  activeId={activeConv?.id || null}
                  currentUserId={currentUserId}
                  onSelect={handleSelectConversation}
                />
              </div>
            </div>

            {/* Right: Chat thread */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-clarita-beige-50 to-clarita-green-50/20">
              {activeConv ? (
                <ChatPanel
                  conversation={activeConv}
                  currentUserId={currentUserId}
                  onMessageSent={handleMessageSent}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center animate-fade-in">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-soft flex items-center justify-center mx-auto mb-5">
                      <MessageCircle size={36} className="text-clarita-green-300" />
                    </div>
                    <p className="text-gray-600 font-semibold text-lg">Selecione uma conversa</p>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-[260px]">
                      Escolha uma conversa à esquerda para começar a trocar mensagens
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
