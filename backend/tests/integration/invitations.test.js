'use strict';

const request = require('supertest');
const {
  getApp,
  cleanDatabase,
  createTestProfessional,
  createTestPatient,
  createTestUser,
} = require('../helpers');

const app = getApp();

beforeEach(async () => {
  await cleanDatabase();
});

// ---------------------------------------------------------------------------
// POST /api/invitations
// ---------------------------------------------------------------------------

describe('POST /api/invitations', () => {
  it('should allow a patient to invite a professional by display_id', async () => {
    const { user: professional } = await createTestProfessional();
    const { token: patientToken } = await createTestPatient();

    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ display_id: professional.display_id });

    expect(res.status).toBe(201);
    expect(res.body.invitation).toBeDefined();
    expect(res.body.invitation.status).toBe('pending');
  });

  it('should allow a professional to invite a patient by display_id', async () => {
    const { token: professionalToken } = await createTestProfessional();
    const { user: patient } = await createTestPatient();

    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    expect(res.status).toBe(201);
    expect(res.body.invitation).toBeDefined();
    expect(res.body.invitation.status).toBe('pending');
  });

  it('should return 400 when display_id is missing', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 404 when display_id does not match any user', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_id: 'CLA-000000' });

    expect(res.status).toBe(404);
  });

  it('should return 400 when trying to invite yourself', async () => {
    const { user, token } = await createTestPatient();

    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_id: user.display_id });

    expect(res.status).toBe(400);
  });

  it('should return 400 when both users have the same role (patient→patient)', async () => {
    const { user: patient2 } = await createTestPatient();
    const { token: token1 } = await createTestPatient();

    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token1}`)
      .send({ display_id: patient2.display_id });

    expect(res.status).toBe(400);
  });

  it('should return 409 when a pending invitation already exists', async () => {
    const { user: professional } = await createTestProfessional();
    const { token: patientToken } = await createTestPatient();

    // First invite
    await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ display_id: professional.display_id });

    // Duplicate invite
    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ display_id: professional.display_id });

    expect(res.status).toBe(409);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app)
      .post('/api/invitations')
      .send({ display_id: 'CLA-123456' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/invitations/pending
// ---------------------------------------------------------------------------

describe('GET /api/invitations/pending', () => {
  it('should return 200 with empty array when no pending invitations', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .get('/api/invitations/pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.invitations).toBeInstanceOf(Array);
    expect(res.body.invitations.length).toBe(0);
  });

  it('should return pending invitations received by current user (not sent)', async () => {
    const { user: professional, token: professionalToken } = await createTestProfessional();
    const { user: patient, token: patientToken } = await createTestPatient();

    // Professional invites patient
    await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    // Patient should see it as pending
    const res = await request(app)
      .get('/api/invitations/pending')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.invitations.length).toBe(1);
    expect(res.body.invitations[0].other_first_name).toBeDefined();
  });

  it('should NOT show invitations that the user sent (only received)', async () => {
    const { user: professional } = await createTestProfessional();
    const { token: patientToken } = await createTestPatient();

    // Patient sends invite to professional
    await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ display_id: professional.display_id });

    // Pending endpoint only shows received invitations (invited_by != $1)
    const res = await request(app)
      .get('/api/invitations/pending')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.invitations.length).toBe(0);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/invitations/pending');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/invitations/sent
// ---------------------------------------------------------------------------

describe('GET /api/invitations/sent', () => {
  it('should return 200 with sent invitations', async () => {
    const { user: professional } = await createTestProfessional();
    const { token: patientToken } = await createTestPatient();

    await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ display_id: professional.display_id });

    const res = await request(app)
      .get('/api/invitations/sent')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.invitations).toBeInstanceOf(Array);
    expect(res.body.invitations.length).toBe(1);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/invitations/sent');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/invitations/:id/respond
// ---------------------------------------------------------------------------

describe('PUT /api/invitations/:id/respond', () => {
  it('should allow recipient to accept an invitation', async () => {
    const { user: professional, token: professionalToken } = await createTestProfessional();
    const { user: patient, token: patientToken } = await createTestPatient();

    // Professional invites patient
    const createRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    const invitationId = createRes.body.invitation.id;

    const res = await request(app)
      .put(`/api/invitations/${invitationId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body.relationship.status).toBe('active');
  });

  it('should allow recipient to reject an invitation', async () => {
    const { user: professional, token: professionalToken } = await createTestProfessional();
    const { user: patient, token: patientToken } = await createTestPatient();

    const createRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    const invitationId = createRes.body.invitation.id;

    const res = await request(app)
      .put(`/api/invitations/${invitationId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.relationship.status).toBe('inactive');
  });

  it('should return 400 for invalid action', async () => {
    const { user: professional, token: professionalToken } = await createTestProfessional();
    const { user: patient, token: patientToken } = await createTestPatient();

    const createRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    const invitationId = createRes.body.invitation.id;

    const res = await request(app)
      .put(`/api/invitations/${invitationId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ action: 'maybe' });

    expect(res.status).toBe(400);
  });

  it('should return 403 when sender tries to respond to their own invitation', async () => {
    const { user: professional, token: professionalToken } = await createTestProfessional();
    const { user: patient } = await createTestPatient();

    const createRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    const invitationId = createRes.body.invitation.id;

    const res = await request(app)
      .put(`/api/invitations/${invitationId}/respond`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent invitation id', async () => {
    const { token } = await createTestPatient();

    // Use a valid UUID v4 that doesn't correspond to any real invitation
    const res = await request(app)
      .put('/api/invitations/11111111-1111-4111-8111-111111111111/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(404);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app)
      .put('/api/invitations/11111111-1111-4111-8111-111111111111/respond')
      .send({ action: 'accept' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/invitations/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/invitations/:id', () => {
  it('should allow sender to cancel a pending invitation', async () => {
    const { user: professional } = await createTestProfessional();
    const { token: patientToken } = await createTestPatient();

    const createRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ display_id: professional.display_id });

    const invitationId = createRes.body.invitation.id;

    const res = await request(app)
      .delete(`/api/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(204);
  });

  it('should return 403 when non-sender tries to cancel the invitation', async () => {
    const { user: professional, token: professionalToken } = await createTestProfessional();
    const { user: patient, token: patientToken } = await createTestPatient();

    // Professional invites patient
    const createRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ display_id: patient.display_id });

    const invitationId = createRes.body.invitation.id;

    // Patient tries to cancel (but patient didn't send it)
    const res = await request(app)
      .delete(`/api/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent invitation', async () => {
    const { token } = await createTestPatient();

    // Use a valid UUID v4 that doesn't correspond to any real invitation
    const res = await request(app)
      .delete('/api/invitations/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).delete(
      '/api/invitations/11111111-1111-4111-8111-111111111111'
    );

    expect(res.status).toBe(401);
  });
});
