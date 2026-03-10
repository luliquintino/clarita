'use strict';

const jwt = require('jsonwebtoken');
const {
  generateToken,
  generateExpiredToken,
  createTestUser,
  cleanDatabase,
  JWT_SECRET,
} = require('../../helpers');

const authenticate = require('../../../src/middleware/auth');

// ---- mock helpers ----
function mockReq(headers = {}) {
  return { headers };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn();
}

describe('authenticate middleware', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // ------------------------------------------------------------------
  // Missing / malformed header
  // ------------------------------------------------------------------
  it('should return 401 when no Authorization header is present', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header has no "Bearer " prefix', async () => {
    const req = mockReq({ authorization: 'Token some-token' });
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Invalid / expired token
  // ------------------------------------------------------------------
  it('should return 401 when token is invalid (bad signature)', async () => {
    const badToken = jwt.sign({ userId: '00000000-0000-0000-0000-000000000000' }, 'wrong-secret');
    const req = mockReq({ authorization: `Bearer ${badToken}` });
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Token inv\u00e1lido' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', async () => {
    const { user } = await createTestUser();
    const expiredToken = generateExpiredToken(user.id, user.role);
    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Token expirado' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // User lookup failures
  // ------------------------------------------------------------------
  it('should return 401 when user does not exist in DB', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000099';
    const token = generateToken(nonExistentId, 'patient');
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('n\u00e3o encontrado') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user is inactive (is_active = false)', async () => {
    const { user } = await createTestUser({ is_active: false });
    const token = generateToken(user.id, user.role);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('desativada') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Happy path
  // ------------------------------------------------------------------
  it('should call next() and set req.user for a valid token', async () => {
    const { user } = await createTestUser();
    const token = generateToken(user.id, user.role);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = mockNext();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(user.id);
    expect(req.user.email).toBe(user.email);
    expect(req.user.role).toBe(user.role);
    expect(req.user.is_active).toBe(true);
  });
});
