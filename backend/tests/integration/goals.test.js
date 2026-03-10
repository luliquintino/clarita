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

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional({ email: 'goals-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('POST /api/goals', () => {
  it('should create goal as professional → 201', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        patient_id: patient.id,
        title: 'Praticar mindfulness diariamente',
        description: 'Dedicar 10 minutos por dia à meditação.',
      });

    expect(res.status).toBe(201);
    expect(res.body.goal).toBeDefined();
    expect(res.body.goal.title).toBe('Praticar mindfulness diariamente');
    expect(res.body.goal.patient_status).toBe('pending');
  });

  it('should reject patient creating goal → 403', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patient_id: patient.id,
        title: 'Meta indevida',
      });

    expect(res.status).toBe(403);
  });

  it('should reject without required fields → 400', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ patient_id: patient.id });

    expect(res.status).toBe(400);
  });

  it('should reject professional without access', async () => {
    const otherProf = await createTestProfessional({ email: 'goals-no-access@test.com' });
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${otherProf.token}`)
      .send({
        patient_id: patient.id,
        title: 'Meta sem acesso',
      });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/goals/:patientId', () => {
  it('should list goals for patient', async () => {
    const res = await request(app)
      .get(`/api/goals/${patient.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.goals).toBeDefined();
    expect(res.body.goals.length).toBeGreaterThanOrEqual(1);
  });

  it('should list goals for professional with access', async () => {
    const res = await request(app)
      .get(`/api/goals/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.goals.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject another patient', async () => {
    const otherPatient = await createTestPatient({ email: 'goals-other-patient@test.com' });
    const res = await request(app)
      .get(`/api/goals/${patient.id}`)
      .set('Authorization', `Bearer ${otherPatient.token}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/goals/:id/respond', () => {
  let goalId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        patient_id: patient.id,
        title: 'Meta para aceitar',
      });
    goalId = res.body.goal.id;
  });

  it('should accept goal as patient', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body.goal.patient_status).toBe('accepted');
  });

  it('should reject already responded goal → 400', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'reject' });

    expect(res.status).toBe(400);
  });

  it('should reject goal and create alert', async () => {
    // Create a new goal to reject
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        patient_id: patient.id,
        title: 'Meta para rejeitar',
      });

    const res = await request(app)
      .put(`/api/goals/${createRes.body.goal.id}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'reject', rejection_reason: 'Muito difícil no momento.' });

    expect(res.status).toBe(200);
    expect(res.body.goal.patient_status).toBe('rejected');
    expect(res.body.goal.status).toBe('cancelled');
    expect(res.body.goal.rejection_reason).toBe('Muito difícil no momento.');
  });

  it('should reject professional responding → 403', async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ patient_id: patient.id, title: 'Meta prof respond' });

    const res = await request(app)
      .put(`/api/goals/${createRes.body.goal.id}/respond`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/goals/:id/achieve', () => {
  let acceptedGoalId;

  beforeAll(async () => {
    // Create and accept a goal
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ patient_id: patient.id, title: 'Meta para conquistar' });

    acceptedGoalId = createRes.body.goal.id;

    await request(app)
      .put(`/api/goals/${acceptedGoalId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'accept' });
  });

  it('should mark accepted goal as achieved', async () => {
    const res = await request(app)
      .put(`/api/goals/${acceptedGoalId}/achieve`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.goal.status).toBe('achieved');
    expect(res.body.goal.achieved_at).toBeDefined();
  });

  it('should reject achieving pending goal → 400', async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ patient_id: patient.id, title: 'Meta pendente' });

    const res = await request(app)
      .put(`/api/goals/${createRes.body.goal.id}/achieve`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(400);
  });

  it('should reject patient achieving → 403', async () => {
    const res = await request(app)
      .put(`/api/goals/${acceptedGoalId}/achieve`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/goals/:id', () => {
  let goalId;

  beforeAll(async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ patient_id: patient.id, title: 'Meta para atualizar' });
    goalId = createRes.body.goal.id;

    // Accept the goal so we can change status
    await request(app)
      .put(`/api/goals/${goalId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'accept' });
  });

  it('should update goal title', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ title: 'Titulo atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.goal.title).toBe('Titulo atualizado');
  });

  it('should update goal status to paused', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ status: 'paused' });

    expect(res.status).toBe(200);
    expect(res.body.goal.status).toBe('paused');
  });

  it('should reject patient updating → 403', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ title: 'Tentativa paciente' });

    expect(res.status).toBe(403);
  });
});
