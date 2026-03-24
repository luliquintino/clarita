'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Image as ImageIcon, Download, Loader2, ClipboardList, Info, Lock } from 'lucide-react';
import { examsApi } from '@/lib/api';
import type { Exam } from '@/lib/api';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface PatientExamsPanelProps {
  patientId: string;
  readOnly?: boolean;
}

export default function PatientExamsPanel({ patientId, readOnly = false }: PatientExamsPanelProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await examsApi.getPatientExams(patientId);
      setExams(res.exams);
    } catch {
      setError('Erro ao carregar exames.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleDownload = async (exam: Exam) => {
    try {
      const blob = await examsApi.download(exam.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError('Erro ao baixar exame.');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <ImageIcon className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-clarita-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card section-blue">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="card section-blue animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-clarita-blue-400" />
        <h3 className="section-title mb-0">Exames Compartilhados</h3>
        <span className="badge badge-blue ml-auto">{exams.length}</span>
      </div>

      {readOnly && (
        <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-blue-50 border border-blue-200/60">
          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">Visualização clínica.</span>{' '}
            Solicitação de exames é realizada pelo psiquiatra.
            Os exames abaixo estão disponíveis para consulta do acompanhamento.
          </p>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhum exame compartilhado com você.</p>
          <p className="text-xs text-gray-400 mt-1">
            O paciente precisa compartilhar exames para que apareçam aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 hover:border-clarita-blue-200/60 transition-all duration-300"
            >
              {getFileIcon(exam.mime_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="badge badge-teal text-xs">{exam.exam_type}</span>
                  {exam.is_professional_only && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                      <Lock size={10} />
                      Laudo
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(exam.exam_date)}</span>
                </div>
                <p className="text-sm text-gray-700 truncate mt-0.5">{exam.original_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{formatFileSize(exam.file_size)}</span>
                  {exam.notes && (
                    <span className="text-xs text-gray-500 truncate">· {exam.notes}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDownload(exam)}
                className="p-2.5 rounded-xl bg-clarita-blue-50 hover:bg-clarita-blue-100 text-clarita-blue-500 transition-colors"
                title="Baixar exame"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
