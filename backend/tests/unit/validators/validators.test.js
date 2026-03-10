'use strict';

const { validationResult } = require('express-validator');
const {
  registrationValidator,
  loginValidator,
  emotionalLogValidator,
  handleValidation,
} = require('../../../src/validators');

/**
 * Helper: run express-validator chains against a mock request object
 * and return the validation result.
 */
async function runValidators(validators, body = {}, params = {}, queryObj = {}) {
  const req = {
    body,
    params,
    query: queryObj,
    headers: {},
  };

  // Run each validator chain
  for (const validator of validators) {
    if (typeof validator === 'function') {
      await validator(req, {}, () => {});
    } else if (validator.run) {
      await validator.run(req);
    }
  }

  return validationResult(req);
}

// =========================================================================
// Email validation (from registrationValidator)
// =========================================================================
describe('Email validation', () => {
  const minValidBody = {
    email: 'valid@example.com',
    password: 'Test1234!',
    first_name: 'Test',
    last_name: 'User',
    role: 'patient',
  };

  it('should accept a valid email', async () => {
    const result = await runValidators(registrationValidator, minValidBody);
    const emailErrors = result.array().filter((e) => e.path === 'email');
    expect(emailErrors).toHaveLength(0);
  });

  it('should reject an invalid email (missing @)', async () => {
    const result = await runValidators(registrationValidator, {
      ...minValidBody,
      email: 'not-an-email',
    });
    const emailErrors = result.array().filter((e) => e.path === 'email');
    expect(emailErrors.length).toBeGreaterThan(0);
  });

  it('should reject an empty email', async () => {
    const result = await runValidators(registrationValidator, {
      ...minValidBody,
      email: '',
    });
    const emailErrors = result.array().filter((e) => e.path === 'email');
    expect(emailErrors.length).toBeGreaterThan(0);
  });

  it('should reject an email without domain', async () => {
    const result = await runValidators(registrationValidator, {
      ...minValidBody,
      email: 'user@',
    });
    const emailErrors = result.array().filter((e) => e.path === 'email');
    expect(emailErrors.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// Password validation (from registrationValidator)
// =========================================================================
describe('Password validation', () => {
  const minValidBody = {
    email: 'valid@example.com',
    password: 'Test1234!',
    first_name: 'Test',
    last_name: 'User',
    role: 'patient',
  };

  it('should accept a valid password (8+ chars, uppercase, number)', async () => {
    const result = await runValidators(registrationValidator, minValidBody);
    const pwErrors = result.array().filter((e) => e.path === 'password');
    expect(pwErrors).toHaveLength(0);
  });

  it('should reject a password shorter than 8 characters', async () => {
    const result = await runValidators(registrationValidator, {
      ...minValidBody,
      password: 'Ab1!',
    });
    const pwErrors = result.array().filter((e) => e.path === 'password');
    expect(pwErrors.length).toBeGreaterThan(0);
    expect(pwErrors[0].msg).toContain('8');
  });

  it('should reject a password without an uppercase letter', async () => {
    const result = await runValidators(registrationValidator, {
      ...minValidBody,
      password: 'test1234!',
    });
    const pwErrors = result.array().filter((e) => e.path === 'password');
    expect(pwErrors.length).toBeGreaterThan(0);
    expect(pwErrors.some((e) => e.msg.includes('mai\u00fascula'))).toBe(true);
  });

  it('should reject a password without a number', async () => {
    const result = await runValidators(registrationValidator, {
      ...minValidBody,
      password: 'Testtest!',
    });
    const pwErrors = result.array().filter((e) => e.path === 'password');
    expect(pwErrors.length).toBeGreaterThan(0);
    expect(pwErrors.some((e) => e.msg.includes('n\u00famero'))).toBe(true);
  });
});

// =========================================================================
// Score validation (emotionalLogValidator, mood_score 1-10)
// =========================================================================
describe('Score validation (mood_score, 1-10)', () => {
  const minValidBody = {
    mood_score: 5,
    anxiety_score: 5,
    energy_score: 5,
  };

  it('should accept scores in range 1-10', async () => {
    const result = await runValidators(emotionalLogValidator, minValidBody);
    const scoreErrors = result.array().filter((e) => e.path === 'mood_score');
    expect(scoreErrors).toHaveLength(0);
  });

  it('should accept score of 1 (minimum)', async () => {
    const result = await runValidators(emotionalLogValidator, {
      ...minValidBody,
      mood_score: 1,
    });
    const scoreErrors = result.array().filter((e) => e.path === 'mood_score');
    expect(scoreErrors).toHaveLength(0);
  });

  it('should accept score of 10 (maximum)', async () => {
    const result = await runValidators(emotionalLogValidator, {
      ...minValidBody,
      mood_score: 10,
    });
    const scoreErrors = result.array().filter((e) => e.path === 'mood_score');
    expect(scoreErrors).toHaveLength(0);
  });

  it('should reject score of 0 (below minimum)', async () => {
    const result = await runValidators(emotionalLogValidator, {
      ...minValidBody,
      mood_score: 0,
    });
    const scoreErrors = result.array().filter((e) => e.path === 'mood_score');
    expect(scoreErrors.length).toBeGreaterThan(0);
  });

  it('should reject score of 11 (above maximum)', async () => {
    const result = await runValidators(emotionalLogValidator, {
      ...minValidBody,
      mood_score: 11,
    });
    const scoreErrors = result.array().filter((e) => e.path === 'mood_score');
    expect(scoreErrors.length).toBeGreaterThan(0);
  });

  it('should reject non-integer score', async () => {
    const result = await runValidators(emotionalLogValidator, {
      ...minValidBody,
      mood_score: 'abc',
    });
    const scoreErrors = result.array().filter((e) => e.path === 'mood_score');
    expect(scoreErrors.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// handleValidation middleware
// =========================================================================
describe('handleValidation', () => {
  it('should call next() when there are no validation errors', async () => {
    const req = { body: {}, params: {}, query: {}, headers: {} };
    // Run with no validators so no errors
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    // handleValidation reads from validationResult(req) which requires
    // express-validator to have been run. With no validation run, there
    // are no errors.
    handleValidation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with error details when validation fails', async () => {
    const body = {
      email: 'not-valid',
      password: 'x',
      first_name: 'Test',
      last_name: 'User',
      role: 'patient',
    };
    const req = { body, params: {}, query: {}, headers: {} };

    // Run the validators to populate errors
    for (const validator of registrationValidator) {
      if (typeof validator === 'function') {
        await validator(req, {}, () => {});
      } else if (validator.run) {
        await validator.run(req);
      }
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    handleValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        details: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
