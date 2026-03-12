# Patient Home UI V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the patient home with a desktop sidebar, integrated medication check-in, history chart, and redesigned anamnesis panel.

**Architecture:** SideNav (desktop, `hidden md:flex`) + BottomNav (mobile, `md:hidden`) share a single `NAV_ITEMS` constant. JournalEntry absorbs MedicationCheckCard. A new HistoryChart uses recharts above the existing JournalHistory list. AnamnesisPanel's patient view adopts the light theme with accordion Q&A.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, recharts, lucide-react, date-fns (already installed)

---

## Task 1: Install recharts

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install recharts**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm install recharts
```

Expected: `added N packages` with no errors.

**Step 2: Verify TypeScript recognizes recharts**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors (recharts ships its own types).

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for history chart"
```

---

## Task 2: Extract shared nav items + create SideNav

**Files:**
- Create: `src/components/nav-items.ts`
- Create: `src/components/SideNav.tsx`
- Modify: `src/components/BottomNav.tsx`

### Step 1: Create `src/components/nav-items.ts`

Extract the `NAV_ITEMS` array and `PatientSection` type so both BottomNav and SideNav share the same source:

```ts
import {
  Home,
  FileText,
  Pill,
  FlaskConical,
  ClipboardList,
  Target,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export type PatientSection =
  | 'home'
  | 'exams'
  | 'prescriptions'
  | 'tests'
  | 'anamnesis'
  | 'goals'
  | 'history';

export const NAV_ITEMS: Array<{
  key: PatientSection;
  label: string;
  icon: LucideIcon;
  color: string;
  activeColor: string;
  activeBg: string;
}> = [
  {
    key: 'home',
    label: 'Home',
    icon: Home,
    color: 'text-gray-400',
    activeColor: 'text-clarita-green-600',
    activeBg: 'bg-clarita-green-50 border-clarita-green-200',
  },
  {
    key: 'exams',
    label: 'Exames',
    icon: FileText,
    color: 'text-gray-400',
    activeColor: 'text-clarita-green-700',
    activeBg: 'bg-green-50 border-green-200',
  },
  {
    key: 'prescriptions',
    label: 'Prescrições',
    icon: Pill,
    color: 'text-gray-400',
    activeColor: 'text-indigo-600',
    activeBg: 'bg-indigo-50 border-indigo-200',
  },
  {
    key: 'tests',
    label: 'Testes',
    icon: FlaskConical,
    color: 'text-gray-400',
    activeColor: 'text-indigo-500',
    activeBg: 'bg-indigo-50 border-indigo-100',
  },
  {
    key: 'anamnesis',
    label: 'Anamnese',
    icon: ClipboardList,
    color: 'text-gray-400',
    activeColor: 'text-teal-600',
    activeBg: 'bg-teal-50 border-teal-200',
  },
  {
    key: 'goals',
    label: 'Metas',
    icon: Target,
    color: 'text-gray-400',
    activeColor: 'text-clarita-purple-600',
    activeBg: 'bg-purple-50 border-purple-200',
  },
  {
    key: 'history',
    label: 'Histórico',
    icon: BookOpen,
    color: 'text-gray-400',
    activeColor: 'text-blue-600',
    activeBg: 'bg-blue-50 border-blue-200',
  },
];
```

### Step 2: Create `src/components/SideNav.tsx`

```tsx
'use client';

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS, type PatientSection } from './nav-items';
import type { AuthUser } from '@/lib/api';

interface SideNavProps {
  user: AuthUser | null;
  active: PatientSection;
  onChange: (section: PatientSection) => void;
  badges?: Partial<Record<PatientSection, number>>;
  onLogout: () => void;
}

export default function SideNav({ user, active, onChange, badges = {}, onLogout }: SideNavProps) {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 z-30 glass border-r border-white/30">
      {/* Logo + user */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/20">
        <Image src="/logo-clarita.png" alt="Clarita" width={32} height={25} className="drop-shadow-sm flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {user?.first_name || 'Paciente'}
          </p>
          <p className="text-xs text-gray-400">Minha conta</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon, color, activeColor, activeBg }) => {
          const isActive = active === key;
          const badge = badges[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`
                relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 border text-left
                ${isActive
                  ? `${activeColor} ${activeBg} shadow-sm`
                  : `${color} bg-transparent border-transparent hover:bg-gray-50`
                }
              `}
            >
              <Icon size={18} className={isActive ? activeColor : color} />
              <span>{label}</span>
              {badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold bg-gradient-to-r from-clarita-purple-400 to-clarita-green-400 text-white rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/20 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all border border-transparent"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
```

### Step 3: Update `src/components/BottomNav.tsx`

Replace the current file contents. The only changes are: import `PatientSection` and `NAV_ITEMS` from `./nav-items` instead of defining them locally, and add `md:hidden` to the `<nav>` element.

```tsx
'use client';

import { NAV_ITEMS, type PatientSection } from './nav-items';

interface BottomNavProps {
  active: PatientSection;
  onChange: (section: PatientSection) => void;
  badges?: Partial<Record<PatientSection, number>>;
}

export default function BottomNav({ active, onChange, badges = {} }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/40 shadow-lg">
      <div
        className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon, color, activeColor, activeBg }) => {
          const isActive = active === key;
          const badge = badges[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`
                relative flex-shrink-0 flex flex-col items-center justify-center gap-0.5
                min-w-[64px] px-2 py-2 rounded-2xl text-[10px] font-medium
                transition-all duration-200 border
                ${isActive
                  ? `${activeColor} ${activeBg} shadow-sm`
                  : `${color} bg-transparent border-transparent`
                }
              `}
            >
              <Icon size={20} className={isActive ? activeColor : color} />
              <span>{label}</span>
              {badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-gradient-to-r from-clarita-purple-400 to-clarita-green-400 text-white rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

### Step 4: Update BottomNav import in `patient-home/page.tsx`

Find the current import:
```ts
import BottomNav, { type PatientSection } from '@/components/BottomNav';
```

Replace with:
```ts
import BottomNav from '@/components/BottomNav';
import { type PatientSection } from '@/components/nav-items';
```

### Step 5: Check TypeScript compiles

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

### Step 6: Commit

```bash
git add src/components/nav-items.ts src/components/SideNav.tsx src/components/BottomNav.tsx src/app/patient-home/page.tsx
git commit -m "feat: extract nav-items + add SideNav desktop component"
```

---

## Task 3: Update patient-home layout for sidebar

**Files:**
- Modify: `src/app/patient-home/page.tsx`

This task wires the SideNav into the page layout.

### Step 1: Add SideNav import

At the top of `patient-home/page.tsx`, add:
```ts
import SideNav from '@/components/SideNav';
```

### Step 2: Update the root `<div>` and header

**Current root return:**
```tsx
return (
  <div className="min-h-screen pb-24">
    {/* Header */}
    <header className="sticky top-0 z-30 glass rounded-none border-b border-white/30">
      ...
    </header>
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
```

**Replace with:**
```tsx
return (
  <div className="min-h-screen md:flex md:flex-row">
    {/* Desktop sidebar */}
    <SideNav
      user={user}
      active={activeSection}
      onChange={setActiveSection}
      badges={navBadges}
      onLogout={handleLogout}
    />

    {/* Page content */}
    <div className="flex-1 min-w-0 md:ml-56 pb-24 md:pb-8">
      {/* Mobile header only */}
      <header className="md:hidden sticky top-0 z-30 glass rounded-none border-b border-white/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-clarita.png"
              alt="Clarita"
              width={36}
              height={28}
              className="drop-shadow-sm"
            />
            <div>
              <h1 className="text-base font-semibold text-gray-800">
                Olá, {user?.first_name || 'Paciente'}!
              </h1>
              <p className="text-xs text-gray-400">Como você está hoje?</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.display_id && (
              <DisplayIdBadge displayId={user.display_id} size="sm" />
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
```

### Step 3: Close the new wrapper div

After the `</main>` and before the closing `</div>` of the original root, the structure becomes:

```tsx
      </main>

      {/* Mobile BottomNav */}
      <BottomNav
        active={activeSection}
        onChange={setActiveSection}
        badges={navBadges}
      />
    </div>
  </div>
);
```

Remove the `<BottomNav>` that was outside `<main>` — it is now inside the content wrapper.

### Step 4: Check TypeScript

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

### Step 5: Commit

```bash
git add src/app/patient-home/page.tsx
git commit -m "feat: integrate SideNav into patient-home layout"
```

---

## Task 4: Integrate medication check into JournalEntry

**Files:**
- Modify: `src/components/JournalEntry.tsx`
- Modify: `src/app/patient-home/page.tsx`

### Step 1: Update `JournalEntry.tsx` props interface

Add `PatientMedication` import and extend the props:

```tsx
'use client';

import { useState } from 'react';
import { Send, Smile, Frown, Meh, Zap, Moon, Heart, CheckCircle2, XCircle, Loader2, Pill } from 'lucide-react';
import type { PatientMedication } from '@/lib/api';

interface JournalEntryProps {
  onSubmit: (data: {
    mood_score: number;
    anxiety_score: number;
    energy_score: number;
    sleep_hours?: number;
    journal_entry?: string;
    medication_logs?: Array<{ patient_medication_id: string; skipped: boolean }>;
  }) => Promise<void>;
  saving?: boolean;
  medications?: PatientMedication[];
}
```

### Step 2: Add medication state inside the component

After the existing `useState` calls (mood, anxiety, energy, sleepHours, journalText, submitted), add:

```tsx
// key = med.id, value = true (taken) | false (skipped) | undefined (not answered)
const [medAnswers, setMedAnswers] = useState<Record<string, boolean>>({});
```

### Step 3: Update `handleSubmit` to include medication logs

```tsx
const handleSubmit = async () => {
  const medication_logs = Object.entries(medAnswers).map(([id, taken]) => ({
    patient_medication_id: id,
    skipped: !taken,
  }));

  await onSubmit({
    mood_score: mood,
    anxiety_score: anxiety,
    energy_score: energy,
    sleep_hours: sleepHours,
    journal_entry: journalText || undefined,
    medication_logs: medication_logs.length > 0 ? medication_logs : undefined,
  });

  setSubmitted(true);
  setMedAnswers({});
  setTimeout(() => setSubmitted(false), 3000);
  setJournalText('');
};
```

### Step 4: Add medication section to JSX

After the journal textarea `<div>` and before the `{/* Submit */}` div, add:

```tsx
{/* Medication check */}
{medications && medications.length > 0 && (
  <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-3">
    <div className="flex items-center gap-2">
      <Pill size={16} className="text-indigo-500" />
      <p className="text-sm font-medium text-gray-700">Você tomou sua medicação hoje?</p>
    </div>
    <div className="space-y-2">
      {medications.map((med) => {
        const answer = medAnswers[med.id];
        return (
          <div
            key={med.id}
            className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2.5 border border-white/60"
          >
            <div className="min-w-0 mr-3">
              <p className="text-sm font-medium text-gray-800 truncate">{med.medication_name}</p>
              <p className="text-xs text-gray-400">{med.dosage} · {med.frequency}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMedAnswers((prev) => ({ ...prev, [med.id]: true }))}
                aria-label={`Sim, tomei ${med.medication_name}`}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  answer === true
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                }`}
              >
                <CheckCircle2 size={13} /> Sim
              </button>
              <button
                type="button"
                onClick={() => setMedAnswers((prev) => ({ ...prev, [med.id]: false }))}
                aria-label={`Não tomei ${med.medication_name}`}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  answer === false
                    ? 'bg-red-100 text-red-600 border-red-300'
                    : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'
                }`}
              >
                <XCircle size={13} /> Não
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

### Step 5: Update `patient-home/page.tsx` — handleJournalSubmit

Replace the existing `handleJournalSubmit` function with one that also logs medications in parallel:

```tsx
const handleJournalSubmit = async (data: {
  mood_score: number;
  anxiety_score: number;
  energy_score: number;
  sleep_hours?: number;
  journal_entry?: string;
  medication_logs?: Array<{ patient_medication_id: string; skipped: boolean }>;
}) => {
  setSaving(true);
  try {
    const { medication_logs, ...journalData } = data;
    await journalApi.create(journalData);
    if (medication_logs && medication_logs.length > 0) {
      await Promise.all(
        medication_logs.map((log) => medicationLogsApi.log(log.patient_medication_id, log.skipped))
      );
    }
    await loadJournals();
  } finally {
    setSaving(false);
  }
};
```

### Step 6: Pass `medications` prop to `<JournalEntry>` and remove `<MedicationCheckCard>`

In the `activeSection === 'home'` block, update the `<JournalEntry>` call:

```tsx
<JournalEntry
  onSubmit={handleJournalSubmit}
  saving={saving}
  medications={medications}
/>
```

And remove the `<MedicationCheckCard />` line below it.

At the top of `patient-home/page.tsx`, remove the `MedicationCheckCard` import.

Also add a `medications` state (derived from page data). Add this state near the other states:
```tsx
const [medications, setMedications] = useState<import('@/lib/api').PatientMedication[]>([]);
```

Add a `loadMedications` function:
```tsx
const loadMedications = useCallback(async () => {
  try {
    const res = await patientMedicationsApi.listMine('active');
    setMedications(res.patient_medications ?? []);
  } catch {
    setMedications([]);
  }
}, []);
```

In `loadProfile`, add `loadMedications()` to the calls after `setUser`:
```tsx
setUser(response.user);
loadJournals();
loadProfessionals();
loadGoals(response.user.id);
loadInvitations();
loadMedications();
```

Add `patientMedicationsApi` to imports from `@/lib/api` at the top if not already present.

### Step 7: Check TypeScript

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

### Step 8: Commit

```bash
git add src/components/JournalEntry.tsx src/app/patient-home/page.tsx
git commit -m "feat: integrate medication check into JournalEntry check-in"
```

---

## Task 5: History chart

**Files:**
- Create: `src/components/HistoryChart.tsx`
- Modify: `src/app/patient-home/page.tsx`

### Step 1: Create `src/components/HistoryChart.tsx`

```tsx
'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { JournalEntryData } from '@/lib/api';

interface HistoryChartProps {
  entries: JournalEntryData[];
}

type Period = 7 | 30 | 90;

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.3) return <Minus size={14} className="text-gray-400" />;
  if (diff > 0) return <TrendingUp size={14} className="text-green-500" />;
  return <TrendingDown size={14} className="text-red-400" />;
}

export default function HistoryChart({ entries }: HistoryChartProps) {
  const [period, setPeriod] = useState<Period>(30);

  const { chartData, currentAvgs, previousAvgs } = useMemo(() => {
    const now = new Date();
    const cutoff = subDays(now, period);
    const prevCutoff = subDays(now, period * 2);

    const current = entries.filter((e) => {
      const d = parseISO(e.logged_at || e.created_at);
      return isAfter(d, cutoff);
    });

    const previous = entries.filter((e) => {
      const d = parseISO(e.logged_at || e.created_at);
      return isAfter(d, prevCutoff) && !isAfter(d, cutoff);
    });

    const chartData = [...current]
      .reverse()
      .map((e) => ({
        date: format(parseISO(e.logged_at || e.created_at), 'd MMM', { locale: ptBR }),
        Humor: e.mood_score,
        Ansiedade: e.anxiety_score,
        Energia: e.energy_score,
      }));

    const currentAvgs = {
      mood: avg(current.map((e) => e.mood_score)),
      anxiety: avg(current.map((e) => e.anxiety_score)),
      energy: avg(current.map((e) => e.energy_score)),
    };

    const previousAvgs = {
      mood: avg(previous.map((e) => e.mood_score)),
      anxiety: avg(previous.map((e) => e.anxiety_score)),
      energy: avg(previous.map((e) => e.energy_score)),
    };

    return { chartData, currentAvgs, previousAvgs };
  }, [entries, period]);

  if (entries.length === 0) return null;

  const PERIODS: Period[] = [7, 30, 90];

  return (
    <div className="card section-blue space-y-5 animate-fade-in">
      {/* Header + period selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-semibold text-gray-800">Evolução</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                period === p
                  ? 'bg-clarita-blue-100 text-clarita-blue-600 border-clarita-blue-200'
                  : 'bg-white/40 text-gray-500 border-gray-200 hover:bg-white/60'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Area chart */}
      {chartData.length > 1 ? (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gHumor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF78" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4CAF78" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gAnsiedade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEnergia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb', background: 'rgba(255,255,255,0.95)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Humor" stroke="#4CAF78" strokeWidth={2} fill="url(#gHumor)" dot={false} />
              <Area type="monotone" dataKey="Ansiedade" stroke="#F97316" strokeWidth={2} fill="url(#gAnsiedade)" dot={false} />
              <Area type="monotone" dataKey="Energia" stroke="#60A5FA" strokeWidth={2} fill="url(#gEnergia)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          Registre mais check-ins para ver o gráfico.
        </p>
      )}

      {/* Averages */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Humor médio', current: currentAvgs.mood, previous: previousAvgs.mood, color: 'text-clarita-green-600' },
          { label: 'Ansiedade média', current: currentAvgs.anxiety, previous: previousAvgs.anxiety, color: 'text-orange-500' },
          { label: 'Energia média', current: currentAvgs.energy, previous: previousAvgs.energy, color: 'text-clarita-blue-500' },
        ].map(({ label, current, previous, color }) => (
          <div key={label} className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 border border-white/30 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{current || '—'}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendIcon current={current} previous={previous} />
              <span className="text-xs text-gray-400">vs anterior</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Add HistoryChart above JournalHistory in `patient-home/page.tsx`

Add import:
```tsx
import HistoryChart from '@/components/HistoryChart';
```

In the `activeSection === 'history'` block, replace:
```tsx
{activeSection === 'history' && (
  <JournalHistory entries={journals} loading={journalsLoading} />
)}
```

With:
```tsx
{activeSection === 'history' && (
  <div className="space-y-6">
    <HistoryChart entries={journals} />
    <JournalHistory entries={journals} loading={journalsLoading} />
  </div>
)}
```

### Step 3: Check TypeScript

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors. If recharts gives "Cannot find module 'recharts'" at this point, run `npm install` again.

### Step 4: Commit

```bash
git add src/components/HistoryChart.tsx src/app/patient-home/page.tsx
git commit -m "feat: add history chart with evolution graph and averages"
```

---

## Task 6: Redesign AnamnesisPanel patient view

**Files:**
- Modify: `src/components/AnamnesisPanel.tsx`

The professional view is unchanged. Only the patient view (role === 'patient') is redesigned to:
- Use the light card theme (matching the rest of the patient home)
- Show responses as accordion cards (title, status badge, expandable Q&A)
- Better empty state

### Step 1: Replace the patient view block in `AnamnesisPanel.tsx`

Find the section starting at `// Patient view: respond to pending anamneses` (line 158) and ending just before `// Professional view` (line 278).

Replace the entire patient view (both the `respond` sub-view and the list view) with the following. The professional view stays untouched.

**New patient view — respond sub-view (role === 'patient', activeView === 'respond'):**

```tsx
if (role === 'patient') {
  if (activeView === 'respond' && selectedResponse && selectedTemplate) {
    const questions = selectedTemplate.questions || [];
    const isCompleted = selectedResponse.status === 'completed';
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          type="button"
          onClick={() => { setActiveView('list'); setSelectedResponse(null); }}
          className="text-sm text-clarita-green-600 hover:text-clarita-green-700 font-medium"
        >
          ← Voltar
        </button>

        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">{selectedTemplate.title}</h3>
              {selectedTemplate.description && (
                <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
              )}
            </div>
            <span className={`flex-shrink-0 ml-3 text-xs px-2.5 py-1 rounded-full font-medium ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isCompleted ? 'Respondida' : 'Pendente'}
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id || i} className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {i + 1}. {q.question_text}
                  {q.is_required && !isCompleted && <span className="text-red-400 ml-1">*</span>}
                </label>
                {isCompleted ? (
                  <p className="text-sm text-gray-800 font-medium">
                    {String(selectedResponse.answers?.[String(i)] ?? '—')}
                  </p>
                ) : q.question_type === 'text' ? (
                  <textarea
                    className="input-field min-h-[80px] resize-none"
                    rows={3}
                    value={String(answers[String(i)] || '')}
                    onChange={(e) => setAnswers({ ...answers, [String(i)]: e.target.value })}
                  />
                ) : q.question_type === 'scale' ? (
                  <div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={Number(answers[String(i)] || 5)}
                      onChange={(e) => setAnswers({ ...answers, [String(i)]: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1</span>
                      <span className="font-medium text-clarita-green-600">{String(answers[String(i)] || 5)}</span>
                      <span>10</span>
                    </div>
                  </div>
                ) : q.question_type === 'yes_no' ? (
                  <div className="flex gap-3">
                    {['Sim', 'Não'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [String(i)]: opt })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          answers[String(i)] === opt
                            ? 'bg-clarita-green-100 border-clarita-green-300 text-clarita-green-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.question_type === 'multiple_choice' ? (
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(q.options) ? q.options : []).map((opt: string) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [String(i)]: opt })}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                          answers[String(i)] === opt
                            ? 'bg-clarita-green-100 border-clarita-green-300 text-clarita-green-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {String(opt)}
                      </button>
                    ))}
                  </div>
                ) : q.question_type === 'date' ? (
                  <input
                    type="date"
                    className="input-field w-auto"
                    value={String(answers[String(i)] || '')}
                    onChange={(e) => setAnswers({ ...answers, [String(i)]: e.target.value })}
                  />
                ) : null}
              </div>
            ))}
          </div>

          {!isCompleted && (
            <button
              type="button"
              onClick={() => handleSubmitResponse(selectedResponse.id)}
              disabled={submitting}
              className="btn-primary mt-5 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enviar Respostas
            </button>
          )}
        </div>
      </div>
    );
  }

  // Patient list view
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList size={20} className="text-teal-500" />
        <h3 className="text-lg font-semibold text-gray-800">Anamneses</h3>
      </div>

      {responses.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 mx-auto mb-3 bg-teal-50 rounded-full flex items-center justify-center">
            <ClipboardList size={24} className="text-teal-400" />
          </div>
          <p className="text-gray-600 font-medium">Nenhuma anamnese pendente</p>
          <p className="text-sm text-gray-400 mt-1">
            Seu profissional de saúde enviará questionários por aqui.
          </p>
        </div>
      ) : (
        responses.map((r) => {
          const isCompleted = r.status === 'completed';
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleViewResponse(r)}
              className="w-full card text-left hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {r.template_title || 'Anamnese'}
                  </p>
                  {r.deadline && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Prazo: {new Date(r.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                  isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {isCompleted ? 'Respondida' : 'Pendente'}
                </span>
              </div>
              {isCompleted && (
                <p className="text-xs text-clarita-green-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Toque para ver suas respostas
                </p>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
```

Make sure the `Clock` icon is imported at the top of the file. Add it to the existing import line:
```tsx
import { ClipboardList, Plus, Send, ChevronDown, ChevronUp, CheckCircle2, Clock, Loader2, Trash2 } from 'lucide-react';
```

(`Clock` may already be present — check the import line and add it if missing.)

### Step 2: Check TypeScript

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

### Step 3: Commit

```bash
git add src/components/AnamnesisPanel.tsx
git commit -m "feat: redesign AnamnesisPanel patient view with light theme and accordion"
```

---

## Verification

After all tasks complete:

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit
```

Expected: zero TypeScript errors across the project.

Manual smoke test:
1. `npm run dev -- --port 3002`
2. Login como paciente → desktop: ver sidebar à esquerda, conteúdo à direita
3. Mobile (DevTools 375px): sidebar some, BottomNav aparece no fundo
4. Seção Home → check-in mostra sliders + medicamentos abaixo → submit único
5. Seção Histórico → gráfico de área + cards de médias acima da lista de entradas
6. Seção Anamnese → lista de cards light theme; clicar para responder/ver

