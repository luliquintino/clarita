# Disconnected Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Conectar 5 funcionalidades desconectadas: relato de sintomas pelo paciente, seção de medicamentos do paciente, eventos de vida pelo profissional, aba de chat na view do profissional, e aba de insights na view do profissional.

**Architecture:** Majoritariamente mudanças de frontend. Apenas uma nova rota de backend (Feature 3: life events pelo profissional). Todos os outros backends já existem. Reutilizar componentes existentes sempre que possível.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Node.js/Express, PostgreSQL

---

## Task 1: API client de sintomas em `api.ts`

**Files:**
- Modify: `dashboard/src/lib/api.ts`

### Contexto
Não existe nenhum `symptomsApi` em `api.ts`. O backend tem:
- `GET /api/symptoms` — lista global de sintomas (sem auth ou com auth, todos podem ver)
- `POST /api/patient-symptoms` — relato de sintoma (só paciente, requer `symptom_id: UUID`, `severity: int 1-10`, `notes?: string`, `reported_at?: ISO8601`)

**Step 1: Adicionar interfaces e API client**

Encontre onde `lifeEventsApi` foi adicionado (linha ~1130) e adicione logo antes ou depois:

```typescript
// ---------------------------------------------------------------------------
// Symptoms
// ---------------------------------------------------------------------------

export interface Symptom {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface PatientSymptom {
  id: string;
  patient_id: string;
  symptom_id: string;
  severity: number;
  notes?: string;
  reported_at: string;
  created_at: string;
}

export interface CreatePatientSymptomInput {
  symptom_id: string;
  severity: number;
  notes?: string;
  reported_at?: string;
}

export const symptomsApi = {
  list: () => request<{ symptoms: Symptom[] }>('/symptoms'),

  report: (data: CreatePatientSymptomInput) =>
    request<{ patient_symptom: PatientSymptom }>('/patient-symptoms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

**Step 2: Verificar TypeScript**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sem erros.

**Step 3: Commit**
```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/lib/api.ts
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add Symptom types and symptomsApi to api.ts"
```

---

## Task 2: Componente `ReportSymptomModal.tsx`

**Files:**
- Create: `dashboard/src/components/ReportSymptomModal.tsx`

### Contexto
Modal simples para paciente relatar sintoma. Busca lista de sintomas no backend ao abrir, apresenta select, slider de intensidade 1-10, campo de observações opcional e data.

**Step 1: Criar o componente**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { symptomsApi, type Symptom } from '@/lib/api';

interface ReportSymptomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ReportSymptomModal({ open, onClose, onCreated }: ReportSymptomModalProps) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loadingSymptoms, setLoadingSymptoms] = useState(false);
  const [symptomId, setSymptomId] = useState('');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [reportedAt, setReportedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoadingSymptoms(true);
    symptomsApi.list()
      .then((res) => {
        const raw = res as any;
        setSymptoms(Array.isArray(raw) ? raw : (raw?.symptoms ?? []));
      })
      .catch(() => setError('Erro ao carregar sintomas.'))
      .finally(() => setLoadingSymptoms(false));
  }, [open]);

  const reset = () => {
    setSymptomId('');
    setSeverity(5);
    setNotes('');
    setReportedAt(format(new Date(), 'yyyy-MM-dd'));
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomId) {
      setError('Selecione um sintoma');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await symptomsApi.report({
        symptom_id: symptomId,
        severity,
        notes: notes.trim() || undefined,
        reported_at: new Date(reportedAt).toISOString(),
      });
      reset();
      onCreated();
      onClose();
    } catch {
      setError('Erro ao salvar sintoma. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <AlertCircle size={18} className="text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Relatar Sintoma</h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar"
            className="btn-ghost p-2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Sintoma */}
          <div>
            <label htmlFor="symptom-select" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Sintoma <span className="text-red-400">*</span>
            </label>
            {loadingSymptoms ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </div>
            ) : (
              <select
                id="symptom-select"
                value={symptomId}
                onChange={(e) => setSymptomId(e.target.value)}
                className="input-field w-full"
                disabled={saving}
              >
                <option value="">Selecione um sintoma</option>
                {symptoms.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Intensidade */}
          <div>
            <label htmlFor="symptom-severity" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Intensidade: <span className="text-gray-700 font-bold">{severity}/10</span>
            </label>
            <input
              id="symptom-severity"
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-orange-500"
              disabled={saving}
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Leve</span>
              <span>Moderado</span>
              <span>Intenso</span>
            </div>
          </div>

          {/* Data */}
          <div>
            <label htmlFor="symptom-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Data
            </label>
            <input
              id="symptom-date"
              type="date"
              value={reportedAt}
              onChange={(e) => setReportedAt(e.target.value)}
              className="input-field w-full"
              disabled={saving}
            />
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="symptom-notes" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Observações <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <textarea
              id="symptom-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva como está se sentindo..."
              rows={3}
              maxLength={5000}
              className="input-field w-full resize-none"
              disabled={saving}
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="btn-ghost flex-1 py-2.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !symptomId}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Salvando...' : 'Relatar sintoma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verificar TypeScript**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**
```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/ReportSymptomModal.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add ReportSymptomModal component for patient symptom reporting"
```

---

## Task 3: Integrar sintomas e seção de medicamentos na `patient-home`

**Files:**
- Modify: `dashboard/src/components/nav-items.ts`
- Modify: `dashboard/src/app/patient-home/page.tsx`

### Contexto
Dois objetivos nesta task:
1. Adicionar card "Relatar Sintoma" na seção `home` da patient-home
2. Adicionar nova seção `'medications'` na nav com medicações ativas + checklist + prescrições

### 3a — Nav items

**Step 1: Adicionar `'medications'` ao `nav-items.ts`**

Em `dashboard/src/components/nav-items.ts`, adicionar `'medications'` ao tipo `PatientSection` e um novo item ao array `NAV_ITEMS`:

```typescript
// No tipo PatientSection, adicionar:
| 'medications'

// No array NAV_ITEMS, adicionar após 'goals':
{
  key: 'medications',
  label: 'Medicamentos',
  icon: Pill,
  color: 'text-gray-400',
  activeColor: 'text-amber-600',
  activeBg: 'bg-amber-50 border-amber-200',
},
```

**IMPORTANTE:** Importar `Pill` do lucide-react no topo do arquivo junto com os outros ícones.

### 3b — Patient-home: card de sintoma + seção de medicamentos

**Step 2: Adicionar imports em `patient-home/page.tsx`**

Adicionar imports:
```typescript
import ReportSymptomModal from '@/components/ReportSymptomModal';
import MedicationCheckCard from '@/components/MedicationCheckCard';
import MyPrescriptionsPanel from '@/components/MyPrescriptionsPanel';
import { AlertCircle, Pill as PillIcon } from 'lucide-react'; // se não existirem
```

**Step 3: Adicionar estado do modal de sintoma**

Após `const [showLifeEventModal, setShowLifeEventModal] = useState(false)`, adicionar:
```typescript
const [showSymptomModal, setShowSymptomModal] = useState(false);
```

**Step 4: Adicionar card de sintoma na seção home**

Na seção `{activeSection === 'home' && (...)}, dentro do `<div className="md:col-span-3 space-y-4">` (onde fica o `JournalEntry`), adicionar após o `<JournalEntry .../>`:

```typescript
{/* Relatar sintoma */}
<button
  onClick={() => setShowSymptomModal(true)}
  className="w-full flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-2xl transition-all duration-200 text-left"
>
  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
    <AlertCircle size={18} className="text-orange-500" />
  </div>
  <div>
    <p className="font-medium text-gray-800 text-sm">Relatar Sintoma</p>
    <p className="text-xs text-gray-500">Registre um sintoma que está sentindo</p>
  </div>
</button>
```

**Step 5: Adicionar seção `'medications'`**

Após o bloco `{activeSection === 'goals' && ...}`, adicionar:

```typescript
{/* ── MEDICAMENTOS ── */}
{activeSection === 'medications' && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Medicações Ativas</h2>
      <MedicationCheckCard />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Minhas Prescrições</h2>
      <MyPrescriptionsPanel />
    </div>
  </div>
)}
```

**Step 6: Adicionar modal de sintoma no JSX (junto com `AddLifeEventModal`)**

```typescript
<ReportSymptomModal
  open={showSymptomModal}
  onClose={() => setShowSymptomModal(false)}
  onCreated={() => {/* sintoma aparece na timeline do profissional no próximo load */}}
/>
```

**Step 7: Verificar TypeScript**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

**Step 8: Commit**
```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/nav-items.ts dashboard/src/app/patient-home/page.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add symptom reporting card and medications section to patient-home"
```

---

## Task 4: Eventos de Vida pelo Profissional

**Files:**
- Modify: `backend/src/routes/lifeEvents.js`
- Modify: `dashboard/src/lib/api.ts`
- Modify: `dashboard/src/components/AddLifeEventModal.tsx`
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

### 4a — Backend

**Step 1: Nova rota `POST /api/life-events/:patientId` (profissional)**

Em `backend/src/routes/lifeEvents.js`, adicione ANTES de `module.exports`:

```javascript
// ---------------------------------------------------------------------------
// POST /api/life-events/:patientId
// Professional creates a life event for a patient
// ---------------------------------------------------------------------------

router.post(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('life_events'),
  lifeEventValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const { title, description, category, impact_level, event_date } = req.body;

      const result = await query(
        `INSERT INTO life_events (patient_id, title, description, category, impact_level, event_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.params.patientId, title, description || null, category, impact_level, event_date]
      );

      res.status(201).json({ life_event: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);
```

**Step 2: Verificar que `isUUID` e `requirePatientAccess` estão importados**

No topo de `lifeEvents.js`, verificar que existe:
```javascript
const { lifeEventValidator, handleValidation, isUUID } = require('../validators');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
```
Se `isUUID` não estiver importado, adicionar.

### 4b — API client

**Step 3: Adicionar `createForPatient` ao `lifeEventsApi` em `api.ts`**

Encontre `lifeEventsApi` (já existe) e adicione o método `createForPatient`:

```typescript
export const lifeEventsApi = {
  // ... métodos existentes (create, list) ...
  createForPatient: (patientId: string, data: CreateLifeEventInput) =>
    request<{ life_event: LifeEvent }>(`/life-events/${patientId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

### 4c — Modal adaptado

**Step 4: Adicionar prop `patientId` ao `AddLifeEventModal`**

Em `dashboard/src/components/AddLifeEventModal.tsx`:

Na interface de props, adicionar:
```typescript
interface AddLifeEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  patientId?: string; // se presente, profissional criando para paciente
}
```

No `handleSubmit`, alterar a chamada para:
```typescript
// Em vez de sempre chamar lifeEventsApi.create(...)
if (patientId) {
  await lifeEventsApi.createForPatient(patientId, {
    title: title.trim(),
    description: description.trim() || undefined,
    category,
    impact_level: impactLevel,
    event_date: eventDate,
  });
} else {
  await lifeEventsApi.create({
    title: title.trim(),
    description: description.trim() || undefined,
    category,
    impact_level: impactLevel,
    event_date: eventDate,
  });
}
```

Adicionar `patientId` à desestruturação de props:
```typescript
export default function AddLifeEventModal({ open, onClose, onCreated, patientId }: AddLifeEventModalProps)
```

### 4d — Botão no header do profissional

**Step 5: Adicionar botão "+ Evento" e modal em `patients/[id]/page.tsx`**

**Imports a adicionar** (se não existirem):
```typescript
import { Star } from 'lucide-react'; // já pode existir, verificar
```

**Estado a adicionar** (após outros estados de modal):
```typescript
const [showLifeEventModal, setShowLifeEventModal] = useState(false);
```

**Botão no header:** Localize a área do header do paciente onde fica o nome e status (por volta da linha 1190). Encontre o `<div className="text-right flex flex-col items-end gap-2">` e adicione um botão antes:

```typescript
<button
  onClick={() => setShowLifeEventModal(true)}
  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
>
  <Star size={12} />
  + Evento
</button>
```

**Modal no JSX** (antes do fechamento do return):
```typescript
<AddLifeEventModal
  open={showLifeEventModal}
  onClose={() => setShowLifeEventModal(false)}
  patientId={patientId}
  onCreated={() => {
    setShowLifeEventModal(false);
    // Reload timeline
    loadTimeline?.();
  }}
/>
```

**NOTA:** Se `loadTimeline` não existir como função separada, você pode fazer `loadAll()` ou chamar o fetch do timeline diretamente. Verifique como o reload é feito para outras ações neste arquivo.

**Step 6: Verificar TypeScript**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

**Step 7: Commit**
```bash
git -C /Users/luizaquintino/Desktop/Clarita add \
  backend/src/routes/lifeEvents.js \
  dashboard/src/lib/api.ts \
  dashboard/src/components/AddLifeEventModal.tsx \
  "dashboard/src/app/patients/[id]/page.tsx"
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: allow professionals to create life events for patients"
```

---

## Task 5: Aba Chat na view do profissional

**Files:**
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

### Contexto
`ChatPanel` recebe `conversation: Conversation` e `currentUserId: string`. O profissional precisa:
1. Buscar conversas existentes com este paciente (`chatApi.listConversations()`)
2. Filtrar pela que tem `patient_id === patientId`
3. Se não existir, criar com `chatApi.createConversation(patientUserId, patientId)`
4. Passar a conversa para `ChatPanel`

**PROBLEMA:** O profissional não tem diretamente o `userId` do paciente para criar a conversa — tem o `patientId` (UUID do paciente na tabela `patients`). Verificar se `patient.user_id` está no objeto `patient` já carregado. Se sim, usar diretamente.

**Step 1: Adicionar import de ChatPanel**

No topo do arquivo, adicionar:
```typescript
import ChatPanel from '@/components/ChatPanel';
```

**Step 2: Adicionar estado de chat**

Após os outros estados, adicionar:
```typescript
const [patientConversation, setPatientConversation] = useState<Conversation | null>(null);
const [chatLoading, setChatLoading] = useState(false);
```

**Step 3: Adicionar função `loadOrCreateConversation`**

```typescript
const loadOrCreateConversation = useCallback(async () => {
  if (patientConversation) return;
  setChatLoading(true);
  try {
    const res = await chatApi.listConversations();
    const raw = res as any;
    const convs: Conversation[] = Array.isArray(raw) ? raw : (raw?.conversations ?? []);
    const existing = convs.find((c) => c.patient_id === patientId);
    if (existing) {
      setPatientConversation(existing);
    } else {
      // patient object tem user_id? verificar estrutura
      const patientUserId = (patient as any)?.user_id;
      if (patientUserId) {
        const created = await chatApi.createConversation(patientUserId, patientId);
        const createdRaw = created as any;
        // Re-fetch conversations to get full Conversation object
        const res2 = await chatApi.listConversations();
        const raw2 = res2 as any;
        const convs2: Conversation[] = Array.isArray(raw2) ? raw2 : (raw2?.conversations ?? []);
        const newConv = convs2.find((c) => c.patient_id === patientId);
        if (newConv) setPatientConversation(newConv);
      }
    }
  } catch {
    // falha silenciosa — chat simplesmente não carrega
  } finally {
    setChatLoading(false);
  }
}, [patientId, patientConversation, patient]);
```

**Step 4: Adicionar aba 'chat' ao tipo Tab e tabs array**

No tipo `Tab`:
```typescript
type Tab = 'overview' | 'timeline' | 'assessments' | 'notes' | 'exams' | 'digital-twin' | 'anamnesis' | 'medications' | 'diagnostico' | 'insights' | 'chat';
```

No array `tabs` (procure onde ficam `{ key: 'notes', label: 'Notas', ... }`), adicionar APÓS 'notes':
```typescript
{ key: 'chat', label: 'Chat', icon: <MessageCircle size={16} /> },
```

Importar `MessageCircle` do lucide-react.

**Step 5: Adicionar renderização da aba**

No switch de renderização de tabs, adicionar:
```typescript
case 'chat':
  activeClass = 'tab-button bg-clarita-blue-500/20 text-clarita-blue-700 shadow-sm border border-clarita-blue-500/30';
  break;
```

No bloco de renderização de conteúdo:
```typescript
{activeTab === 'chat' && (
  <div className="card">
    {chatLoading ? (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-clarita-blue-400" />
      </div>
    ) : patientConversation && currentUserId ? (
      <ChatPanel
        conversation={patientConversation}
        currentUserId={currentUserId}
      />
    ) : (
      <div className="text-center py-12 text-gray-400 text-sm">
        Não foi possível carregar o chat com este paciente.
      </div>
    )}
  </div>
)}
```

**Step 6: Chamar `loadOrCreateConversation` quando aba chat é ativada**

Encontre onde `setActiveTab` é chamado (o `onClick` dos tabs) e adicione:
```typescript
onClick={() => {
  setActiveTab(tab.key as Tab);
  if (tab.key === 'chat') loadOrCreateConversation();
}}
```

**NOTA:** `currentUserId` precisa estar disponível no componente. Verifique se o user logado está carregado — provavelmente via `getUserRoleFromToken()` ou similar. Se não estiver como variável, use `getToken()` para decodificar o JWT e pegar o `sub` (userId).

**Step 7: Verificar TypeScript**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

**Step 8: Commit**
```bash
git -C /Users/luizaquintino/Desktop/Clarita add "dashboard/src/app/patients/[id]/page.tsx"
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add Chat tab to professional patient view"
```

---

## Task 6: Aba Insights na view do profissional

**Files:**
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

### Contexto
`InsightsPanel` já existe e recebe `insights: Insight[]`. O array `insights` já é carregado no componente (linha ~477). Só precisamos de uma nova aba que passe todos os insights (não só 2).

**Step 1: Adicionar aba 'insights' ao tipo Tab (já foi adicionado na Task 5)**

Verificar que `'insights'` já está no tipo `Tab`. Se não, adicionar.

**Step 2: Adicionar tab item**

No array `tabs`, adicionar (após 'chat' ou em posição adequada):
```typescript
{ key: 'insights', label: 'Insights', icon: <Sparkles size={16} /> },
```

Verificar que `Sparkles` está importado do lucide-react.

**Step 3: Adicionar estilo ativo para 'insights'**

No switch de `activeClass`:
```typescript
case 'insights':
  activeClass = 'tab-button bg-clarita-purple-500/20 text-clarita-purple-700 shadow-sm border border-clarita-purple-500/30';
  break;
```

**Step 4: Adicionar renderização**

```typescript
{activeTab === 'insights' && (
  <InsightsPanel
    insights={insights}
    loading={false}
  />
)}
```

**Step 5: Verificar TypeScript**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**
```bash
git -C /Users/luizaquintino/Desktop/Clarita add "dashboard/src/app/patients/[id]/page.tsx"
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add Insights tab to professional patient view"
```

---

## Task 7: Build final e push

**Step 1: Build completo**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npm run build 2>&1 | tail -30
```
Esperado: `✓ Compiled successfully` sem erros.

**Step 2: Push**
```bash
git -C /Users/luizaquintino/Desktop/Clarita push origin main
```

**Step 3: Verificar produção**

Aguardar ~3 minutos. Verificar `https://clarita.tec.br`:
- **Paciente:** seção Home → card "Relatar Sintoma" visível → clicar → modal com lista de sintomas
- **Paciente:** nav inferior → aba "Medicamentos" → 3 blocos visíveis
- **Profissional (João/Maria):** botão "+ Evento" no header → modal abre com formulário
- **Profissional (João/Maria):** aba "Chat" → chat carrega
- **Profissional (João/Maria):** aba "Insights" → lista completa de insights

---

## Notas de Implementação

- `symptomsApi` usa `/symptoms` e `/patient-symptoms` — rotas distintas registradas separadamente no backend
- `patient.user_id` — verificar se o objeto `patient` no componente tem `user_id`. Se não tiver, pode ser necessário buscá-lo via `GET /api/users/:patientId` ou via o objeto de relacionamento
- `currentUserId` no contexto profissional — usar `getUserIdFromToken()` se existir, ou decodificar o JWT token com `getToken()`
- Classes CSS: `btn-primary`, `btn-ghost`, `input-field`, `card` são globais no projeto
- `Pill` do lucide-react para o ícone de medicamentos na nav
- `MessageCircle` do lucide-react para o ícone de chat
- `Sparkles` já importado no `AISummaryCard` — verificar se está disponível globalmente ou importar localmente
