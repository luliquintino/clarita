# AI Summary Psicólogo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o "Briefing de IA" compacto no `PsychologistSessionPrep` por um `PatientAISummary` completo que agrega todos os dados do paciente e gera texto narrativo via Claude API com seletor de período.

**Architecture:** Componente `PatientAISummary.tsx` autônomo (carrega seus dados, gerencia período, exibe chips + texto IA) integrado como Card 5 do `PsychologistSessionPrep`. Backend expande o `summaryService.js` para agregar `emotional_logs`, `life_events`, `patient_symptoms`, `assessment_results` e `goals`, e chama `claude-haiku-4-5` via `@anthropic-ai/sdk`; fallback para lógica manual quando `ANTHROPIC_API_KEY` ausente.

**Tech Stack:** Node.js/Express (backend), `@anthropic-ai/sdk`, Next.js 14 + TypeScript + Tailwind (frontend), PostgreSQL (Neon), date-fns, lucide-react

---

## Task 1: Backend — Instalar Anthropic SDK e configurar env

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env` (adicionar linha)

**Step 1: Instalar o SDK**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend && npm install @anthropic-ai/sdk
```

Expected output: `added X packages` sem erros.

**Step 2: Adicionar a variável de ambiente**

Abrir `backend/.env` e adicionar no final:
```
ANTHROPIC_API_KEY=
```
(deixar vazia por enquanto — fallback automático quando vazia)

**Step 3: Verificar instalação**

```bash
node -e "const Anthropic = require('@anthropic-ai/sdk'); console.log('OK');"
```

Expected: `OK`

**Step 4: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add backend/package.json backend/package-lock.json
git commit -m "feat: add @anthropic-ai/sdk to backend dependencies"
```

---

## Task 2: Backend — Expandir `summaryService.js`

**Files:**
- Modify: `backend/src/services/summaryService.js`

O arquivo atual só consulta `emotional_logs`. Vamos reescrever `generatePatientSummary` para:
1. Aceitar `startDate`/`endDate` como objetos `Date` (em vez de calcular a partir de `periodDays`)
2. Agregar dados de 5 tabelas em paralelo
3. Chamar Claude API se key presente, ou gerar texto manual rico como fallback

**Step 1: Reescrever `generatePatientSummary`**

Substituir o conteúdo completo de `backend/src/services/summaryService.js` pelo código abaixo:

```js
'use strict';

const { query } = require('../config/database');

/**
 * Generate a patient summary using all available data sources.
 * Uses Claude API if ANTHROPIC_API_KEY is set, otherwise falls back to manual logic.
 */
async function generatePatientSummary(patientId, periodDaysOrStartDate = 7, endDateArg = null) {
  let startDate, endDate;

  if (endDateArg instanceof Date) {
    startDate = periodDaysOrStartDate;
    endDate = endDateArg;
  } else {
    endDate = new Date();
    startDate = new Date(endDate.getTime() - periodDaysOrStartDate * 24 * 60 * 60 * 1000);
  }

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  const startDate_ = startDate.toISOString().split('T')[0];
  const endDate_ = endDate.toISOString().split('T')[0];

  // Aggregate all data in parallel
  const [logsResult, symptomsResult, eventsResult, goalsResult, assessmentsResult] =
    await Promise.allSettled([
      query(
        `SELECT mood_score, anxiety_score, energy_score, sleep_hours, journal_entry, logged_at
         FROM emotional_logs
         WHERE patient_id = $1 AND logged_at >= $2 AND logged_at <= $3
         ORDER BY logged_at DESC`,
        [patientId, startISO, endISO]
      ),
      query(
        `SELECT ps.severity, ps.reported_at, s.name AS symptom_name, s.category
         FROM patient_symptoms ps
         JOIN symptoms s ON s.id = ps.symptom_id
         WHERE ps.patient_id = $1 AND ps.reported_at >= $2 AND ps.reported_at <= $3
         ORDER BY ps.reported_at DESC`,
        [patientId, startISO, endISO]
      ),
      query(
        `SELECT title, category, impact_level, event_date
         FROM life_events
         WHERE patient_id = $1 AND event_date >= $2 AND event_date <= $3
         ORDER BY event_date DESC`,
        [patientId, startDate_, endDate_]
      ),
      query(
        `SELECT title, status FROM goals
         WHERE patient_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [patientId]
      ),
      query(
        `SELECT type, score, severity, timestamp
         FROM assessment_results
         WHERE patient_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp DESC`,
        [patientId, startISO, endISO]
      ),
    ]);

  const logs = logsResult.status === 'fulfilled' ? logsResult.value.rows : [];
  const symptoms = symptomsResult.status === 'fulfilled' ? symptomsResult.value.rows : [];
  const events = eventsResult.status === 'fulfilled' ? eventsResult.value.rows : [];
  const goals = goalsResult.status === 'fulfilled' ? goalsResult.value.rows : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value.rows : [];

  // Calculate emotional averages
  const avgMood = logs.length
    ? parseFloat((logs.reduce((s, l) => s + l.mood_score, 0) / logs.length).toFixed(1))
    : null;
  const avgAnxiety = logs.length
    ? parseFloat((logs.reduce((s, l) => s + l.anxiety_score, 0) / logs.length).toFixed(1))
    : null;
  const avgEnergy = logs.length
    ? parseFloat((logs.reduce((s, l) => s + l.energy_score, 0) / logs.length).toFixed(1))
    : null;
  const sleepLogs = logs.filter((l) => l.sleep_hours);
  const avgSleep = sleepLogs.length
    ? parseFloat(
        (sleepLogs.reduce((s, l) => s + parseFloat(l.sleep_hours), 0) / sleepLogs.length).toFixed(1)
      )
    : null;

  // Mood trend
  let moodTrend = 'estável';
  if (logs.length >= 2) {
    const firstHalf = logs.slice(Math.floor(logs.length / 2));
    const secondHalf = logs.slice(0, Math.floor(logs.length / 2));
    const firstAvg = firstHalf.reduce((s, l) => s + l.mood_score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, l) => s + l.mood_score, 0) / secondHalf.length;
    moodTrend = secondAvg > firstAvg + 0.5 ? 'melhora' : secondAvg < firstAvg - 0.5 ? 'declínio' : 'estável';
  }

  const journalEntries = logs.filter((l) => l.journal_entry).map((l) => l.journal_entry);

  // Build summary data object
  const summaryData = {
    period: { start: startDate_, end: endDate_ },
    emotional: {
      log_count: logs.length,
      avg_mood: avgMood,
      avg_anxiety: avgAnxiety,
      avg_energy: avgEnergy,
      avg_sleep: avgSleep,
      mood_trend: moodTrend,
      journal_count: journalEntries.length,
    },
    symptoms: symptoms.map((s) => ({
      name: s.symptom_name,
      category: s.category,
      severity: s.severity,
      date: s.reported_at,
    })),
    life_events: events.map((e) => ({
      title: e.title,
      category: e.category,
      impact: e.impact_level,
      date: e.event_date,
    })),
    goals: {
      in_progress: goals.filter((g) => g.status === 'in_progress').map((g) => g.title),
      achieved: goals.filter((g) => g.status === 'achieved').map((g) => g.title),
    },
    assessments: assessments.map((a) => ({
      type: a.type,
      score: a.score,
      severity: a.severity,
      date: a.timestamp,
    })),
  };

  const summaryText = process.env.ANTHROPIC_API_KEY
    ? await generateWithClaude(summaryData)
    : generateManualSummary(summaryData);

  // Save to journal_summaries
  const saved = await query(
    `INSERT INTO journal_summaries (patient_id, summary_text, period_start, period_end)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [patientId, summaryText, startDate_, endDate_]
  );

  return {
    ...saved.rows[0],
    data: {
      log_count: logs.length,
      avg_mood: avgMood,
      avg_anxiety: avgAnxiety,
      avg_energy: avgEnergy,
      avg_sleep: avgSleep,
      mood_trend: moodTrend,
      journal_count: journalEntries.length,
    },
  };
}

async function generateWithClaude(data) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Você é um assistente clínico de apoio a psicólogos. Abaixo estão os dados registrados pelo paciente no período ${data.period.start} a ${data.period.end}.

Escreva um resumo clínico em português brasileiro para o psicólogo responsável, em 3-4 parágrafos curtos:
1. Padrão emocional geral (humor, ansiedade, energia, sono)
2. Sintomas relatados e eventos de vida relevantes no período
3. Progresso nas metas terapêuticas
4. Alertas ou pontos de atenção clínica (se houver)

Se não houver dados em alguma área, mencione brevemente e passe para a próxima. Seja objetivo, factual e clínico. Use linguagem acessível, sem julgamentos.

DADOS DO PERÍODO:
${JSON.stringify(data, null, 2)}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0].text;
  } catch (err) {
    console.error('[SummaryService] Claude API error:', err.message);
    return generateManualSummary(data);
  }
}

function generateManualSummary(data) {
  const lines = [];
  const { emotional, symptoms, life_events, goals, assessments, period } = data;

  lines.push(`Resumo do período ${period.start} a ${period.end}:`);
  lines.push('');

  if (emotional.log_count > 0) {
    lines.push(`**Padrão emocional (${emotional.log_count} registros):**`);
    if (emotional.avg_mood !== null)
      lines.push(`Humor médio: ${emotional.avg_mood}/10 (${emotional.mood_trend})`);
    if (emotional.avg_anxiety !== null)
      lines.push(`Ansiedade média: ${emotional.avg_anxiety}/10`);
    if (emotional.avg_energy !== null)
      lines.push(`Energia média: ${emotional.avg_energy}/10`);
    if (emotional.avg_sleep !== null)
      lines.push(`Sono médio: ${emotional.avg_sleep}h`);
    if (emotional.avg_anxiety >= 7)
      lines.push('⚠️ Ansiedade elevada no período.');
    if (emotional.avg_mood <= 4)
      lines.push('⚠️ Humor consistentemente baixo.');
    if (emotional.avg_sleep !== null && emotional.avg_sleep < 6)
      lines.push('⚠️ Sono insuficiente (menos de 6h em média).');
    lines.push('');
  } else {
    lines.push('Nenhum check-in emocional registrado neste período.');
    lines.push('');
  }

  if (symptoms.length > 0) {
    lines.push(`**Sintomas relatados (${symptoms.length}):**`);
    symptoms.slice(0, 5).forEach((s) => {
      lines.push(`• ${s.name} — intensidade ${s.severity}/10`);
    });
    lines.push('');
  }

  if (life_events.length > 0) {
    lines.push(`**Eventos de vida (${life_events.length}):**`);
    life_events.slice(0, 3).forEach((e) => {
      lines.push(`• ${e.title} (impacto ${e.impact}/10)`);
    });
    lines.push('');
  }

  if (goals.in_progress.length > 0 || goals.achieved.length > 0) {
    lines.push(`**Metas:** ${goals.in_progress.length} em andamento · ${goals.achieved.length} concluídas`);
    lines.push('');
  }

  if (assessments.length > 0) {
    lines.push('**Avaliações no período:**');
    assessments.forEach((a) => {
      lines.push(`• ${a.type}: ${a.score} pontos (${a.severity})`);
    });
  }

  return lines.join('\n');
}

/**
 * Compile a professional brief for a patient.
 */
async function compileProfessionalBrief(patientId) {
  const [emotionalResult, medsResult, alertsResult, goalsResult] = await Promise.allSettled([
    query(
      `SELECT
        ROUND(AVG(mood_score), 1) AS avg_mood,
        ROUND(AVG(anxiety_score), 1) AS avg_anxiety,
        ROUND(AVG(energy_score), 1) AS avg_energy,
        ROUND(AVG(sleep_hours), 1) AS avg_sleep,
        COUNT(*) AS log_count,
        MIN(mood_score) AS min_mood,
        MAX(mood_score) AS max_mood
      FROM emotional_logs
      WHERE patient_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'`,
      [patientId]
    ),
    query(
      `SELECT pm.id, m.name AS medication_name, pm.dosage, pm.frequency, pm.status
       FROM patient_medications pm
       JOIN medications m ON m.id = pm.medication_id
       WHERE pm.patient_id = $1 AND pm.status = 'active'`,
      [patientId]
    ),
    query(
      `SELECT id, alert_type, title, severity, created_at
       FROM alerts
       WHERE patient_id = $1 AND is_acknowledged = false
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
      [patientId]
    ),
    query(
      `SELECT id, title, status, target_date FROM goals
       WHERE patient_id = $1 AND status = 'in_progress'
       ORDER BY created_at DESC`,
      [patientId]
    ),
  ]);

  const emotional = emotionalResult.status === 'fulfilled' ? emotionalResult.value.rows[0] : {};
  const medications = medsResult.status === 'fulfilled' ? medsResult.value.rows : [];
  const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value.rows : [];
  const goals = goalsResult.status === 'fulfilled' ? goalsResult.value.rows : [];

  return {
    emotional: {
      avg_mood: parseFloat(emotional.avg_mood) || 0,
      avg_anxiety: parseFloat(emotional.avg_anxiety) || 0,
      avg_energy: parseFloat(emotional.avg_energy) || 0,
      avg_sleep: parseFloat(emotional.avg_sleep) || 0,
      log_count: parseInt(emotional.log_count) || 0,
      min_mood: parseInt(emotional.min_mood) || 0,
      max_mood: parseInt(emotional.max_mood) || 0,
    },
    medications,
    alerts,
    goals,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { generatePatientSummary, compileProfessionalBrief };
```

**Step 2: Verificar sintaxe do arquivo**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
node -e "require('./src/services/summaryService'); console.log('OK')"
```

Expected: `OK` (sem erros de syntax)

**Step 3: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add backend/src/services/summaryService.js
git commit -m "feat: expand summaryService to aggregate all patient data and use Claude API"
```

---

## Task 3: Backend — Atualizar rota para aceitar `start_date`/`end_date`

**Files:**
- Modify: `backend/src/routes/summaries.js` (linhas 18-36)

**Step 1: Atualizar o handler do POST**

Localizar o bloco:
```js
const { period_days = 7 } = req.body;
const summary = await generatePatientSummary(patientId, parseInt(period_days, 10));
```

Substituir por:
```js
const { period_days = 7, start_date, end_date } = req.body;

let startDate, endDate;
if (start_date && end_date) {
  startDate = new Date(start_date);
  endDate = new Date(end_date);
  // set end to end of day
  endDate.setHours(23, 59, 59, 999);
} else {
  endDate = new Date();
  startDate = new Date(endDate.getTime() - parseInt(period_days, 10) * 24 * 60 * 60 * 1000);
}

const summary = await generatePatientSummary(patientId, startDate, endDate);
```

**Step 2: Verificar sintaxe**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
node -e "require('./src/routes/summaries'); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add backend/src/routes/summaries.js
git commit -m "feat: summaries route accepts start_date/end_date parameters"
```

---

## Task 4: Frontend — Atualizar `summariesApi` para enviar `start_date`/`end_date`

**Files:**
- Modify: `dashboard/src/lib/api.ts` (bloco `summariesApi`)

**Step 1: Atualizar a função `generate`**

Localizar:
```ts
export const summariesApi = {
  generate: (patientId: string, periodDays?: number) =>
    request<{ summary: PatientSummary }>(`/summaries/${patientId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ period_days: periodDays || 7 }),
    }),
```

Substituir por:
```ts
export const summariesApi = {
  generate: (
    patientId: string,
    period: { periodDays: number } | { startDate: string; endDate: string }
  ) =>
    request<{ summary: PatientSummary }>(`/summaries/${patientId}/generate`, {
      method: 'POST',
      body: JSON.stringify(
        'periodDays' in period
          ? { period_days: period.periodDays }
          : { start_date: period.startDate, end_date: period.endDate }
      ),
    }),
```

**Step 2: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit
```

Expected: zero erros

**Step 3: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/lib/api.ts
git commit -m "feat: summariesApi.generate accepts start/end dates or periodDays"
```

---

## Task 5: Frontend — Criar `PatientAISummary.tsx`

**Files:**
- Create: `dashboard/src/components/PatientAISummary.tsx`

**Step 1: Criar o componente**

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { isAfter, isBefore, parseISO, subDays } from 'date-fns';
import {
  patientsApi,
  symptomsApi,
  lifeEventsApi,
  goalsApi,
  summariesApi,
  type EmotionalLog,
  type PatientSymptom,
  type LifeEvent,
  type Goal,
} from '@/lib/api';

interface PatientAISummaryProps {
  patientId: string;
}

type PeriodPreset = 7 | 30;

export default function PatientAISummary({ patientId }: PatientAISummaryProps) {
  const [preset, setPreset] = useState<PeriodPreset | null>(7);
  const [customDays, setCustomDays] = useState('');

  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [symptoms, setSymptoms] = useState<PatientSymptom[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [summaryText, setSummaryText] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [logsRes, symptomsRes, eventsRes, goalsRes] = await Promise.allSettled([
        patientsApi.getEmotionalLogs(patientId, 90),
        symptomsApi.listForPatient(patientId),
        lifeEventsApi.listForPatient(patientId),
        goalsApi.list(patientId),
      ]);

      if (logsRes.status === 'fulfilled') {
        const raw = logsRes.value as any;
        setEmotionalLogs(Array.isArray(raw) ? raw : []);
      }
      if (symptomsRes.status === 'fulfilled') {
        const raw = symptomsRes.value as any;
        setSymptoms(raw?.patient_symptoms ?? []);
      }
      if (eventsRes.status === 'fulfilled') {
        const raw = eventsRes.value as any;
        setLifeEvents(raw?.life_events ?? []);
      }
      if (goalsRes.status === 'fulfilled') {
        const raw = goalsRes.value as any;
        setGoals(Array.isArray(raw) ? raw : (raw?.goals ?? []));
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  // Compute active period in days
  const activeDays = useMemo(() => {
    if (preset !== null) return preset;
    const n = parseInt(customDays, 10);
    return isNaN(n) || n <= 0 ? 7 : n;
  }, [preset, customDays]);

  // Filter data by period
  const cutoff = useMemo(() => subDays(new Date(), activeDays), [activeDays]);

  const filteredLogs = useMemo(
    () => emotionalLogs.filter((l) => isAfter(parseISO(l.logged_at), cutoff)),
    [emotionalLogs, cutoff]
  );
  const filteredSymptoms = useMemo(
    () => symptoms.filter((s) => s.reported_at && isAfter(parseISO(s.reported_at), cutoff)),
    [symptoms, cutoff]
  );
  const filteredEvents = useMemo(
    () => lifeEvents.filter((e) => isAfter(parseISO(e.event_date), cutoff)),
    [lifeEvents, cutoff]
  );
  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === 'in_progress' && g.patient_status === 'accepted'),
    [goals]
  );

  // Calculate averages
  const avgMood = filteredLogs.length
    ? (filteredLogs.reduce((s, l) => s + l.mood_score, 0) / filteredLogs.length).toFixed(1)
    : null;
  const avgAnxiety = filteredLogs.length
    ? (filteredLogs.reduce((s, l) => s + l.anxiety_score, 0) / filteredLogs.length).toFixed(1)
    : null;
  const avgEnergy = filteredLogs.length
    ? (filteredLogs.reduce((s, l) => s + l.energy_score, 0) / filteredLogs.length).toFixed(1)
    : null;

  const handleGenerate = async () => {
    setGenerating(true);
    setSummaryText('');
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, activeDays);
      const res = await summariesApi.generate(patientId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      const raw = res as any;
      setSummaryText(raw?.summary?.summary_text ?? 'Não foi possível gerar o resumo.');
    } catch {
      setSummaryText('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-clarita-purple-500" />
          <p className="text-sm font-semibold text-gray-700">Resumo IA</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {([7, 30] as PeriodPreset[]).map((d) => (
            <button
              key={d}
              onClick={() => { setPreset(d); setCustomDays(''); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                preset === d
                  ? 'bg-clarita-purple-500 text-white border-clarita-purple-500 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-clarita-purple-300'
              }`}
            >
              {d}d
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => { setCustomDays(e.target.value); setPreset(null); }}
              placeholder="N"
              className={`w-14 text-xs px-2 py-1.5 rounded-full border text-center transition-all ${
                preset === null && customDays
                  ? 'border-clarita-purple-400 bg-clarita-purple-50 font-medium'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            />
            <span className="text-xs text-gray-400">dias</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {generating ? 'Gerando...' : summaryText ? 'Regenerar' : 'Gerar Resumo'}
          </button>
        </div>
      </div>

      {/* Chips */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
          <Loader2 size={12} className="animate-spin" /> Carregando dados...
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {avgMood !== null && (
            <Chip
              label={`😊 Humor ${avgMood}`}
              warning={parseFloat(avgMood) <= 4}
            />
          )}
          {avgAnxiety !== null && (
            <Chip
              label={`😰 Ansiedade ${avgAnxiety}`}
              warning={parseFloat(avgAnxiety) >= 7}
            />
          )}
          {avgEnergy !== null && (
            <Chip label={`⚡ Energia ${avgEnergy}`} />
          )}
          <Chip label={`📋 ${filteredLogs.length} check-ins`} />
          {filteredSymptoms.length > 0 && (
            <Chip label={`🔴 ${filteredSymptoms.length} sintoma${filteredSymptoms.length !== 1 ? 's' : ''}`} />
          )}
          {filteredEvents.length > 0 && (
            <Chip label={`🌟 ${filteredEvents.length} evento${filteredEvents.length !== 1 ? 's' : ''}`} />
          )}
          {activeGoals.length > 0 && (
            <Chip label={`🎯 ${activeGoals.length} meta${activeGoals.length !== 1 ? 's' : ''}`} />
          )}
          {filteredLogs.length === 0 && filteredSymptoms.length === 0 && filteredEvents.length === 0 && (
            <span className="text-xs text-gray-400">Sem dados registrados neste período</span>
          )}
        </div>
      )}

      {/* AI text */}
      {generating && (
        <div className="space-y-2 pt-1">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
        </div>
      )}
      {!generating && summaryText && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summaryText}</p>
        </div>
      )}
      {!generating && !summaryText && (
        <p className="text-xs text-gray-400">
          Clique em &quot;Gerar Resumo&quot; para um resumo clínico do período gerado pela IA.
        </p>
      )}
    </div>
  );
}

function Chip({ label, warning = false }: { label: string; warning?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${
        warning
          ? 'bg-orange-50 border-orange-200 text-orange-700'
          : 'bg-gray-50 border-gray-200 text-gray-600'
      }`}
    >
      {warning && <AlertTriangle size={10} className="text-orange-400" />}
      {label}
    </span>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit
```

Expected: zero erros

**Step 3: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/PatientAISummary.tsx
git commit -m "feat: add PatientAISummary component with period selector and AI text"
```

---

## Task 6: Frontend — Integrar `PatientAISummary` no `PsychologistSessionPrep`

**Files:**
- Modify: `dashboard/src/components/PsychologistSessionPrep.tsx`

**Step 1: Remover Card 5 atual e substituir**

Localizar o bloco completo do Card 5 (começa em `{/* Card 5 — Briefing de IA */}` e termina após o `</div>` que fecha o card).

Remover:
```tsx
{/* Card 5 — Briefing de IA */}
<div className="card p-5">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Sparkles size={14} className="text-clarita-blue-500" />
      <p className="text-sm font-semibold text-gray-500">Briefing de IA</p>
    </div>
    <button
      onClick={handleGenerateBriefing}
      disabled={generatingSummary}
      className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
    >
      {generatingSummary ? <Loader2 size={12} className="animate-spin" /> : null}
      {generatingSummary ? 'Gerando...' : summary ? 'Regenerar' : 'Gerar briefing'}
    </button>
  </div>
  {summary ? (
    <p className="text-sm text-gray-700 italic leading-relaxed">{summary}</p>
  ) : (
    <p className="text-sm text-gray-400">
      Clique em &quot;Gerar briefing&quot; para um resumo do período gerado pela IA.
    </p>
  )}
</div>
```

Inserir no lugar:
```tsx
<PatientAISummary patientId={patientId} />
```

**Step 2: Remover estado e handler desnecessários**

Com a remoção do Card 5, os seguintes items no componente ficam órfãos — remover:
- `const [summary, setSummary] = useState('');`
- `const [generatingSummary, setGeneratingSummary] = useState(false);`
- `const handleGenerateBriefing = useCallback(...)` (bloco inteiro)
- Import `useCallback` (se não usado em outro lugar)
- Import `summariesApi` (se não usado em outro lugar)

**Step 3: Adicionar import do novo componente**

No topo do arquivo, adicionar:
```tsx
import PatientAISummary from '@/components/PatientAISummary';
```

**Step 4: Verificar TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit
```

Expected: zero erros

**Step 5: Commit**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add dashboard/src/components/PsychologistSessionPrep.tsx
git commit -m "feat: replace briefing card with PatientAISummary in PsychologistSessionPrep"
```

---

## Task 7: Verificação Final

**Step 1: Verificar backend**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
node -e "
  require('dotenv').config();
  const s = require('./src/services/summaryService');
  console.log(typeof s.generatePatientSummary, typeof s.compileProfessionalBrief);
"
```

Expected: `function function`

**Step 2: Verificar frontend TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx tsc --noEmit
```

Expected: zero erros

**Step 3: Teste manual no browser**

1. Login como psicólogo (ana@clarita.demo / Demo1234)
2. Abrir prontuário de qualquer paciente
3. Aba Overview → "Prep de Sessão" → Card 5 deve ser `PatientAISummary`
4. Chips carregam com dados do período de 7 dias
5. Clicar em "30d" → chips atualizam para 30 dias
6. Digitar "14" no campo N dias → chips atualizam para 14 dias
7. Clicar "Gerar Resumo" → skeleton aparece → texto gerado exibido
8. Clicar "Regenerar" → novo texto gerado

**Step 4: Commit final**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git add .
git commit -m "feat: complete AI summary with all data sources and period selector for psychologist"
```
