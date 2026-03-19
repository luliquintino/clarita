'use strict';

const { query } = require('../config/database');

/**
 * Calculate score based on test scoring_rules and patient answers.
 * scoring_rules shape: { method: 'sum' | 'subscale' | 'max_subscale' | 'dimension_majority', thresholds: [...], subscales?: {...}, dimensions?: [...] }
 */
function calculateScore(test, answers) {
  const rules = test.scoring_rules;
  if (!rules || !answers) return { total_score: 0, subscores: null };

  const questions = test.questions || [];
  const method = rules.method;
  let totalScore = 0;
  const subscores = {};

  if (method === 'subscale' && rules.subscales) {
    // Each subscale has indices and its own thresholds
    for (const [scaleName, scaleConfig] of Object.entries(rules.subscales)) {
      let scaleScore = 0;
      for (const idx of scaleConfig.indices || []) {
        const answer = answers[String(idx)];
        scaleScore += typeof answer === 'number' ? answer : parseInt(answer, 10) || 0;
      }
      subscores[scaleName] = {
        score: scaleScore,
        interpretation: interpretScore(scaleScore, scaleConfig.thresholds || []),
      };
      totalScore += scaleScore;
    }
  } else if (method === 'max_subscale') {
    // Enneagram-style: winner is the subscale with the highest total
    const subscalesConfig = rules.subscales || {};
    const subscoredFlat = {};
    let winner = null;
    for (const [key, sub] of Object.entries(subscalesConfig)) {
      const total = (sub.indices || []).reduce((sum, i) => sum + (Number(answers[String(i)]) || 0), 0);
      subscoredFlat[key] = total;
      if (!winner || total > winner.score) {
        winner = { key, label: sub.label || key, score: total };
      }
    }
    if (!winner) return { total_score: 0, severity: 'unknown', label: 'Indeterminado', subscores: subscoredFlat };
    return { total_score: winner.score, severity: winner.key, label: winner.label, subscores: subscoredFlat };
  } else if (method === 'dimension_majority') {
    // 16-Personalities-style: 4 dimensions, each with pole_a / pole_b indices
    const dimensions = rules.dimensions || [];
    let typeString = '';
    const dimSubscores = {};
    for (const dim of dimensions) {
      const scoreA = (dim.pole_a_indices || []).reduce((s, i) => s + (Number(answers[String(i)]) || 0), 0);
      const scoreB = (dim.pole_b_indices || []).reduce((s, i) => s + (Number(answers[String(i)]) || 0), 0);
      const result = scoreA >= scoreB ? (dim.pole_a_label || 'A') : (dim.pole_b_label || 'B');
      typeString += result;
      dimSubscores[dim.key] = { score_a: scoreA, score_b: scoreB, result };
    }
    const label = typeString || 'Indeterminado';
    return { total_score: 0, severity: label, label, subscores: dimSubscores };
  } else {
    // Simple sum
    for (let i = 0; i < questions.length; i++) {
      const answer = answers[String(i)];
      totalScore += typeof answer === 'number' ? answer : parseInt(answer, 10) || 0;
    }
  }

  const interpretation = interpretScore(totalScore, rules.thresholds || []);

  return { total_score: totalScore, subscores: Object.keys(subscores).length > 0 ? subscores : null, interpretation };
}

/**
 * Map score to severity level using thresholds array.
 * thresholds: [{ min, max, label, severity }]
 */
function interpretScore(score, thresholds) {
  for (const t of thresholds) {
    if (score >= t.min && score <= t.max) {
      return { label: t.label, severity: t.severity || t.label };
    }
  }
  return { label: 'Indeterminado', severity: 'unknown' };
}

/**
 * Generate AI analysis for a completed test session.
 * Uses heuristic-based analysis (can be extended to call AI Engine).
 */
async function generateAIAnalysis(session, test) {
  const { total_score, answers } = session;
  const scoring = test.scoring_rules || {};
  const interpretation = test.interpretation_guide || {};

  const analysis = {
    summary: '',
    patterns: [],
    clinical_observations: [],
    dsm_mapping: [],
    recommendations: [],
    generated_at: new Date().toISOString(),
  };

  // Determine severity from thresholds (or use label directly for personality tests)
  const isPersonalityTest = ['max_subscale', 'dimension_majority'].includes(scoring.method);
  let scoreInterp;
  if (isPersonalityTest) {
    // Contract: callers may store the calculateScore result in session.scores,
    // session.result, or (legacy) as a top-level session.label field.
    // All three paths are checked so the personality type is never lost.
    const personalityLabel =
      session.scores?.label ||
      session.result?.label ||
      session.label ||
      'Indeterminado';
    scoreInterp = { label: personalityLabel, severity: personalityLabel };
    analysis.summary = `Tipo: ${personalityLabel}.`;
  } else {
    scoreInterp = interpretScore(total_score, scoring.thresholds || []);
    analysis.summary = `Escore total: ${total_score}. Classificação: ${scoreInterp.label}.`;
  }

  // Pattern detection: identify high-scoring clusters
  const questions = test.questions || [];
  const highItems = [];
  for (let i = 0; i < questions.length; i++) {
    const val = parseInt(answers?.[String(i)], 10) || 0;
    const maxVal = questions[i].max_value || 3;
    if (val >= maxVal * 0.75) {
      highItems.push({
        index: i,
        question: questions[i].text || `Questão ${i + 1}`,
        value: val,
        domain: questions[i].domain || null,
      });
    }
  }

  if (highItems.length > 0) {
    analysis.patterns.push({
      type: 'high_scoring_items',
      count: highItems.length,
      items: highItems.map((h) => h.question),
    });
  }

  // DSM mapping based on test dsm_references.
  // Skipped for personality tests: severity is a type code (e.g. "INTJ"), not a
  // clinical severity level, so computing relevance from it would be misleading.
  if (!isPersonalityTest && test.dsm_references && test.dsm_references.length > 0) {
    const dsmResult = await query(
      `SELECT code, name, category FROM dsm_criteria WHERE code = ANY($1)`,
      [test.dsm_references]
    );
    analysis.dsm_mapping = dsmResult.rows.map((d) => ({
      code: d.code,
      name: d.name,
      category: d.category,
      relevance: scoreInterp.severity === 'severe' || scoreInterp.severity === 'moderately_severe'
        ? 'high'
        : scoreInterp.severity === 'moderate'
          ? 'moderate'
          : 'low',
    }));
  }

  // Clinical observations
  if (scoreInterp.severity === 'severe' || scoreInterp.severity === 'moderately_severe') {
    analysis.clinical_observations.push('Escore elevado — avaliação clínica aprofundada recomendada.');
  }
  if (questions.length > 0 && highItems.length >= questions.length * 0.5) {
    analysis.clinical_observations.push('Mais de 50% dos itens com pontuação elevada — padrão difuso.');
  }

  // Recommendations from interpretation guide
  if (interpretation.recommendations) {
    const rec = interpretation.recommendations[scoreInterp.severity] || interpretation.recommendations.default;
    if (rec) {
      analysis.recommendations = Array.isArray(rec) ? rec : [rec];
    }
  }

  return analysis;
}

/**
 * Expire overdue test sessions (cron job — runs daily).
 */
async function expireOverdueSessions() {
  const result = await query(
    `UPDATE patient_test_sessions
     SET status = 'expired'
     WHERE status IN ('pending', 'in_progress')
       AND deadline IS NOT NULL
       AND deadline < NOW()
     RETURNING id`
  );
  return result.rows.length;
}

module.exports = { calculateScore, generateAIAnalysis, expireOverdueSessions };
