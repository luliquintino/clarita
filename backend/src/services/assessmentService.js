'use strict';

// ---------------------------------------------------------------------------
// Scoring rules for supported assessments
// ---------------------------------------------------------------------------

const PHQ9_SEVERITY = [
  { min: 0, max: 4, level: 'minimal' },
  { min: 5, max: 9, level: 'mild' },
  { min: 10, max: 14, level: 'moderate' },
  { min: 15, max: 19, level: 'moderately_severe' },
  { min: 20, max: 27, level: 'severe' },
];

const GAD7_SEVERITY = [
  { min: 0, max: 4, level: 'minimal' },
  { min: 5, max: 9, level: 'mild' },
  { min: 10, max: 14, level: 'moderate' },
  { min: 15, max: 21, level: 'severe' },
];

/**
 * Calculate total score from an answers object.
 * The answers object maps question identifiers (e.g. "q1", "q2") to integer
 * values (0-3 for PHQ-9 and GAD-7).
 *
 * @param {object} answers  { "q1": 2, "q2": 1, ... }
 * @returns {number}
 */
function calculateScore(answers) {
  return Object.values(answers).reduce((sum, val) => {
    const num = parseInt(val, 10);
    if (Number.isNaN(num)) {
      throw new Error('Todos os valores das respostas devem ser inteiros');
    }
    return sum + num;
  }, 0);
}

/**
 * Determine the severity level for a given assessment name and total score.
 *
 * @param {string} assessmentName  e.g. "PHQ-9" or "GAD-7"
 * @param {number} totalScore
 * @returns {string}  Severity level string
 */
function classifySeverity(assessmentName, totalScore) {
  let table;

  const normalised = assessmentName.toUpperCase().replace(/\s/g, '');

  if (normalised.includes('PHQ') || normalised.includes('PHQ-9') || normalised.includes('PHQ9')) {
    table = PHQ9_SEVERITY;
  } else if (
    normalised.includes('GAD') ||
    normalised.includes('GAD-7') ||
    normalised.includes('GAD7')
  ) {
    table = GAD7_SEVERITY;
  } else {
    // Unknown assessment -- fallback to a generic label
    return 'unclassified';
  }

  for (const band of table) {
    if (totalScore >= band.min && totalScore <= band.max) {
      return band.level;
    }
  }

  // Score exceeds the maximum defined band -- return the highest severity
  return table[table.length - 1].level;
}

/**
 * Validate that the answer set is consistent with the expected question count.
 *
 * @param {string} assessmentName
 * @param {object} answers
 * @returns {{ valid: boolean, message?: string }}
 */
function validateAnswers(assessmentName, answers) {
  const normalised = assessmentName.toUpperCase().replace(/\s/g, '');

  let expectedCount;
  let maxPerQuestion;

  if (normalised.includes('PHQ') || normalised.includes('PHQ9')) {
    expectedCount = 9;
    maxPerQuestion = 3;
  } else if (normalised.includes('GAD') || normalised.includes('GAD7')) {
    expectedCount = 7;
    maxPerQuestion = 3;
  } else {
    // Unknown assessment -- skip structural validation
    return { valid: true };
  }

  const keys = Object.keys(answers);

  if (keys.length !== expectedCount) {
    return {
      valid: false,
      message: `Esperado ${expectedCount} respostas, recebido ${keys.length}`,
    };
  }

  for (const key of keys) {
    const val = parseInt(answers[key], 10);
    if (Number.isNaN(val) || val < 0 || val > maxPerQuestion) {
      return {
        valid: false,
        message: `Resposta "${key}" deve ser um inteiro entre 0 e ${maxPerQuestion}`,
      };
    }
  }

  return { valid: true };
}

module.exports = {
  calculateScore,
  classifySeverity,
  validateAnswers,
  PHQ9_SEVERITY,
  GAD7_SEVERITY,
};
