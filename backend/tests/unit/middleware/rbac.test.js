'use strict';

const { query } = require('../../../src/config/database');
const {
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
} = require('../../helpers');

const {
  requireRole,
  requirePatientAccess,
  requireOwnership,
} = require('../../../src/middleware/rbac');

// ---- mock helpers ----
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn();
}

// =========================================================================
// requireRole
// =========================================================================
describe('requireRole', () => {
  it('should call next() when user has an allowed role', () => {
    const middleware = requireRole('patient', 'psychologist');
    const req = { user: { role: 'patient' } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user has a disallowed role', () => {
    const middleware = requireRole('psychiatrist');
    const req = { user: { role: 'patient' } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when req.user is missing', () => {
    const middleware = requireRole('patient');
    const req = {};
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// =========================================================================
// requirePatientAccess
// =========================================================================
describe('requirePatientAccess', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should allow a patient accessing their own data', async () => {
    const { user: patient } = await createTestPatient();
    const middleware = requirePatientAccess('emotional_logs');
    const req = { user: patient, params: { patientId: patient.id } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow a professional with an active care relationship', async () => {
    const { user: patient } = await createTestPatient();
    const { user: professional } = await createTestProfessional();
    await createCareRelationship(patient.id, professional.id);

    const middleware = requirePatientAccess('emotional_logs');
    const req = { user: professional, params: { patientId: patient.id } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when professional has no care relationship', async () => {
    const { user: patient } = await createTestPatient();
    const { user: professional } = await createTestProfessional();

    const middleware = requirePatientAccess();
    const req = { user: professional, params: { patientId: patient.id } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when professional has a revoked (granted=false) data permission', async () => {
    const { user: patient } = await createTestPatient();
    const { user: professional } = await createTestProfessional();
    await createCareRelationship(patient.id, professional.id);

    // Revoke the specific permission
    await query(
      `UPDATE data_permissions
       SET granted = false
       WHERE patient_id = $1 AND professional_id = $2 AND permission_type = $3`,
      [patient.id, professional.id, 'emotional_logs']
    );

    const middleware = requirePatientAccess('emotional_logs');
    const req = { user: professional, params: { patientId: patient.id } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Permiss\u00e3o negada') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when a patient tries to access another patient data', async () => {
    const { user: patient1 } = await createTestPatient();
    const { user: patient2 } = await createTestPatient();

    const middleware = requirePatientAccess();
    const req = { user: patient1, params: { patientId: patient2.id } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// =========================================================================
// requireOwnership
// =========================================================================
describe('requireOwnership', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should call next() when user owns the resource', async () => {
    const { user: professional } = await createTestProfessional();
    const { user: patient } = await createTestPatient();
    await createCareRelationship(patient.id, professional.id);

    // Create a clinical note owned by the professional
    const noteResult = await query(
      `INSERT INTO clinical_notes (professional_id, patient_id, session_date, note_type, content)
       VALUES ($1, $2, NOW(), 'session', 'test note')
       RETURNING id`,
      [professional.id, patient.id]
    );
    const noteId = noteResult.rows[0].id;

    const middleware = requireOwnership('clinical_notes', 'id', 'professional_id');
    const req = { user: professional, params: { id: noteId } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user does not own the resource', async () => {
    const { user: professional1 } = await createTestProfessional();
    const { user: professional2 } = await createTestProfessional();
    const { user: patient } = await createTestPatient();
    await createCareRelationship(patient.id, professional1.id);

    const noteResult = await query(
      `INSERT INTO clinical_notes (professional_id, patient_id, session_date, note_type, content)
       VALUES ($1, $2, NOW(), 'session', 'test note')
       RETURNING id`,
      [professional1.id, patient.id]
    );
    const noteId = noteResult.rows[0].id;

    const middleware = requireOwnership('clinical_notes', 'id', 'professional_id');
    const req = { user: professional2, params: { id: noteId } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 404 when the resource is not found', async () => {
    const { user: professional } = await createTestProfessional();
    const nonExistentId = '00000000-0000-0000-0000-000000000099';

    const middleware = requireOwnership('clinical_notes', 'id', 'professional_id');
    const req = { user: professional, params: { id: nonExistentId } };
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('n\u00e3o encontrado') })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
