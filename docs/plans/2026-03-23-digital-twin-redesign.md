# Design: Gêmeo Digital — Redesign Completo

**Data:** 2026-03-23
**Status:** Aprovado
**Escopo:** Backend Node.js + Frontend DigitalTwinPanel

---

## Problema

O gêmeo digital nunca gerou dados em produção. O AI engine Python existente nunca foi deployado. O `DigitalTwinPanel` fica sempre em estado vazio. Além disso, o twin atual considera apenas check-ins — ignorando testes psicológicos e diagnósticos CID-11.

## Decisões

- **Quem vê:** apenas profissionais (psicóloga/psiquiatra)
- **Abordagem:** computar o twin no próprio backend Node.js (sem serviço Python separado)
- **Visual:** híbrido — resumo narrativo no topo, detalhes técnicos expansíveis

---

## Seção 1 — Fontes de Dados e Modelo

### Camadas de dados

| Camada | Fonte | Papel |
|---|---|---|
| Humor diário | `emotional_logs` (últimos 90 dias) | Base temporal, alta frequência |
| Escalas clínicas | `assessment_results` + `psych_test_sessions` completadas | Pontuais, alta validade clínica |
| Contexto diagnóstico | `patient_diagnoses` (is_active = true) | Âncora interpretativa |

### Computações

1. **Estado por variável** — média ponderada com decaimento exponencial (dias recentes pesam mais) sobre 30 dias de check-ins. Variáveis: `mood`, `anxiety`, `energy`, `sleep_quality`, `sleep_hours`, `med_adherence`.

2. **Score composto de saúde mental (0–100)** — normalização reversa dos instrumentos mais recentes:
   - PHQ-9: score 0–27 → inverte e normaliza
   - GAD-7: score 0–21 → inverte e normaliza
   - BAI: score 0–63 → inverte e normaliza
   - DASS-21: subscalas depression + anxiety → inverte e normaliza
   - Média ponderada dos instrumentos disponíveis

3. **Tendência (14 dias)** — regressão linear simples sobre o score composto e variáveis individuais → `improving` / `stable` / `worsening`

4. **Correlações** — Pearson entre pares de variáveis nos últimos 90 dias. Filtra |r| < 0.3. Máximo 6 correlações mais fortes. Gera descrição em linguagem natural.

5. **Predição 7 dias** — extrapolação linear da tendência atual com intervalo de confiança (±1 desvio padrão dos resíduos).

6. **Diagnósticos ativos** — lista de `icd_code` + `icd_name` + `certainty` onde `is_active = true`.

### Cache

- Twin válido por 6 horas (campo `computed_at` na tabela `digital_twin_states`)
- `GET /api/digital-twin/:patientId` retorna cache se fresco, recomputa se stale
- `POST /api/digital-twin/:patientId/refresh` força recomputação

---

## Seção 2 — Backend

### Novo arquivo: `src/services/digitalTwinCompute.js`

Funções puras, sem efeitos colaterais, testáveis isoladamente:

```
computeVariableStates(logs)         → estado + tendência por variável
computeCorrelations(logs)           → correlações Pearson filtradas
computeClinicalScore(testResults)   → score composto 0–100
computePredictions(states, score)   → predição 7 dias com IC
buildTwin(patientId, db)            → orquestra tudo, retorna twin object
saveTwin(patientId, twin, db)       → upsert em digital_twin_states
```

### Mudanças em `src/routes/digitalTwin.js`

- `GET /:patientId` — verifica cache; se stale/inexistente, chama `buildTwin()` on-demand
- `POST /:patientId/refresh` — força `buildTwin()` independente do cache

### Dados buscados pelo buildTwin()

```sql
-- Logs emocionais
SELECT * FROM emotional_logs WHERE patient_id = $1 AND timestamp >= NOW() - INTERVAL '90 days'

-- Resultados de avaliação (PHQ-9, GAD-7)
SELECT ar.*, a.name, a.type FROM assessment_results ar
JOIN assessments a ON a.id = ar.assessment_id
WHERE ar.patient_id = $1 ORDER BY ar.completed_at DESC

-- Sessões de testes psicológicos completadas
SELECT pts.*, st.name, st.type FROM psych_test_sessions pts
JOIN satepsi_tests st ON st.id = pts.test_id
WHERE pts.patient_id = $1 AND pts.status = 'completed'
ORDER BY pts.completed_at DESC

-- Diagnósticos ativos
SELECT * FROM patient_diagnoses WHERE patient_id = $1 AND is_active = true
```

### Sem novas tabelas

Usa `digital_twin_states` que já existe no schema.

---

## Seção 3 — Frontend

### Estrutura do DigitalTwinPanel (3 blocos)

**Bloco 1 — Retrato do Paciente** (sempre visível)
- Score composto: número grande (0–100) + anel de progresso colorido (verde ≥70, amarelo 40–69, vermelho <40)
- Variação vs. computação anterior (+5 pts / -3 pts)
- Tendência em linguagem natural: *"Quadro em melhora moderada nos últimos 14 dias"*
- Tags de diagnósticos ativos: `F33.1 Confirmado` / `F41.1 Suspeito`
- Data da computação + botão "Atualizar"

**Bloco 2 — Variáveis** (sempre visível)
- Grid de cards: humor, ansiedade, energia, sono
- Cada card: valor atual (0–10) + mini sparkline 14 dias + ícone de tendência ↑↓→
- Borda vermelha quando variável em zona de risco (ansiedade ≥7, humor ≤3, sono <6h)

**Bloco 3 — Detalhes Técnicos** (expansível, colapsado por padrão)
- Correlações em linguagem natural (até 4 mais relevantes)
- Gráfico de linha com predição 7 dias + área sombreada de IC
- Resultados dos testes psicológicos mais recentes (instrumento, score, severity, data)
- Confiança geral do modelo (% baseado em quantidade de dados)

### Estado de loading/empty

- Skeleton animado durante computação on-demand
- Estado vazio com CTA claro: *"Dados insuficientes — o gêmeo precisa de ao menos 7 check-ins"*
- Se há dados mas twin nunca foi computado: botão "Gerar Gêmeo Digital" proeminente

---

## Ordem de Implementação

1. `src/services/digitalTwinCompute.js` — lógica de computação
2. Atualizar `src/routes/digitalTwin.js` — cache + on-demand + refresh endpoint
3. Reescrever `DigitalTwinPanel.tsx` — 3 blocos + visual híbrido
4. Ajustar `src/lib/api.ts` — adicionar chamada para refresh endpoint
5. Verificar em produção com dados reais de Maria e João
