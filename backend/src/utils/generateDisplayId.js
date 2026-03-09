'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

/**
 * Generates a unique human-readable display ID for a user.
 * Format: CLA-XXXXXX (6 uppercase hex characters)
 * Retries up to maxRetries on collision, then falls back to 8 chars.
 */
async function generateDisplayId(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const code = 'CLA-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const exists = await query('SELECT 1 FROM users WHERE display_id = $1', [code]);
    if (exists.rows.length === 0) {
      return code;
    }
  }
  // Fallback: 4 bytes = 8 hex chars for less collision chance
  const fallback = 'CLA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  return fallback;
}

module.exports = { generateDisplayId };
