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
let unlinkedProfessional, unlinkedProfessionalToken;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional({ email: 'icd11-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  const otherProf = await createTestProfessional({ email: 'icd11-other@test.com' });
  unlinkedProfessional = otherProf.user;
  unlinkedProfessionalToken = otherProf.token;

  // Only link the main professional to the patient
  await createCareRelationship(patient.id, professional.id);
});

// ---------------------------------------------------------------------------
// GET /api/icd11
// ---------------------------------------------------------------------------

describe('GET /api/icd11', () => {
  it('should return 200 with disorders list for professional', async () => {
    const res = await request(app)
      .get('/api/icd11')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.disorders).toBeDefined();
    expect(Array.isArray(res.body.disorders)).toBe(true);
  });

  it('should return 403 for patient', async () => {
    const res = await request(app)
      .get('/api/icd11')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/icd11');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/icd11?search=depression
// ---------------------------------------------------------------------------

describe('GET /api/icd11?search=depression', () => {
  it('should return 200 with filtered disorders when search param provided', async () => {
    const res = await request(app)
      .get('/api/icd11?search=depression')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.disorders).toBeDefined();
    expect(Array.isArray(res.body.disorders)).toBe(true);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/icd11?search=depression');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/icd11?category=mood
// ---------------------------------------------------------------------------

describe('GET /api/icd11?category=mood', () => {
  it('should return 200 with category-filtered disorders', async () => {
    const res = await request(app)
      .get('/api/icd11?category=mood')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.disorders).toBeDefined();
    expect(Array.isArray(res.body.disorders)).toBe(true);
  });

  it('should return 403 for patient with category filter', async () => {
    const res = await request(app)
      .get('/api/icd11?category=mood')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/icd11/recent
// ---------------------------------------------------------------------------

describe('GET /api/icd11/recent', () => {
  it('should return 200 with recent list for professional', async () => {
    const res = await request(app)
      .get('/api/icd11/recent')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.recent).toBeDefined();
    expect(Array.isArray(res.body.recent)).toBe(true);
  });

  it('should return 403 for patient', async () => {
    const res = await request(app)
      .get('/api/icd11/recent')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/icd11/recent');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/icd11/categories
// ---------------------------------------------------------------------------

describe('GET /api/icd11/categories', () => {
  it('should return 200 with categories list for professional', async () => {
    const res = await request(app)
      .get('/api/icd11/categories')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.categories).toBeDefined();
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it('should return 403 for patient', async () => {
    const res = await request(app)
      .get('/api/icd11/categories')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});
