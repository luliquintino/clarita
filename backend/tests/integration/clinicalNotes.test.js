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

  const prof = await createTestProfessional({ email: 'cn-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  const otherProf = await createTestProfessional({ email: 'cn-other-prof@test.com' });
  otherProfessional = otherProf.user;
  otherProfessionalToken = otherProf.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('POST /api/clinical-notes', () => {
  it('should create clinical note as professional → 201', async () => {
    const res = await request(app)
      .post('/api/clinical-notes')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        patient_id: patient.id,
        session_date: new Date().toISOString().split('T')[0],
        note_type: 'session',
        content: 'Paciente apresentou melhora significativa.',
      });

    expect(res.status).toBe(201);
    expect(res.body.clinical_note).toBeDefined();
    expect(res.body.clinical_note.content).toBe('Paciente apresentou melhora significativa.');
  });

  it('should reject patient creating note → 403', async () => {
    const res = await request(app)
      .post('/api/clinical-notes')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patient_id: patient.id,
        session_date: new Date().toISOString().split('T')[0],
        note_type: 'session',
        content: 'Nota indevida.',
      });

    expect(res.status).toBe(403);
  });

  it('should reject professional without care relationship → 403', async () => {
    const res = await request(app)
      .post('/api/clinical-notes')
      .set('Authorization', `Bearer ${otherProfessionalToken}`)
      .send({
        patient_id: patient.id,
        session_date: new Date().toISOString().split('T')[0],
        note_type: 'session',
        content: 'Nota sem vinculo.',
      });

    expect(res.status).toBe(403);
  });

  it('should create private note', async () => {
    const res = await request(app)
      .post('/api/clinical-notes')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        patient_id: patient.id,
        session_date: new Date().toISOString().split('T')[0],
        note_type: 'session',
        content: 'Nota privada confidencial.',
        is_private: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.clinical_note.is_private).toBe(true);
  });
});

describe('GET /api/clinical-notes/:patientId', () => {
  it('should return notes for professional with access', async () => {
    const res = await request(app)
      .get(`/api/clinical-notes/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clinical_notes).toBeDefined();
    expect(res.body.clinical_notes.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });

  it('should hide private notes from patient', async () => {
    const res = await request(app)
      .get(`/api/clinical-notes/${patient.id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    // All returned notes should be non-private
    res.body.clinical_notes.forEach((note) => {
      expect(note.is_private).toBe(false);
    });
  });

  it('should reject professional without access', async () => {
    const res = await request(app)
      .get(`/api/clinical-notes/${patient.id}`)
      .set('Authorization', `Bearer ${otherProfessionalToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/clinical-notes/:id', () => {
  let noteId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/clinical-notes')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        patient_id: patient.id,
        session_date: new Date().toISOString().split('T')[0],
        note_type: 'session',
        content: 'Nota para editar.',
      });
    noteId = res.body.clinical_note.id;
  });

  it('should update note as author → 200', async () => {
    const res = await request(app)
      .put(`/api/clinical-notes/${noteId}`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ content: 'Nota atualizada.' });

    expect(res.status).toBe(200);
    expect(res.body.clinical_note.content).toBe('Nota atualizada.');
  });

  it('should reject update by non-author → 403', async () => {
    // Give other professional access first
    await createCareRelationship(patient.id, otherProfessional.id);

    const res = await request(app)
      .put(`/api/clinical-notes/${noteId}`)
      .set('Authorization', `Bearer ${otherProfessionalToken}`)
      .send({ content: 'Tentativa indevida.' });

    expect(res.status).toBe(403);
  });

  it('should return 400 with no fields to update', async () => {
    const res = await request(app)
      .put(`/api/clinical-notes/${noteId}`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
