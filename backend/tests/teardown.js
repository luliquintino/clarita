'use strict';

const path = require('path');

/**
 * Jest globalTeardown — runs once after all test suites.
 * Closes the database pool.
 */
module.exports = async () => {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Clean up any remaining connections
    await pool.end();
  } catch {
    // Ignore errors during teardown
  }
};
