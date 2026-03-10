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
let psychologist, psychologistToken;
let psychiatrist, psychiatristToken;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const psy = await createTestProfessional({
    email: 'psicologa-list@test.com',
    role: 'psychologist',
    specialization: 'Clinica',
  });
  psychologist = psy.user;
  psychologistToken = psy.token;

  const psiq = await createTestProfessional({
    email: 'psiquiatra-list@test.com',
    role: 'psychiatrist',
    specialization: 'Psiquiatria Geral',
  });
  psychiatrist = psiq.user;
  psychiatristToken = psiq.token;

  await createCareRelationship(patient.id, psychologist.id);
});

describe('GET /api/professionals', () => {
  it('should list all professionals', async () => {
    const res = await request(app)
      .get('/api/professionals')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.professionals).toBeDefined();
    expect(res.body.professionals.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter by role=psychologist', async () => {
    const res = await request(app)
      .get('/api/professionals?role=psychologist')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    res.body.professionals.forEach((p) => {
      expect(p.role).toBe('psychologist');
    });
  });

  it('should filter by role=psychiatrist', async () => {
    const res = await request(app)
      .get('/api/professionals?role=psychiatrist')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    res.body.professionals.forEach((p) => {
      expect(p.role).toBe('psychiatrist');
    });
  });

  it('should search by name', async () => {
    const res = await request(app)
      .get('/api/professionals?search=Psicologa')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.professionals.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject without auth', async () => {
    const res = await request(app).get('/api/professionals');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/professionals/my-patients', () => {
  it('should return patients for professional', async () => {
    const res = await request(app)
      .get('/api/professionals/my-patients')
      .set('Authorization', `Bearer ${psychologistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toBeDefined();
    expect(res.body.patients.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject patient role', async () => {
    const res = await request(app)
      .get('/api/professionals/my-patients')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/professionals/:id', () => {
  it('should return professional detail', async () => {
    const res = await request(app)
      .get(`/api/professionals/${psychologist.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.professional).toBeDefined();
    expect(res.body.professional.id).toBe(psychologist.id);
    expect(res.body.professional.license_number).toBeDefined();
    expect(res.body.professional.specialization).toBeDefined();
  });

  it('should return 404 for non-existent professional', async () => {
    const res = await request(app)
      .get('/api/professionals/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${patientToken}`);

    expect([400, 404]).toContain(res.status);
  });

  it('should reject invalid UUID', async () => {
    const res = await request(app)
      .get('/api/professionals/not-a-uuid')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(400);
  });
});
