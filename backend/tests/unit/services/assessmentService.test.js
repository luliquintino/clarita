'use strict';

const {
  calculateScore,
  classifySeverity,
  validateAnswers,
  PHQ9_SEVERITY,
  GAD7_SEVERITY,
} = require('../../../src/services/assessmentService');

// =========================================================================
// calculateScore
// =========================================================================
describe('calculateScore', () => {
  it('should sum all answer values', () => {
    const answers = { q1: 1, q2: 2, q3: 3 };
    expect(calculateScore(answers)).toBe(6);
  });

  it('should return 0 for all-zero answers', () => {
    const answers = { q1: 0, q2: 0, q3: 0 };
    expect(calculateScore(answers)).toBe(0);
  });

  it('should throw when a value is not a valid integer', () => {
    const answers = { q1: 1, q2: 'abc' };
    expect(() => calculateScore(answers)).toThrow('inteiros');
  });
});

// =========================================================================
// classifySeverity - PHQ-9
// =========================================================================
describe('classifySeverity - PHQ-9', () => {
  it('should classify score 0 as minimal', () => {
    expect(classifySeverity('PHQ-9', 0)).toBe('minimal');
  });

  it('should classify score 4 as minimal', () => {
    expect(classifySeverity('PHQ-9', 4)).toBe('minimal');
  });

  it('should classify score 5 as mild', () => {
    expect(classifySeverity('PHQ-9', 5)).toBe('mild');
  });

  it('should classify score 9 as mild', () => {
    expect(classifySeverity('PHQ-9', 9)).toBe('mild');
  });

  it('should classify score 10 as moderate', () => {
    expect(classifySeverity('PHQ-9', 10)).toBe('moderate');
  });

  it('should classify score 14 as moderate', () => {
    expect(classifySeverity('PHQ-9', 14)).toBe('moderate');
  });

  it('should classify score 15 as moderately_severe', () => {
    expect(classifySeverity('PHQ-9', 15)).toBe('moderately_severe');
  });

  it('should classify score 19 as moderately_severe', () => {
    expect(classifySeverity('PHQ-9', 19)).toBe('moderately_severe');
  });

  it('should classify score 20 as severe', () => {
    expect(classifySeverity('PHQ-9', 20)).toBe('severe');
  });

  it('should classify score 27 as severe', () => {
    expect(classifySeverity('PHQ-9', 27)).toBe('severe');
  });

  it('should classify score above 27 as severe (fallback to highest)', () => {
    expect(classifySeverity('PHQ-9', 30)).toBe('severe');
  });

  it('should handle alternate name formats (PHQ9, phq-9)', () => {
    expect(classifySeverity('PHQ9', 5)).toBe('mild');
    expect(classifySeverity('phq-9', 5)).toBe('mild');
  });
});

// =========================================================================
// classifySeverity - GAD-7
// =========================================================================
describe('classifySeverity - GAD-7', () => {
  it('should classify score 0 as minimal', () => {
    expect(classifySeverity('GAD-7', 0)).toBe('minimal');
  });

  it('should classify score 4 as minimal', () => {
    expect(classifySeverity('GAD-7', 4)).toBe('minimal');
  });

  it('should classify score 5 as mild', () => {
    expect(classifySeverity('GAD-7', 5)).toBe('mild');
  });

  it('should classify score 9 as mild', () => {
    expect(classifySeverity('GAD-7', 9)).toBe('mild');
  });

  it('should classify score 10 as moderate', () => {
    expect(classifySeverity('GAD-7', 10)).toBe('moderate');
  });

  it('should classify score 14 as moderate', () => {
    expect(classifySeverity('GAD-7', 14)).toBe('moderate');
  });

  it('should classify score 15 as severe', () => {
    expect(classifySeverity('GAD-7', 15)).toBe('severe');
  });

  it('should classify score 21 as severe', () => {
    expect(classifySeverity('GAD-7', 21)).toBe('severe');
  });

  it('should classify score above 21 as severe (fallback to highest)', () => {
    expect(classifySeverity('GAD-7', 25)).toBe('severe');
  });

  it('should handle alternate name formats (GAD7, gad-7)', () => {
    expect(classifySeverity('GAD7', 5)).toBe('mild');
    expect(classifySeverity('gad-7', 5)).toBe('mild');
  });
});

// =========================================================================
// classifySeverity - Unknown assessment
// =========================================================================
describe('classifySeverity - unknown assessment', () => {
  it('should return unclassified for unknown assessment names', () => {
    expect(classifySeverity('UNKNOWN-99', 10)).toBe('unclassified');
  });
});

// =========================================================================
// validateAnswers - PHQ-9
// =========================================================================
describe('validateAnswers - PHQ-9', () => {
  it('should accept valid 9-question answers', () => {
    const answers = { q1: 0, q2: 1, q3: 2, q4: 3, q5: 0, q6: 1, q7: 2, q8: 3, q9: 0 };
    const result = validateAnswers('PHQ-9', answers);
    expect(result.valid).toBe(true);
  });

  it('should reject when answer count is wrong', () => {
    const answers = { q1: 0, q2: 1 }; // only 2 answers
    const result = validateAnswers('PHQ-9', answers);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('9');
  });

  it('should reject when a value exceeds max (3)', () => {
    const answers = { q1: 0, q2: 1, q3: 2, q4: 4, q5: 0, q6: 1, q7: 2, q8: 3, q9: 0 };
    const result = validateAnswers('PHQ-9', answers);
    expect(result.valid).toBe(false);
  });

  it('should reject negative values', () => {
    const answers = { q1: -1, q2: 1, q3: 2, q4: 3, q5: 0, q6: 1, q7: 2, q8: 3, q9: 0 };
    const result = validateAnswers('PHQ-9', answers);
    expect(result.valid).toBe(false);
  });
});

// =========================================================================
// validateAnswers - GAD-7
// =========================================================================
describe('validateAnswers - GAD-7', () => {
  it('should accept valid 7-question answers', () => {
    const answers = { q1: 0, q2: 1, q3: 2, q4: 3, q5: 0, q6: 1, q7: 2 };
    const result = validateAnswers('GAD-7', answers);
    expect(result.valid).toBe(true);
  });

  it('should reject when answer count is wrong', () => {
    const answers = { q1: 0, q2: 1 };
    const result = validateAnswers('GAD-7', answers);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('7');
  });

  it('should reject when a value exceeds max (3)', () => {
    const answers = { q1: 0, q2: 1, q3: 2, q4: 5, q5: 0, q6: 1, q7: 2 };
    const result = validateAnswers('GAD-7', answers);
    expect(result.valid).toBe(false);
  });
});

// =========================================================================
// validateAnswers - unknown
// =========================================================================
describe('validateAnswers - unknown assessment', () => {
  it('should return valid true for unknown assessment (skip validation)', () => {
    const answers = { q1: 99 };
    const result = validateAnswers('SOME-UNKNOWN', answers);
    expect(result.valid).toBe(true);
  });
});
