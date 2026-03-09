"use client";

import React, { useState } from "react";
import { X, Search, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { usersApi, invitationsApi, UserSearchResult } from "@/lib/api";

interface InvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationSent: () => void;
  senderRole: string;
}

export default function InvitationDialog({
  isOpen,
  onClose,
  onInvitationSent,
  senderRole,
}: InvitationDialogProps) {
  const [displayId, setDisplayId] = useState("");
  const [message, setMessage] = useState("");
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const targetLabel = senderRole === "patient" ? "profissional" : "paciente";

  const resetState = () => {
    setDisplayId("");
    setMessage("");
    setSearchResult(null);
    setError("");
    setSuccess("");
    setSearching(false);
    setSending(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    if (!displayId.trim()) {
      setError("Digite o ID do usu\u00e1rio");
      return;
    }

    setError("");
    setSearchResult(null);
    setSearching(true);

    try {
      const data = await usersApi.search(displayId.trim());
      const user = data.user;

      // Validate the pairing
      const isPatient = senderRole === "patient";
      const targetIsPatient = user.role === "patient";
      if (isPatient === targetIsPatient) {
        setError(
          isPatient
            ? "Este ID pertence a outro paciente. Insira o ID de um profissional."
            : "Este ID pertence a outro profissional. Insira o ID de um paciente."
        );
        return;
      }

      setSearchResult(user);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; detail?: string };
      if (apiErr.status === 404) {
        setError("Nenhum usu\u00e1rio encontrado com este ID");
      } else {
        setError(apiErr.detail || "Erro ao buscar usu\u00e1rio");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!searchResult) return;

    setSending(true);
    setError("");

    try {
      await invitationsApi.send(searchResult.display_id, message || undefined);
      setSuccess("Convite enviado com sucesso!");
      setTimeout(() => {
        handleClose();
        onInvitationSent();
      }, 1500);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; detail?: string };
      if (apiErr.status === 409) {
        setError("J\u00e1 existe um v\u00ednculo ou convite pendente com este usu\u00e1rio");
      } else {
        setError(apiErr.detail || "Erro ao enviar convite");
      }
    } finally {
      setSending(false);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "psychologist": return "Psic\u00f3logo(a)";
      case "psychiatrist": return "Psiquiatra";
      case "patient": return "Paciente";
      default: return role;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 max-w-md w-full animate-scale-in overflow-hidden">
        {/* Gradient header bar */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <UserPlus size={18} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Convidar {targetLabel}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
          >
            <X size={18} className="text-white/80" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {success ? (
            <div className="text-center py-6 animate-scale-in">
              <div className="w-14 h-14 bg-gradient-to-br from-clarita-green-100 to-clarita-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-clarita-green-600" />
              </div>
              <p className="text-clarita-green-700 font-semibold">{success}</p>
            </div>
          ) : (
            <>
              {/* Search Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ID do {targetLabel}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">
                      CLA-
                    </span>
                    <input
                      type="text"
                      value={displayId.replace(/^CLA-/i, "")}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                        setDisplayId("CLA-" + val);
                        setSearchResult(null);
                        setError("");
                      }}
                      placeholder="XXXXXX"
                      className="input-field pl-12 font-mono uppercase"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !displayId.trim()}
                    className="btn-secondary px-4"
                  >
                    {searching ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Pe\u00e7a o ID Clarita ao {targetLabel} que deseja convidar
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl text-sm text-red-700 animate-fade-in">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Search Result */}
              {searchResult && (
                <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-2xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-clarita-green-100 to-clarita-green-200 rounded-full flex items-center justify-center">
                      <span className="text-clarita-green-700 font-semibold text-sm">
                        {searchResult.first_name[0]}{searchResult.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {searchResult.first_name} {searchResult.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {roleLabel(searchResult.role)}
                        {searchResult.specialization && ` \u00b7 ${searchResult.specialization}`}
                      </p>
                    </div>
                    <span className="badge-teal font-mono text-[10px]">
                      {searchResult.display_id}
                    </span>
                  </div>
                </div>
              )}

              {/* Message (optional) */}
              {searchResult && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mensagem (opcional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Escreva uma mensagem para o ${targetLabel}...`}
                    className="input-field resize-none h-20"
                    maxLength={500}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex justify-end gap-3 px-5 pb-5 pt-2">
            <button onClick={handleClose} className="btn-secondary">
              Cancelar
            </button>
            {searchResult && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="btn-primary"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} className="mr-2" />
                    Enviar Convite
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
