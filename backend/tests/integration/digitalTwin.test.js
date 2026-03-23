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
        `INSERT INTO emotional_logs (patient_id, timestamp, mood, anxiety, energy, sleep_quality)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          patient.id,
          new Date(Date.now() - (10 - i) * 86400000).toISOString(),
          5 + i * 0.2,
          6 - i * 0.1,
          5,
          6,
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
    expect(res.body.twin).toBeDefined();
  });

  it('returns 403 for patient', async () => {
    const res = await request(app)
      .post(`/api/digital-twin/${patient.id}/refresh`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});
