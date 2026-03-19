'use client';

import { useState, useEffect } from 'react';
import {
  Search, BookOpen, FlaskConical, ShieldCheck, ShieldAlert,
  ChevronRight, Loader2, AlertTriangle, Tag, ArrowLeft,
  Sparkles, Send, Stethoscope, ChevronDown, FileText,
  ClipboardList, Brain, Save, CheckCircle2,
} from 'lucide-react';
import {
  icd11Api, satepsiApi, psychTestsApi, diagnosesApi, medicalRecordsApi,
  ICD11Disorder, ICDTestSuggestion, SatepsiTest, PatientDiagnosis, RecentIcd,
} from '@/lib/api';

interface DiagnosticBrowserPanelProps {
  patientId?: string;
  onAssignTest?: (testId: string) => void;
  onDiagnosisCreated?: (diagnosis: PatientDiagnosis) => void;
  diagnosesForPatient?: PatientDiagnosis[];
  currentProfessionalId?: string;
}

type View = 'browse' | 'disorder-detail' | 'satepsi-list' | 'symptom-search';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NextStepBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon} {title}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function ClinicalNoteBlock({ patientId, diagnosis, onNoteCreated }: {
  patientId: string;
  diagnosis: PatientDiagnosis;
  onNoteCreated: (noteId: string) => void;
}) {
  const [title, setTitle] = useState(`Diagnóstico: ${diagnosis.icd_name}`);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const data = await medicalRecordsApi.create({
        patient_id: patientId,
        title,
        content,
        record_date: diagnosis.diagnosis_date,
        category: 'Diagnóstico',
        tags: [diagnosis.icd_code],
      });
      onNoteCreated(data.record.id);
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Nota criada no prontuário.</p>;
  }

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Conteúdo da nota clínica..."
        rows={4}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
      />
      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar nota no prontuário
      </button>
    </div>
  );
}

function ConductBlock({ diagnosisId, patientId, initialNotes }: {
  diagnosisId: string;
  patientId: string;
  initialNotes: string;
}) {
  const [conduct, setConduct] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await diagnosesApi.update(patientId, diagnosisId, { notes: conduct });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={conduct}
        onChange={e => { setConduct(e.target.value); setSaved(false); }}
        placeholder="Descreva o plano terapêutico e conduta..."
        rows={4}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
      />
      <button
        onClick={handleSave}
        disabled={saving || !conduct.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Salvo!' : 'Salvar conduta'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DiagnosticBrowserPanel({
  patientId,
  onAssignTest,
  onDiagnosisCreated,
  diagnosesForPatient,
  currentProfessionalId,
}: DiagnosticBrowserPanelProps) {
  const [view, setView] = useState<View>('browse');
  const [disorders, setDisorders] = useState<ICD11Disorder[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Disorder detail
  const [selectedDisorder, setSelectedDisorder] = useState<ICD11Disorder | null>(null);
  const [suggestedTests, setSuggestedTests] = useState<ICDTestSuggestion[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loadingTests, setLoadingTests] = useState(false);

  // SATEPSI list
  const [satepsiTests, setSatepsiTests] = useState<SatepsiTest[]>([]);
  const [satepsiSearch, setSatepsiSearch] = useState('');
  const [loadingSatepsi, setLoadingSatepsi] = useState(false);

  // Symptom search
  const [symptomInput, setSymptomInput] = useState('');
  const [symptomSuggestions, setSymptomSuggestions] = useState<(ICD11Disorder & { match_count: number })[]>([]);
  const [loadingSymptoms, setLoadingSymptoms] = useState(false);

  // Assigning
  const [assigning, setAssigning] = useState<string | null>(null);

  // Task 6a — Recent ICDs carousel
  const [recentIcds, setRecentIcds] = useState<RecentIcd[]>([]);

  // Task 6b — Unified smart search
  const [searchMode, setSearchMode] = useState<'text' | 'symptom'>('text');
  const [symptomResults, setSymptomResults] = useState<ICD11Disorder[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Task 7 — Guided diagnosis flow
  const [showDiagnoseForm, setShowDiagnoseForm] = useState(false);
  const [diagCertainty, setDiagCertainty] = useState<'suspected' | 'confirmed'>('suspected');
  const [diagDate, setDiagDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagNotes, setDiagNotes] = useState('');
  const [diagSaving, setDiagSaving] = useState(false);
  const [savedDiagnosis, setSavedDiagnosis] = useState<PatientDiagnosis | null>(null);

  // Task 8 — Patient diagnosis history
  const [patientDiagnoses, setPatientDiagnoses] = useState<PatientDiagnosis[]>([]);

  useEffect(() => {
    loadInitialData();
    icd11Api.recent().then(d => setRecentIcds(d.recent)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!patientId) return;
    diagnosesApi.list(patientId)
      .then(d => setPatientDiagnoses(d.diagnoses))
      .catch(() => {});
  }, [patientId]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [disordersData, categoriesData] = await Promise.all([
        icd11Api.list(),
        icd11Api.getCategories(),
      ]);
      setDisorders(disordersData.disorders || []);
      setCategories(categoriesData.categories || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setLoading(true);
    try {
      const data = await icd11Api.list({
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      setDisorders(data.disorders || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // Task 6b — Unified smart search handler
  async function handleSearchInput(value: string) {
    setSearch(value);

    const isCidCode = /^[A-Z0-9]{2,6}$/.test(value.trim().toUpperCase());
    const isPhrase = value.trim().split(' ').length > 2 && !isCidCode;

    if (isPhrase && value.trim().length > 10) {
      setSearchMode('symptom');
      setIsSearching(true);
      try {
        const stopwords = ['de', 'da', 'do', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'com', 'que', 'em', 'para', 'por'];
        const keywords = value.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w));
        const data = await icd11Api.suggestBySymptoms(keywords);
        setSymptomResults(data.suggestions);
      } catch {
        setSymptomResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchMode('text');
      setSymptomResults([]);
    }
  }

  // Task 6a — Select disorder by ICD code
  async function handleSelectByCode(code: string) {
    try {
      const data = await icd11Api.detail(code);
      setSelectedDisorder(data.disorder);
      setShowDiagnoseForm(false);
      setSavedDiagnosis(null);
      setView('disorder-detail');
      setLoadingTests(true);
      try {
        const testsData = await icd11Api.getSuggestedTests(data.disorder.icd_code);
        setSuggestedTests(testsData.suggested_tests || []);
        setDisclaimer(testsData.disclaimer);
      } catch {
        setSuggestedTests([]);
      } finally {
        setLoadingTests(false);
      }
    } catch {
      // silent
    }
  }

  async function handleSelectDisorder(disorder: ICD11Disorder) {
    setSelectedDisorder(disorder);
    setShowDiagnoseForm(false);
    setSavedDiagnosis(null);
    setDiagNotes('');
    setDiagDate(new Date().toISOString().split('T')[0]);
    setDiagCertainty('suspected');
    setView('disorder-detail');
    setLoadingTests(true);
    try {
      const data = await icd11Api.getSuggestedTests(disorder.icd_code);
      setSuggestedTests(data.suggested_tests || []);
      setDisclaimer(data.disclaimer);
    } catch {
      setSuggestedTests([]);
    } finally {
      setLoadingTests(false);
    }
  }

  async function handleLoadSatepsi() {
    setView('satepsi-list');
    setLoadingSatepsi(true);
    try {
      const data = await satepsiApi.list({ search: satepsiSearch || undefined });
      setSatepsiTests(data.tests || []);
    } catch {
      // silent
    } finally {
      setLoadingSatepsi(false);
    }
  }

  async function handleSearchSatepsi() {
    setLoadingSatepsi(true);
    try {
      const data = await satepsiApi.list({ search: satepsiSearch || undefined });
      setSatepsiTests(data.tests || []);
    } catch {
      // silent
    } finally {
      setLoadingSatepsi(false);
    }
  }

  async function handleSymptomSearch() {
    if (!symptomInput.trim()) return;
    setLoadingSymptoms(true);
    try {
      const symptoms = symptomInput.split(',').map((s) => s.trim()).filter(Boolean);
      const data = await icd11Api.suggestBySymptoms(symptoms);
      setSymptomSuggestions(data.suggestions || []);
      setDisclaimer(data.disclaimer);
    } catch {
      // silent
    } finally {
      setLoadingSymptoms(false);
    }
  }

  async function handleAssignTest(testId: string) {
    if (!patientId || !onAssignTest) return;
    setAssigning(testId);
    try {
      await psychTestsApi.assign({ test_id: testId, patient_id: patientId });
      onAssignTest(testId);
    } catch {
      // silent
    } finally {
      setAssigning(null);
    }
  }

  // Task 7 — Register diagnosis
  async function handleRegisterDiagnosis() {
    if (!selectedDisorder || !patientId) return;
    setDiagSaving(true);
    try {
      const data = await diagnosesApi.create(patientId, {
        icd_code: selectedDisorder.icd_code,
        icd_name: selectedDisorder.disorder_name,
        certainty: diagCertainty,
        diagnosis_date: diagDate,
        notes: diagNotes || undefined,
      });
      setSavedDiagnosis(data.diagnosis);
      setPatientDiagnoses(prev => [data.diagnosis, ...prev]);
      setShowDiagnoseForm(false);
      onDiagnosisCreated?.(data.diagnosis);
      icd11Api.recent().then(d => setRecentIcds(d.recent)).catch(() => {});
    } catch {
      // silent
    } finally {
      setDiagSaving(false);
    }
  }

  // Task 8 — Upgrade certainty
  async function handleUpgradeCertainty(diagnosis: PatientDiagnosis) {
    if (!patientId) return;
    try {
      const data = await diagnosesApi.update(patientId, diagnosis.id, { certainty: 'confirmed' });
      setPatientDiagnoses(prev => prev.map(d => d.id === diagnosis.id ? data.diagnosis : d));
    } catch {
      // silent
    }
  }

  if (loading && view === 'browse') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  // SATEPSI list view
  if (view === 'satepsi-list') {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setView('browse')} className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar
        </button>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Testes Aprovados SATEPSI/CFP
        </h3>
        <div className="flex gap-2">
          <input
            value={satepsiSearch}
            onChange={(e) => setSatepsiSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSatepsi()}
            placeholder="Buscar teste SATEPSI..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
          />
          <button onClick={handleSearchSatepsi} className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm">
            <Search className="w-4 h-4" />
          </button>
        </div>
        {loadingSatepsi ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
        ) : satepsiTests.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhum teste encontrado.</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {satepsiTests.map((t) => (
              <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 text-sm font-medium truncate">{t.test_name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{t.test_author}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {t.test_category && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded">{t.test_category}</span>
                      )}
                      {t.cfp_code && (
                        <span className="text-xs text-gray-400">{t.cfp_code}</span>
                      )}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    t.approval_status === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {t.approval_status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {t.approval_status === 'active' ? 'Ativo' : 'Expirado'}
                  </span>
                </div>
                {t.expiry_date && (
                  <p className="text-xs text-gray-400 mt-1">
                    Validade: {new Date(t.expiry_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Disorder detail view
  if (view === 'disorder-detail' && selectedDisorder) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          onClick={() => {
            setView('browse');
            setSelectedDisorder(null);
            setShowDiagnoseForm(false);
            setSavedDiagnosis(null);
          }}
          className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> Voltar
        </button>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-xs text-indigo-400 font-mono">{selectedDisorder.icd_code}</span>
              <h3 className="text-gray-900 font-semibold mt-0.5">{selectedDisorder.disorder_name}</h3>
              {selectedDisorder.category && (
                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded mt-1 inline-block">{selectedDisorder.category}</span>
              )}
              {selectedDisorder.description && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{selectedDisorder.description}</p>
              )}
            </div>
          </div>
          {selectedDisorder.symptom_keywords && selectedDisorder.symptom_keywords.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Palavras-chave de sintomas
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedDisorder.symptom_keywords.map((kw) => (
                  <span key={kw} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Task 7 — Diagnose button / form */}
        {patientId && !showDiagnoseForm && !savedDiagnosis && (
          <button
            onClick={() => setShowDiagnoseForm(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Stethoscope className="w-4 h-4" />
            Diagnosticar este Paciente
          </button>
        )}

        {showDiagnoseForm && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3 animate-fade-in">
            <p className="text-sm font-semibold text-indigo-800">
              Registrar Diagnóstico — {selectedDisorder?.icd_code}
            </p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data do diagnóstico</label>
              <input
                type="date"
                value={diagDate}
                onChange={e => setDiagDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Grau de certeza</label>
              <div className="flex gap-4">
                {(['suspected', 'confirmed'] as const).map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="certainty"
                      value={opt}
                      checked={diagCertainty === opt}
                      onChange={() => setDiagCertainty(opt)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">
                      {opt === 'suspected' ? 'Suspeita' : 'Confirmado'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observação (opcional)</label>
              <textarea
                value={diagNotes}
                onChange={e => setDiagNotes(e.target.value)}
                placeholder="Observações clínicas..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiagnoseForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterDiagnosis}
                disabled={diagSaving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {diagSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Registrar e continuar →
              </button>
            </div>
          </div>
        )}

        {/* Task 7 — Post-diagnosis panel */}
        {savedDiagnosis && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Diagnóstico {savedDiagnosis.certainty === 'confirmed' ? 'confirmado' : 'suspeita'} registrado!
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Próximos passos</p>
            <NextStepBlock title="Nota clínica" icon={<FileText className="w-4 h-4" />}>
              <ClinicalNoteBlock
                patientId={patientId!}
                diagnosis={savedDiagnosis}
                onNoteCreated={(noteId) => {
                  diagnosesApi.update(patientId!, savedDiagnosis.id, { clinical_note_id: noteId });
                }}
              />
            </NextStepBlock>
            <NextStepBlock title={`Testes sugeridos${suggestedTests.length > 0 ? ` (${suggestedTests.length})` : ''}`} icon={<ClipboardList className="w-4 h-4" />}>
              {loadingTests ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : suggestedTests.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Nenhum teste mapeado para este transtorno.</p>
              ) : (
                <div className="space-y-2">
                  {suggestedTests.map(t => (
                    <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{t.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {t.category && <span className="text-xs text-gray-400">{t.category}</span>}
                            <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded">
                              Relevância: {Math.round(t.relevance_score * 100)}%
                            </span>
                            {t.satepsi_status && (
                              <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                t.satepsi_status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {t.satepsi_status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                SATEPSI {t.satepsi_status === 'active' ? 'Ativo' : 'Inativo'}
                              </span>
                            )}
                          </div>
                          {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
                        </div>
                        {patientId && onAssignTest && (
                          <button
                            onClick={() => handleAssignTest(t.id)}
                            disabled={assigning === t.id}
                            className="flex-shrink-0 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {assigning === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Atribuir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </NextStepBlock>
            <NextStepBlock title="Conduta / Tratamento" icon={<Brain className="w-4 h-4" />}>
              <ConductBlock
                diagnosisId={savedDiagnosis.id}
                patientId={patientId!}
                initialNotes={savedDiagnosis.notes || ''}
              />
            </NextStepBlock>
          </div>
        )}

        {/* Suggested Tests */}
        <h4 className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-indigo-400" /> Testes Sugeridos
        </h4>

        {loadingTests ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
        ) : suggestedTests.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhum teste mapeado para este transtorno.</p>
        ) : (
          <div className="space-y-2">
            {suggestedTests.map((t) => (
              <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 text-sm font-medium">{t.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {t.category && <span className="text-xs text-gray-400">{t.category}</span>}
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                        Relevância: {Math.round(t.relevance_score * 100)}%
                      </span>
                      {t.satepsi_status && (
                        <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                          t.satepsi_status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {t.satepsi_status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          SATEPSI {t.satepsi_status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </div>
                    {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
                  </div>
                  {patientId && onAssignTest && (
                    <button
                      onClick={() => handleAssignTest(t.id)}
                      disabled={assigning === t.id}
                      className="flex-shrink-0 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 ml-2 transition-colors"
                    >
                      {assigning === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Atribuir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">{disclaimer}</p>
          </div>
        )}
      </div>
    );
  }

  // Symptom search view
  if (view === 'symptom-search') {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setView('browse')} className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar
        </button>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Sugestão por Sintomas
        </h3>
        <p className="text-xs text-gray-400">
          Digite sintomas separados por vírgula. O sistema sugerirá áreas diagnósticas relevantes.
        </p>
        <div className="flex gap-2">
          <input
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSymptomSearch()}
            placeholder="Ex: insônia, fadiga, tristeza, concentração..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={handleSymptomSearch}
            disabled={loadingSymptoms || !symptomInput.trim()}
            className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm disabled:opacity-40"
          >
            {loadingSymptoms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {symptomSuggestions.length > 0 && (
          <div className="space-y-2">
            {symptomSuggestions.map((d) => (
              <button
                key={d.id}
                onClick={() => handleSelectDisorder(d)}
                className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-indigo-400 font-mono">{d.icd_code}</span>
                    <h4 className="text-gray-900 text-sm font-medium">{d.disorder_name}</h4>
                    {d.category && <span className="text-xs text-gray-400">{d.category}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                      {d.match_count} sintoma(s)
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {disclaimer && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">{disclaimer}</p>
          </div>
        )}
      </div>
    );
  }

  // Browse view (default)
  const displayDisorders = searchMode === 'symptom' ? symptomResults : disorders;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Referência CID-11
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setView('symptom-search')}
            className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" /> Por Sintomas
          </button>
          <button
            onClick={handleLoadSatepsi}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <ShieldCheck className="w-3 h-3" /> SATEPSI
          </button>
        </div>
      </div>

      {/* Task 6a — Recent ICDs carousel */}
      {recentIcds.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Usados recentemente</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentIcds.map(r => (
              <button
                key={r.icd_code}
                onClick={() => handleSelectByCode(r.icd_code)}
                className="flex-shrink-0 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-1.5 text-left transition-colors"
              >
                <p className="text-xs font-bold text-indigo-700">{r.icd_code}</p>
                <p className="text-xs text-gray-500 max-w-[120px] truncate">{r.icd_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task 8 — Patient diagnoses history */}
      {patientDiagnoses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Diagnósticos deste Paciente
          </p>
          <div className="space-y-1.5">
            {patientDiagnoses.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    d.certainty === 'confirmed'
                      ? 'bg-indigo-600 text-white'
                      : 'border-2 border-dashed border-indigo-400 text-indigo-700'
                  }`}>
                    {d.certainty === 'suspected' ? '? ' : ''}{d.icd_code}
                  </span>
                  <span className="text-sm text-gray-700 truncate">{d.icd_name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(d.diagnosis_date).toLocaleDateString('pt-BR')}
                  </span>
                  {d.certainty === 'suspected' && d.professional_id === currentProfessionalId && (
                    <button
                      onClick={() => handleUpgradeCertainty(d)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar transtorno ou descreva sintomas..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
        />
        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); }}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-indigo-400 max-w-[200px]"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-sm"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {searchMode === 'symptom' && search.trim().length > 10 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Buscando por sintomas...
        </p>
      )}

      {/* Disorders list */}
      {displayDisorders.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Nenhum transtorno encontrado. Execute o seed de dados CID-11.</p>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {displayDisorders.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSelectDisorder(d)}
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3.5 text-left transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-indigo-400 font-mono flex-shrink-0">{d.icd_code}</span>
                    <span className="text-gray-900 text-sm font-medium">{d.disorder_name}</span>
                    {diagnosesForPatient?.some(diag => diag.icd_code === d.icd_code && diag.is_active) && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                        Diagnosticado
                      </span>
                    )}
                  </div>
                  {d.category && (
                    <span className="text-xs text-gray-400 mt-0.5 block">{d.category}</span>
                  )}
                  {d.description && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{d.description}</p>
                  )}
                  {d.symptom_keywords && d.symptom_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.symptom_keywords.slice(0, 5).map(kw => (
                        <span key={kw} className="text-xs bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                      {d.symptom_keywords.length > 5 && (
                        <span className="text-xs text-gray-400">+{d.symptom_keywords.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Clinical disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Resultados de testes e insights de IA são ferramentas de apoio clínico e não substituem o julgamento profissional.
          O sistema NÃO gera diagnósticos automaticamente — apenas sugere áreas diagnósticas relevantes.
        </p>
      </div>
    </div>
  );
}
