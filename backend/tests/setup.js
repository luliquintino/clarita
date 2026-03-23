'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Jest globalSetup — runs once before all test suites.
 * Sets up test database schema and migrations.
 */
module.exports = async () => {
  // Load test env vars (globalSetup runs in its own context)
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Migration files in dependency order (phases first, then dependent migrations)
  const migrationsDir = path.join(__dirname, '..', 'db');
  const migrationOrder = [
    'migration_password_reset.sql',
    'migration_phase1.sql',
    'migration_phase3.sql',
    'migration_phase4.sql',
    'migration_goal_acceptance.sql',
    'migration_digital_twin.sql',
    'migration_emotional_logs_twin_columns.sql',
    'migration_onboarding_documents.sql',
    'migration_invitations.sql',
    'migration_exams.sql',
    'migration_clinical_modules.sql',
    'migration_lgpd.sql',
    // Feature migrations (must run after base schema + above)
    'migration_conditions.sql',
    'migration_professional_onboarding.sql',
    'migration_push_subscriptions.sql',
    'migration_direct_chat.sql',
    'migration_icd11_satepsi.sql',
    'migration_patient_diagnoses.sql',
  ];
  const migrationFiles = migrationOrder.filter((f) =>
    fs.existsSync(path.join(migrationsDir, f))
  );

  // Seed files for reference/catalog data (order matters)
  const seedOrder = [
    'seed.sql',                  // symptoms, medications, assessments
    'seed_icd11_disorders.sql',  // ICD-11 catalog (needed by icd11 routes + enrich migration)
    'migration_enrich_icd11.sql', // UPDATEs icd11_disorders (depends on seed_icd11_disorders)
    'seed_dsm_criteria.sql',
    'seed_satepsi_tests.sql',
    'seed_psych_tests.sql',
    'seed_icd_test_mapping.sql',
  ];
  const seedFiles = seedOrder.filter((f) =>
    fs.existsSync(path.join(migrationsDir, f))
  );

  try {
    // Drop all tables first for a clean state
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop all custom types
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Run main schema
    await pool.query(schemaSql);

    // Run migrations
    for (const file of migrationFiles) {
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(migrationSql);
    }

    // Seed reference/catalog tables
    for (const file of seedFiles) {
      const seedSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(seedSql);
    }
  } catch (err) {
    console.error('Failed to set up test database:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
};
