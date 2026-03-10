'use strict';

const request = require('supertest');
const {
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
  createTestEmotionalLog,
  getApp,
} = require('../helpers');

const app = getApp();

let patient, patientToken;
let professional, professionalToken;
let otherProfessional, otherProfessionalToken;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional();
  professional = prof.user;
  professionalToken = prof.token;

  const otherProf = await createTestProfessional({ email: 'other-prof-emo@test.com' });
  otherProfessional = otherProf.user;
  otherProfessionalToken = otherProf.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('POST /api/emotional-logs', () => {
  it('should create an emotional log as patient (201)', async () => {
    const res = await request(app)
      .post('/api/emotional-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        mood_score: 7,
        anxiety_score: 3,
        energy_score: 6,
        sleep_quality: 'good',
        sleep_hours: 7.5,
        notes: 'Feeling good today',
      });

    expect(res.status).toBe(201);
    expect(res.body.emotional_log).toBeDefined();
    expect(res.body.emotional_log.mood_score).toBe(7);
    expect(res.body.emotional_log.anxiety_score).toBe(3);
    expect(res.body.emotional_log.energy_score).toBe(6);
    expect(res.body.emotional_log.patient_id).toBe(patient.id);
  });

  it('should reject mood_score > 10 (400)', async () => {
    const res = await request(app)
      .post('/api/emotional-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        mood_score: 11,
        anxiety_score: 3,
        energy_score: 6,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject without auth (401)', async () => {
    const res = await request(app)
      .post('/api/emotional-logs')
      .send({
        mood_score: 7,
        anxiety_score: 3,
        energy_score: 6,
      });

    expect(res.status).toBe(401);
  });

  it('should reject professional role (403)', async () => {
    const res = await request(app)
      .post('/api/emotional-logs')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        mood_score: 7,
        anxiety_score: 3,
        energy_score: 6,
      });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/emotional-logs', () => {
  beforeAll(async () => {
    // Create a couple of logs for the patient
    await createTestEmotionalLog(patient.id, { mood_score: 5 });
    await createTestEmotionalLog(patient.id, { mood_score: 8 });
  });

  it('should list own logs as patient', async () => {
    const res = await request(app)
      .get('/api/emotional-logs')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.emotional_logs).toBeDefined();
    expect(Array.isArray(res.body.emotional_logs)).toBe(true);
    expect(res.body.emotional_logs.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/emotional-logs/:patientId (professional access)', () => {
  it('should allow professional with care access to see patient logs', async () => {
    const res = await request(app)
      .get(`/api/emotional-logs/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.emotional_logs).toBeDefined();
    expect(Array.isArray(res.body.emotional_logs)).toBe(true);
    expect(res.body.emotional_logs.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject professional without care access (403)', async () => {
    const res = await request(app)
      .get(`/api/emotional-logs/${patient.id}`)
      .set('Authorization', `Bearer ${otherProfessionalToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/emotional-logs/trends', () => {
  it('should return trend data for the patient', async () => {
    const res = await request(app)
      .get('/api/emotional-logs/trends')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trends).toBeDefined();
    expect(Array.isArray(res.body.trends)).toBe(true);
    expect(res.body.period).toBeDefined();
  });

  it('should support period parameter', async () => {
    const res = await request(app)
      .get('/api/emotional-logs/trends?period=daily')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.period).toBe('daily');
  });
});
