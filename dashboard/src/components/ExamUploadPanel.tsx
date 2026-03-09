"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  X,
  Loader2,
  ClipboardList,
} from "lucide-react";
import {
  examsApi,
  patientProfileApi,
} from "@/lib/api";
import type { Exam, ProfessionalInfo } from "@/lib/api";

const EXAM_TYPES = [
  "Hemograma",
  "Glicemia",
  "Colesterol",
  "Tireoide",
  "Vitaminas",
  "Imagem / Raio-X",
  "Ressonância",
  "Outro",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  // Handle both ISO strings (2026-03-01T03:00:00.000Z) and date-only (2026-03-01)
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ExamUploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("");
  const [examDate, setExamDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  // Expanded exam cards
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [examsRes, profsRes] = await Promise.all([
        examsApi.getMyExams(),
        patientProfileApi.getMyProfessionals(),
      ]);
      setExams(examsRes.exams);
      setProfessionals(profsRes.professionals);
    } catch {
      setError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo: 10MB.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(file.type)) {
        setError("Tipo de arquivo não permitido. Use PDF, JPEG ou PNG.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo: 10MB.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !examType || !examDate) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("exam_type", examType);
      formData.append("exam_date", examDate);
      if (notes) formData.append("notes", notes);
      formData.append("professional_ids", JSON.stringify(selectedProfessionals));

      await examsApi.upload(formData);

      // Reset form
      setSelectedFile(null);
      setExamType("");
      setExamDate("");
      setNotes("");
      setSelectedProfessionals([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setSuccess("Exame enviado com sucesso!");
      setTimeout(() => setSuccess(null), 3000);

      // Reload exams
      const examsRes = await examsApi.getMyExams();
      setExams(examsRes.exams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar exame.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (exam: Exam) => {
    try {
      const blob = await examsApi.download(exam.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("Erro ao baixar exame.");
    }
  };

  const handleDelete = async (examId: string) => {
    try {
      await examsApi.delete(examId);
      setExams((prev) => prev.filter((e) => e.id !== examId));
      setDeletingId(null);
      setSuccess("Exame removido.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Erro ao remover exame.");
    }
  };

  const handlePermissionToggle = async (examId: string, profId: string, currentPerms: Exam["permissions"]) => {
    const currentIds = (currentPerms || []).map((p) => p.professional_id);
    const newIds = currentIds.includes(profId)
      ? currentIds.filter((id) => id !== profId)
      : [...currentIds, profId];

    try {
      const res = await examsApi.updatePermissions(examId, newIds);
      setExams((prev) =>
        prev.map((e) =>
          e.id === examId ? { ...e, permissions: res.permissions } : e
        )
      );
    } catch {
      setError("Erro ao atualizar permissões.");
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
    return <ImageIcon className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-clarita-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Form */}
      <div className="card section-green">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-clarita-green-500" />
          <h3 className="section-title mb-0">Enviar Exame</h3>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-clarita-green-50 border border-clarita-green-200 text-clarita-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* File Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 mb-4
            ${selectedFile
              ? "border-clarita-green-300 bg-clarita-green-50/50"
              : "border-gray-300 hover:border-clarita-green-300 hover:bg-clarita-green-50/30"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              {getFileIcon(selectedFile.type)}
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="ml-2 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Arraste um arquivo ou clique para selecionar</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPEG ou PNG (máx. 10MB)</p>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Exame *</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="input-field"
            >
              <option value="">Selecione...</option>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Exame *</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionais sobre este exame..."
            rows={2}
            className="input-field"
          />
        </div>

        {/* Professional Permissions */}
        {professionals.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Compartilhar com</label>
            <div className="space-y-2">
              {professionals.map((prof) => (
                <label
                  key={prof.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 hover:bg-white/80 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedProfessionals.includes(prof.id)}
                    onChange={() =>
                      setSelectedProfessionals((prev) =>
                        prev.includes(prof.id) ? prev.filter((id) => id !== prof.id) : [...prev, prof.id]
                      )
                    }
                    className="w-4 h-4 rounded border-gray-300 text-clarita-green-500 focus:ring-clarita-green-300"
                  />
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      prof.role === "psychiatrist" ? "bg-clarita-purple-400" : "bg-clarita-green-400"
                    }`}>
                      {prof.first_name[0]}{prof.last_name[0]}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {prof.first_name} {prof.last_name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {prof.role === "psychiatrist" ? "Psiquiatra" : "Psicólogo(a)"}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !examType || !examDate}
          className="btn-primary w-full"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          ) : (
            <><Upload className="w-4 h-4" /> Enviar Exame</>
          )}
        </button>
      </div>

      {/* Exam History */}
      <div className="card section-blue">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-clarita-blue-400" />
          <h3 className="section-title mb-0">Meus Exames</h3>
          <span className="badge badge-blue ml-auto">{exams.length}</span>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">Nenhum exame enviado ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Use o formulário acima para enviar seu primeiro exame.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 overflow-hidden transition-all duration-300">
                <div className="flex items-center gap-3 p-3">
                  {getFileIcon(exam.mime_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-teal text-xs">{exam.exam_type}</span>
                      <span className="text-xs text-gray-500">{formatDate(exam.exam_date)}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate mt-0.5">{exam.original_name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(exam.file_size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(exam)}
                      className="p-2 rounded-lg hover:bg-clarita-blue-50 text-clarita-blue-400 transition-colors"
                      title="Baixar"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                      title="Detalhes"
                    >
                      {expandedExam === exam.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {deletingId === exam.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Confirmar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(exam.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedExam === exam.id && (
                  <div className="border-t border-gray-100 p-3 bg-white/40 animate-fade-in">
                    {exam.notes && (
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Notas:</span> {exam.notes}
                      </p>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Compartilhado com:</p>
                      {professionals.length === 0 ? (
                        <p className="text-xs text-gray-400">Nenhum profissional vinculado.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {professionals.map((prof) => {
                            const hasAccess = (exam.permissions || []).some(
                              (p) => p.professional_id === prof.id
                            );
                            return (
                              <label
                                key={prof.id}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/60 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={hasAccess}
                                  onChange={() => handlePermissionToggle(exam.id, prof.id, exam.permissions)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-clarita-green-500 focus:ring-clarita-green-300"
                                />
                                <span className="text-sm text-gray-700">
                                  {prof.first_name} {prof.last_name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {prof.role === "psychiatrist" ? "Psiquiatra" : "Psicólogo(a)"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
