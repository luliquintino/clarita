'use strict';

const { query } = require('../config/database');

/**
 * Calculate score based on test scoring_rules and patient answers.
 * scoring_rules shape: { method: 'sum' | 'subscale', thresholds: [...], subscales?: {...} }
 */
function calculateScore(test, answers) {
  const rules = test.scoring_rules;
  if (!rules || !answers) return { total_score: 0, subscores: null };

  const questions = test.questions || [];
  let totalScore = 0;
  const subscores = {};

  if (rules.method === 'subscale' && rules.subscales) {
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

  // Determine severity from thresholds
  const scoreInterp = interpretScore(total_score, scoring.thresholds || []);
  analysis.summary = `Escore total: ${total_score}. Classificação: ${scoreInterp.label}.`;

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

  // DSM mapping based on test dsm_references
  if (test.dsm_references && test.dsm_references.length > 0) {
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
  if (highItems.length >= questions.length * 0.5) {
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
