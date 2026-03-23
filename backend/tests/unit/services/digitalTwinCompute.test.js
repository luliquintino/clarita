'use strict';

const {
  computeVariableStates,
  computeCorrelations,
  computeClinicalScore,
  computePredictions,
  buildTwinObject,
} = require('../../../src/services/digitalTwinCompute');

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

describe('computeCorrelations', () => {
  const makeLogs = (n) =>
    Array.from({ length: n }, (_, i) => ({
      timestamp: new Date(Date.now() - (n - i) * 86400000).toISOString(),
      mood: 5 + Math.sin(i) * 2,
      anxiety: 5 - Math.sin(i) * 2,
      energy: 5 + Math.sin(i) * 2,
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
    const results = [
      {
        instrument: 'PHQ-9',
        total_score: 25,
        completed_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        instrument: 'PHQ-9',
        total_score: 5,
        completed_at: new Date().toISOString(),
      },
    ];
    const score = computeClinicalScore(results);
    // Should use score=5 (recent), not score=25 (old)
    // score=5 → (1 - 5/27)*100 ≈ 81
    // score=25 → (1 - 25/27)*100 ≈ 7
    expect(score).toBeGreaterThan(50); // proves the recent (low) score was used
  });
});

describe('computePredictions', () => {
  it('returns empty array for null states', () => {
    expect(computePredictions(null, null)).toEqual([]);
  });

  it('returns prediction with correct structure', () => {
    const states = {
      mood: { current: 7, avg_7d: 6.5, avg_30d: 5.5, trend: 'improving', slope_14d: 0.2 },
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
    expect(twin.overall_trend).toBeDefined();
    expect(['improving', 'stable', 'worsening']).toContain(twin.overall_trend);
    expect(twin.model_version).toBe('2.0-node');
  });
});
