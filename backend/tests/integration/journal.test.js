'use strict';

const request = require('supertest');
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
let otherProfessional, otherProfessionalToken;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional();
  professional = prof.user;
  professionalToken = prof.token;

  const otherProf = await createTestProfessional({ email: 'other-prof-journal@test.com' });
  otherProfessional = otherProf.user;
  otherProfessionalToken = otherProf.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('POST /api/journal', () => {
  it('should create a journal entry as patient (201)', async () => {
    const res = await request(app)
      .post('/api/journal')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        mood_score: 6,
        anxiety_score: 4,
        energy_score: 5,
        sleep_quality: 'fair',
        sleep_hours: 6,
        journal_entry: 'Today I reflected on my progress and feel cautiously optimistic.',
        notes: 'Therapy session tomorrow',
      });

    expect(res.status).toBe(201);
    expect(res.body.journal).toBeDefined();
    expect(res.body.journal.mood_score).toBe(6);
    expect(res.body.journal.anxiety_score).toBe(4);
    expect(res.body.journal.energy_score).toBe(5);
    expect(res.body.journal.journal_entry).toContain('cautiously optimistic');
    expect(res.body.journal.patient_id).toBe(patient.id);
  });

  it('should reject mood_score > 10 (400)', async () => {
    const res = await request(app)
      .post('/api/journal')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        mood_score: 11,
        anxiety_score: 4,
        energy_score: 5,
      });

    expect(res.status).toBe(400);
  });

  it('should reject without auth (401)', async () => {
    const res = await request(app)
      .post('/api/journal')
      .send({
        mood_score: 6,
        anxiety_score: 4,
        energy_score: 5,
      });

    expect(res.status).toBe(401);
  });

  it('should reject professional role (403)', async () => {
    const res = await request(app)
      .post('/api/journal')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        mood_score: 6,
        anxiety_score: 4,
        energy_score: 5,
      });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/journal', () => {
  it('should list journal entries for the patient', async () => {
    const res = await request(app)
      .get('/api/journal')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.journals).toBeDefined();
    expect(Array.isArray(res.body.journals)).toBe(true);
    expect(res.body.journals.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('GET /api/journal/:patientId (professional access)', () => {
  it('should allow professional with care access to see journal entries', async () => {
    const res = await request(app)
      .get(`/api/journal/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.journals).toBeDefined();
    expect(Array.isArray(res.body.journals)).toBe(true);
  });

  it('should reject professional without care access (403)', async () => {
    const res = await request(app)
      .get(`/api/journal/${patient.id}`)
      .set('Authorization', `Bearer ${otherProfessionalToken}`);

    expect(res.status).toBe(403);
  });
});
