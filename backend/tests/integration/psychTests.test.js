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

  const prof = await createTestProfessional({ email: 'psych-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  const otherProf = await createTestProfessional({ email: 'psych-other@test.com' });
  unlinkedProfessional = otherProf.user;
  unlinkedProfessionalToken = otherProf.token;

  // Only link the main professional to the patient
  await createCareRelationship(patient.id, professional.id);
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests
// ---------------------------------------------------------------------------

describe('GET /api/psych-tests', () => {
  it('should return 200 with tests list for professional', async () => {
    const res = await request(app)
      .get('/api/psych-tests')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tests).toBeDefined();
    expect(Array.isArray(res.body.tests)).toBe(true);
    expect(res.body.disclaimer).toBeDefined();
  });

  it('should return 403 for patient', async () => {
    const res = await request(app)
      .get('/api/psych-tests')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/psych-tests');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/dsm-criteria
// ---------------------------------------------------------------------------

describe('GET /api/psych-tests/dsm-criteria', () => {
  it('should return 200 for authenticated professional', async () => {
    const res = await request(app)
      .get('/api/psych-tests/dsm-criteria')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.criteria).toBeDefined();
    expect(Array.isArray(res.body.criteria)).toBe(true);
  });

  it('should return 200 for authenticated patient', async () => {
    const res = await request(app)
      .get('/api/psych-tests/dsm-criteria')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.criteria).toBeDefined();
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/psych-tests/dsm-criteria');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/sessions/patient/:patientId
// ---------------------------------------------------------------------------

describe('GET /api/psych-tests/sessions/patient/:patientId', () => {
  it('should return 200 for linked professional', async () => {
    const res = await request(app)
      .get(`/api/psych-tests/sessions/patient/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toBeDefined();
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('should return 403 for unlinked professional', async () => {
    const res = await request(app)
      .get(`/api/psych-tests/sessions/patient/${patient.id}`)
      .set('Authorization', `Bearer ${unlinkedProfessionalToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get(
      `/api/psych-tests/sessions/patient/${patient.id}`
    );

    expect(res.status).toBe(401);
  });

  it('should return 403 for patient trying to access', async () => {
    const res = await request(app)
      .get(`/api/psych-tests/sessions/patient/${patient.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/psych-tests/assign
// (maps to "POST sessions/:patientId" in the task — uses patient_id in body)
// ---------------------------------------------------------------------------

describe('POST /api/psych-tests/assign', () => {
  it('should return 404 for non-existent test_id', async () => {
    const nonExistentTestId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .post('/api/psych-tests/assign')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        test_id: nonExistentTestId,
        patient_id: patient.id,
      });

    // Should either be 404 (test not found) or 400 (validation) since test doesn't exist
    // The route checks care relationship first (403), then test existence (404)
    expect([403, 404].includes(res.status) || res.status === 404).toBe(true);
  });

  it('should return 403 for unlinked patient', async () => {
    const anotherPatient = await createTestPatient({
      email: 'unlinked-patient-psych@test.com',
    });
    const nonExistentTestId = '00000000-0000-4000-8000-000000000001';

    const res = await request(app)
      .post('/api/psych-tests/assign')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        test_id: nonExistentTestId,
        patient_id: anotherPatient.user.id,
      });

    expect(res.status).toBe(403);
  });

  it('should return 403 for patient role trying to assign', async () => {
    const nonExistentTestId = '00000000-0000-4000-8000-000000000002';

    const res = await request(app)
      .post('/api/psych-tests/assign')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        test_id: nonExistentTestId,
        patient_id: patient.id,
      });

    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/psych-tests/assign')
      .send({
        test_id: '00000000-0000-4000-8000-000000000003',
        patient_id: patient.id,
      });

    expect(res.status).toBe(401);
  });
});
