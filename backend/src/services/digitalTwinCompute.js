'use strict';

const { classifySeverity } = require('./assessmentService');

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Compute Exponentially Weighted Moving Average over an array of numbers.
 * @param {number[]} values
 * @param {number} alpha  smoothing factor (0 < alpha < 1)
 * @returns {number}
 */
function ewma(values, alpha = 0.15) {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

/**
 * Simple arithmetic mean.
 * @param {number[]} values
 * @returns {number}
 */
function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Linear regression slope (ordinary least squares) for a series of values
 * treated as evenly spaced x = 0, 1, 2, …
 * @param {number[]} values
 * @returns {number} slope
 */
function linearSlope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Pearson correlation coefficient between two equal-length arrays.
 * Returns 0 if standard deviation of either series is 0.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {number}
 */
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let sdx = 0;
  let sdy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    sdx += (xs[i] - mx) ** 2;
    sdy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(sdx * sdy);
  return denom === 0 ? 0 : num / denom;
}

// ---------------------------------------------------------------------------
// Variable name labels in Portuguese
// ---------------------------------------------------------------------------
const VAR_LABELS_PT = {
  mood: 'Humor',
  anxiety: 'Ansiedade',
  energy: 'Energia',
  sleep_quality: 'Qualidade do sono',
  sleep_hours: 'Horas de sono',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute per-variable state statistics from emotional logs.
 *
 * @param {object[]} logs  Array of emotional log objects ordered by timestamp ASC.
 * @returns {object|null}  Map of variable name → state object, or null if < 3 logs.
 */
function computeVariableStates(logs) {
  if (!logs || logs.length < 3) return null;

  const variables = ['mood', 'anxiety', 'energy', 'sleep_quality', 'sleep_hours', 'med_adherence'];
  const result = {};

  for (const varName of variables) {
    // Extract non-null values with their position preserved (for rolling windows)
    const allValues = logs
      .map((l) => l[varName])
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map(Number);

    if (allValues.length === 0) continue;

    const last7 = allValues.slice(-7);
    const last14 = allValues.slice(-14);
    const last30 = allValues.slice(-30);

    const current = parseFloat(ewma(last7).toFixed(2));
    const avg_7d = parseFloat(mean(last7).toFixed(2));
    const avg_30d = parseFloat(mean(last30).toFixed(2));
    const slope_14d = parseFloat(linearSlope(last14).toFixed(4));

    let trend;
    const THRESHOLD = 0.05;
    if (varName === 'anxiety') {
      // For anxiety: increasing is worsening
      if (slope_14d > THRESHOLD) trend = 'worsening';
      else if (slope_14d < -THRESHOLD) trend = 'improving';
      else trend = 'stable';
    } else {
      if (slope_14d > THRESHOLD) trend = 'improving';
      else if (slope_14d < -THRESHOLD) trend = 'worsening';
      else trend = 'stable';
    }

    result[varName] = { current, avg_7d, avg_30d, trend, slope_14d };
  }

  return result;
}

/**
 * Compute Pearson correlations between all relevant variable pairs.
 *
 * @param {object[]} logs
 * @returns {object[]}  Correlation objects sorted by |r| descending (top 6).
 */
function computeCorrelations(logs) {
  if (!logs || logs.length < 7) return [];

  const VARS = ['mood', 'anxiety', 'energy', 'sleep_quality', 'sleep_hours'];
  const correlations = [];

  for (let i = 0; i < VARS.length; i++) {
    for (let j = i + 1; j < VARS.length; j++) {
      const varA = VARS[i];
      const varB = VARS[j];

      // Build paired arrays (only where both are non-null)
      const xs = [];
      const ys = [];
      for (const log of logs) {
        const a = log[varA];
        const b = log[varB];
        if (a !== null && a !== undefined && b !== null && b !== undefined) {
          xs.push(Number(a));
          ys.push(Number(b));
        }
      }

      if (xs.length < 3) continue;

      const r = parseFloat(pearson(xs, ys).toFixed(4));
      if (Math.abs(r) < 0.3) continue;

      const direction = r >= 0 ? 'positive' : 'negative';
      let strength;
      const absR = Math.abs(r);
      if (absR >= 0.7) strength = 'strong';
      else if (absR >= 0.5) strength = 'moderate';
      else strength = 'mild';

      const labelA = VAR_LABELS_PT[varA] || varA;
      const labelB = VAR_LABELS_PT[varB] || varB;
      const label_pt = `${labelA} × ${labelB}`;

      correlations.push({
        variable_a: varA,
        variable_b: varB,
        pearson_r: r,
        p_value: null,
        direction,
        strength,
        label_pt,
      });
    }
  }

  // Sort by |r| descending, return top 6
  correlations.sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r));
  return correlations.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Instrument max scores
// ---------------------------------------------------------------------------
const INSTRUMENT_MAX = {
  'PHQ-9': 27,
  'GAD-7': 21,
  'BAI': 63,
  'DASS-21': 42,
};

/**
 * Compute an overall clinical wellness score (0–100) from test results.
 * Higher = better (less pathology).
 *
 * @param {object[]} testResults
 * @returns {number|null}
 */
function computeClinicalScore(testResults) {
  if (!testResults || testResults.length === 0) return null;

  // Group by instrument, keep most recent
  const latestByInstrument = {};
  for (const result of testResults) {
    const instr = result.instrument;
    if (!INSTRUMENT_MAX[instr]) continue; // unsupported instrument
    const existing = latestByInstrument[instr];
    if (!existing || new Date(result.completed_at) > new Date(existing.completed_at)) {
      latestByInstrument[instr] = result;
    }
  }

  const instruments = Object.values(latestByInstrument);
  if (instruments.length === 0) return null;

  const scores = instruments.map((r) => {
    const max = INSTRUMENT_MAX[r.instrument];
    return Math.max(0, Math.min(100, Math.round((1 - r.total_score / max) * 100)));
  });

  return Math.round(mean(scores));
}

/**
 * Compute forward-looking predictions from current states.
 *
 * @param {object|null} states   Output of computeVariableStates
 * @param {number|null} clinicalScore
 * @returns {object[]}
 */
function computePredictions(states, clinicalScore) {
  if (!states) return [];

  const PRIORITY_VARS = ['mood', 'anxiety', 'energy', 'sleep_quality'];
  const predictions = [];

  for (const varName of PRIORITY_VARS) {
    const state = states[varName];
    if (!state) continue;

    const { current, trend, slope_14d } = state;

    // Prediction direction
    let prediction;
    if (slope_14d > 0.05) prediction = 'increase';
    else if (slope_14d < -0.05) prediction = 'decrease';
    else prediction = 'stable';

    // Risk level
    let risk_level = 'low';
    if (varName === 'mood' && current < 4 && trend === 'worsening') {
      risk_level = 'high';
    } else if (varName === 'anxiety' && current > 7 && trend === 'worsening') {
      risk_level = 'high';
    } else if (trend === 'worsening') {
      risk_level = 'moderate';
    }

    // Confidence
    const confidence = parseFloat(Math.min(0.85, 0.4 + Math.abs(slope_14d) * 2).toFixed(2));

    // Reasoning in Portuguese
    const varLabel = VAR_LABELS_PT[varName] || varName;
    let reasoning;
    if (trend === 'improving') {
      reasoning = `${varLabel} apresenta tendência de melhora nos últimos dias.`;
    } else if (trend === 'worsening') {
      reasoning = `${varLabel} apresenta tendência de piora nos últimos dias.`;
    } else {
      reasoning = `${varLabel} está estável nos últimos dias.`;
    }

    predictions.push({
      variable: varName,
      prediction,
      risk_level,
      confidence,
      horizon_days: 7,
      reasoning,
    });
  }

  return predictions;
}

/**
 * Build the complete Digital Twin object for a patient.
 *
 * @param {string}   patientId
 * @param {object[]} logs          Emotional logs (ASC)
 * @param {object[]} testResults   Psychometric test results
 * @param {object[]} diagnoses     Diagnosis records
 * @returns {object|null}
 */
function buildTwinObject(patientId, logs, testResults, diagnoses) {
  if ((!logs || logs.length < 3) && (!testResults || testResults.length === 0)) {
    return null;
  }

  const states = computeVariableStates(logs || []);
  const clinicalScore = computeClinicalScore(testResults || []);

  if (!states && clinicalScore === null) return null;

  const correlations = computeCorrelations(logs || []);
  const predictions = computePredictions(states, clinicalScore);

  // Overall trend: average of trend scores
  let overallTrend = 'stable';
  if (states) {
    const trendScores = Object.values(states).map((s) => {
      if (s.trend === 'improving') return 1;
      if (s.trend === 'worsening') return -1;
      return 0;
    });
    if (trendScores.length > 0) {
      const avg = mean(trendScores);
      if (avg > 0.3) overallTrend = 'improving';
      else if (avg < -0.3) overallTrend = 'worsening';
      else overallTrend = 'stable';
    }
  }

  // 5 most recent test results with severity
  const testResultsSummary = (testResults || [])
    .slice()
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 5)
    .map((r) => ({
      instrument: r.instrument,
      total_score: r.total_score,
      severity_level: classifySeverity(r.instrument, r.total_score),
      completed_at: r.completed_at,
    }));

  const dataPoints = (logs || []).length + (testResults || []).length;
  const confidenceOverall = parseFloat(Math.min(1, dataPoints / 30).toFixed(2));

  return {
    patient_id: patientId,
    current_state: states,
    clinical_score: clinicalScore,
    overall_trend: overallTrend,
    correlations,
    predictions,
    diagnoses: (diagnoses || []).map((d) => ({
      icd_code: d.icd_code,
      icd_name: d.icd_name,
      certainty: d.certainty,
    })),
    test_results_summary: testResultsSummary,
    data_points_used: dataPoints,
    model_version: '2.0-node',
    confidence_overall: confidenceOverall,
    computed_at: new Date().toISOString(),
  };
}

module.exports = {
  computeVariableStates,
  computeCorrelations,
  computeClinicalScore,
  computePredictions,
  buildTwinObject,
};
