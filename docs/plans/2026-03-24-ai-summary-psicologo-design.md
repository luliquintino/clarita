# Resumo IA Completo para o Psicólogo — Design

## Contexto

O `PsychologistSessionPrep` já tem um "Briefing de IA" compacto, mas o `summaryService.js` só consulta `emotional_logs`. Sintomas, eventos de vida, metas e avaliações são ignorados. Além disso, o período é fixo (7 ou 30 dias) e não há IA real — apenas texto gerado por concatenação de strings.

O objetivo é substituir o Card 5 ("Briefing de IA") por um componente rico que:
- Agrega **todos** os dados inseridos pelo paciente
- Permite selecionar o período (7d / 30d / N dias)
- Exibe chips com dados chave imediatamente
- Gera texto clínico real via **Claude API** sob demanda

---

## Decisões de Design

| Questão | Decisão |
|---|---|
| Onde vive | Card 5 do `PsychologistSessionPrep` (substituição) |
| Formato do resumo | Híbrido: chips de dados no topo + texto narrativo da IA abaixo |
| Seletor de período | 3 controles inline: botão `7d`, botão `30d`, input `[N] dias` |
| IA | Claude API (`claude-haiku-4-5`) com fallback para lógica manual se key ausente |
| Arquitetura | Componente `PatientAISummary.tsx` (B) + endpoint backend expandido (C) |

---

## Seção 1: Backend

### Endpoint expandido

`POST /api/summaries/:patientId/generate`

**Body:**
```json
{
  "start_date": "2026-03-17",
  "end_date": "2026-03-24"
}
```
`period_days` continua aceito para compatibilidade retroativa. Se `start_date`/`end_date` presentes, têm prioridade.

### Dados agregados (queries paralelas)

| Tabela | Dados |
|---|---|
| `emotional_logs` | humor, ansiedade, energia, sono, entradas de diário |
| `life_events` | título, categoria, impacto, data |
| `patient_symptoms` + `symptoms` | nome do sintoma, intensidade, data |
| `assessment_results` + `assessments` | tipo (PHQ-9, GAD-7), score, data |
| `goals` | título, status |

### Prompt para Claude

```
Você é um assistente clínico de apoio. Abaixo estão os dados registrados pelo
paciente no período [start_date] a [end_date]. Escreva um resumo clínico em
português brasileiro para o psicólogo responsável, em 3-4 parágrafos:
1. Padrão emocional geral (humor, ansiedade, energia, sono)
2. Sintomas relatados e eventos de vida relevantes
3. Progresso nas metas terapêuticas
4. Alertas ou pontos de atenção (se houver)

Seja objetivo, factual, sem julgamentos. Use linguagem clínica acessível.

DADOS DO PERÍODO:
[JSON estruturado]
```

**Modelo:** `claude-haiku-4-5` (rápido, barato para uso frequente pré-sessão)

**Fallback:** se `process.env.ANTHROPIC_API_KEY` não definida → usa lógica manual expandida com todos os dados

### Novo pacote
`@anthropic-ai/sdk` adicionado ao `backend/package.json`

---

## Seção 2: Componente `PatientAISummary.tsx`

**Localização:** `dashboard/src/components/PatientAISummary.tsx`

### Props
```tsx
interface PatientAISummaryProps {
  patientId: string;
}
```

### Layout
```
┌─────────────────────────────────────────────────────┐
│  ✨ Resumo IA         [7d] [30d] [__ dias] [Gerar]  │
├─────────────────────────────────────────────────────┤
│  CHIPS DE DADOS CHAVE                               │
│  Humor X.X  Ansiedade X.X⚠️  Energia X.X           │
│  Sono X.Xh  N check-ins  N sintomas  N eventos     │
├─────────────────────────────────────────────────────┤
│  TEXTO DA IA (após gerar)                           │
│  Texto narrativo clínico em 3-4 parágrafos         │
│  [skeleton loader durante geração]                  │
│  [botão "Regenerar" após gerado]                   │
└─────────────────────────────────────────────────────┘
```

### Comportamento do seletor de período
- `7d` e `30d` são botões com destaque visual quando ativos
- Input numérico "N dias" — ao alterar, torna-se o período ativo
- Mudar período recarrega os chips (filtra dados já carregados por data no frontend)
- Botão "Gerar Resumo" chama o backend — não é automático

### Estado do componente
```tsx
period: 7 | 30 | number          // período ativo
customDays: string                // valor do input numérico
emotionalLogs: EmotionalLog[]     // carregados ao montar (90 dias)
lifeEvents: LifeEvent[]           // carregados ao montar
symptoms: PatientSymptom[]        // carregados ao montar
goals: Goal[]                     // carregados ao montar
summaryText: string               // texto gerado pela IA
generating: boolean               // estado de loading do botão
loading: boolean                  // loading inicial dos chips
```

### Chips calculados (derivados do estado, filtrados pelo período)
- Humor médio, Ansiedade média, Energia média, Sono médio
- Contagem de check-ins, sintomas, eventos de vida no período
- Badge de alerta se ansiedade ≥ 7 ou humor ≤ 4

---

## Seção 3: Integração

### Mudança no `PsychologistSessionPrep`

Card 5 atual:
```tsx
{/* Card 5 — Briefing de IA */}
<div className="card p-5">
  ...briefing compacto...
</div>
```

Substituído por:
```tsx
<PatientAISummary patientId={patientId} />
```

Os outros 4 cards não mudam.

### Chamadas de API ao montar `PatientAISummary`
```
GET /api/patients/:id/emotional-logs (90 dias — filtragem por período no frontend)
GET /api/patient-symptoms/:patientId
GET /api/life-events (listForPatient)
GET /api/goals/:patientId
```

Todas em `Promise.allSettled()` — falha em uma não quebra o resto.

### Geração do resumo
```
POST /api/summaries/:patientId/generate
Body: { start_date, end_date }
Response: { summary: { summary_text, period_start, period_end, ... } }
```

---

## Verificação

1. `cd backend && npm install` → `@anthropic-ai/sdk` instalado
2. `cd dashboard && npx tsc --noEmit` → zero erros TypeScript
3. Abrir prontuário como psicólogo → Card 5 mostra `PatientAISummary`
4. Chips carregam automaticamente com dados do período padrão (7d)
5. Mudar para 30d → chips atualizam sem chamada ao backend
6. Clicar "Gerar Resumo" → texto narrativo aparece em 3-4 parágrafos
7. Com `ANTHROPIC_API_KEY` ausente → fallback gera texto manual com todos os dados
8. Clicar "Regenerar" → novo texto é gerado
