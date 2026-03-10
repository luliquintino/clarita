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
let insightId;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional({ email: 'insights-prof@test.com' });
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);

  // Create test insights
  const result = await query(
    `INSERT INTO ai_insights (patient_id, insight_type, title, explanation, impact_level, confidence_score)
     VALUES ($1, 'pattern', 'Padrao de sono', 'Qualidade do sono esta correlacionada com humor.', 'high', 0.85)
     RETURNING id`,
    [patient.id]
  );
  insightId = result.rows[0].id;

  await query(
    `INSERT INTO ai_insights (patient_id, insight_type, title, explanation, impact_level, confidence_score)
     VALUES ($1, 'trend', 'Exercicio fisico', 'Considere exercicio regular para ansiedade.', 'medium', 0.72)`,
    [patient.id]
  );
});

describe('GET /api/insights', () => {
  it('should return patient own insights', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.insights).toBeDefined();
    expect(res.body.insights.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter by insight_type', async () => {
    const res = await request(app)
      .get('/api/insights?insight_type=pattern')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    res.body.insights.forEach((i) => {
      expect(i.insight_type).toBe('pattern');
    });
  });

  it('should filter by impact_level', async () => {
    const res = await request(app)
      .get('/api/insights?impact_level=high')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    res.body.insights.forEach((i) => {
      expect(i.impact_level).toBe('high');
    });
  });

  it('should reject professional role → 403', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/insights/:patientId', () => {
  it('should return insights for professional with access', async () => {
    const res = await request(app)
      .get(`/api/insights/${patient.id}`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.insights).toBeDefined();
    expect(res.body.insights.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject professional without access', async () => {
    const otherProf = await createTestProfessional({ email: 'insights-no-access@test.com' });

    const res = await request(app)
      .get(`/api/insights/${patient.id}`)
      .set('Authorization', `Bearer ${otherProf.token}`);

    expect(res.status).toBe(403);
  });

  it('should filter by is_reviewed', async () => {
    const res = await request(app)
      .get(`/api/insights/${patient.id}?is_reviewed=false`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    res.body.insights.forEach((i) => {
      expect(i.is_reviewed).toBe(false);
    });
  });
});

describe('PUT /api/insights/:id/review', () => {
  it('should mark insight as reviewed', async () => {
    const res = await request(app)
      .put(`/api/insights/${insightId}/review`)
      .set('Authorization', `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.insight.is_reviewed).toBe(true);
    expect(res.body.insight.reviewed_by).toBe(professional.id);
  });

  it('should return 404 for non-existent insight', async () => {
    const res = await request(app)
      .put('/api/insights/00000000-0000-0000-0000-000000000000/review')
      .set('Authorization', `Bearer ${professionalToken}`);

    expect([400, 404]).toContain(res.status);
  });

  it('should reject patient reviewing → 403', async () => {
    const res = await request(app)
      .put(`/api/insights/${insightId}/review`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('should reject professional without care relationship', async () => {
    const otherProf = await createTestProfessional({ email: 'insights-review-no-access@test.com' });

    const res = await request(app)
      .put(`/api/insights/${insightId}/review`)
      .set('Authorization', `Bearer ${otherProf.token}`);

    expect(res.status).toBe(403);
  });
});
