'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  getApp,
  cleanDatabase,
  generateToken,
  generateExpiredToken,
  createTestPatient,
  createTestProfessional,
  createTestUser,
  JWT_SECRET,
} = require('../helpers');
const { query } = require('../../src/config/database');

const app = getApp();

beforeEach(async () => {
  await cleanDatabase();
});

// ===========================================================================
// POST /api/auth/register
// ===========================================================================

describe('POST /api/auth/register', () => {
  const validPatient = {
    email: 'patient@test.com',
    password: 'Secure1234',
    first_name: 'Maria',
    last_name: 'Silva',
    role: 'patient',
    consent: true,
  };

  const validProfessional = {
    email: 'psy@test.com',
    password: 'Secure1234',
    first_name: 'Ana',
    last_name: 'Santos',
    role: 'psychologist',
    license_number: 'CRP-06/12345',
    consent: true,
  };

  it('should register a patient and return 201 with token', async () => {
    const res = await request(app).post('/api/auth/register').send(validPatient);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(validPatient.email);
    expect(res.body.user.role).toBe('patient');
    expect(res.body.user.first_name).toBe(validPatient.first_name);
    expect(res.body.user.last_name).toBe(validPatient.last_name);
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.display_id).toBeDefined();
  });

  it('should register a psychologist with license_number and return 201', async () => {
    const res = await request(app).post('/api/auth/register').send(validProfessional);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('psychologist');
  });

  it('should return 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validPatient);

    const res = await request(app).post('/api/auth/register').send(validPatient);

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for password without uppercase letter', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPatient, password: 'nouppercase1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for password without number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPatient, password: 'NoNumberHere' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for password that is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPatient, password: 'Ab1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPatient, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('should return 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPatient, role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for professional without license_number', async () => {
    const { license_number, ...noLicense } = validProfessional;

    const res = await request(app).post('/api/auth/register').send(noLicense);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return a JWT with correct userId and role in payload', async () => {
    const res = await request(app).post('/api/auth/register').send(validPatient);

    expect(res.status).toBe(201);

    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.userId).toBe(res.body.user.id);
    expect(decoded.role).toBe('patient');
  });
});

// ===========================================================================
// POST /api/auth/login
// ===========================================================================

describe('POST /api/auth/login', () => {
  let patientPassword;
  let patientEmail;
  let professionalEmail;
  let professionalPassword;

  beforeEach(async () => {
    const patient = await createTestPatient({ email: 'login-patient@test.com' });
    patientEmail = patient.user.email;
    patientPassword = patient.password;

    const prof = await createTestProfessional({ email: 'login-prof@test.com' });
    professionalEmail = prof.user.email;
    professionalPassword = prof.password;
  });

  it('should login a patient and return 200 with token and user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: patientEmail, password: patientPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(patientEmail);
    expect(res.body.user.role).toBe('patient');
  });

  it('should login a professional and return 200', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: professionalEmail, password: professionalPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('psychologist');
  });

  it('should return 401 for wrong email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: patientPassword });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: patientEmail, password: 'WrongPass123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 403 for inactive account', async () => {
    const inactive = await createTestUser({
      email: 'inactive@test.com',
      is_active: false,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: inactive.user.email, password: inactive.password });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should NOT contain password_hash in the response', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: patientEmail, password: patientPassword });

    expect(res.status).toBe(200);
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('should return 400 for empty email field', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: patientPassword });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty password field', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: patientEmail, password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-a-valid-email', password: patientPassword });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 or 401 for SQL injection attempt in email (never 200)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "' OR '1'='1'; --", password: 'AnyPass123' });

    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });

  it('should return 401 for expired JWT on protected route', async () => {
    const { user } = await createTestPatient({ email: 'expired-jwt@test.com' });
    const expired = generateExpiredToken(user.id, user.role);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 401 for tampered/invalid JWT on protected route', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

// ===========================================================================
// GET /api/auth/me
// ===========================================================================

describe('GET /api/auth/me', () => {
  it('should return 200 with user and profile data for valid token', async () => {
    const { user, token } = await createTestPatient();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.profile).toBeDefined();
  });

  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 401 for expired token', async () => {
    const { user } = await createTestPatient();
    const expired = generateExpiredToken(user.id, user.role);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return patient_profile data for a patient', async () => {
    const { token } = await createTestPatient({ date_of_birth: '1995-06-15', gender: 'feminino' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.date_of_birth).toBeDefined();
    expect(res.body.profile.gender).toBe('feminino');
  });

  it('should return professional_profile data for a professional', async () => {
    const { token } = await createTestProfessional({
      specialization: 'Terapia Cognitivo-Comportamental',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.license_number).toBeDefined();
    expect(res.body.profile.specialization).toBe('Terapia Cognitivo-Comportamental');
  });
});

// ===========================================================================
// PUT /api/auth/me
// ===========================================================================

describe('PUT /api/auth/me', () => {
  it('should update first_name and return 200', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.first_name).toBe('Atualizado');
  });

  it('should update phone and return 200', async () => {
    const { token } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Same', phone: '11999998888' });

    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('11999998888');
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .send({ first_name: 'NoAuth' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should allow a patient to update date_of_birth', async () => {
    const { token, user } = await createTestPatient();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: user.first_name, date_of_birth: '2000-03-15' });

    expect(res.status).toBe(200);

    // Verify the profile was updated
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    const dob = new Date(meRes.body.profile.date_of_birth).toISOString().split('T')[0];
    expect(dob).toBe('2000-03-15');
  });

  it('should allow a professional to update specialization', async () => {
    const { token, user } = await createTestProfessional();

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: user.first_name, specialization: 'Neuropsicologia' });

    expect(res.status).toBe(200);

    // Verify the profile was updated
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.body.profile.specialization).toBe('Neuropsicologia');
  });
});

// ===========================================================================
// POST /api/auth/forgot-password
// ===========================================================================

describe('POST /api/auth/forgot-password', () => {
  it('should return 200 with generic message for existing email', async () => {
    const { user } = await createTestPatient({ email: 'forgot@test.com' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('should return 200 with the SAME generic message for non-existing email', async () => {
    const existingRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'someone@exists.com' });

    // Create a user so we can compare messages
    await createTestPatient({ email: 'realuser@test.com' });
    const realRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'realuser@test.com' });

    // Both responses must have 200 and same message to avoid email enumeration
    expect(existingRes.status).toBe(200);
    expect(realRes.status).toBe(200);
    expect(existingRes.body.message).toBe(realRes.body.message);
  });
});

// ===========================================================================
// POST /api/auth/reset-password
// ===========================================================================

describe('POST /api/auth/reset-password', () => {
  let resetToken;
  let userEmail;
  const originalPassword = 'Test1234!';
  const newPassword = 'NewPass5678';

  beforeEach(async () => {
    const { user } = await createTestPatient({ email: 'reset@test.com', password: originalPassword });
    userEmail = user.email;

    // Manually set a reset token in the database (simulating forgot-password flow)
    resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [
      resetToken,
      expires,
      user.id,
    ]);
  });

  it('should reset password with valid token and return 200', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('should return 400 for invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token-value', password: newPassword });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for expired token', async () => {
    // Set the token expiry to the past
    await query(
      "UPDATE users SET reset_token_expires = NOW() - INTERVAL '2 hours' WHERE email = $1",
      [userEmail]
    );

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should allow login with new password and reject old password after reset', async () => {
    // Reset the password
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });

    // Login with the new password should succeed
    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: newPassword });

    expect(loginNew.status).toBe(200);
    expect(loginNew.body.token).toBeDefined();

    // Login with the old password should fail
    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: originalPassword });

    expect(loginOld.status).toBe(401);
  });
});
