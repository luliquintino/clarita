"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { chatApi } from "@/lib/api";
import type { ChatMessage, Conversation } from "@/lib/api";

interface ChatPanelProps {
  conversation: Conversation;
  currentUserId: string;
  onMessageSent?: () => void;
}

export default function ChatPanel({
  conversation,
  currentUserId,
  onMessageSent,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await chatApi.getMessages(conversation.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const msgs = Array.isArray(raw) ? raw : raw?.messages ?? [];
      setMessages(msgs);
    } catch {
      // Silent fail
    }
  }, [conversation.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages().finally(() => setLoading(false));

    // Mark as read
    chatApi.markAsRead(conversation.id).catch(() => {});

    // Polling every 5s
    pollRef.current = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversation.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      const data = await chatApi.sendMessage(conversation.id, text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const newMsg = raw?.message || raw;
      setMessages((prev) => [...prev, newMsg]);
      onMessageSent?.();
    } catch {
      setInput(text); // Restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-white/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-clarita-green-100 to-clarita-purple-100 flex items-center justify-center text-xs font-bold text-gray-600 ring-2 ring-clarita-green-300 ring-offset-2 ring-offset-white/50">
            {conversation.other_first_name[0]}{conversation.other_last_name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {conversation.other_first_name} {conversation.other_last_name}
            </h3>
            <p className="text-xs text-gray-400">
              Sobre {conversation.patient_first_name}{" "}
              {conversation.patient_last_name}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3" style={{ scrollBehavior: "smooth" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-clarita-green-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-soft flex items-center justify-center mx-auto mb-4">
              <Send size={22} className="text-clarita-green-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              Nenhuma mensagem ainda.
            </p>
            <p className="text-gray-400 text-xs mt-1">Inicie a conversa!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const showDate =
              idx === 0 ||
              format(new Date(msg.created_at), "yyyy-MM-dd") !==
                format(new Date(messages[idx - 1].created_at), "yyyy-MM-dd");

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/40 shadow-sm">
                      {format(new Date(msg.created_at), "d 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
                      isMe
                        ? "bg-clarita-green-50 border border-clarita-green-200/40 text-gray-800 rounded-br-lg"
                        : "bg-white/80 backdrop-blur-sm border border-white/50 text-gray-800 rounded-bl-lg shadow-soft"
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-semibold text-clarita-purple-500 mb-1">
                        {msg.sender_first_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1.5 ${
                        isMe ? "text-clarita-green-500/70 text-right" : "text-gray-400"
                      }`}
                    >
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 bg-white/70 backdrop-blur-xl border-t border-white/40">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[48px] max-h-[120px] resize-none px-5 py-3 bg-white/60 backdrop-blur-sm border border-clarita-beige-200/60 rounded-2xl text-gray-800 text-sm placeholder-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-clarita-green-200/70 focus:border-clarita-green-300 focus:bg-white/80 focus:shadow-glow-green"
            rows={1}
            maxLength={10000}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0 shadow-md"
            style={{ background: "linear-gradient(135deg, #14b8a6, #8b5cf6)" }}
          >
            {sending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
