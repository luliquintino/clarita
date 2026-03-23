# Cockpit por Especialização Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adaptar a tela inicial do prontuário do paciente ao papel clínico — psiquiatra vê central de medicação/aderência, psicólogo vê ficha de prep de sessão gerada por IA.

**Architecture:** Frontend-only. Dois novos componentes (`PsychiatristCockpit`, `PsychologistSessionPrep`) integrados como primeira aba `'cockpit'` em `patients/[id]/page.tsx`, renderizada condicionalmente por role. Dados existentes — sem novos endpoints de backend necessários além de pequenas adições ao `api.ts`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Lucide React, dados já carregados via `api.ts`

---

## Task 1: Verificar e estender API client

**Files:**
- Modify: `dashboard/src/lib/api.ts`
- Read: `backend/src/routes/lifeEvents.js`
- Read: `backend/src/routes/patientSymptoms.js` (ou similar)

### Contexto

Precisamos verificar se existem endpoints para profissionais listarem life events e sintomas de um paciente específico, e adicionar métodos ao `api.ts` conforme necessário.

**Step 1: Verificar endpoints de life events para profissionais**

```bash
grep -n "router\.\(get\|post\|put\)" /Users/luizaquintino/Desktop/Clarita/backend/src/routes/lifeEvents.js
```

Esperado: ver se existe `GET /:patientId` além do `POST /:patientId` já adicionado.

**Step 2: Verificar endpoints de sintomas do paciente para profissionais**

```bash
ls /Users/luizaquintino/Desktop/Clarita/backend/src/routes/ | grep -i symptom
grep -rn "patient.symptoms\|patient_symptoms" /Users/luizaquintino/Desktop/Clarita/backend/src/routes/ | grep "router.get" | head -10
```

**Step 3: Verificar se existe clinicalNotesApi em api.ts**

```bash
grep -n "clinicalNotes\|ClinicalNote" /Users/luizaquintino/Desktop/Clarita/dashboard/src/lib/api.ts | head -10
```

**Step 4: Adicionar métodos ao api.ts**

Encontre `lifeEventsApi` (linha ~1130) e adicione `listForPatient` se o backend suportar:

```typescript
export const lifeEventsApi = {
  create: (...) => ...,
  createForPatient: (...) => ...,
  list: () => ...,
  // ADICIONAR:
  listForPatient: (patientId: string) =>
    request<{ life_events: LifeEvent[] }>(`/life-events/patient/${patientId}`),
};
```

**NOTA:** Só adicione se o backend tiver a rota. Se não tiver, use `lifeEventsApi.list()` e filtre no cliente — não é ideal mas funciona para a primeira versão.

Encontre `symptomsApi` (linha ~1168) e adicione `listForPatient`:

```typescript
export const symptomsApi = {
  list: () => ...,
  report: (...) => ...,
  // ADICIONAR (se o backend tiver GET /patient-symptoms/:patientId):
  listForPatient: (patientId: string) =>
    request<{ patient_symptoms: PatientSymptom[] }>(`/patient-symptoms/${patientId}`),
};
```

**Se não houver endpoint de profissional para sintomas,** omita o método — o bloco de sintomas no cockpit do psiquiatra simplesmente não existirá.

Adicione `clinicalNotesApi` se não existir:

```typescript
// ---------------------------------------------------------------------------
// Clinical Notes
// ---------------------------------------------------------------------------

export interface ClinicalNote {
  id: string;
  patient_id: string;
  professional_id: string;
  session_date: string;
  note_type: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

export const clinicalNotesApi = {
  list: (patientId: string, params?: { note_type?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.note_type) qs.set('note_type', params.note_type);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ clinical_notes: ClinicalNote[] }>(`/clinical-notes/${patientId}${query}`);
  },
};
```

**Step 5: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

Esperado: zero erros.

**Step 6: Commit**

```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/lib/api.ts
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: extend api.ts with clinicalNotesApi and professional symptom/life-event methods"
```

---

## Task 2: Componente `PsychiatristCockpit.tsx`

**Files:**
- Create: `dashboard/src/components/PsychiatristCockpit.tsx`

### Contexto

O cockpit do psiquiatra exibe 4 blocos: aderência, medicações ativas, alertas de não-aderência, e sintomas recentes. Todos os dados vêm de APIs já existentes.

**APIs usadas:**
- `prescriptionsApi.list(patientId)` → `{ prescriptions: Prescription[] }`
- `alertsApi.list({ patient_id: patientId })` → lista de alertas
- `symptomsApi.listForPatient(patientId)` → sintomas (se existir; senão omitir bloco)

**Step 1: Criar o componente**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Pill, Bell, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { prescriptionsApi, alertsApi, symptomsApi, type Prescription, type PatientSymptom } from '@/lib/api';

interface PsychiatristCockpitProps {
  patientId: string;
}

interface Alert {
  id: string;
  message: string;
  severity: string;
  alert_type?: string;
  created_at: string;
}

export default function PsychiatristCockpit({ patientId }: PsychiatristCockpitProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [symptoms, setSymptoms] = useState<PatientSymptom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [presRes, alertRes] = await Promise.allSettled([
          prescriptionsApi.list(patientId),
          alertsApi.list({ patient_id: patientId }),
        ]);

        if (presRes.status === 'fulfilled') {
          const raw = presRes.value as any;
          setPrescriptions(Array.isArray(raw) ? raw : (raw?.prescriptions ?? []));
        }
        if (alertRes.status === 'fulfilled') {
          const raw = alertRes.value as any;
          const all: Alert[] = Array.isArray(raw) ? raw : (raw?.alerts ?? []);
          setAlerts(all);
        }

        // Sintomas — opcional, só se o método existir
        if ('listForPatient' in symptomsApi) {
          const symRes = await (symptomsApi as any).listForPatient(patientId).catch(() => null);
          if (symRes) {
            const raw = symRes as any;
            setSymptoms(Array.isArray(raw) ? raw : (raw?.patient_symptoms ?? []));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  // Calcula % de aderência aproximada: prescrições ativas vs. alertas de não-aderência
  const activePrescriptions = prescriptions.filter((p: any) => p.status === 'active' || !p.status);
  const adherenceAlerts = alerts.filter((a) =>
    a.alert_type === 'medication' || a.alert_type === 'adherence' ||
    a.message?.toLowerCase().includes('dose') || a.message?.toLowerCase().includes('medicação')
  );

  // Aderência estimada simples: se tem prescrições ativas e sem alertas = alto; com alertas = proporcional
  const adherencePct = activePrescriptions.length === 0
    ? null
    : adherenceAlerts.length === 0
    ? 100
    : Math.max(0, Math.round(100 - (adherenceAlerts.length / activePrescriptions.length) * 30));

  const adherenceColor = adherencePct === null
    ? 'bg-gray-200'
    : adherencePct >= 80
    ? 'bg-emerald-500'
    : adherencePct >= 50
    ? 'bg-amber-500'
    : 'bg-red-500';

  const adherenceText = adherencePct === null
    ? 'Sem prescrições'
    : adherencePct >= 80
    ? 'Boa aderência'
    : adherencePct >= 50
    ? 'Aderência moderada'
    : 'Baixa aderência';

  const recentSymptoms = symptoms.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-clarita-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Bloco 1 — Aderência */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-clarita-blue-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Aderência da Semana</h3>
          </div>
          {adherencePct === null ? (
            <p className="text-sm text-gray-400">Nenhuma prescrição ativa</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-800">{adherencePct}%</span>
                <span className="text-xs text-gray-500">{adherenceText}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${adherenceColor}`}
                  style={{ width: `${adherencePct}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Bloco 2 — Medicações ativas */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pill size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Medicações Ativas</h3>
          </div>
          {activePrescriptions.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma prescrição ativa</p>
          ) : (
            <ul className="space-y-2">
              {activePrescriptions.slice(0, 4).map((p: any) => (
                <li key={p.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {p.medications?.[0]?.name ?? p.medication_name ?? 'Medicação'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.medications?.[0]?.dosage} · {p.medications?.[0]?.frequency}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    ativo
                  </span>
                </li>
              ))}
              {activePrescriptions.length > 4 && (
                <p className="text-xs text-gray-400">+{activePrescriptions.length - 4} mais</p>
              )}
            </ul>
          )}
        </div>

        {/* Bloco 3 — Alertas */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-red-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Alertas de Aderência</h3>
          </div>
          {adherenceAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 size={14} />
              Sem alertas recentes
            </div>
          ) : (
            <ul className="space-y-2">
              {adherenceAlerts.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-700">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bloco 4 — Sintomas recentes */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Sintomas Relatados</h3>
          </div>
          {recentSymptoms.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum sintoma relatado recentemente</p>
          ) : (
            <ul className="space-y-2">
              {recentSymptoms.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700">
                    {s.symptom?.name ?? s.symptom_name ?? 'Sintoma'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    s.severity >= 8 ? 'bg-red-100 text-red-700' :
                    s.severity >= 5 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {s.severity}/10
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -20
```

Esperado: zero erros.

**Step 3: Commit**

```bash
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/PsychiatristCockpit.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add PsychiatristCockpit component with medication and adherence overview"
```

---

## Task 3: Componente `PsychologistSessionPrep.tsx`

**Files:**
- Create: `dashboard/src/components/PsychologistSessionPrep.tsx`

### Contexto

O prep de sessão do psicólogo exibe: tempo desde a última sessão, tendência emocional, eventos de vida no período, metas em progresso, e briefing de IA sob demanda.

**APIs usadas:**
- `clinicalNotesApi.list(patientId, { limit: 1 })` → última nota para calcular `daysSinceLastNote`
- `patientsApi.getEmotionalLogs(patientId, daysSinceLastNote)` → dados para EmotionalChart
- `lifeEventsApi.listForPatient(patientId)` OU `lifeEventsApi.list()` (filtrar no cliente)
- `goalsApi.list(patientId)` → metas
- `summariesApi.generate(patientId, daysSinceLastNote)` → briefing de IA (sob demanda)

**Step 1: Criar o componente**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Calendar, TrendingUp, Star, Target, Sparkles, FileText, Clock } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clinicalNotesApi, patientsApi, lifeEventsApi, goalsApi, summariesApi } from '@/lib/api';
import EmotionalChart from '@/components/EmotionalChart';

interface PsychologistSessionPrepProps {
  patientId: string;
  onStartNote?: () => void;
}

export default function PsychologistSessionPrep({ patientId, onStartNote }: PsychologistSessionPrepProps) {
  const [loading, setLoading] = useState(true);
  const [daysSinceLastNote, setDaysSinceLastNote] = useState<number>(30);
  const [lastNoteDate, setLastNoteDate] = useState<string | null>(null);
  const [emotionalLogs, setEmotionalLogs] = useState<any[]>([]);
  const [lifeEvents, setLifeEvents] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [checkInCount, setCheckInCount] = useState(0);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1. Última nota clínica → daysSinceLastNote
        const notesRes = await clinicalNotesApi.list(patientId, { limit: 1 }).catch(() => null);
        const notesRaw = notesRes as any;
        const notes: any[] = Array.isArray(notesRaw) ? notesRaw : (notesRaw?.clinical_notes ?? []);
        let days = 30;
        let lastDate: string | null = null;
        if (notes.length > 0) {
          lastDate = notes[0].session_date ?? notes[0].created_at;
          if (lastDate) {
            days = Math.max(1, differenceInDays(new Date(), parseISO(lastDate)));
          }
        }
        setDaysSinceLastNote(days);
        setLastNoteDate(lastDate);

        // 2. Carregar dados em paralelo
        const [logsRes, eventsRes, goalsRes] = await Promise.allSettled([
          patientsApi.getEmotionalLogs(patientId, days),
          lifeEventsApi.list(),
          goalsApi.list(patientId),
        ]);

        if (logsRes.status === 'fulfilled') {
          const raw = logsRes.value as any;
          const logs = Array.isArray(raw) ? raw : (raw?.emotional_logs ?? []);
          setEmotionalLogs(logs);
          setCheckInCount(logs.length);
        }

        if (eventsRes.status === 'fulfilled') {
          const raw = eventsRes.value as any;
          const all: any[] = Array.isArray(raw) ? raw : (raw?.life_events ?? []);
          // Filtrar eventos no período
          const sinceDate = lastDate ? parseISO(lastDate) : new Date(Date.now() - days * 86400000);
          setLifeEvents(all.filter((e) => parseISO(e.event_date ?? e.created_at) >= sinceDate));
        }

        if (goalsRes.status === 'fulfilled') {
          const raw = goalsRes.value as any;
          setGoals(Array.isArray(raw) ? raw : (raw?.goals ?? []));
        }

      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  const handleGenerateBriefing = useCallback(async () => {
    setGeneratingBriefing(true);
    try {
      const res = await summariesApi.generate(patientId, daysSinceLastNote);
      const raw = res as any;
      setBriefing(raw?.summary?.content ?? raw?.content ?? raw?.summary ?? 'Briefing gerado.');
    } catch {
      setBriefing('Não foi possível gerar o briefing. Tente novamente.');
    } finally {
      setGeneratingBriefing(false);
    }
  }, [patientId, daysSinceLastNote]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-clarita-blue-400" />
      </div>
    );
  }

  const completedGoals = goals.filter((g: any) => g.status === 'completed' || g.status === 'achieved');
  const activeGoals = goals.filter((g: any) => g.status === 'active' || g.status === 'in_progress');
  const stalledGoals = activeGoals.filter((g: any) => {
    const updated = g.updated_at ?? g.created_at;
    if (!updated) return false;
    return differenceInDays(new Date(), parseISO(updated)) > 7;
  });

  return (
    <div className="space-y-4">

      {/* Botão principal */}
      <div className="flex justify-end">
        <button
          onClick={onStartNote}
          className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
        >
          <FileText size={14} />
          Iniciar Nota de Sessão
        </button>
      </div>

      {/* Card 1 — Desde a última sessão */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-clarita-blue-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Desde a última sessão</h3>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-3xl font-bold text-clarita-blue-600">{daysSinceLastNote}</p>
            <p className="text-xs text-gray-500">dias</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{checkInCount}</p>
            <p className="text-xs text-gray-500">check-ins</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{lifeEvents.length}</p>
            <p className="text-xs text-gray-500">eventos de vida</p>
          </div>
        </div>
        {lastNoteDate && (
          <p className="text-xs text-gray-400 mt-3">
            Última sessão: {format(parseISO(lastNoteDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}
      </div>

      {/* Card 2 — Tendência emocional */}
      {emotionalLogs.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Tendência emocional no período</h3>
          </div>
          <EmotionalChart data={emotionalLogs} />
        </div>
      )}

      {/* Card 3 — Eventos de vida */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star size={16} className="text-amber-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Eventos de vida registrados</h3>
        </div>
        {lifeEvents.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum evento registrado desde a última sessão</p>
        ) : (
          <ul className="space-y-2">
            {lifeEvents.slice(0, 5).map((e: any) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="text-base">{
                  e.category === 'relationship' ? '💑' :
                  e.category === 'work' ? '💼' :
                  e.category === 'health' ? '🏥' :
                  e.category === 'achievement' ? '🏆' :
                  e.category === 'loss' ? '💔' :
                  e.category === 'travel' ? '✈️' :
                  e.category === 'family' ? '👨‍👩‍👧' : '⭐'
                }</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                  <p className="text-xs text-gray-500">
                    {e.event_date ? format(parseISO(e.event_date), "d MMM", { locale: ptBR }) : ''} · Impacto {e.impact_level}/10
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Card 4 — Metas */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-clarita-purple-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Metas terapêuticas</h3>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma meta cadastrada</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {completedGoals.length > 0 && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                {completedGoals.length} concluída{completedGoals.length > 1 ? 's' : ''}
              </span>
            )}
            {activeGoals.length > 0 && (
              <span className="text-xs bg-clarita-blue-50 text-clarita-blue-700 px-2.5 py-1 rounded-full font-medium">
                {activeGoals.length} em andamento
              </span>
            )}
            {stalledGoals.length > 0 && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                ⚠ {stalledGoals.length} parada{stalledGoals.length > 1 ? 's' : ''} há +7 dias
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card 5 — Briefing de IA */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-clarita-purple-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Briefing de IA</h3>
        </div>
        {briefing ? (
          <p className="text-sm text-gray-700 leading-relaxed">{briefing}</p>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-gray-400">
              Gere um resumo do período com análise de padrões emocionais, eventos de vida e progresso terapêutico.
            </p>
            <button
              onClick={handleGenerateBriefing}
              disabled={generatingBriefing}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              {generatingBriefing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generatingBriefing ? 'Gerando...' : 'Gerar briefing'}
            </button>
          </div>
        )}
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
git -C /Users/luizaquintino/Desktop/Clarita add dashboard/src/components/PsychologistSessionPrep.tsx
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add PsychologistSessionPrep component with AI briefing and session context"
```

---

## Task 4: Integrar cockpit em `patients/[id]/page.tsx`

**Files:**
- Modify: `dashboard/src/app/patients/[id]/page.tsx`

### Contexto

O `Tab` type atual é (linha 73):
```typescript
type Tab = 'overview' | 'timeline' | 'assessments' | 'notes' | 'exams' | 'digital-twin' | 'anamnesis' | 'medications' | 'diagnostico';
```

O `activeTab` default é `'overview'` (linha 460). O `userRole` é detectado via `getUserRoleFromToken()` (linha 462). O array `tabs` fica nas linhas 1013-1027. O rendering condicional começa na linha 1355.

**Step 1: Adicionar imports**

No topo do arquivo, adicionar após os imports existentes de componentes:

```typescript
import PsychiatristCockpit from '@/components/PsychiatristCockpit';
import PsychologistSessionPrep from '@/components/PsychologistSessionPrep';
import { Stethoscope } from 'lucide-react'; // verificar se já existe
```

**NOTA:** Verifique se `Stethoscope` já está importado do lucide-react antes de adicionar.

**Step 2: Atualizar o tipo `Tab`**

Encontre a linha:
```typescript
type Tab = 'overview' | 'timeline' | ...
```

Altere para:
```typescript
type Tab = 'cockpit' | 'overview' | 'timeline' | 'assessments' | 'notes' | 'exams' | 'digital-twin' | 'anamnesis' | 'medications' | 'diagnostico';
```

**Step 3: Adicionar variáveis de role**

Logo após `const [userRole] = useState(...)` (linha ~462), adicionar:
```typescript
const isPsychiatrist = userRole === 'psychiatrist';
const isPsychologist = userRole === 'psychologist';
const showCockpit = isPsychiatrist || isPsychologist;
```

**Step 4: Atualizar o default de `activeTab`**

Mude a linha do `useState<Tab>('overview')` para:
```typescript
const [activeTab, setActiveTab] = useState<Tab>(
  (() => {
    const role = getUserRoleFromToken();
    return (role === 'psychiatrist' || role === 'psychologist') ? 'cockpit' : 'overview';
  })()
);
```

**Step 5: Adicionar aba `cockpit` ao array `tabs`**

Encontre o array `tabs` (linhas 1013-1027) e adicione como primeiro item condicional:

```typescript
const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  ...(showCockpit ? [{
    key: 'cockpit' as Tab,
    label: isPsychiatrist ? 'Prontuário' : 'Prep de Sessão',
    icon: <Stethoscope size={16} />,
  }] : []),
  { key: 'overview', label: 'Visão Geral', icon: <Activity size={16} /> },
  // ... resto do array inalterado
];
```

**Step 6: Adicionar renderização do cockpit**

Encontre onde começa o bloco de renderização condicional (`{activeTab === 'overview' && ...}`, linha ~1355) e adicione ANTES dele:

```typescript
{activeTab === 'cockpit' && isPsychiatrist && (
  <PsychiatristCockpit patientId={patientId} />
)}
{activeTab === 'cockpit' && isPsychologist && (
  <PsychologistSessionPrep
    patientId={patientId}
    onStartNote={() => setActiveTab('notes')}
  />
)}
```

**Step 7: Adicionar `activeClass` para cockpit no switch**

Encontre onde o `activeClass` é determinado para cada tab (switch ou if/else). Adicione:
```typescript
case 'cockpit':
  activeClass = 'tab-button bg-clarita-blue-500/20 text-clarita-blue-700 shadow-sm border border-clarita-blue-500/30';
  break;
```

**Step 8: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1 | head -30
```

Esperado: zero erros. Se houver erros de tipo no `activeTab` default (porque `getUserRoleFromToken` é chamado antes de estar no estado), simplesmente mude para:

```typescript
const [activeTab, setActiveTab] = useState<Tab>(() =>
  (['psychiatrist', 'psychologist'].includes(getUserRoleFromToken() ?? '') ? 'cockpit' : 'overview')
);
```

**Step 9: Commit**

```bash
git -C /Users/luizaquintino/Desktop/Clarita add "dashboard/src/app/patients/[id]/page.tsx"
git -C /Users/luizaquintino/Desktop/Clarita commit -m "feat: add role-specific cockpit tab as default view for psychiatrist and psychologist"
```

---

## Task 5: Build final e push

**Step 1: Build completo**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npm run build 2>&1 | tail -30
```

Esperado: `✓ Compiled successfully` sem erros.

**Step 2: Push**

```bash
git -C /Users/luizaquintino/Desktop/Clarita push origin main
```

**Step 3: Verificação em produção**

Aguardar ~3 minutos e verificar `https://clarita.tec.br`:

- **Login como psiquiatra (Pedro)** → abrir prontuário de Maria ou João → primeira aba = "Prontuário" → 4 blocos visíveis (aderência, medicações, alertas, sintomas)
- **Login como psicóloga (Ana)** → abrir prontuário → primeira aba = "Prep de Sessão" → cards de dias/check-ins/eventos, gráfico emocional, metas, botão "Gerar briefing"
- **Clicar "Gerar briefing"** → loading → texto de IA aparece
- **Clicar "Iniciar Nota de Sessão"** → muda para aba "Notas"
- **Outras abas** → continuam funcionando normalmente (sem regressão)

---

## Notas de Implementação

- `date-fns` já está instalado no projeto — usar `differenceInDays`, `parseISO`, `format`, `ptBR`
- Classes CSS globais: `btn-primary`, `btn-ghost`, `card` — disponíveis via `globals.css`
- `patientsApi.getEmotionalLogs(patientId, days)` — verificar se o segundo argumento é `days` ou `{ days }` lendo a definição em `api.ts`
- Se `Stethoscope` não existir no lucide-react, usar `Briefcase` ou `Activity` como fallback
- O `summariesApi.generate(patientId, periodDays)` — verificar a assinatura exata em `api.ts`; pode ser `generate(patientId: string, periodDays?: number)` ou `generate({ patientId, period_days })`
- `Promise.allSettled` é preferível a `Promise.all` para não quebrar o cockpit inteiro se uma API falhar
