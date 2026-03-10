'use strict';

const request = require('supertest');
const { query } = require('../../src/config/database');
const {
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
  getApp,
} = require('../helpers');

const app = getApp();

let patient, patientToken;
let psychiatrist, psychiatristToken;
let psychologist, psychologistToken;
let medicationId;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const psych = await createTestProfessional({
    role: 'psychiatrist',
    email: 'psychiatrist-med@test.com',
  });
  psychiatrist = psych.user;
  psychiatristToken = psych.token;

  const psy = await createTestProfessional({
    role: 'psychologist',
    email: 'psychologist-med@test.com',
  });
  psychologist = psy.user;
  psychologistToken = psy.token;

  await createCareRelationship(patient.id, psychiatrist.id, {
    relationship_type: 'psychiatrist',
  });
  await createCareRelationship(patient.id, psychologist.id, {
    relationship_type: 'psychologist',
  });

  // Fetch a valid medication id from the catalog
  const medResult = await query('SELECT id FROM medications LIMIT 1');
  medicationId = medResult.rows[0].id;
});

describe('GET /api/medications', () => {
  it('should return the medication catalog', async () => {
    const res = await request(app)
      .get('/api/medications')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medications).toBeDefined();
    expect(Array.isArray(res.body.medications)).toBe(true);
    expect(res.body.medications.length).toBeGreaterThan(0);
    expect(res.body.medications[0].name).toBeDefined();
    expect(res.body.medications[0].category).toBeDefined();
  });
});

describe('POST /api/patient-medications', () => {
  it('should allow psychiatrist to prescribe medication (201)', async () => {
    const res = await request(app)
      .post('/api/patient-medications')
      .set('Authorization', `Bearer ${psychiatristToken}`)
      .send({
        patient_id: patient.id,
        medication_id: medicationId,
        dosage: '50mg',
        frequency: 'Once daily',
        start_date: new Date().toISOString().split('T')[0],
      });

    expect(res.status).toBe(201);
    expect(res.body.patient_medication).toBeDefined();
    expect(res.body.patient_medication.dosage).toBe('50mg');
    expect(res.body.patient_medication.patient_id).toBe(patient.id);
    expect(res.body.patient_medication.prescribed_by).toBe(psychiatrist.id);
  });

  it('should reject psychologist from prescribing (403)', async () => {
    const res = await request(app)
      .post('/api/patient-medications')
      .set('Authorization', `Bearer ${psychologistToken}`)
      .send({
        patient_id: patient.id,
        medication_id: medicationId,
        dosage: '50mg',
        frequency: 'Once daily',
        start_date: new Date().toISOString().split('T')[0],
      });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/patient-medications/:id', () => {
  let prescriptionId;

  beforeAll(async () => {
    // Create a prescription to update
    const result = await query(
      `INSERT INTO patient_medications (patient_id, medication_id, prescribed_by, dosage, frequency, start_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient.id, medicationId, psychiatrist.id, '25mg', 'Once daily', new Date().toISOString().split('T')[0]]
    );
    prescriptionId = result.rows[0].id;
  });

  it('should allow psychiatrist to adjust dosage', async () => {
    const res = await request(app)
      .put(`/api/patient-medications/${prescriptionId}`)
      .set('Authorization', `Bearer ${psychiatristToken}`)
      .send({ dosage: '100mg' });

    expect(res.status).toBe(200);
    expect(res.body.patient_medication).toBeDefined();
    expect(res.body.patient_medication.dosage).toBe('100mg');
  });

  it('should return 400 when no fields provided', async () => {
    const res = await request(app)
      .put(`/api/patient-medications/${prescriptionId}`)
      .set('Authorization', `Bearer ${psychiatristToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/medication-logs', () => {
  let prescriptionId;

  beforeAll(async () => {
    const result = await query(
      `SELECT id FROM patient_medications WHERE patient_id = $1 LIMIT 1`,
      [patient.id]
    );
    prescriptionId = result.rows[0].id;
  });

  it('should allow patient to log medication adherence (201)', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patient_medication_id: prescriptionId,
        taken_at: new Date().toISOString(),
        skipped: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.medication_log).toBeDefined();
    expect(res.body.medication_log.skipped).toBe(false);
  });

  it('should require skip_reason when medication is skipped', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patient_medication_id: prescriptionId,
        skipped: true,
      });

    expect(res.status).toBe(400);
  });

  it('should allow logging skipped medication with reason', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patient_medication_id: prescriptionId,
        skipped: true,
        skip_reason: 'Side effects',
      });

    expect(res.status).toBe(201);
    expect(res.body.medication_log.skipped).toBe(true);
  });
});

describe('GET /api/medication-logs', () => {
  it('should return adherence history for patient', async () => {
    const res = await request(app)
      .get('/api/medication-logs')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs).toBeDefined();
    expect(Array.isArray(res.body.medication_logs)).toBe(true);
    expect(res.body.medication_logs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.total).toBeGreaterThanOrEqual(1);
    expect(res.body.summary.adherence_rate).toBeDefined();
  });
});
