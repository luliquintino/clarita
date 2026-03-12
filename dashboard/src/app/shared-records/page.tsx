'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, FileText, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { recordSharingApi, isAuthenticated, getUserRoleFromToken } from '@/lib/api';
import type { MedicalRecord, SharedMedicalRecord } from '@/lib/api';

export default function SharedRecordsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [sharedRecord, setSharedRecord] = useState<SharedMedicalRecord | null>(null);
  const [summary, setSummary] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/login?redirect=/shared-records?token=${token}`);
      return;
    }
    const role = getUserRoleFromToken();
    if (role === 'patient') {
      setError('Apenas profissionais podem acessar prontuarios compartilhados.');
      setLoading(false);
      return;
    }
    if (!token) {
      setError('Token de acesso nao fornecido.');
      setLoading(false);
      return;
    }
    accessRecords();
  }, [token]);

  async function accessRecords() {
    setLoading(true);
    try {
      const result = await recordSharingApi.accessRecords(token!);
      setRecords(result.records || []);
      setSharedRecord(result.shared_record || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Token invalido ou expirado.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSummary() {
    if (!sharedRecord || !summary.trim()) return;
    setSavingSummary(true);
    try {
      await recordSharingApi.saveSummary({
        access_token_id: sharedRecord.access_token_id,
        summary: summary.trim(),
      });
      setSummarySaved(true);
    } catch {
      // silent
    } finally {
      setSavingSummary(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
          <p className="text-gray-500">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/patients')}
            className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  if (records.length === 0 && !sharedRecord) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/patients')}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para pacientes
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-800">Prontuario Compartilhado</h1>
              <p className="text-sm text-gray-500 mt-1">
                {records.length} registro(s) compartilhado(s)
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                  {records.length} registro(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Records */}
        <div className="space-y-4 mb-6">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {record.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {record.record_date && new Date(record.record_date).toLocaleDateString('pt-BR')}
                    {record.category && ` — ${record.category}`}
                  </p>
                </div>
                {record.tags && record.tags.length > 0 && (
                  <div className="flex gap-1">
                    {record.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{record.content}</p>
            </div>
          ))}
        </div>

        {/* Save summary */}
        {!summarySaved ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Save className="w-4 h-4 text-violet-500" />
              Salvar Resumo
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Salve um resumo antes que o acesso expire. O resumo ficara disponivel permanentemente.
            </p>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Escreva seu resumo sobre os registros..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 resize-none"
            />
            <button
              onClick={handleSaveSummary}
              disabled={savingSummary || !summary.trim()}
              className="mt-3 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              {savingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Resumo
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">Resumo salvo com sucesso!</p>
            <p className="text-xs text-green-600 mt-1">Disponivel em "Meus Compartilhamentos".</p>
          </div>
        )}
      </div>
    </div>
  );
}
