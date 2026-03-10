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

  const otherProf = await createTestProfessional({ email: 'other-prof@test.com' });
  otherProfessional = otherProf.user;
  otherProfessionalToken = otherProf.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('GET /api/patients', () => {
  it('should list patients for professional with active relationship', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toBeDefined();
    expect(res.body.patients.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });

  it('should return empty list for professional without patients', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${otherProfessionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(0);
  });

  it('should reject patient role', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should filter by search term', async () => {
    const res = await request(app)
      .get('/api/patients?search=Paciente')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patients.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject without auth', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/patients/:id', () => {
  it('should return patient detail for professional with access', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patient).toBeDefined();
    expect(res.body.patient.id).toBe(patient.id);
    expect(res.body.patient.first_name).toBeDefined();
  });

  it('should allow patient to access own data', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patient.id).toBe(patient.id);
  });

  it('should reject professional without access', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${otherProfessionalToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent patient', async () => {
    const res = await request(app)
      .get('/api/patients/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect([400, 403, 404]).toContain(res.status);
  });
});

describe('GET /api/patients/:id/timeline', () => {
  it('should return timeline for professional with access', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient.id}/timeline`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.timeline).toBeDefined();
    expect(Array.isArray(res.body.timeline)).toBe(true);
  });

  it('should allow patient to access own timeline', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient.id}/timeline`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.timeline).toBeDefined();
  });
});

describe('GET /api/patients/my-professionals', () => {
  it('should return linked professionals for patient', async () => {
    const res = await request(app)
      .get('/api/patients/my-professionals')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.professionals).toBeDefined();
    expect(res.body.professionals.length).toBeGreaterThanOrEqual(1);
    expect(res.body.professionals[0].permissions).toBeDefined();
  });

  it('should reject professional role', async () => {
    const res = await request(app)
      .get('/api/patients/my-professionals')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/patients/revoke-access', () => {
  it('should revoke professional access', async () => {
    // Create a new patient + relationship to revoke
    const newPatient = await createTestPatient({ email: 'revoke-test@test.com' });
    const newProf = await createTestProfessional({ email: 'revoke-prof@test.com' });
    await createCareRelationship(newPatient.user.id, newProf.user.id);

    const res = await request(app)
      .put('/api/patients/revoke-access')
      .set('Authorization', `Bearer ${newPatient.token}`)
      .send({ professional_id: newProf.user.id });

    expect(res.status).toBe(200);
    expect(res.body.relationship).toBeDefined();
    expect(res.body.relationship.status).toBe('inactive');
  });

  it('should return 400 without professional_id', async () => {
    const res = await request(app)
      .put('/api/patients/revoke-access')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent relationship', async () => {
    const res = await request(app)
      .put('/api/patients/revoke-access')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ professional_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });

  it('should reject professional role', async () => {
    const res = await request(app)
      .put('/api/patients/revoke-access')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ professional_id: patient.id });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/patients/:id/permissions', () => {
  it('should update permissions for own professional', async () => {
    const res = await request(app)
      .put(`/api/patients/${patient.id}/permissions`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        professional_id: professional.id,
        permissions: [{ permission_type: 'emotional_logs', granted: false }],
      });

    expect(res.status).toBe(200);
    expect(res.body.permissions).toBeDefined();
    expect(res.body.permissions[0].granted).toBe(false);
  });

  it('should return 400 without required fields', async () => {
    const res = await request(app)
      .put(`/api/patients/${patient.id}/permissions`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should reject other patient trying to update permissions', async () => {
    const otherPatient = await createTestPatient({ email: 'other-patient-perm@test.com' });

    const res = await request(app)
      .put(`/api/patients/${patient.id}/permissions`)
      .set('Authorization', `Bearer ${otherPatient.token}`)
      .send({
        professional_id: professional.id,
        permissions: [{ permission_type: 'emotional_logs', granted: false }],
      });

    expect(res.status).toBe(403);
  });
});
