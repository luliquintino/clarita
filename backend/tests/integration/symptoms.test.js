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
let professional, professionalToken;
let symptomId;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional();
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);

  // Fetch a valid symptom id from the catalog
  const symptomResult = await query('SELECT id FROM symptoms LIMIT 1');
  symptomId = symptomResult.rows[0].id;
});

describe('GET /api/symptoms', () => {
  it('should return the symptom catalog', async () => {
    const res = await request(app)
      .get('/api/symptoms')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptoms).toBeDefined();
    expect(Array.isArray(res.body.symptoms)).toBe(true);
    expect(res.body.symptoms.length).toBeGreaterThan(0);
    expect(res.body.symptoms[0].name).toBeDefined();
    expect(res.body.symptoms[0].category).toBeDefined();
  });

  it('should filter by category', async () => {
    const res = await request(app)
      .get('/api/symptoms?category=mood')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptoms).toBeDefined();
    res.body.symptoms.forEach((s) => {
      expect(s.category).toBe('mood');
    });
  });
});

describe('POST /api/patient-symptoms', () => {
  it('should report a symptom as patient (201)', async () => {
    const res = await request(app)
      .post('/api/patient-symptoms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        symptom_id: symptomId,
        severity: 5,
        notes: 'Moderate symptom today',
      });

    expect(res.status).toBe(201);
    expect(res.body.patient_symptom).toBeDefined();
    expect(res.body.patient_symptom.severity).toBe(5);
    expect(res.body.patient_symptom.patient_id).toBe(patient.id);
  });

  it('should reject severity out of range (400)', async () => {
    const res = await request(app)
      .post('/api/patient-symptoms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        symptom_id: symptomId,
        severity: 11,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject severity below minimum (400)', async () => {
    const res = await request(app)
      .post('/api/patient-symptoms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        symptom_id: symptomId,
        severity: 0,
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/patient-symptoms', () => {
  it('should return patient symptom history', async () => {
    const res = await request(app)
      .get('/api/patient-symptoms')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patient_symptoms).toBeDefined();
    expect(Array.isArray(res.body.patient_symptoms)).toBe(true);
    expect(res.body.patient_symptoms.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
    // Should join symptom name
    expect(res.body.patient_symptoms[0].symptom_name).toBeDefined();
  });
});
