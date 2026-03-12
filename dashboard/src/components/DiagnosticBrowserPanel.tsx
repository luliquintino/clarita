'use client';

import { useState, useEffect } from 'react';
import {
  Search, BookOpen, FlaskConical, ShieldCheck, ShieldAlert,
  ChevronRight, Loader2, AlertTriangle, Tag, ArrowLeft,
  Sparkles, Send,
} from 'lucide-react';
import {
  icd11Api, satepsiApi, psychTestsApi,
  ICD11Disorder, ICDTestSuggestion, SatepsiTest,
} from '@/lib/api';

interface DiagnosticBrowserPanelProps {
  patientId?: string;
  onAssignTest?: (testId: string) => void;
}

type View = 'browse' | 'disorder-detail' | 'satepsi-list' | 'symptom-search';

export default function DiagnosticBrowserPanel({ patientId, onAssignTest }: DiagnosticBrowserPanelProps) {
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

  useEffect(() => {
    loadInitialData();
  }, []);

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

  async function handleSelectDisorder(disorder: ICD11Disorder) {
    setSelectedDisorder(disorder);
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
        <button onClick={() => { setView('browse'); setSelectedDisorder(null); }} className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
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
  const filteredDisorders = disorders;

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

      {/* Search and filter */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar transtorno..."
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
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Disorders list */}
      {filteredDisorders.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Nenhum transtorno encontrado. Execute o seed de dados CID-11.</p>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredDisorders.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSelectDisorder(d)}
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3.5 text-left transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-indigo-400 font-mono flex-shrink-0">{d.icd_code}</span>
                    <span className="text-gray-900 text-sm font-medium truncate">{d.disorder_name}</span>
                  </div>
                  {d.category && (
                    <span className="text-xs text-gray-400 mt-0.5 block">{d.category}</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
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
