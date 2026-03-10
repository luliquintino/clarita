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
let phq9Id;

beforeAll(async () => {
  await cleanDatabase();

  const p = await createTestPatient();
  patient = p.user;
  patientToken = p.token;

  const prof = await createTestProfessional();
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);

  // Fetch the PHQ-9 assessment id from the catalog
  const assessmentResult = await query("SELECT id FROM assessments WHERE name = 'PHQ-9' LIMIT 1");
  phq9Id = assessmentResult.rows[0].id;
});

describe('GET /api/assessments', () => {
  it('should list available assessments', async () => {
    const res = await request(app)
      .get('/api/assessments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.assessments).toBeDefined();
    expect(Array.isArray(res.body.assessments)).toBe(true);
    expect(res.body.assessments.length).toBeGreaterThanOrEqual(2);
    expect(res.body.assessments[0].name).toBeDefined();
  });
});

describe('POST /api/assessment-results', () => {
  it('should submit assessment and auto-calculate score (201)', async () => {
    const answers = {
      q1: 1,
      q2: 2,
      q3: 1,
      q4: 0,
      q5: 1,
      q6: 2,
      q7: 1,
      q8: 0,
      q9: 0,
    };
    // Expected total: 1+2+1+0+1+2+1+0+0 = 8

    const res = await request(app)
      .post('/api/assessment-results')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        assessment_id: phq9Id,
        answers,
      });

    expect(res.status).toBe(201);
    expect(res.body.assessment_result).toBeDefined();
    expect(res.body.scoring).toBeDefined();
    expect(res.body.scoring.total_score).toBe(8);
    expect(res.body.scoring.severity_level).toBe('mild');
    expect(res.body.scoring.assessment_name).toBe('PHQ-9');
  });

  it('should reject with invalid number of answers (400)', async () => {
    // PHQ-9 expects 9 answers, send only 3
    const answers = {
      q1: 1,
      q2: 2,
      q3: 1,
    };

    const res = await request(app)
      .post('/api/assessment-results')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        assessment_id: phq9Id,
        answers,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject with answer value out of range (400)', async () => {
    const answers = {
      q1: 1,
      q2: 2,
      q3: 1,
      q4: 0,
      q5: 1,
      q6: 5, // max is 3
      q7: 1,
      q8: 0,
      q9: 0,
    };

    const res = await request(app)
      .post('/api/assessment-results')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        assessment_id: phq9Id,
        answers,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject when answers is not an object (400)', async () => {
    const res = await request(app)
      .post('/api/assessment-results')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        assessment_id: phq9Id,
        answers: 'not-an-object',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/assessment-results', () => {
  it('should return patient assessment history', async () => {
    const res = await request(app)
      .get('/api/assessment-results')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.assessment_results).toBeDefined();
    expect(Array.isArray(res.body.assessment_results)).toBe(true);
    expect(res.body.assessment_results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.assessment_results[0].assessment_name).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });
});
