'use client';

import { useState, useEffect } from 'react';
import { QrCode, Share2, Copy, Clock, ShieldCheck, Loader2, XCircle, CheckCircle2, FileText } from 'lucide-react';
import { recordSharingApi, RecordAccessToken } from '@/lib/api';

interface RecordSharingPanelProps {
  patientId: string;
}

export default function RecordSharingPanel({ patientId }: RecordSharingPanelProps) {
  const [shares, setShares] = useState<Array<RecordAccessToken & { records_count?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<RecordAccessToken | null>(null);
  const [copied, setCopied] = useState(false);

  // Access view state
  const [accessToken, setAccessToken] = useState('');
  const [accessView, setAccessView] = useState<'share' | 'access'>('share');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accessedRecords, setAccessedRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [accessTokenId, setAccessTokenId] = useState('');

  useEffect(() => {
    loadShares();
  }, []);

  async function loadShares() {
    setLoading(true);
    try {
      const data = await recordSharingApi.getMyShares();
      setShares(data.shares || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await recordSharingApi.generateToken(patientId);
      setGeneratedToken(data.token);
      await loadShares();
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm('Revogar este token de acesso?')) return;
    try {
      await recordSharingApi.revokeToken(tokenId);
      setGeneratedToken(null);
      await loadShares();
    } catch {
      // silent
    }
  }

  function copyToken(token: string) {
    const shareUrl = `${window.location.origin}/shared-records?token=${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAccessRecords() {
    if (!accessToken.trim()) return;
    setAccessLoading(true);
    setAccessError('');
    try {
      const data = await recordSharingApi.accessRecords(accessToken.trim());
      setAccessedRecords(data.records || []);
      setAccessTokenId(data.shared_record?.access_token_id || '');
    } catch (err: unknown) {
      setAccessError((err as Error).message || 'Token inválido ou expirado.');
    } finally {
      setAccessLoading(false);
    }
  }

  async function handleSaveSummary() {
    if (!summary.trim() || !accessTokenId) return;
    setSavingSummary(true);
    try {
      await recordSharingApi.saveSummary({ access_token_id: accessTokenId, summary });
      setSummary('');
      setAccessedRecords([]);
      setAccessToken('');
      setAccessView('share');
    } catch {
      // silent
    } finally {
      setSavingSummary(false);
    }
  }

  function daysRemaining(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  // Access records view
  if (accessView === 'access') {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => { setAccessView('share'); setAccessedRecords([]); setAccessToken(''); }} className="text-sm text-violet-400 hover:text-violet-300">
          ← Voltar
        </button>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          Acessar Prontuário Compartilhado
        </h3>

        {accessedRecords.length === 0 ? (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Cole o token de acesso aqui..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 font-mono text-sm"
            />
            {accessError && <p className="text-red-400 text-sm">{accessError}</p>}
            <button
              onClick={handleAccessRecords}
              disabled={accessLoading || !accessToken.trim()}
              className="w-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            >
              {accessLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verificar e Acessar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/60">{accessedRecords.length} registro(s) compartilhado(s)</p>
            {accessedRecords.map((r) => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{r.title}</span>
                  <span className="text-xs text-white/40">{new Date(r.record_date).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-sm text-white/60 whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <h4 className="text-sm font-medium text-white/60">Salvar resumo (antes do token expirar)</h4>
              <textarea
                placeholder="Escreva um resumo dos registros..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 resize-none text-sm"
                rows={4}
              />
              <button
                onClick={handleSaveSummary}
                disabled={savingSummary || !summary.trim()}
                className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors disabled:opacity-40"
              >
                {savingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Salvar Resumo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Share view (default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Share2 className="w-5 h-5 text-violet-400" />
          Compartilhamento de Prontuário
        </h3>
        <button
          onClick={() => setAccessView('access')}
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          Acessar via Token
        </button>
      </div>

      {/* Generate Token */}
      {generatedToken ? (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-violet-300">
            <QrCode className="w-5 h-5" />
            <span className="font-medium">Token Gerado</span>
          </div>
          <div className="bg-white/5 rounded-lg p-3 font-mono text-xs text-white/60 break-all select-all">
            {generatedToken.token}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Expira em {daysRemaining(generatedToken.expires_at)} dias
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => copyToken(generatedToken.token)}
                className="text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => handleRevoke(generatedToken.id)}
                className="text-xs text-red-400/60 hover:text-red-400 px-2"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Gerar Token de Compartilhamento
        </button>
      )}

      <p className="text-xs text-white/30 text-center">
        O token permite que outro profissional acesse seu prontuário deste paciente por 20 dias.
      </p>

      {/* Existing shares */}
      {shares.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider">Tokens Ativos</h4>
          {shares.map((s) => (
            <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 font-mono">{s.token.substring(0, 16)}...</p>
                <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {s.is_revoked ? 'Revogado' : `${daysRemaining(s.expires_at)} dias restantes`}
                  {s.accessed_at && ' • Acessado'}
                </p>
              </div>
              {!s.is_revoked && daysRemaining(s.expires_at) > 0 && (
                <button onClick={() => handleRevoke(s.id)} className="text-red-400/60 hover:text-red-400">
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
