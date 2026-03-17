'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  MessageCircle,
  Plus,
  Search,
  X,
  Brain,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ConversationList from '@/components/ConversationList';
import ChatPanel from '@/components/ChatPanel';
import { chatApi, authApi, isAuthenticated, getUserRoleFromToken } from '@/lib/api';
import type { Conversation } from '@/lib/api';

interface ProfessionalResult {
  id: string;
  display_id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
  specialization: string | null;
  institution: string | null;
}

const roleLabel: Record<string, string> = {
  psychologist: 'Psicólogo(a)',
  psychiatrist: 'Psiquiatra',
  therapist: 'Terapeuta',
  nutritionist: 'Nutricionista',
};

const roleIcon: Record<string, React.ReactNode> = {
  psychologist: <Brain size={14} className="text-clarita-purple-500" />,
  psychiatrist: <Stethoscope size={14} className="text-clarita-green-500" />,
};

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // New conversation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfessionalResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [creating, setCreating] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Search professionals with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSearchError('');
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await chatApi.searchProfessionals(value.trim());
        setSearchResults(data.professionals);
      } catch {
        setSearchError('Erro ao buscar profissionais');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const handleStartConversation = async (professional: ProfessionalResult) => {
    setCreating(true);
    try {
      const data = await chatApi.createConversation(professional.id);
      // Reload conversations, then select the new/existing one
      await loadConversations();
      // Find and select the conversation
      const convData = await chatApi.listConversations();
      const raw = convData as any;
      const convs: Conversation[] = Array.isArray(raw) ? raw : (raw?.conversations ?? []);
      const newConv = convs.find((c) => c.id === data.conversation.id);
      if (newConv) {
        setActiveConv(newConv);
      }
      setShowNewModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      setSearchError(err?.message || 'Erro ao criar conversa');
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => {
    setShowNewModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
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
            {/* Left: Conversation list */}
            <div className="w-[340px] bg-white/70 backdrop-blur-xl border-r border-white/40 overflow-y-auto flex flex-col animate-fade-in">
              <div className="px-5 py-4 border-b border-clarita-beige-100/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    Conversas
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-clarita-green-600 bg-clarita-green-50 px-2.5 py-0.5 rounded-full">
                      {conversations.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewModal(true)}
                      className="w-7 h-7 rounded-lg bg-clarita-green-500 hover:bg-clarita-green-600 text-white flex items-center justify-center transition-colors shadow-sm"
                      title="Nova conversa"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
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
                      Escolha uma conversa à esquerda ou inicie uma nova
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewModal(true)}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-clarita-green-500 hover:bg-clarita-green-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                    >
                      <Plus size={16} /> Nova conversa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-clarita-green-100 flex items-center justify-center">
                  <UserCheck size={18} className="text-clarita-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Nova conversa</h3>
                  <p className="text-xs text-gray-400">Busque um profissional pelo nome ou código</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Search input */}
            <div className="p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome ou código (ex: CLA-BA5A3)"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-clarita-green-400 bg-gray-50"
                />
              </div>

              {searchError && (
                <p className="mt-2 text-xs text-red-500">{searchError}</p>
              )}

              {/* Results */}
              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                {searchLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-clarita-green-400" />
                  </div>
                )}

                {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && !searchError && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">Nenhum profissional encontrado</p>
                  </div>
                )}

                {!searchLoading && searchResults.map((professional) => (
                  <button
                    key={professional.id}
                    type="button"
                    disabled={creating}
                    onClick={() => handleStartConversation(professional)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-clarita-green-50 transition-colors text-left disabled:opacity-50"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-clarita-purple-100 to-clarita-green-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600 ring-2 ring-white">
                      {professional.first_name[0]}{professional.last_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {roleIcon[professional.role]}
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {professional.first_name} {professional.last_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {roleLabel[professional.role] || professional.role}
                        {professional.specialization ? ` · ${professional.specialization}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-300 flex-shrink-0">{professional.display_id}</span>
                  </button>
                ))}

                {searchQuery.length < 2 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400">Digite pelo menos 2 caracteres para buscar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
