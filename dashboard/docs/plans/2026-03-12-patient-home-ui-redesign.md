# Patient Home UI Redesign — Design Document

## Changes

Four UI/UX improvements to the patient home:

1. **Sidebar navigation** — vertical left sidebar on desktop, icon tab bar on mobile
2. **Medication integrated into check-in** — single submit for journal + meds
3. **History chart** — area chart + averages summary using recharts
4. **Anamnesis redesign** — collapsible sections with visual hierarchy

---

## 1. Navigation

### SideNav (new component, desktop only)

- Fixed left, `w-56`, full screen height
- Clarita logo + user first name at top
- 7 vertical nav items: icon + label + badge count (same items as BottomNav)
- Active item: soft `clarita-green` background, darker text
- Logout button pinned to bottom
- Hidden on mobile: `hidden md:flex md:flex-col`

### BottomNav (mobile, unchanged)

- Remains as-is
- Visible on mobile only: `md:hidden`

### Layout changes in `patient-home/page.tsx`

- Root div: `md:flex md:flex-row`
- Main content column: `md:ml-56 md:flex-1`
- Header (`sticky top-0`): visible on mobile (`md:hidden`); on desktop, logo/user info live in SideNav

---

## 2. Medication Integrated into Check-in

### JournalEntry props extension

```ts
// New optional props
medications?: PatientMedication[]
onSubmit: (data: {
  mood_score: number;
  anxiety_score: number;
  energy_score: number;
  sleep_hours?: number;
  journal_entry?: string;
  medication_logs?: Array<{ patient_medication_id: string; skipped: boolean }>;
}) => Promise<void>
```

### Visual

- After existing sliders + textarea: new section "Você tomou sua medicação hoje?"
- Per-medication Sim/Não buttons (same UI as former MedicationCheckCard)
- Local state: `medicationAnswers: Record<string, boolean>`
- If `medications.length === 0`: section does not render
- Single "Registrar check-in" submit button handles everything

### patient-home/page.tsx changes

- `handleJournalSubmit` calls `journalApi.create(data)` + `Promise.all(medication_logs.map(...))` in parallel
- `medications` prop passed from page state (already loaded)
- `MedicationCheckCard` removed from layout (replaced by JournalEntry section)

---

## 3. History Chart

### Library

`recharts` — `npm install recharts`

### Layout

1. **Period selector** — pill buttons: `7 dias | 30 dias | 90 dias`
2. **Area chart card** — 3 series (mood, anxiety, energy), X: date, Y: 0–10, hover tooltip
3. **Averages summary card** — 3 stat boxes: mood avg / anxiety avg / energy avg, with trend vs previous period (↑ ↓ →)
4. **Existing journal entry list** — unchanged below

### Data

- Uses existing `journalApi.list({ limit: 90 })` data already in state
- Period filtering done client-side (no new backend route)

---

## 4. Anamnesis Redesign

### Structure

- Replace flat layout with **collapsible accordion sections** by category:
  - Histórico Médico, Medicamentos, Saúde Mental, Estilo de Vida, Histórico Familiar
- Each section header: colored icon + title + filled fields badge
- Inner content: grid of label/value cards (`text-xs` gray label / `text-sm` dark value)
- Empty fields show `—` in light gray (not hidden)

### Visual

- Icon per category (Heart, Pill, Brain, Activity, Users from lucide-react)
- All fields filled → green `Completo` badge
- Missing fields → amber `X campos pendentes` badge

### Behavior

- First section open by default
- Open/close state local (no persistence)
- No backend changes — UI only

---

## Files Affected

| File | Change |
|---|---|
| `src/components/SideNav.tsx` | Create new |
| `src/components/BottomNav.tsx` | Add `md:hidden` wrapper |
| `src/components/JournalEntry.tsx` | Add `medications` prop + medication section |
| `src/components/MedicationCheckCard.tsx` | Delete (logic moved into JournalEntry) |
| `src/components/JournalHistory.tsx` | Wrap chart above existing list |
| `src/components/HistoryChart.tsx` | Create new (recharts area chart + averages) |
| `src/components/AnamnesisPanel.tsx` | Redesign with accordions |
| `src/app/patient-home/page.tsx` | Layout: sidebar + pass medications to JournalEntry |
