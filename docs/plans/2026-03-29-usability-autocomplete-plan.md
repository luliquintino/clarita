# Usabilidade — Autocomplete & Velocidade no Uso Diário

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce daily-use friction for both patients and professionals with inline search, autocomplete, and smarter defaults — no full redesign, only surgical changes.

**Architecture:** Shared `Combobox` component used by medication and ICD autocomplete. All other changes are isolated edits to existing components. One new API helper function added to `api.ts`. Backend already has `?search=` on `GET /api/medications`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, existing `api.ts` helpers

---

### Task 1: Shared `Combobox` Component

**Files:**
- Create: `dashboard/src/components/Combobox.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

export interface ComboboxOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ComboboxOption) => void;
  options: ComboboxOption[];
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  minChars?: number;
  className?: string;
  disabled?: boolean;
}

export default function Combobox({
  value,
  onChange,
  onSelect,
  options,
  onSearch,
  loading = false,
  placeholder = 'Buscar...',
  minChars = 3,
  className = '',
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      onChange(q);
      setHighlighted(0);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.length >= minChars) {
        debounceRef.current = setTimeout(() => {
          onSearch(q);
          setOpen(true);
        }, 300);
      } else {
        setOpen(false);
      }
    },
    [onChange, onSearch, minChars]
  );

  const handleSelect = (item: ComboboxOption) => {
    onSelect(item);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlighted]) handleSelect(options[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= minChars && options.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field w-full pr-8"
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-4 text-sm text-gray-400 gap-2">
              <Loader2 size={14} className="animate-spin" /> Buscando...
            </div>
          )}
          {!loading && options.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">Nenhum resultado encontrado</p>
          )}
          {!loading &&
            options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 flex flex-col transition-colors ${
                  i === highlighted ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.subtitle && <span className="text-xs text-gray-400">{opt.subtitle}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors

**Step 3: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/Combobox.tsx
git commit -m "feat: add shared Combobox component for autocomplete"
```

---

### Task 2: Busca Inline de Sintomas

**Files:**
- Modify: `dashboard/src/components/ReportSymptomModal.tsx`

**Context:** Currently shows ~30+ symptoms as a flat grouped grid — user must scroll to find what they need. Also, `reset()` clears everything on close but we want to remember recently used symptoms.

**Step 1: Add search state and recent symptoms logic**

In `ReportSymptomModal.tsx`:

a) Add import for `Search` from lucide-react (add to existing import line):
```tsx
import { X, Loader2, AlertCircle, Check, Search } from 'lucide-react';
```

b) Add state after the existing state declarations (after line 22, before `useEffect`):
```tsx
const [search, setSearch] = useState('');
```

c) Add helper functions before the `return` statement (after the `count` variable on line 106):
```tsx
function getRecentIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('clarita_recent_symptoms') ?? '[]');
  } catch {
    return [];
  }
}

function saveRecentIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('clarita_recent_symptoms', JSON.stringify(ids));
}
```

d) Update `reset()` to also clear search:
```tsx
const reset = () => {
  setSelectedIds(new Set());
  setSeverity(5);
  setNotes('');
  setReportedAt(format(new Date(), 'yyyy-MM-dd'));
  setError('');
  setSearch('');
};
```

e) Update `handleSubmit` — after `reset()` and before `onCreated()`, save recent symptom IDs:
```tsx
// Save recent symptom IDs (keep last 5)
const recent = getRecentIds();
const submitted = Array.from(selectedIds);
const updated = [...submitted, ...recent.filter((id) => !submitted.includes(id))].slice(0, 5);
saveRecentIds(updated);
reset();
onCreated();
onClose();
```

f) Replace the `grouped` computation and rendering with filtered + sorted version.

Replace from line 89 to line 104 (the `grouped` and `categoryLabels` blocks) with:

```tsx
const recentIds = getRecentIds();

// Sort: recent first, then alphabetical within each group
const sortedSymptoms = [...symptoms].sort((a, b) => {
  const aRecent = recentIds.indexOf(a.id);
  const bRecent = recentIds.indexOf(b.id);
  if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
  if (aRecent !== -1) return -1;
  if (bRecent !== -1) return 1;
  return a.name.localeCompare(b.name);
});

const filtered = search.trim()
  ? sortedSymptoms.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase())
    )
  : sortedSymptoms;

const grouped = filtered.reduce<Record<string, Symptom[]>>((acc, s) => {
  const cat = search.trim() ? 'results' : (s.category ?? 'Outros');
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(s);
  return acc;
}, {});

const categoryLabels: Record<string, string> = {
  results: 'Resultados',
  mood: 'Humor',
  anxiety: 'Ansiedade',
  sleep: 'Sono',
  cognitive: 'Cognitivo',
  physical: 'Físico',
  behavioral: 'Comportamento',
  Outros: 'Outros',
};

const count = selectedIds.size;
```

g) Add search input to JSX — inside the `<div>` for "Sintomas" section (after the `<p>` label tag on line 141, before the loading check):

```tsx
{/* Search input */}
<div className="relative mb-3">
  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Buscar sintoma..."
    className="input-field w-full pl-8 py-2 text-sm"
    disabled={saving}
  />
</div>
```

**Step 2: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors

**Step 3: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/ReportSymptomModal.tsx
git commit -m "feat: add inline search and recent symptoms to ReportSymptomModal"
```

---

### Task 3: Catálogo de Medicamentos + Autocomplete na Prescrição

**Files:**
- Modify: `dashboard/src/lib/api.ts`
- Modify: `dashboard/src/components/MedicationManager.tsx`

**Context:** `GET /api/medications` already supports `?search=` (verified in backend). The `medicationsApi` in `api.ts` only covers patient medications (prescriptions). We need a new catalog search function.

**Step 1: Add `medicationCatalogApi` to `api.ts`**

Find the `medicationsApi` block (around line 706). Add a new export right after its closing `};`:

```ts
export const medicationCatalogApi = {
  search: (query: string) =>
    request<{ medications: { id: string; name: string; category: string }[] }>(
      `/medications?search=${encodeURIComponent(query)}&limit=10`
    ),
};
```

**Step 2: Update `MedicationManager.tsx` to use Combobox**

a) Add imports at the top:
```tsx
import Combobox, { type ComboboxOption } from '@/components/Combobox';
import { medicationCatalogApi } from '@/lib/api';
```

b) Add state for autocomplete options and loading (after the existing state declarations, around line 91):
```tsx
const [medOptions, setMedOptions] = useState<ComboboxOption[]>([]);
const [medSearching, setMedSearching] = useState(false);
```

c) Add search handler (after `resetAdjustForm` function, around line 115):
```tsx
const handleMedSearch = async (query: string) => {
  if (!query.trim()) return;
  setMedSearching(true);
  try {
    const data = await medicationCatalogApi.search(query);
    setMedOptions(
      data.medications.map((m) => ({
        label: m.name,
        value: m.name,
        subtitle: m.category,
      }))
    );
  } catch {
    setMedOptions([]);
  } finally {
    setMedSearching(false);
  }
};
```

d) Replace the "Nome do Medicamento" input (lines 246-256) with:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Nome do Medicamento
  </label>
  <Combobox
    value={medName}
    onChange={setMedName}
    onSelect={(item) => setMedName(item.value)}
    options={medOptions}
    onSearch={handleMedSearch}
    loading={medSearching}
    placeholder="ex.: Sertralina"
    minChars={3}
    disabled={saving}
  />
</div>
```

e) In `resetPrescribeForm`, reset options too:
```tsx
const resetPrescribeForm = () => {
  setMedName('');
  setMedDosage('');
  setMedFrequency('');
  setMedNotes('');
  setMedOptions([]);
  setShowPrescribeForm(false);
};
```

**Step 3: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors

**Step 4: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/lib/api.ts dashboard/src/components/MedicationManager.tsx
git commit -m "feat: add medication catalog autocomplete to prescription form"
```

---

### Task 4: ICD Inline no Diagnóstico

**Files:**
- Modify: `dashboard/src/components/DiagnosticBrowserPanel.tsx`

**Context:** Currently, creating a diagnosis requires: browse → click disorder → disorder detail → click "Diagnosticar" button → fill form. We add a "quick diagnosis" form at the top of the browse view with ICD autocomplete, so professionals can go directly from search to diagnosis without navigating to the detail view.

**Step 1: Add state for quick-diagnose form**

In `DiagnosticBrowserPanel.tsx`, in the state declarations section (around line 195), add:
```tsx
// Quick-diagnose form
const [showQuickDiagnose, setShowQuickDiagnose] = useState(false);
const [quickIcdValue, setQuickIcdValue] = useState('');
const [quickIcdOptions, setQuickIcdOptions] = useState<{ label: string; value: string; subtitle?: string }[]>([]);
const [quickIcdSearching, setQuickIcdSearching] = useState(false);
const [quickSelectedCode, setQuickSelectedCode] = useState('');
const [quickSelectedName, setQuickSelectedName] = useState('');
const [quickCertainty, setQuickCertainty] = useState<'suspected' | 'confirmed'>('suspected');
const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]);
const [quickNotes, setQuickNotes] = useState('');
const [quickSaving, setQuickSaving] = useState(false);
```

**Step 2: Add ICD search handler and submit handler**

Add these functions before the `if (loading && view === 'browse')` check (around line 407):

```tsx
async function handleQuickIcdSearch(query: string) {
  setQuickIcdSearching(true);
  try {
    const data = await icd11Api.list({ search: query });
    setQuickIcdOptions(
      (data.disorders || []).slice(0, 10).map((d) => ({
        label: d.disorder_name,
        value: d.icd_code,
        subtitle: d.icd_code,
      }))
    );
  } catch {
    setQuickIcdOptions([]);
  } finally {
    setQuickIcdSearching(false);
  }
}

async function handleQuickDiagnosis() {
  if (!quickSelectedCode || !patientId) return;
  setQuickSaving(true);
  try {
    const data = await diagnosesApi.create(patientId, {
      icd_code: quickSelectedCode,
      icd_name: quickSelectedName,
      certainty: quickCertainty,
      diagnosis_date: quickDate,
      notes: quickNotes || undefined,
    });
    setPatientDiagnoses((prev) => [data.diagnosis, ...prev]);
    onDiagnosisCreated?.(data.diagnosis);
    setShowQuickDiagnose(false);
    setQuickIcdValue('');
    setQuickSelectedCode('');
    setQuickSelectedName('');
    setQuickNotes('');
    setQuickCertainty('suspected');
    icd11Api.recent().then((d) => setRecentIcds(d.recent)).catch(() => {});
  } catch {
    // silent
  } finally {
    setQuickSaving(false);
  }
}
```

**Step 3: Add Combobox import**

At the top of `DiagnosticBrowserPanel.tsx`, add to imports:
```tsx
import Combobox from '@/components/Combobox';
```

**Step 4: Add quick-diagnose form to browse view JSX**

In the browse view JSX (the section with `view === 'browse'`), find the search bar section (around line 490 where there's a search input). Add the quick-diagnose toggle button and form right after the existing `recentIcds` carousel block and before the main disorders list.

Find where the main `<div className="space-y-4...">` or `<div className="grid...">` of disorder cards begins. Insert before it:

```tsx
{/* Quick Diagnose */}
{patientId && (
  <div className="border border-indigo-200 rounded-xl overflow-hidden">
    <button
      onClick={() => setShowQuickDiagnose((v) => !v)}
      className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
        <Stethoscope className="w-4 h-4" /> Diagnosticar diretamente por CID
      </span>
      <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${showQuickDiagnose ? 'rotate-180' : ''}`} />
    </button>
    {showQuickDiagnose && (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Código ou nome CID-11</label>
          <Combobox
            value={quickIcdValue}
            onChange={setQuickIcdValue}
            onSelect={(item) => {
              setQuickIcdValue(item.label);
              setQuickSelectedCode(item.value);
              setQuickSelectedName(item.label);
            }}
            options={quickIcdOptions}
            onSearch={handleQuickIcdSearch}
            loading={quickIcdSearching}
            placeholder="ex.: ansiedade, F41.1..."
            minChars={2}
          />
        </div>
        {quickSelectedCode && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Certeza</label>
              <select
                value={quickCertainty}
                onChange={(e) => setQuickCertainty(e.target.value as 'suspected' | 'confirmed')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="suspected">Suspeita</option>
                <option value="confirmed">Confirmado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Data</label>
              <input
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        )}
        {quickSelectedCode && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas (opcional)</label>
              <textarea
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                rows={2}
                placeholder="Observações clínicas..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:border-indigo-400 placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleQuickDiagnosis}
              disabled={quickSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {quickSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {quickSaving ? 'Salvando...' : `Registrar ${quickCertainty === 'confirmed' ? 'diagnóstico' : 'suspeita'}`}
            </button>
          </>
        )}
      </div>
    )}
  </div>
)}
```

**Step 5: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors

**Step 6: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/DiagnosticBrowserPanel.tsx
git commit -m "feat: add inline ICD autocomplete to diagnostic browser"
```

---

### Task 5: Título Auto-Gerado nas Notas Clínicas

**Files:**
- Modify: `dashboard/src/components/ClinicalNotes.tsx`

**Context:** The component has `formType` (initialized `'session'`) and `formTitle` (initialized `''`). When creating a new note, the type selector is shown. We want to auto-fill the title when the type changes, unless the user has already typed their own title.

**Step 1: Add `isTitleAutoFilled` state**

After the existing state declarations (around line 84), add:
```tsx
const [isTitleAutoFilled, setIsTitleAutoFilled] = useState(false);
```

**Step 2: Add `typeLabels` map and auto-fill helper**

Add before the `resetForm` function (around line 86):
```tsx
const typeLabels: Record<string, string> = {
  session: 'Sessão',
  observation: 'Observação',
  treatment_plan: 'Plano de Tratamento',
  progress: 'Nota de Progresso',
};

function autoFillTitle(type: string) {
  const label = typeLabels[type] ?? type;
  const dateStr = format(new Date(), 'dd/MM/yyyy');
  setFormTitle(`${label} — ${dateStr}`);
  setIsTitleAutoFilled(true);
}
```

**Step 3: Call `autoFillTitle` when `isCreating` is set to true**

Update the "Nova Nota" button handler. Find where `setIsCreating(true)` is called (in the JSX, where the `+` button is). Add an effect: after `setIsCreating(true)`, call `autoFillTitle(formType)`.

Replace the button's `onClick`:
```tsx
onClick={() => {
  setIsCreating(true);
  setEditingId(null);
  autoFillTitle(formType);
}}
```

**Step 4: Handle type change — auto-fill only if not manually edited**

Find the type selector buttons in the form JSX (where the note types are rendered as clickable buttons). Each type button currently calls `setFormType(type)`. Update each to also auto-fill title:

```tsx
onClick={() => {
  setFormType(type);
  if (isTitleAutoFilled || !formTitle.trim()) {
    autoFillTitle(type);
  }
}}
```

**Step 5: Handle manual title edit — stop auto-fill**

Find the title `<input>` in the form (where `formTitle` is bound). Update its `onChange`:
```tsx
onChange={(e) => {
  setFormTitle(e.target.value);
  setIsTitleAutoFilled(false);
}}
```

**Step 6: Reset `isTitleAutoFilled` in `resetForm`**

```tsx
const resetForm = () => {
  setFormType('session');
  setFormTitle('');
  setFormContent('');
  setIsTitleAutoFilled(false);
  setIsCreating(false);
  setEditingId(null);
};
```

**Step 7: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors

**Step 8: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/ClinicalNotes.tsx
git commit -m "feat: auto-fill clinical note title on type selection"
```

---

### Task 6: Pre-fill de Medicações no Check-in

**Files:**
- Modify: `dashboard/src/components/JournalEntry.tsx`

**Context:** Currently `medAnswers` is `Record<string, boolean>` initialized as `{}`. Patient must click "Sim" for each medication. Most patients take all medications daily — invert the default.

**Step 1: Change `medAnswers` initialization**

Find line 85:
```tsx
const [medAnswers, setMedAnswers] = useState<Record<string, boolean>>({});
```

Replace with:
```tsx
const [medAnswers, setMedAnswers] = useState<Record<string, boolean>>(
  () => Object.fromEntries((medications ?? []).map((m) => [m.id, true]))
);
```

**Step 2: Update the medication section label**

Find line 183 (the "Você tomou sua medicação hoje?" label):
```tsx
<p className="text-sm font-medium text-gray-700">Você tomou sua medicação hoje?</p>
```

Replace with:
```tsx
<p className="text-sm font-medium text-gray-700">Medicações de hoje <span className="text-xs text-gray-400 font-normal">(desmarque o que não tomou)</span></p>
```

**Step 3: Verify the `handleSubmit` logic is still correct**

Check lines 91-94 — the medication_logs mapping:
```tsx
const medication_logs = Object.entries(medAnswers).map(([id, taken]) => ({
  patient_medication_id: id,
  skipped: !taken,
}));
```
This is already correct — `taken: true` → `skipped: false`, `taken: false` → `skipped: true`. No change needed.

**Step 4: Reset medAnswers on submit to defaults, not empty**

Find in `handleSubmit`, the line `setMedAnswers({});` (around line 106). Replace with:
```tsx
setMedAnswers(Object.fromEntries((medications ?? []).map((m) => [m.id, true])));
```

**Step 5: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors

**Step 6: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/JournalEntry.tsx
git commit -m "feat: pre-fill medications as taken in daily check-in"
```

---

### Task 7: Final Verification

**Step 1: TypeScript zero errors**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1
```
Expected: no output

**Step 2: Manual verification checklist**

- **Sintomas:** Abrir modal de sintomas → digitar "dor" → grid filtra instantaneamente; submeter → reabrir → sintomas recentes aparecem primeiro
- **Medicamentos:** Abrir formulário de prescrição → digitar "ser" (3+ chars) → dropdown mostra "Sertralina", "Sertralina 50mg" etc.
- **ICD:** Abrir painel de diagnóstico → expandir "Diagnosticar diretamente por CID" → digitar "ansi" → dropdown mostra transtornos de ansiedade; selecionar → certeza + data aparecem → salvar
- **Título:** Criar nova nota → ao abrir o form, título já está preenchido como "Sessão — 29/03/2026"; mudar tipo para "Observação" → título muda; editar título manualmente → mudar tipo → título não muda
- **Medicações:** Abrir check-in com medicações ativas → todos os botões "Sim" já estão selecionados; clicar "Não" em uma → ao enviar, apenas essa aparece como `skipped: true`

**Step 3: Git log**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git log --oneline -8
```
Expected: all 7 commits present

**Step 4: Push**

```bash
git push origin main
```
