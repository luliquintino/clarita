# Patient Home Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesenhar a `/patient-home` com home limpa (check-in + card de medicação + profissionais) e barra de navegação inferior scrollável para Exames, Prescrições, Testes, Anamnese, Metas e Histórico.

**Architecture:** Novos componentes `MedicationCheckCard`, `BottomNav` e `MyPrescriptionsPanel`. Um novo endpoint backend `GET /api/prescriptions/my`. O `page.tsx` da patient-home é refatorado para usar `activeSection` controlado pelo BottomNav em vez dos tabs atuais.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Express.js (Node), PostgreSQL

---

## Contexto da Codebase

- **Frontend:** `dashboard/src/app/patient-home/page.tsx` (407 linhas) — página principal do paciente
- **API client:** `dashboard/src/lib/api.ts` — todas as chamadas HTTP
- **Backend medicações:** `backend/src/routes/medications.js`
  - `GET /api/patient-medications` → já suporta role=patient (usa req.user.id, ignora query param)
  - `POST /api/medication-logs` → registra tomada/skip (só patient)
  - `GET /api/medication-logs?start_date=&end_date=` → logs com filtro de data
- **Backend prescrições:** `backend/src/routes/prescriptions.js`
  - `GET /api/prescriptions/:patientId` → só profissionais, precisa de novo `/my`
  - Usa `listPrescriptions(patientId)` de `memedService.js`
- **Componentes existentes** (não mudam):
  - `JournalEntry`, `JournalHistory`, `ProfessionalTabs`, `PatientGoalsPanel`
  - `ExamUploadPanel`, `AnamnesisPanel`, `PsychTestPanel`

---

## Task 1: Backend — GET /api/prescriptions/my

**Objetivo:** Paciente lista suas próprias prescrições sem passar patient_id.

**Files:**
- Modify: `backend/src/routes/prescriptions.js`

**Step 1: Adicionar a rota `/my` ANTES da rota `/:patientId`**

Abrir `backend/src/routes/prescriptions.js`. Antes da linha `router.get('/:patientId', ...)`, inserir:

```javascript
// ---------------------------------------------------------------------------
// GET /api/prescriptions/my
// Patient lists their own prescriptions (reads patient_id from JWT)
// ---------------------------------------------------------------------------
router.get(
  '/my',
  requireRole('patient'),
  async (req, res, next) => {
    try {
      const data = await listPrescriptions(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);
```

**⚠️ IMPORTANTE:** A rota `/my` deve ficar ANTES de `/:patientId`, caso contrário o Express vai interpretar "my" como um UUID e chamar a rota errada.

**Step 2: Verificar no terminal que o servidor reiniciou**

```bash
# No diretório backend, se estiver com nodemon/dev server:
# O servidor deve reiniciar automaticamente.
# Se não, matar e reiniciar:
kill $(lsof -ti:3001) && node src/index.js &
sleep 2 && curl -s http://localhost:3001/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Step 3: Testar manualmente**

```bash
# Login como paciente e pegar token
TOKEN=$(curl -s -H "Content-Type: application/json" \
  -d '{"email":"luiza.paciente@teste.com","password":"JCHh14025520"}' \
  http://localhost:3001/api/auth/login | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Testar /my
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/prescriptions/my
# Expected: {"prescriptions":[],"pagination":{"page":1,"limit":20,"total":0}}
# (ou com dados se houver prescrições)
```

**Step 4: Commit**

```bash
git add backend/src/routes/prescriptions.js
git commit -m "feat(backend): add GET /api/prescriptions/my for patient role"
```

---

## Task 2: Frontend — Tipos e métodos em api.ts

**Objetivo:** Adicionar interface `PatientMedication`, `MedicationLog` e os métodos de API necessários.

**Files:**
- Modify: `dashboard/src/lib/api.ts`

**Step 1: Adicionar interface `PatientMedication` após a interface `Medication` (~linha 234)**

Procurar `export interface Medication {` e logo APÓS o bloco da interface `Medication` (após o `}`), inserir:

```typescript
export interface PatientMedication {
  id: string;
  patient_id: string;
  medication_id: string;
  prescribed_by: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: 'active' | 'discontinued' | 'adjusted';
  medication_name: string;
  medication_category: string | null;
  prescriber_first_name: string | null;
  prescriber_last_name: string | null;
}

export interface MedicationLog {
  id: string;
  patient_medication_id: string;
  taken_at: string;
  skipped: boolean;
  skip_reason: string | null;
  notes: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
}
```

**Step 2: Adicionar `patientMedicationsApi` após o bloco `medicationsApi` (~linha 636)**

Procurar `export const alertsApi` e inserir ANTES:

```typescript
// ---------------------------------------------------------------------------
// Patient Medications API (for the patient themselves)
// ---------------------------------------------------------------------------

export const patientMedicationsApi = {
  /** List the current patient's own medications. Role=patient reads from JWT. */
  listMine: (status?: 'active' | 'discontinued' | 'adjusted') => {
    const params = status ? `?status=${status}` : '';
    return request<{ patient_medications: PatientMedication[] }>(`/patient-medications${params}`);
  },
};

// ---------------------------------------------------------------------------
// Medication Logs API
// ---------------------------------------------------------------------------

export const medicationLogsApi = {
  /** Log a medication as taken or skipped for the current patient. */
  log: (patientMedicationId: string, skipped: boolean, skipReason?: string) =>
    request<{ medication_log: MedicationLog }>('/medication-logs', {
      method: 'POST',
      body: JSON.stringify({
        patient_medication_id: patientMedicationId,
        skipped,
        skip_reason: skipReason,
      }),
    }),

  /** Get today's medication logs for the current patient. */
  getToday: () => {
    const today = new Date().toISOString().split('T')[0]; // "2026-03-12"
    return request<{ medication_logs: MedicationLog[]; summary: { total: number; taken: number; skipped: number; adherence_rate: number | null } }>(
      `/medication-logs?start_date=${today}T00:00:00&end_date=${today}T23:59:59`
    );
  },
};
```

**Step 3: Adicionar `prescriptionsApi.getMy()` no bloco existente de `prescriptionsApi` (~linha 1453)**

Encontrar o bloco `export const prescriptionsApi = {` e adicionar o método `getMy` ao final do objeto, antes do `}`:

```typescript
  getMy: (page = 1, limit = 20) =>
    request<{ prescriptions: Prescription[]; pagination: { page: number; limit: number; total: number } }>(
      `/prescriptions/my?page=${page}&limit=${limit}`
    ),
```

**Step 4: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -20
# Expected: sem erros
```

**Step 5: Commit**

```bash
git add dashboard/src/lib/api.ts
git commit -m "feat(api): add PatientMedication types, patientMedicationsApi, medicationLogsApi, prescriptionsApi.getMy"
```

---

## Task 3: Componente MedicationCheckCard

**Objetivo:** Card que lista medicações ativas do paciente com botões Sim/Não para registrar adesão diária.

**Files:**
- Create: `dashboard/src/components/MedicationCheckCard.tsx`

**Step 1: Criar o arquivo**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Pill, CheckCircle2, XCircle, Loader2, Check } from 'lucide-react';
import { patientMedicationsApi, medicationLogsApi } from '@/lib/api';
import type { PatientMedication, MedicationLog } from '@/lib/api';

export default function MedicationCheckCard() {
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null); // id being logged

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [medsRes, logsRes] = await Promise.all([
        patientMedicationsApi.listMine('active'),
        medicationLogsApi.getToday(),
      ]);
      setMedications(medsRes.patient_medications ?? []);
      setTodayLogs(logsRes.medication_logs ?? []);
    } catch {
      setMedications([]);
      setTodayLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no active medications
  if (!loading && medications.length === 0) return null;

  if (loading) {
    return (
      <div className="card p-4 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-clarita-green-400" />
      </div>
    );
  }

  const getLogForMed = (medId: string) =>
    todayLogs.find((l) => l.patient_medication_id === medId);

  const allAnswered = medications.every((m) => !!getLogForMed(m.id));

  const handleLog = async (medId: string, skipped: boolean) => {
    if (getLogForMed(medId)) return; // already logged
    setLogging(medId);
    try {
      await medicationLogsApi.log(medId, skipped);
      const logsRes = await medicationLogsApi.getToday();
      setTodayLogs(logsRes.medication_logs ?? []);
    } catch {
      // silent fail — UI stays unchanged
    } finally {
      setLogging(null);
    }
  };

  const takenCount = medications.filter((m) => {
    const log = getLogForMed(m.id);
    return log && !log.skipped;
  }).length;

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Pill size={16} className="text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Você tomou sua medicação hoje?</h3>
          {allAnswered && (
            <p className="text-xs text-green-600 font-medium">
              {takenCount}/{medications.length} tomada{takenCount !== 1 ? 's' : ''} ✓
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {medications.map((med) => {
          const log = getLogForMed(med.id);
          const isLogging = logging === med.id;

          return (
            <div
              key={med.id}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100"
            >
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium text-gray-800 truncate">{med.medication_name}</p>
                <p className="text-xs text-gray-400">{med.dosage} · {med.frequency}</p>
              </div>

              {log ? (
                // Already logged
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
                  log.skipped
                    ? 'bg-red-50 text-red-500 border border-red-100'
                    : 'bg-green-50 text-green-600 border border-green-100'
                }`}>
                  {log.skipped ? (
                    <><XCircle size={13} /> Não tomei</>
                  ) : (
                    <><Check size={13} /> Tomei</>
                  )}
                </div>
              ) : (
                // Awaiting response
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleLog(med.id, false)}
                    disabled={!!isLogging}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {isLogging ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Sim
                  </button>
                  <button
                    onClick={() => handleLog(med.id, true)}
                    disabled={!!isLogging}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={13} /> Não
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -20
# Expected: sem erros
```

**Step 3: Commit**

```bash
git add dashboard/src/components/MedicationCheckCard.tsx
git commit -m "feat: add MedicationCheckCard component for daily medication adherence check"
```

---

## Task 4: Componente MyPrescriptionsPanel

**Objetivo:** Painel simples que lista as prescrições do psiquiatra para o paciente.

**Files:**
- Create: `dashboard/src/components/MyPrescriptionsPanel.tsx`

**Step 1: Criar o arquivo**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Pill, Loader2, FileText, User } from 'lucide-react';
import { prescriptionsApi } from '@/lib/api';
import type { Prescription } from '@/lib/api';

export default function MyPrescriptionsPanel() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await prescriptionsApi.getMy();
      setPrescriptions(res.prescriptions ?? []);
    } catch {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-clarita-green-400" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
          <Pill size={22} className="text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">Nenhuma prescrição encontrada</p>
        <p className="text-xs text-gray-400 mt-1">Seu psiquiatra ainda não gerou prescrições</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800 px-1">Minhas Prescrições</h2>
      {prescriptions.map((p) => {
        const pAny = p as any;
        const profName = pAny.professional_first_name
          ? `${pAny.professional_first_name} ${pAny.professional_last_name}`
          : 'Psiquiatra';

        return (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <FileText size={15} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User size={11} />
                    <span>{profName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medication list */}
            {Array.isArray(pAny.medications) && pAny.medications.length > 0 && (
              <div className="space-y-1.5">
                {pAny.medications.map((med: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{med.name}</p>
                      <p className="text-xs text-gray-400">{med.dosage} · {med.frequency}</p>
                    </div>
                    {med.duration && (
                      <span className="text-xs text-gray-400">{med.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -20
# Expected: sem erros
```

**Step 3: Commit**

```bash
git add dashboard/src/components/MyPrescriptionsPanel.tsx
git commit -m "feat: add MyPrescriptionsPanel for patient prescription history"
```

---

## Task 5: Componente BottomNav

**Objetivo:** Barra de navegação inferior fixa com 7 abas scrolláveis horizontalmente.

**Files:**
- Create: `dashboard/src/components/BottomNav.tsx`

**Step 1: Criar o arquivo**

```tsx
'use client';

import { Home, FileText, Pill, FlaskConical, ClipboardList, Target, BookOpen } from 'lucide-react';

export type PatientSection =
  | 'home'
  | 'exams'
  | 'prescriptions'
  | 'tests'
  | 'anamnesis'
  | 'goals'
  | 'history';

interface BottomNavProps {
  active: PatientSection;
  onChange: (section: PatientSection) => void;
  badges?: Partial<Record<PatientSection, number>>;
}

const NAV_ITEMS: Array<{
  key: PatientSection;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
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

export default function BottomNav({ active, onChange, badges = {} }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/40 shadow-lg">
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

**Step 2: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -20
# Expected: sem erros
```

**Step 3: Commit**

```bash
git add dashboard/src/components/BottomNav.tsx
git commit -m "feat: add BottomNav component with 7 scrollable tabs for patient navigation"
```

---

## Task 6: Redesign patient-home/page.tsx

**Objetivo:** Substituir a lógica de tabs atual pela nova estrutura: home limpa + BottomNav.

**Files:**
- Modify: `dashboard/src/app/patient-home/page.tsx`

**Step 1: Substituir o arquivo inteiro** com a versão abaixo:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import Image from 'next/image';
import {
  authApi,
  removeToken,
  isAuthenticated,
  getUserRoleFromToken,
  journalApi,
  patientProfileApi,
  goalsApi,
  invitationsApi,
  onboardingApi,
} from '@/lib/api';
import type { AuthUser, JournalEntryData, ProfessionalInfo, Goal, Invitation } from '@/lib/api';
import JournalEntry from '@/components/JournalEntry';
import JournalHistory from '@/components/JournalHistory';
import ProfessionalTabs from '@/components/ProfessionalTabs';
import PatientGoalsPanel from '@/components/PatientGoalsPanel';
import ExamUploadPanel from '@/components/ExamUploadPanel';
import DisplayIdBadge from '@/components/DisplayIdBadge';
import AnamnesisPanel from '@/components/AnamnesisPanel';
import PsychTestPanel from '@/components/PsychTestPanel';
import MedicationCheckCard from '@/components/MedicationCheckCard';
import MyPrescriptionsPanel from '@/components/MyPrescriptionsPanel';
import BottomNav, { type PatientSection } from '@/components/BottomNav';

export default function PatientHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [journals, setJournals] = useState<JournalEntryData[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [professionals, setProfessionals] = useState<ProfessionalInfo[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(true);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);

  const [activeSection, setActiveSection] = useState<PatientSection>('home');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const role = getUserRoleFromToken();
    if (role && role !== 'patient') {
      router.replace('/patients');
      return;
    }
    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      const response = await authApi.me();
      if (response.user.role !== 'patient') {
        router.replace('/patients');
        return;
      }

      try {
        const onboardingRes = await onboardingApi.get();
        if (!onboardingRes.profile.onboarding_completed) {
          router.replace('/onboarding');
          return;
        }
      } catch {
        // If onboarding check fails, continue to home
      }

      setUser(response.user);
      loadJournals();
      loadProfessionals();
      loadGoals(response.user.id);
      loadInvitations();
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadJournals = async () => {
    setJournalsLoading(true);
    try {
      const data = await journalApi.list({ limit: 20 });
      const raw = data as any;
      const entries: JournalEntryData[] = Array.isArray(raw)
        ? raw
        : (raw?.journals ?? raw?.emotional_logs ?? []);
      setJournals(entries);
    } catch {
      setJournals([]);
    } finally {
      setJournalsLoading(false);
    }
  };

  const loadProfessionals = async () => {
    setProfessionalsLoading(true);
    try {
      const data = await patientProfileApi.getMyProfessionals();
      const raw = data as any;
      const profs: ProfessionalInfo[] = Array.isArray(raw) ? raw : (raw?.professionals ?? []);
      setProfessionals(profs);
    } catch {
      setProfessionals([]);
    } finally {
      setProfessionalsLoading(false);
    }
  };

  const loadGoals = async (userId: string) => {
    setGoalsLoading(true);
    try {
      const data = await goalsApi.list(userId);
      const raw = data as any;
      const goalsList: Goal[] = Array.isArray(raw) ? raw : (raw?.goals ?? []);
      setGoals(goalsList);
    } catch {
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const [pendingData, sentData] = await Promise.all([
        invitationsApi.listPending(),
        invitationsApi.listSent(),
      ]);
      setPendingInvitations(pendingData.invitations || []);
      setSentInvitations(sentData.invitations || []);
    } catch {
      setPendingInvitations([]);
      setSentInvitations([]);
    }
  };

  const handleInvitationsUpdate = async () => {
    await Promise.all([loadInvitations(), loadProfessionals()]);
  };

  const handleGoalRespond = async (
    goalId: string,
    action: 'accept' | 'reject',
    reason?: string
  ) => {
    await goalsApi.respond(goalId, action, reason);
    if (user) await loadGoals(user.id);
  };

  const handleJournalSubmit = async (data: {
    mood_score: number;
    anxiety_score: number;
    energy_score: number;
    sleep_hours?: number;
    journal_entry?: string;
  }) => {
    setSaving(true);
    try {
      await journalApi.create(data);
      await loadJournals();
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = useCallback(
    async (
      professionalId: string,
      permissions: Array<{ permission_type: string; granted: boolean }>
    ) => {
      if (!user) return;
      await patientProfileApi.updatePermissions(user.id, professionalId, permissions);
      await loadProfessionals();
    },
    [user]
  );

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-clarita-green-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const pendingGoalsCount = goals.filter((g) => g.patient_status === 'pending').length;
  const pendingInvitationsCount = pendingInvitations.filter(
    (inv) => inv.invited_by !== user?.id
  ).length;

  const navBadges: Partial<Record<PatientSection, number>> = {
    goals: pendingGoalsCount > 0 ? pendingGoalsCount : undefined,
    home: pendingInvitationsCount > 0 ? pendingInvitationsCount : undefined,
  };

  return (
    <div className="min-h-screen pb-24"> {/* pb-24 = space for fixed BottomNav */}
      {/* Header */}
      <header className="sticky top-0 z-30 glass rounded-none border-b border-white/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-8 py-3">
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
              <div className="hidden sm:block">
                <DisplayIdBadge displayId={user.display_id} size="sm" />
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* ── HOME ── */}
        {activeSection === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
            {/* Left: check-in + medication */}
            <div className="md:col-span-3 space-y-4">
              <JournalEntry onSubmit={handleJournalSubmit} saving={saving} />
              <MedicationCheckCard />
            </div>

            {/* Right: professionals */}
            <div className="md:col-span-2">
              {professionalsLoading ? (
                <div className="card flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-clarita-green-400" />
                </div>
              ) : (
                <ProfessionalTabs
                  professionals={professionals}
                  patientId={user?.id || ''}
                  onPermissionChange={handlePermissionChange}
                  pendingInvitations={pendingInvitations}
                  sentInvitations={sentInvitations}
                  onInvitationsUpdate={handleInvitationsUpdate}
                  currentUserId={user?.id || ''}
                />
              )}
            </div>
          </div>
        )}

        {/* ── EXAMES ── */}
        {activeSection === 'exams' && <ExamUploadPanel />}

        {/* ── PRESCRIÇÕES ── */}
        {activeSection === 'prescriptions' && <MyPrescriptionsPanel />}

        {/* ── TESTES ── */}
        {activeSection === 'tests' && <PsychTestPanel role="patient" />}

        {/* ── ANAMNESE ── */}
        {activeSection === 'anamnesis' && <AnamnesisPanel role="patient" />}

        {/* ── METAS ── */}
        {activeSection === 'goals' && (
          <PatientGoalsPanel
            goals={goals}
            loading={goalsLoading}
            onRespond={handleGoalRespond}
          />
        )}

        {/* ── HISTÓRICO ── */}
        {activeSection === 'history' && (
          <JournalHistory entries={journals} loading={journalsLoading} />
        )}
      </main>

      <p className="text-center text-xs text-gray-400 pb-4">
        Informações protegidas &middot; Conformidade LGPD
      </p>

      {/* Bottom Navigation */}
      <BottomNav
        active={activeSection}
        onChange={setActiveSection}
        badges={navBadges}
      />
    </div>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd dashboard && npx tsc --noEmit 2>&1 | head -20
# Expected: sem erros
```

**Step 3: Verificar no browser** — http://localhost:3002/patient-home
- Verificar que a home mostra check-in + card de medicação + profissionais
- Verificar que a barra inferior aparece com 7 abas
- Clicar em cada aba e verificar que o conteúdo muda
- Verificar que o card de medicação não aparece se não tiver medicações ativas
- Verificar scroll horizontal na barra inferior em tela pequena

**Step 4: Commit**

```bash
git add dashboard/src/app/patient-home/page.tsx
git commit -m "feat: redesign patient-home with BottomNav and MedicationCheckCard

- Remove old mobile tab bar
- Home section: check-in + medication daily check + professionals panel
- BottomNav with 7 scrollable sections: Home, Exames, Prescrições, Testes, Anamnese, Metas, Histórico
- Each section renders on demand (conditional rendering vs hidden)"
```

---

## Verificação Final

1. `npx tsc --noEmit` → zero erros
2. Login como `luiza.paciente@teste.com` / `JCHh14025520`
3. Home: check-in emocional visível, card de medicação (hidden se sem med), painel de profissionais
4. Clicar em cada aba da barra: Exames, Prescrições, Testes, Anamnese, Metas, Histórico
5. Verificar que o card "Você tomou sua medicação hoje?" só aparece para pacientes com medicação `active`
6. Scroll horizontal na barra inferior funciona em viewport mobile (375px)
