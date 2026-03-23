'use strict';

const request = require('supertest');
const {
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
  getApp,
} = require('../helpers');
const { query } = require('../../src/config/database');

const app = getApp();

let patient, patientToken;
let professional, professionalToken;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional({ email: 'twin-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('GET /api/digital-twin/:patientId', () => {
  it('returns 404 when no data exists', async () => {
    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 403 for patient trying to access own twin', async () => {
    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with twin after seeding emotional logs', async () => {
    for (let i = 0; i < 10; i++) {
      await query(
        `INSERT INTO emotional_logs (patient_id, logged_at, mood_score, anxiety_score, energy_score, sleep_hours)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          patient.id,
          new Date(Date.now() - (10 - i) * 86400000).toISOString(),
          Math.round(5 + i * 0.2),
          Math.round(6 - i * 0.1),
          5,
          7.5,
        ]
      );
    }

    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.current_state).toBeDefined();
    expect(res.body.computed_at).toBeDefined();
    expect(res.body.data_points_used).toBeGreaterThan(0);
  });
});

describe('POST /api/digital-twin/:patientId/refresh', () => {
  it('returns 200 and recomputes twin', async () => {
    const res = await request(app)
      .post(`/api/digital-twin/${patient.id}/refresh`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.current_state).toBeDefined();
    expect(res.body.computed_at).toBeDefined();
  });

  it('returns 403 for patient', async () => {
    const res = await request(app)
      .post(`/api/digital-twin/${patient.id}/refresh`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Cache behavior', () => {
  it('serves cache on second request within TTL', async () => {
    // First request (computes and caches)
    const res1 = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);
    expect(res1.status).toBe(200);

    // Second request (should hit cache - same computed_at)
    const res2 = await request(app)
      .get(`/api/digital-twin/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.computed_at).toBe(res1.body.computed_at);
  });
});

describe('GET /api/digital-twin/:patientId/history', () => {
  it('returns history array for professional', async () => {
    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}/history`)
      .set('Authorization', `Bearer ${professionalToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('returns 403 for patient', async () => {
    const res = await request(app)
      .get(`/api/digital-twin/${patient.id}/history`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });
});
