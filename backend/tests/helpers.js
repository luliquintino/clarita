'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');
const { generateDisplayId } = require('../src/utils/generateDisplayId');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-clarita-2024';

/**
 * Generate a JWT token for testing.
 */
function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Generate an expired JWT token for testing.
 */
function generateExpiredToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '-1s' });
}

/**
 * Create a test user and return the user object + token.
 * @param {object} overrides - Override default values
 * @returns {Promise<{user: object, token: string}>}
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password: 'Test1234!',
    first_name: 'Test',
    last_name: 'User',
    role: 'patient',
    phone: null,
    is_active: true,
  };

  const data = { ...defaults, ...overrides };
  const passwordHash = await bcrypt.hash(data.password, 4); // Low rounds for speed
  const displayId = await generateDisplayId();

  const result = await query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, display_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, role, first_name, last_name, phone, is_active, display_id, created_at`,
    [data.email, passwordHash, data.role, data.first_name, data.last_name, data.phone, data.is_active, displayId]
  );

  const user = result.rows[0];
  const token = generateToken(user.id, user.role);

  return { user, token, password: data.password };
}

/**
 * Create a test patient with profile.
 */
async function createTestPatient(overrides = {}) {
  const { user, token, password } = await createTestUser({
    role: 'patient',
    first_name: 'Paciente',
    last_name: 'Teste',
    ...overrides,
  });

  await query(
    `INSERT INTO patient_profiles (user_id, date_of_birth, gender)
     VALUES ($1, $2, $3)`,
    [user.id, overrides.date_of_birth || '1990-01-01', overrides.gender || 'feminino']
  );

  return { user, token, password };
}

/**
 * Create a test professional (psychologist or psychiatrist) with profile.
 */
async function createTestProfessional(overrides = {}) {
  const role = overrides.role || 'psychologist';
  const { user, token, password } = await createTestUser({
    role,
    first_name: role === 'psychiatrist' ? 'Psiquiatra' : 'Psicologa',
    last_name: 'Teste',
    ...overrides,
  });

  const licenseNumber =
    overrides.license_number ||
    `CRP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await query(
    `INSERT INTO professional_profiles (user_id, license_number, specialization, institution)
     VALUES ($1, $2, $3, $4)`,
    [
      user.id,
      licenseNumber,
      overrides.specialization || 'Clinica',
      overrides.institution || 'Clinica Teste',
    ]
  );

  return { user, token, password };
}

/**
 * Create a care relationship between patient and professional.
 */
async function createCareRelationship(patientId, professionalId, overrides = {}) {
  const result = await query(
    `INSERT INTO care_relationships (patient_id, professional_id, relationship_type, status, started_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [
      patientId,
      professionalId,
      overrides.relationship_type || 'psychologist',
      overrides.status || 'active',
    ]
  );

  // Grant default data permissions
  const permissionTypes = ['emotional_logs', 'symptoms', 'medications', 'assessments', 'life_events', 'clinical_notes'];
  for (const permType of permissionTypes) {
    await query(
      `INSERT INTO data_permissions (patient_id, professional_id, permission_type, granted)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (patient_id, professional_id, permission_type) DO NOTHING`,
      [patientId, professionalId, permType]
    );
  }

  return result.rows[0];
}

/**
 * Clean all data from tables (preserving schema).
 */
async function cleanDatabase() {
  await query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('assessments', 'symptoms', 'medications')) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}

/**
 * Create a test emotional log.
 */
async function createTestEmotionalLog(patientId, overrides = {}) {
  const result = await query(
    `INSERT INTO emotional_logs (patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      patientId,
      overrides.mood_score || 7,
      overrides.anxiety_score || 3,
      overrides.energy_score || 6,
      overrides.sleep_quality || 'good',
      overrides.sleep_hours || 7.5,
      overrides.notes || 'Log de teste',
    ]
  );
  return result.rows[0];
}

/**
 * Create a test life event.
 */
async function createTestLifeEvent(patientId, overrides = {}) {
  const result = await query(
    `INSERT INTO life_events (patient_id, title, description, category, impact_level, event_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      patientId,
      overrides.title || 'Evento de teste',
      overrides.description || 'Descricao do evento',
      overrides.category || 'work',
      overrides.impact_level || 5,
      overrides.event_date || new Date().toISOString().split('T')[0],
    ]
  );
  return result.rows[0];
}

/**
 * Create a test clinical note.
 */
async function createTestClinicalNote(professionalId, patientId, overrides = {}) {
  const result = await query(
    `INSERT INTO clinical_notes (professional_id, patient_id, session_date, note_type, content, is_private)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      professionalId,
      patientId,
      overrides.session_date || new Date().toISOString().split('T')[0],
      overrides.note_type || 'session',
      overrides.content || 'Nota clinica de teste',
      overrides.is_private || false,
    ]
  );
  return result.rows[0];
}

/**
 * Get the Express app for Supertest.
 */
function getApp() {
  return require('../src/index');
}

module.exports = {
  generateToken,
  generateExpiredToken,
  createTestUser,
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
  createTestEmotionalLog,
  createTestLifeEvent,
  createTestClinicalNote,
  getApp,
  JWT_SECRET,
};
