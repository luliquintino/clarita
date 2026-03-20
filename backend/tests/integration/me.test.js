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
// GET /api/auth/me — get current user
// ---------------------------------------------------------------------------

describe('GET /api/auth/me', () => {
  it('should return 200 with current user info (no password_hash)', async () => {
    const { token, user } = await createTestPatient();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('should return profile data alongside user for a patient', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
  });

  it('should return profile data alongside user for a professional', async () => {
    const { token } = await createTestProfessional();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/me — update user profile
// ---------------------------------------------------------------------------

describe('PUT /api/auth/me', () => {
  it('should update first_name and last_name and return updated user', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Novo', last_name: 'Nome' });

    expect(res.status).toBe(200);
    expect(res.body.user.first_name).toBe('Novo');
    expect(res.body.user.last_name).toBe('Nome');
  });

  it('should update phone number', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+55 11 99999-0000' });

    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('+55 11 99999-0000');
  });

  it('should update patient-specific profile fields (gender, date_of_birth)', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Test', gender: 'masculino', date_of_birth: '1995-06-15' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('should update professional-specific profile fields (specialization, institution)', async () => {
    const { token } = await createTestProfessional();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Dr', specialization: 'Neuropsicologia', institution: 'UFMG' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('should return 400 when no fields are provided', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .send({ first_name: 'Hacker' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/me/export — download all user data
// ---------------------------------------------------------------------------

describe('GET /api/me/export', () => {
  it('should return 200 with JSON export for authenticated patient', async () => {
    const { token, user } = await createTestPatient();

    const res = await request(app)
      .get('/api/me/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(user.id);
    // Should not expose password_hash in export
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.exported_at).toBeDefined();
    expect(res.body.emotional_logs).toBeInstanceOf(Array);
    expect(res.body.goals).toBeInstanceOf(Array);
  });

  it('should return 200 with JSON export for authenticated professional', async () => {
    const { token } = await createTestProfessional();

    const res = await request(app)
      .get('/api/me/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.exported_at).toBeDefined();
  });

  it('should set Content-Disposition attachment header', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .get('/api/me/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/me/export');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/me — anonymize and deactivate account
// ---------------------------------------------------------------------------

describe('DELETE /api/me', () => {
  it('should anonymize and deactivate the authenticated user account', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('should return 403 if account is already deactivated (auth middleware blocks inactive accounts)', async () => {
    const { token } = await createTestPatient();

    // First deletion — succeeds
    await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${token}`);

    // Second attempt with same token — auth middleware returns 403 for inactive account
    const res = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).delete('/api/me');
    expect(res.status).toBe(401);
  });
});
