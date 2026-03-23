# Digital Twin Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fazer o gêmeo digital funcionar em produção — computação on-demand no backend Node.js, incorporando check-ins + testes psicológicos + diagnósticos, com painel visual híbrido (retrato + variáveis + detalhes expansíveis).

**Architecture:** Novo serviço `digitalTwinCompute.js` com funções puras calcula o twin on-demand quando o endpoint é chamado (cache de 6h na tabela `digital_twin_states`). Frontend reescrito em 3 blocos: score composto + variáveis + detalhes técnicos expansíveis.

**Tech Stack:** Node.js (backend), Jest (testes), Next.js + TypeScript + Recharts + Tailwind (frontend)

---

## Task 1: Serviço de Computação — Funções Puras

**Files:**
- Create: `backend/src/services/digitalTwinCompute.js`
- Create: `backend/tests/unit/services/digitalTwinCompute.test.js`

### Step 1: Criar o arquivo de teste

```javascript
// backend/tests/unit/services/digitalTwinCompute.test.js
'use strict';

const {
  computeVariableStates,
  computeCorrelations,
  computeClinicalScore,
  computePredictions,
  buildTwinObject,
} = require('../../../src/services/digitalTwinCompute');

// ---------------------------------------------------------------------------
// computeVariableStates
// ---------------------------------------------------------------------------
describe('computeVariableStates', () => {
  const makeLogs = (moods) =>
    moods.map((mood, i) => ({
      timestamp: new Date(Date.now() - (moods.length - i) * 86400000).toISOString(),
      mood,
      anxiety: 5,
      energy: 5,
      sleep_quality: 5,
      sleep_hours: 7,
      med_adherence: null,
    }));

  it('returns null when fewer than 3 logs', () => {
    expect(computeVariableStates(makeLogs([5, 6]))).toBeNull();
  });

  it('returns object with mood key for sufficient logs', () => {
    const logs = makeLogs([4, 5, 6, 5, 7, 6, 8]);
    const result = computeVariableStates(logs);
    expect(result).not.toBeNull();
    expect(result.mood).toBeDefined();
    expect(result.mood.current).toBeGreaterThanOrEqual(1);
    expect(result.mood.current).toBeLessThanOrEqual(10);
    expect(['improving', 'worsening', 'stable']).toContain(result.mood.trend);
  });

  it('detects improving trend when values increase', () => {
    const logs = makeLogs([3, 4, 5, 6, 7, 8, 9]);
    const result = computeVariableStates(logs);
    expect(result.mood.trend).toBe('improving');
  });

  it('detects worsening trend when values decrease', () => {
    const logs = makeLogs([9, 8, 7, 6, 5, 4, 3]);
    const result = computeVariableStates(logs);
    expect(result.mood.trend).toBe('worsening');
  });
});

// ---------------------------------------------------------------------------
// computeCorrelations
// ---------------------------------------------------------------------------
describe('computeCorrelations', () => {
  const makeLogs = (n) =>
    Array.from({ length: n }, (_, i) => ({
      timestamp: new Date(Date.now() - (n - i) * 86400000).toISOString(),
      mood: 5 + Math.sin(i) * 2,
      anxiety: 5 - Math.sin(i) * 2,  // perfect negative correlation with mood
      energy: 5 + Math.sin(i) * 2,   // perfect positive correlation with mood
      sleep_quality: 5,
      sleep_hours: 7,
      med_adherence: null,
    }));

  it('returns empty array for fewer than 7 logs', () => {
    expect(computeCorrelations(makeLogs(4))).toEqual([]);
  });

  it('finds strong negative correlation between mood and anxiety', () => {
    const logs = makeLogs(20);
    const correlations = computeCorrelations(logs);
    const moodAnxiety = correlations.find(
      (c) =>
        (c.variable_a === 'mood' && c.variable_b === 'anxiety') ||
        (c.variable_a === 'anxiety' && c.variable_b === 'mood')
    );
    expect(moodAnxiety).toBeDefined();
    expect(moodAnxiety.direction).toBe('negative');
  });

  it('filters out weak correlations (|r| < 0.3)', () => {
    const logs = makeLogs(20);
    const correlations = computeCorrelations(logs);
    correlations.forEach((c) => {
      expect(Math.abs(c.pearson_r)).toBeGreaterThanOrEqual(0.3);
    });
  });
});

// ---------------------------------------------------------------------------
// computeClinicalScore
// ---------------------------------------------------------------------------
describe('computeClinicalScore', () => {
  it('returns null when no test results', () => {
    expect(computeClinicalScore([])).toBeNull();
  });

  it('returns 100 for perfect scores (all zeros)', () => {
    const results = [
      { instrument: 'PHQ-9', total_score: 0, completed_at: new Date().toISOString() },
      { instrument: 'GAD-7', total_score: 0, completed_at: new Date().toISOString() },
    ];
    expect(computeClinicalScore(results)).toBe(100);
  });

  it('returns low score for maximum pathology', () => {
    const results = [
      { instrument: 'PHQ-9', total_score: 27, completed_at: new Date().toISOString() },
      { instrument: 'GAD-7', total_score: 21, completed_at: new Date().toISOString() },
    ];
    const score = computeClinicalScore(results);
    expect(score).toBeLessThan(20);
  });

  it('returns moderate score for moderate pathology', () => {
    const results = [
      { instrument: 'PHQ-9', total_score: 13, completed_at: new Date().toISOString() },
    ];
    const score = computeClinicalScore(results);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(70);
  });

  it('uses most recent result when multiple for same instrument', () => {
    const old = {
      instrument: 'PHQ-9',
      total_score: 25,
      completed_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    const recent = {
      instrument: 'PHQ-9',
      total_score: 5,
      completed_at: new Date().toISOString(),
    };
    const scoreWithOld = computeClinicalScore([old]);
    const scoreWithRecent = computeClinicalScore([recent]);
    expect(scoreWithRecent).toBeGreaterThan(scoreWithOld);
  });
});

// ---------------------------------------------------------------------------
// computePredictions
// ---------------------------------------------------------------------------
describe('computePredictions', () => {
  it('returns empty array for null states', () => {
    expect(computePredictions(null, null)).toEqual([]);
  });

  it('returns prediction with correct structure', () => {
    const states = {
      mood: { current: 7, avg_7d: 6.5, avg_30d: 5.5, trend: 'improving', slope_7d: 0.2 },
    };
    const preds = computePredictions(states, 65);
    expect(preds.length).toBeGreaterThan(0);
    const p = preds[0];
    expect(['increase', 'decrease', 'stable']).toContain(p.prediction);
    expect(['low', 'moderate', 'high']).toContain(p.risk_level);
    expect(p.confidence).toBeGreaterThan(0);
    expect(p.confidence).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// buildTwinObject
// ---------------------------------------------------------------------------
describe('buildTwinObject', () => {
  it('returns null when no logs and no test results', () => {
    const result = buildTwinObject('patient-123', [], [], []);
    expect(result).toBeNull();
  });

  it('returns valid twin object with sufficient data', () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
      mood: 5 + i * 0.2,
      anxiety: 6 - i * 0.1,
      energy: 5,
      sleep_quality: 6,
      sleep_hours: 7,
      med_adherence: null,
    }));
    const testResults = [
      { instrument: 'PHQ-9', total_score: 10, completed_at: new Date().toISOString() },
    ];
    const diagnoses = [
      { icd_code: 'F33.1', icd_name: 'Transtorno depressivo', certainty: 'confirmed' },
    ];

    const twin = buildTwinObject('patient-123', logs, testResults, diagnoses);
    expect(twin).not.toBeNull();
    expect(twin.current_state).toBeDefined();
    expect(twin.clinical_score).toBeDefined();
    expect(twin.diagnoses).toHaveLength(1);
    expect(twin.correlations).toBeDefined();
    expect(twin.predictions).toBeDefined();
    expect(twin.data_points_used).toBeGreaterThan(0);
  });
});
```

### Step 2: Rodar e confirmar que FALHA

```bash
cd backend
npx jest tests/unit/services/digitalTwinCompute.test.js --no-coverage
```

Esperado: `FAIL` com `Cannot find module '../../../src/services/digitalTwinCompute'`

### Step 3: Implementar `digitalTwinCompute.js`

```javascript
// backend/src/services/digitalTwinCompute.js
'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_LOGS = 3;
const MIN_CORRELATION_LOGS = 7;
const TREND_WINDOW_DAYS = 14;
const MAX_CORRELATIONS = 6;
const MIN_PEARSON = 0.3;

// Instruments and their max scores
const INSTRUMENT_MAX = {
  'PHQ-9': 27,
  'GAD-7': 21,
  'BAI': 63,
  'DASS-21': 42, // depression subscale max 21 + anxiety subscale max 21
  'DASS-21-Depression': 21,
  'DASS-21-Anxiety': 21,
  'DASS-21-Stress': 21,
};

const CORE_VARS = ['mood', 'anxiety', 'energy', 'sleep_quality'];

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/**
 * Linear regression: returns { slope, intercept, r2 }
 */
function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let ssxy = 0, ssxx = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (xs[i] - xMean) * (ys[i] - yMean);
    ssxx += (xs[i] - xMean) ** 2;
    ssyy += (ys[i] - yMean) ** 2;
  }

  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = yMean - slope * xMean;
  const r2 = ssyy === 0 ? 0 : (ssxy ** 2) / (ssxx * ssyy);

  return { slope, intercept, r2 };
}

/**
 * Pearson correlation coefficient between two arrays.
 */
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    denomX += (xs[i] - xMean) ** 2;
    denomY += (ys[i] - yMean) ** 2;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Exponentially weighted mean (recent days weigh more).
 */
function ewma(values, alpha = 0.15) {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

// ---------------------------------------------------------------------------
// computeVariableStates
// ---------------------------------------------------------------------------

/**
 * Compute per-variable state from emotional logs.
 * @param {Array} logs - Array of emotional_log rows, sorted by timestamp ASC
 * @returns {Record<string, object> | null}
 */
function computeVariableStates(logs) {
  if (!logs || logs.length < MIN_LOGS) return null;

  const result = {};
  const variables = ['mood', 'anxiety', 'energy', 'sleep_quality', 'sleep_hours', 'med_adherence'];

  for (const variable of variables) {
    const values = logs
      .map((l) => (l[variable] != null ? Number(l[variable]) : null))
      .filter((v) => v !== null);

    if (values.length < MIN_LOGS) continue;

    // Trend: linear regression over last TREND_WINDOW_DAYS values
    const trendValues = values.slice(-TREND_WINDOW_DAYS);
    const xs = trendValues.map((_, i) => i);
    const { slope } = linearRegression(xs, trendValues);

    let trend;
    if (Math.abs(slope) < 0.05) {
      trend = 'stable';
    } else if (slope > 0) {
      // For anxiety: higher = worse, so increasing = worsening
      trend = variable === 'anxiety' ? 'worsening' : 'improving';
    } else {
      trend = variable === 'anxiety' ? 'improving' : 'worsening';
    }

    const recent7 = values.slice(-7);
    const recent30 = values.slice(-30);

    result[variable] = {
      current: Math.round(ewma(values.slice(-7)) * 10) / 10,
      avg_7d: Math.round((recent7.reduce((a, b) => a + b, 0) / recent7.length) * 10) / 10,
      avg_30d: Math.round((recent30.reduce((a, b) => a + b, 0) / recent30.length) * 10) / 10,
      trend,
      slope_7d: Math.round(slope * 100) / 100,
    };
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// computeCorrelations
// ---------------------------------------------------------------------------

const CORRELATION_LABEL_PT = {
  mood_anxiety: 'Humor × Ansiedade',
  mood_energy: 'Humor × Energia',
  mood_sleep_quality: 'Humor × Qualidade do Sono',
  mood_sleep_hours: 'Humor × Horas de Sono',
  anxiety_energy: 'Ansiedade × Energia',
  anxiety_sleep_quality: 'Ansiedade × Qualidade do Sono',
  anxiety_sleep_hours: 'Ansiedade × Horas de Sono',
  energy_sleep_quality: 'Energia × Qualidade do Sono',
  energy_sleep_hours: 'Energia × Horas de Sono',
  sleep_quality_sleep_hours: 'Qualidade × Horas de Sono',
};

/**
 * Compute Pearson correlations between variable pairs.
 * @param {Array} logs
 * @returns {Array}
 */
function computeCorrelations(logs) {
  if (!logs || logs.length < MIN_CORRELATION_LOGS) return [];

  const vars = ['mood', 'anxiety', 'energy', 'sleep_quality', 'sleep_hours'];
  const correlations = [];

  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const va = vars[i];
      const vb = vars[j];

      const pairs = logs
        .filter((l) => l[va] != null && l[vb] != null)
        .map((l) => [Number(l[va]), Number(l[vb])]);

      if (pairs.length < MIN_CORRELATION_LOGS) continue;

      const xs = pairs.map((p) => p[0]);
      const ys = pairs.map((p) => p[1]);
      const r = pearson(xs, ys);

      if (Math.abs(r) < MIN_PEARSON) continue;

      const strength =
        Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.5 ? 'moderate' : 'mild';

      const key = `${va}_${vb}`;
      correlations.push({
        variable_a: va,
        variable_b: vb,
        pearson_r: Math.round(r * 100) / 100,
        p_value: null, // simplified — not computing p-value
        direction: r >= 0 ? 'positive' : 'negative',
        strength,
        label_pt: CORRELATION_LABEL_PT[key] || `${va} × ${vb}`,
      });
    }
  }

  // Sort by absolute strength descending, return top N
  return correlations
    .sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r))
    .slice(0, MAX_CORRELATIONS);
}

// ---------------------------------------------------------------------------
// computeClinicalScore
// ---------------------------------------------------------------------------

/**
 * Compute composite mental health score (0–100) from clinical test results.
 * Higher = better mental health.
 * @param {Array} testResults - [{instrument, total_score, completed_at}]
 * @returns {number | null}
 */
function computeClinicalScore(testResults) {
  if (!testResults || testResults.length === 0) return null;

  // Get most recent result per instrument
  const byInstrument = {};
  for (const r of testResults) {
    const key = r.instrument;
    if (!byInstrument[key] || new Date(r.completed_at) > new Date(byInstrument[key].completed_at)) {
      byInstrument[key] = r;
    }
  }

  const scores = [];
  for (const [instrument, result] of Object.entries(byInstrument)) {
    const max = INSTRUMENT_MAX[instrument];
    if (!max) continue;
    // Normalize to 0–100, inverted (0 = worst, 100 = best)
    const normalized = Math.round((1 - result.total_score / max) * 100);
    scores.push(normalized);
  }

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ---------------------------------------------------------------------------
// computePredictions
// ---------------------------------------------------------------------------

/**
 * Generate 7-day predictions from variable states.
 * @param {Record<string, object> | null} states
 * @param {number | null} clinicalScore
 * @returns {Array}
 */
function computePredictions(states, clinicalScore) {
  if (!states) return [];

  const predictions = [];
  const priorityVars = ['mood', 'anxiety', 'energy', 'sleep_quality'];

  for (const variable of priorityVars) {
    const state = states[variable];
    if (!state) continue;

    let prediction;
    const slope = state.slope_7d;
    if (Math.abs(slope) < 0.05) {
      prediction = 'stable';
    } else if (slope > 0) {
      prediction = variable === 'anxiety' ? 'increase' : 'increase';
    } else {
      prediction = 'decrease';
    }

    // Risk: worsening trend + current already bad
    let risk_level = 'low';
    if (variable === 'mood' && state.current < 4 && state.trend === 'worsening') risk_level = 'high';
    else if (variable === 'anxiety' && state.current > 7 && state.trend === 'worsening') risk_level = 'high';
    else if (state.trend === 'worsening') risk_level = 'moderate';

    const confidence = Math.min(0.85, 0.4 + Math.abs(slope) * 2);

    predictions.push({
      variable,
      prediction,
      risk_level,
      horizon_days: 7,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Tendência de ${state.trend === 'improving' ? 'melhora' : state.trend === 'worsening' ? 'piora' : 'estabilidade'} baseada nos últimos ${TREND_WINDOW_DAYS} dias`,
      based_on: ['check-ins diários'],
    });
  }

  return predictions;
}

// ---------------------------------------------------------------------------
// buildTwinObject
// ---------------------------------------------------------------------------

/**
 * Build a complete twin object from raw data arrays.
 * @param {string} patientId
 * @param {Array} logs - emotional_log rows
 * @param {Array} testResults - [{instrument, total_score, completed_at}]
 * @param {Array} diagnoses - [{icd_code, icd_name, certainty}]
 * @returns {object | null}
 */
function buildTwinObject(patientId, logs, testResults, diagnoses) {
  if ((!logs || logs.length < MIN_LOGS) && (!testResults || testResults.length === 0)) {
    return null;
  }

  const sortedLogs = [...(logs || [])].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const states = computeVariableStates(sortedLogs);
  const correlations = computeCorrelations(sortedLogs);
  const clinicalScore = computeClinicalScore(testResults || []);
  const predictions = computePredictions(states, clinicalScore);

  // Determine overall trend narrative
  let overallTrend = 'stable';
  if (states) {
    const trendScores = Object.values(states).map((s) =>
      s.trend === 'improving' ? 1 : s.trend === 'worsening' ? -1 : 0
    );
    const avg = trendScores.reduce((a, b) => a + b, 0) / trendScores.length;
    if (avg > 0.3) overallTrend = 'improving';
    else if (avg < -0.3) overallTrend = 'worsening';
  }

  // Confidence based on data volume
  const dataPoints = sortedLogs.length + (testResults?.length || 0);
  const confidence = Math.min(1, dataPoints / 30);

  return {
    patient_id: patientId,
    current_state: states || {},
    clinical_score: clinicalScore,
    overall_trend: overallTrend,
    correlations,
    predictions,
    diagnoses: (diagnoses || []).map((d) => ({
      icd_code: d.icd_code,
      icd_name: d.icd_name,
      certainty: d.certainty,
    })),
    test_results_summary: (testResults || [])
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 5)
      .map((r) => ({
        instrument: r.instrument,
        total_score: r.total_score,
        severity: r.severity_level || null,
        completed_at: r.completed_at,
      })),
    data_points_used: dataPoints,
    model_version: '2.0-node',
    confidence_overall: Math.round(confidence * 100) / 100,
    computed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  computeVariableStates,
  computeCorrelations,
  computeClinicalScore,
  computePredictions,
  buildTwinObject,
};
```

### Step 4: Rodar testes e confirmar que PASSAM

```bash
cd backend
npx jest tests/unit/services/digitalTwinCompute.test.js --no-coverage
```

Esperado: `PASS` — todos os testes verdes.

### Step 5: Commit

```bash
cd backend
git add src/services/digitalTwinCompute.js tests/unit/services/digitalTwinCompute.test.js
git commit -m "feat: add digitalTwinCompute service with unit tests"
```

---

## Task 2: Atualizar Rota do Digital Twin

**Files:**
- Modify: `backend/src/routes/digitalTwin.js`
- Create: `backend/tests/integration/digitalTwin.test.js`

### Step 1: Criar teste de integração

```javascript
// backend/tests/integration/digitalTwin.test.js
'use strict';

const request = require('supertest');
const {
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
  getApp,
} = require('../helpers');
const { query } = require('../../src/config/database');

const app = getApp();

let patient, patientToken;
let professional, professionalToken;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional({ email: 'twin-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('GET /api/digital-twin/:patientId', () => {
  it('returns 404 when no data exists', async () => {
    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 403 for patient trying to access own twin', async () => {
    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with twin after seeding emotional logs', async () => {
    // Seed 10 emotional logs
    for (let i = 0; i < 10; i++) {
      await query(
        `INSERT INTO emotional_logs (patient_id, timestamp, mood, anxiety, energy, sleep_quality)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          patient.id,
          new Date(Date.now() - (10 - i) * 86400000).toISOString(),
          5 + i * 0.2,
          6 - i * 0.1,
          5,
          6,
        ]
      );
    }

    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.current_state).toBeDefined();
    expect(res.body.computed_at).toBeDefined();
    expect(res.body.data_points_used).toBeGreaterThan(0);
  });
});

describe('POST /api/digital-twin/:patientId/refresh', () => {
  it('returns 200 and recomputes twin', async () => {
    const res = await request(app)
      .post(`/api/digital-twin/${patient.id}/refresh`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.twin).toBeDefined();
  });

  it('returns 403 for patient', async () => {
    const res = await request(app)
      .post(`/api/digital-twin/${patient.id}/refresh`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});
```

### Step 2: Rodar e confirmar FALHA

```bash
cd backend
npx jest tests/integration/digitalTwin.test.js --no-coverage
```

Esperado: alguns testes falham (o refresh endpoint não existe ainda, e o GET não computa on-demand).

### Step 3: Substituir `src/routes/digitalTwin.js`

Substituir o arquivo inteiro. A lógica nova:

- `GET /:patientId` — verifica cache (≤ 6h) em `digital_twin_states`; se stale/inexistente, busca dados e chama `buildTwinObject`; se `buildTwinObject` retornar `null` (dados insuficientes), responde 404
- `POST /:patientId/refresh` — força recomputação, retorna `{ twin }` com o novo objeto

```javascript
'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { buildTwinObject } = require('../services/digitalTwinCompute');

router.use(authenticate);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ---------------------------------------------------------------------------
// Helper: fetch all data needed to build twin
// ---------------------------------------------------------------------------

async function fetchTwinData(patientId) {
  const [logsResult, assessmentResult, psychResult, diagnosisResult] = await Promise.all([
    // Emotional logs (last 90 days)
    query(
      `SELECT timestamp, mood, anxiety, energy, sleep_quality, sleep_hours, med_adherence
       FROM emotional_logs
       WHERE patient_id = $1 AND timestamp >= NOW() - INTERVAL '90 days'
       ORDER BY timestamp ASC`,
      [patientId]
    ),
    // Assessment results (PHQ-9, GAD-7)
    query(
      `SELECT ar.total_score, ar.severity_level, ar.completed_at, a.name AS instrument
       FROM assessment_results ar
       JOIN assessments a ON a.id = ar.assessment_id
       WHERE ar.patient_id = $1
       ORDER BY ar.completed_at DESC`,
      [patientId]
    ),
    // Completed psych test sessions
    query(
      `SELECT pts.score->>'total_score' AS total_score_raw,
              pts.score->>'severity_level' AS severity_level,
              pts.completed_at,
              st.name AS instrument
       FROM psych_test_sessions pts
       JOIN satepsi_tests st ON st.id = pts.test_id
       WHERE pts.patient_id = $1 AND pts.status = 'completed'
       ORDER BY pts.completed_at DESC`,
      [patientId]
    ),
    // Active diagnoses
    query(
      `SELECT icd_code, icd_name, certainty
       FROM patient_diagnoses
       WHERE patient_id = $1 AND is_active = true
       ORDER BY diagnosis_date DESC`,
      [patientId]
    ),
  ]);

  // Combine assessment + psych test results
  const testResults = [
    ...assessmentResult.rows,
    ...psychResult.rows.map((r) => ({
      ...r,
      total_score: r.total_score_raw ? parseInt(r.total_score_raw, 10) : 0,
    })),
  ].filter((r) => r.total_score != null && !isNaN(r.total_score));

  return {
    logs: logsResult.rows,
    testResults,
    diagnoses: diagnosisResult.rows,
  };
}

// ---------------------------------------------------------------------------
// Helper: save twin to digital_twin_states
// ---------------------------------------------------------------------------

async function saveTwin(patientId, twin) {
  await query(
    `INSERT INTO digital_twin_states
       (patient_id, current_state, correlations, baseline, predictions,
        treatment_responses, data_points_used, model_version, confidence_overall, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      patientId,
      JSON.stringify(twin.current_state),
      JSON.stringify({ correlations: twin.correlations, clinical_score: twin.clinical_score, overall_trend: twin.overall_trend, diagnoses: twin.diagnoses, test_results_summary: twin.test_results_summary }),
      JSON.stringify({}),
      JSON.stringify(twin.predictions),
      JSON.stringify([]),
      twin.data_points_used,
      twin.model_version,
      twin.confidence_overall,
      twin.computed_at,
    ]
  );
}

// ---------------------------------------------------------------------------
// GET /api/digital-twin/:patientId
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      // Check cache
      const cached = await query(
        `SELECT * FROM digital_twin_states
         WHERE patient_id = $1
         ORDER BY computed_at DESC LIMIT 1`,
        [patientId]
      );

      const cacheHit =
        cached.rows.length > 0 &&
        Date.now() - new Date(cached.rows[0].computed_at).getTime() < CACHE_TTL_MS;

      if (cacheHit) {
        const row = cached.rows[0];
        const extra = row.correlations || {};
        return res.json({
          ...row,
          clinical_score: extra.clinical_score ?? null,
          overall_trend: extra.overall_trend ?? 'stable',
          diagnoses: extra.diagnoses ?? [],
          test_results_summary: extra.test_results_summary ?? [],
        });
      }

      // Compute on-demand
      const { logs, testResults, diagnoses } = await fetchTwinData(patientId);
      const twin = buildTwinObject(patientId, logs, testResults, diagnoses);

      if (!twin) {
        return res.status(404).json({
          error: 'Dados insuficientes para o gêmeo digital. O paciente precisa de ao menos 3 check-ins.',
        });
      }

      await saveTwin(patientId, twin);
      return res.json(twin);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/digital-twin/:patientId/refresh
// ---------------------------------------------------------------------------

router.post(
  '/:patientId/refresh',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { logs, testResults, diagnoses } = await fetchTwinData(patientId);
      const twin = buildTwinObject(patientId, logs, testResults, diagnoses);

      if (!twin) {
        return res.status(404).json({
          error: 'Dados insuficientes para o gêmeo digital.',
        });
      }

      await saveTwin(patientId, twin);
      return res.json({ twin });
    } catch (err) {
      next(err);
    }
  }
);

// Keep history + predictions endpoints unchanged
router.get(
  '/:patientId/history',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const days = parseInt(req.query.days, 10) || 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const result = await query(
        `SELECT * FROM digital_twin_states
         WHERE patient_id = $1 AND computed_at >= $2
         ORDER BY computed_at ASC`,
        [req.params.patientId, since]
      );
      res.json({ history: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
```

### Step 4: Rodar testes e confirmar que PASSAM

```bash
cd backend
npx jest tests/integration/digitalTwin.test.js --no-coverage
```

Esperado: `PASS`

### Step 5: Rodar suite completa (não quebrar nada)

```bash
cd backend
npm test
```

Esperado: todos os testes passando (310+ testes).

### Step 6: Commit

```bash
git add src/routes/digitalTwin.js src/services/digitalTwinCompute.js tests/integration/digitalTwin.test.js
git commit -m "feat: compute digital twin on-demand in Node.js with test+clinical data"
```

### Step 7: Push e verificar em produção

```bash
git push origin main
# Aguardar 45s para Railway deploy
sleep 45
# Testar
PEDRO_TOKEN=$(curl -s https://clarita-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pedro@clarita.demo","password":"Demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
curl -s "https://clarita-production.up.railway.app/api/digital-twin/95849831-6ac5-43bc-b7c2-485760dd12fc" \
  -H "Authorization: Bearer $PEDRO_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Score:', d.get('clinical_score')); print('Trend:', d.get('overall_trend'))"
```

Esperado: `Score: <número>` e `Trend: improving/stable/worsening`

---

## Task 3: Reescrever DigitalTwinPanel

**Files:**
- Modify: `dashboard/src/components/DigitalTwinPanel.tsx`
- Modify: `dashboard/src/lib/api.ts` (adicionar campos novos ao tipo `DigitalTwin`)

### Step 1: Atualizar tipo `DigitalTwin` em `api.ts`

Localizar a interface `DigitalTwin` (linha ~343) e adicionar os campos novos:

```typescript
export interface DigitalTwinDiagnosis {
  icd_code: string;
  icd_name: string;
  certainty: 'confirmed' | 'suspected' | 'ruled_out';
}

export interface DigitalTwinTestResult {
  instrument: string;
  total_score: number;
  severity: string | null;
  completed_at: string;
}

export interface DigitalTwin {
  id: string;
  patient_id: string;
  current_state: Record<string, DigitalTwinVariableState>;
  correlations: DigitalTwinCorrelation[];
  baseline: Record<string, { mean: number; std: number; established_at: string; data_points: number }>;
  predictions: DigitalTwinPrediction[];
  treatment_responses: TreatmentResponse[];
  data_points_used: number;
  model_version: string;
  confidence_overall: number;
  computed_at: string;
  // New fields from v2
  clinical_score: number | null;
  overall_trend: 'improving' | 'stable' | 'worsening';
  diagnoses: DigitalTwinDiagnosis[];
  test_results_summary: DigitalTwinTestResult[];
}
```

### Step 2: Reescrever `DigitalTwinPanel.tsx`

Substituir o arquivo inteiro pelo novo componente de 3 blocos:

```tsx
'use client';

import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Activity,
  Moon,
  Zap,
  Heart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DigitalTwin } from '@/lib/api';
import { digitalTwinApi } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const VAR_LABEL: Record<string, string> = {
  mood: 'Humor',
  anxiety: 'Ansiedade',
  energy: 'Energia',
  sleep_quality: 'Sono',
};

const VAR_ICON: Record<string, React.ReactNode> = {
  mood: <Heart size={14} />,
  anxiety: <AlertTriangle size={14} />,
  energy: <Zap size={14} />,
  sleep_quality: <Moon size={14} />,
};

const VAR_COLOR: Record<string, string> = {
  mood: '#22c55e',
  anxiety: '#f59e0b',
  energy: '#60a5fa',
  sleep_quality: '#a78bfa',
};

// For anxiety: higher = worse
const RISK_VAR: Record<string, (v: number) => boolean> = {
  mood: (v) => v <= 3,
  anxiety: (v) => v >= 7,
  energy: (v) => v <= 3,
  sleep_quality: (v) => v <= 3,
};

function TrendBadge({ trend, variable }: { trend: string; variable?: string }) {
  // For anxiety, improving means DOWN which is good
  const isGood = trend === 'improving';
  const isWorse = trend === 'worsening';
  if (isGood)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-600">
        <TrendingUp size={10} /> Melhora
      </span>
    );
  if (isWorse)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500">
        <TrendingDown size={10} /> Piora
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-400">
      <Minus size={10} /> Estável
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={90} height={90} viewBox="0 0 90 90" className="rotate-[-90deg]">
      <circle cx={45} cy={45} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={8} />
      <circle
        cx={45}
        cy={45}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DigitalTwinPanelProps {
  twin: DigitalTwin | null;
  patientId: string;
  onRefreshed?: (twin: DigitalTwin) => void;
}

export default function DigitalTwinPanel({ twin, patientId, onRefreshed }: DigitalTwinPanelProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await digitalTwinApi.refresh(patientId);
      if (result.data?.twin && onRefreshed) {
        onRefreshed(result.data.twin as unknown as DigitalTwin);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!twin) {
    return (
      <div className="card text-center py-12 animate-fade-in">
        <Brain size={40} className="mx-auto text-gray-300 mb-4" />
        <p className="text-sm font-medium text-gray-600 mb-1">Gêmeo Digital não disponível</p>
        <p className="text-xs text-gray-400 mb-5">
          O paciente precisa de ao menos 3 check-ins para gerar o gêmeo digital.
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary text-sm mx-auto flex items-center gap-2"
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {refreshing ? 'Gerando...' : 'Gerar Gêmeo Digital'}
        </button>
      </div>
    );
  }

  const score = twin.clinical_score;
  const overallTrend = twin.overall_trend ?? 'stable';
  const scoreColor =
    score !== null && score >= 70
      ? 'text-green-600'
      : score !== null && score >= 40
        ? 'text-amber-500'
        : 'text-red-500';

  const trendText =
    overallTrend === 'improving'
      ? 'Quadro em melhora nos últimos 14 dias'
      : overallTrend === 'worsening'
        ? 'Quadro em piora nos últimos 14 dias'
        : 'Quadro estável nos últimos 14 dias';

  const PRIORITY_VARS = ['mood', 'anxiety', 'energy', 'sleep_quality'];

  // Build sparkline data from avg_7d slope (simplified)
  const makeSparkline = (state: { current: number; avg_7d: number; avg_30d: number; slope_7d: number }) => {
    if (!state) return [];
    return Array.from({ length: 7 }, (_, i) => ({
      v: Math.min(10, Math.max(1, state.avg_30d + state.slope_7d * (i - 3))),
    }));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ------------------------------------------------------------------ */}
      {/* BLOCO 1 — Retrato                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="card section-purple relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-clarita-purple-400 via-clarita-green-400 to-clarita-blue-400" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-clarita-purple-100 flex items-center justify-center">
              <Brain size={16} className="text-clarita-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Gêmeo Digital</h3>
            <span className="badge-purple text-[10px]">IA</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost p-2 text-gray-500 hover:text-gray-700"
            title="Atualizar"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        </div>

        {/* Score + tendência */}
        <div className="flex items-center gap-6 mb-4">
          {score !== null ? (
            <div className="relative flex-shrink-0">
              <ScoreRing score={score} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-[9px] text-gray-400 mt-0.5">/ 100</span>
              </div>
            </div>
          ) : (
            <div className="w-[90px] h-[90px] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Activity size={24} className="text-gray-300" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {score !== null && (
              <p className="text-2xl font-bold text-gray-800 mb-0.5">
                Score <span className={scoreColor}>{score}</span>
                <span className="text-sm text-gray-400 font-normal">/100</span>
              </p>
            )}
            <p className="text-sm text-gray-600 font-medium">{trendText}</p>
            <p className="text-xs text-gray-400 mt-1">
              {twin.data_points_used} dados · confiança {Math.round(twin.confidence_overall * 100)}% ·{' '}
              {format(new Date(twin.computed_at), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Diagnósticos */}
        {twin.diagnoses && twin.diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {twin.diagnoses.map((d) => (
              <span
                key={d.icd_code}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                  d.certainty === 'confirmed'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className="font-mono">{d.icd_code}</span>
                <span className="opacity-60">·</span>
                <span>{d.certainty === 'confirmed' ? 'Confirmado' : 'Suspeito'}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BLOCO 2 — Variáveis                                                */}
      {/* ------------------------------------------------------------------ */}
      {Object.keys(twin.current_state).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {PRIORITY_VARS.filter((v) => twin.current_state[v]).map((variable) => {
            const state = twin.current_state[variable];
            const isRisk = RISK_VAR[variable]?.(state.current);
            const color = VAR_COLOR[variable];
            const sparkData = makeSparkline(state);

            return (
              <div
                key={variable}
                className={`card p-3 border-2 transition-all duration-300 ${
                  isRisk ? 'border-red-200 bg-red-50/40' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color }} className="opacity-70">
                      {VAR_ICON[variable]}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">{VAR_LABEL[variable]}</span>
                    {isRisk && <AlertTriangle size={10} className="text-red-400" />}
                  </div>
                  <TrendBadge trend={state.trend} variable={variable} />
                </div>

                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-800">{state.current}</span>
                  <div className="w-16 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={isRisk ? '#ef4444' : color}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BLOCO 3 — Detalhes técnicos (expansível)                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-clarita-purple-400" />
            Detalhes técnicos
          </span>
          {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {detailsOpen && (
          <div className="mt-4 space-y-5 animate-fade-in">
            {/* Correlações */}
            {twin.correlations && twin.correlations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Correlações detectadas
                </p>
                <div className="space-y-2">
                  {twin.correlations.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-10 text-center text-xs font-bold rounded-lg py-0.5 ${
                          c.direction === 'positive'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.direction === 'positive' ? '+' : '−'}
                        {Math.abs(c.pearson_r).toFixed(2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{c.label_pt}</p>
                        <p className="text-[10px] text-gray-400">{c.strength === 'strong' ? 'Forte' : c.strength === 'moderate' ? 'Moderada' : 'Leve'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predições */}
            {twin.predictions && twin.predictions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Tendência 7 dias
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {twin.predictions.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-2.5 text-center border ${
                        p.risk_level === 'high'
                          ? 'bg-red-50 border-red-200'
                          : p.risk_level === 'moderate'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <p className="text-[10px] text-gray-500 mb-0.5">{VAR_LABEL[p.variable] ?? p.variable}</p>
                      <p className="text-xs font-bold text-gray-700 capitalize">
                        {p.prediction === 'increase' ? '↑ Alta' : p.prediction === 'decrease' ? '↓ Baixa' : '→ Estável'}
                      </p>
                      <p className="text-[9px] text-gray-400">{Math.round(p.confidence * 100)}% conf.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testes psicológicos */}
            {twin.test_results_summary && twin.test_results_summary.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Testes recentes
                </p>
                <div className="space-y-1.5">
                  {twin.test_results_summary.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{t.instrument}</span>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="font-mono font-bold">{t.total_score}</span>
                        {t.severity && (
                          <span className="badge text-[9px] bg-gray-100 text-gray-500">{t.severity}</span>
                        )}
                        <span className="text-gray-400">
                          {format(new Date(t.completed_at), 'd/MM', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confiança do modelo */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Confiança do modelo · v{twin.model_version}</span>
                <span className="font-medium">{Math.round(twin.confidence_overall * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full mt-1">
                <div
                  className="h-1 rounded-full bg-clarita-purple-400"
                  style={{ width: `${twin.confidence_overall * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Verificar TypeScript compila sem erros

```bash
cd dashboard
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros (ou apenas warnings não-críticos).

### Step 4: Testar localmente (opcional se não tiver backend local)

Verificar se o painel renderiza em `http://localhost:3000` com a conta pedro@clarita.demo no perfil de um paciente.

### Step 5: Commit

```bash
cd dashboard
git add src/components/DigitalTwinPanel.tsx src/lib/api.ts
git commit -m "feat: rewrite DigitalTwinPanel with 3-block hybrid design"
```

---

## Task 4: Deploy e Verificação Final

### Step 1: Push e deploy

```bash
git push origin main
```

Railway fará deploy automático do backend. O frontend (Vercel) também fará deploy automático.

### Step 2: Aguardar deploy (45s) e testar o backend

```bash
sleep 45
PEDRO_TOKEN=$(curl -s https://clarita-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pedro@clarita.demo","password":"Demo1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

MARIA_ID="95849831-6ac5-43bc-b7c2-485760dd12fc"

curl -s "https://clarita-production.up.railway.app/api/digital-twin/$MARIA_ID" \
  -H "Authorization: Bearer $PEDRO_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d:
    print('ERROR:', d['error'])
else:
    print('✓ Score:', d.get('clinical_score'))
    print('✓ Trend:', d.get('overall_trend'))
    print('✓ Variables:', list(d.get('current_state',{}).keys()))
    print('✓ Diagnoses:', len(d.get('diagnoses',[])))
    print('✓ Correlations:', len(d.get('correlations',[])))
    print('✓ Predictions:', len(d.get('predictions',[])))
    print('✓ Tests:', len(d.get('test_results_summary',[])))
"
```

Esperado: todos os campos preenchidos, sem `ERROR`.

### Step 3: Testar refresh endpoint

```bash
curl -s -X POST "https://clarita-production.up.railway.app/api/digital-twin/$MARIA_ID/refresh" \
  -H "Authorization: Bearer $PEDRO_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('twin keys:', list(d.get('twin',{}).keys()))
"
```

Esperado: `twin keys` com todos os campos.

### Step 4: Verificar no frontend

Acessar `https://clarita.tec.br` como pedro@clarita.demo, navegar até o perfil de Maria ou João, aba "Gêmeo Digital".

Verificar:
- [ ] Bloco 1: score composto visível + anel colorido + diagnósticos como tags
- [ ] Bloco 2: 4 cards de variáveis com sparklines
- [ ] Bloco 3: expansível com correlações + predições + testes

---

## Resumo dos Arquivos Tocados

| Arquivo | Ação |
|---|---|
| `backend/src/services/digitalTwinCompute.js` | Criar |
| `backend/src/routes/digitalTwin.js` | Substituir |
| `backend/tests/unit/services/digitalTwinCompute.test.js` | Criar |
| `backend/tests/integration/digitalTwin.test.js` | Criar |
| `dashboard/src/components/DigitalTwinPanel.tsx` | Substituir |
| `dashboard/src/lib/api.ts` | Atualizar tipos |
