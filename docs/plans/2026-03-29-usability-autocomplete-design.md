# Design: Usabilidade — Autocomplete & Velocidade no Uso Diário

**Date:** 2026-03-29
**Status:** Approved

## Context

Audit of daily-use friction in Clarita identified five high-impact, low-risk improvements targeting both patient and professional flows. Goal: fewer steps, no unnecessary repetition, autocomplete where data is already available.

---

## Scope

Five surgical changes — mostly frontend, minimal backend.

| # | Feature | Who | Backend change |
|---|---|---|---|
| 1 | Busca inline de sintomas | Paciente | None |
| 2 | Autocomplete de medicamentos | Profissional | `?search=` param on GET /api/medications |
| 3 | ICD inline no formulário de diagnóstico | Profissional | None (icd11Api.search already exists) |
| 4 | Título auto-gerado nas notas clínicas | Profissional | None |
| 5 | Pre-fill de medicações no check-in | Paciente | None |

---

## Section 1 — Shared `Combobox` Component

**File:** `dashboard/src/components/Combobox.tsx` (new)

Reusable controlled combobox used by features #2 and #3.

**Props:**
```ts
interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: { label: string; value: string; subtitle?: string }) => void;
  options: { label: string; value: string; subtitle?: string }[];
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  minChars?: number; // default 3
}
```

**Behavior:**
- Renders a text `<input>` + dropdown list
- Calls `onSearch` debounced 300ms when `value.length >= minChars`
- Dropdown closes on selection or Escape
- Keyboard nav: Arrow Up/Down to move, Enter to select
- "Nenhum resultado" empty state when `options.length === 0 && !loading`
- Clicking outside closes dropdown (`useEffect` with `mousedown` listener)

---

## Section 2 — Busca Inline de Sintomas

**File:** `dashboard/src/components/ReportSymptomModal.tsx` (modify)

**Problem:** Modal loads all symptoms (~30+) as a flat grid. User must scroll to find their symptom.

**Solution:**
- Add `const [search, setSearch] = useState('')`
- Add `<input placeholder="Buscar sintoma..." value={search} onChange={e => setSearch(e.target.value)} />` above the symptom grid
- Filter: `const filtered = symptoms.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))`
- **Recent symptoms:** store last 3 reported symptom IDs in `localStorage` key `clarita_recent_symptoms`. Sort: recent first, then alphabetical.
- Load recent IDs on modal open; update after successful submit.

No backend change. No new API calls.

---

## Section 3 — Autocomplete de Medicamentos

**Files:**
- `dashboard/src/components/MedicationManager.tsx` (modify)
- `backend/src/routes/medications.js` (modify — add `?search=` param)

**Problem:** Prescription form has a plain text input for medication name — professional types freely, no validation or suggestions.

**Backend change:**
In `GET /api/medications`, add optional `search` query param:
```sql
WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
ORDER BY name
LIMIT 10
```

**Frontend change:**
Replace `<input type="text" name="name">` in the prescribe form with `<Combobox>`:
- `onSearch(q)` → calls `medicationsApi.list({ search: q })`
- `options` → `medications.map(m => ({ label: m.name, value: m.name, subtitle: m.category }))`
- `onSelect(item)` → sets `form.name = item.value`
- Free-text entry still allowed (user can type a name not in the catalog)

---

## Section 4 — ICD Inline no Diagnóstico

**File:** `dashboard/src/components/DiagnosticBrowserPanel.tsx` (modify)

**Problem:** To create a diagnosis, professional navigates to the browser panel, searches by category or text, then fills a separate form. Two-step context switch.

**Solution:**
In the "Novo Diagnóstico" form within `DiagnosticBrowserPanel`, replace the plain `icd_code` + `icd_name` text inputs with a `<Combobox>`:
- `onSearch(q)` → calls `icd11Api.search(q)` (already exists, returns `ICD11Disorder[]`)
- `options` → `results.map(d => ({ label: d.title, value: d.code, subtitle: d.code }))`
- `onSelect(item)` → sets `form.icd_code = item.value` and `form.icd_name = item.label`

The browse panel (navigate by category) remains accessible as a secondary path — no removal.

No backend change.

---

## Section 5 — Título Auto-Gerado nas Notas Clínicas

**File:** `dashboard/src/components/ClinicalNotes.tsx` (modify)

**Problem:** Professional must type the note title manually on every session note.

**Solution:**
When the note type selector changes, auto-fill the title field:
```ts
const typeLabels: Record<string, string> = {
  session: 'Sessão',
  observation: 'Observação',
  treatment_plan: 'Plano de Tratamento',
  progress: 'Evolução',
};

// On type change:
setTitle(`${typeLabels[newType]} — ${format(new Date(), 'dd/MM/yyyy')}`);
```

- Only auto-fills when the title is **empty or was auto-generated** (track with `isTitleAutoFilled` boolean state)
- If the professional has manually edited the title, do not overwrite on type change
- No backend change

---

## Section 6 — Pre-fill de Medicações no Check-in

**File:** `dashboard/src/components/JournalEntry.tsx` (modify)

**Problem:** Medication check section starts with all checkboxes unchecked — patient must actively mark each medication taken. Most days they take all medications.

**Solution:**
Change default state: initialize `medicationLogs` with all active medications pre-set to `skipped: false`:
```ts
const [medicationLogs, setMedicationLogs] = useState<MedLog[]>(
  (medications ?? []).map(m => ({ patient_medication_id: m.id, skipped: false }))
);
```

- UI label changes from "Marque o que tomou" → "Desmarque o que pulou"
- Checkboxes remain fully interactive
- No backend change

---

## Files to Modify

| File | Change |
|---|---|
| `dashboard/src/components/Combobox.tsx` | **NEW** — shared combobox component |
| `dashboard/src/components/ReportSymptomModal.tsx` | Add search filter + recent symptoms |
| `dashboard/src/components/MedicationManager.tsx` | Replace name input with Combobox |
| `dashboard/src/components/DiagnosticBrowserPanel.tsx` | Add ICD Combobox to diagnosis form |
| `dashboard/src/components/ClinicalNotes.tsx` | Auto-fill title on type change |
| `dashboard/src/components/JournalEntry.tsx` | Pre-fill medications as taken |
| `backend/src/routes/medications.js` | Add `?search=` filter param |

---

## Verification

1. **Sintomas:** Open ReportSymptomModal → type "dor" → grid filters instantly → most recent symptoms appear first
2. **Medicamentos:** Open prescription form → type "riv" → dropdown shows "Rivotril, Rivotril 0.5mg" etc.
3. **ICD:** Open new diagnosis form → type "ansied" → dropdown shows matching ICD-11 codes inline
4. **Título:** Create new note → select type "Sessão" → title auto-fills "Sessão — 29/03/2026" → editing title stops auto-fill
5. **Medicações:** Open check-in with active medications → all pre-checked → uncheck one → submit → only unchecked appears as `skipped: true`
6. **TypeScript:** `npx tsc --noEmit` → zero errors
