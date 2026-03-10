'use strict';

const request = require('supertest');
const { query } = require('../../src/config/database');
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
let alertId;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional({ email: 'alerts-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);

  // Create test alerts
  const result = await query(
    `INSERT INTO alerts (patient_id, alert_type, severity, title, description)
     VALUES ($1, 'depressive_episode', 'high', 'Queda de humor', 'Paciente reportou humor abaixo de 3.')
     RETURNING id`,
    [patient.id]
  );
  alertId = result.rows[0].id;

  await query(
    `INSERT INTO alerts (patient_id, alert_type, severity, title, description)
     VALUES ($1, 'high_anxiety', 'medium', 'Check-in perdido', 'Paciente nao fez check-in em 3 dias.')`,
    [patient.id]
  );
});

describe('GET /api/alerts', () => {
  it('should list alerts for professional', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.alerts).toBeDefined();
    expect(res.body.alerts.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter by severity', async () => {
    const res = await request(app)
      .get('/api/alerts?severity=high')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    res.body.alerts.forEach((a) => {
      expect(a.severity).toBe('high');
    });
  });

  it('should filter by acknowledged status', async () => {
    const res = await request(app)
      .get('/api/alerts?is_acknowledged=false')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    res.body.alerts.forEach((a) => {
      expect(a.is_acknowledged).toBe(false);
    });
  });

  it('should reject patient role → 403', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/alerts/:patientId', () => {
  it('should return alerts for specific patient', async () => {
    const res = await request(app)
      .get(`/api/alerts/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.alerts).toBeDefined();
    expect(res.body.alerts.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PUT /api/alerts/:id/acknowledge', () => {
  it('should acknowledge alert', async () => {
    const res = await request(app)
      .put(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.alert.is_acknowledged).toBe(true);
    expect(res.body.alert.acknowledged_by).toBe(professional.id);
  });

  it('should reject already acknowledged alert → 400', async () => {
    const res = await request(app)
      .put(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(400);
  });

  it('should reject patient acknowledging → 403', async () => {
    const res = await request(app)
      .put(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent alert', async () => {
    const res = await request(app)
      .put('/api/alerts/00000000-0000-0000-0000-000000000000/acknowledge')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect([400, 404]).toContain(res.status);
  });

  it('should reject professional without care relationship', async () => {
    const otherProf = await createTestProfessional({ email: 'alerts-no-access@test.com' });

    // Get a non-acknowledged alert
    const alertRes = await query(
      `INSERT INTO alerts (patient_id, alert_type, severity, title, description)
       VALUES ($1, 'anomaly', 'low', 'Alerta teste', 'Teste')
       RETURNING id`,
      [patient.id]
    );

    const res = await request(app)
      .put(`/api/alerts/${alertRes.rows[0].id}/acknowledge`)
      .set('Authorization', `Bearer ${otherProf.token}`);

    expect(res.status).toBe(403);
  });
});
