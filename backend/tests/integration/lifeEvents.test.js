'use strict';

const request = require('supertest');
const {
  createTestPatient,
  createTestProfessional,
  createCareRelationship,
  cleanDatabase,
  createTestLifeEvent,
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

  const prof = await createTestProfessional();
  professional = prof.user;
  professionalToken = prof.token;

  await createCareRelationship(patient.id, professional.id);
});

describe('POST /api/life-events', () => {
  it('should create a life event as patient (201)', async () => {
    const res = await request(app)
      .post('/api/life-events')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Got a new job',
        description: 'Started a new position at a tech company',
        category: 'work',
        impact_level: 7,
        event_date: '2025-01-15',
      });

    expect(res.status).toBe(201);
    expect(res.body.life_event).toBeDefined();
    expect(res.body.life_event.title).toBe('Got a new job');
    expect(res.body.life_event.category).toBe('work');
    expect(res.body.life_event.impact_level).toBe(7);
    expect(res.body.life_event.patient_id).toBe(patient.id);
  });

  it('should reject impact_level > 10 (400)', async () => {
    const res = await request(app)
      .post('/api/life-events')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Test event',
        category: 'work',
        impact_level: 11,
        event_date: '2025-01-15',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject impact_level < 1 (400)', async () => {
    const res = await request(app)
      .post('/api/life-events')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Test event',
        category: 'work',
        impact_level: 0,
        event_date: '2025-01-15',
      });

    expect(res.status).toBe(400);
  });

  it('should reject invalid category (400)', async () => {
    const res = await request(app)
      .post('/api/life-events')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Test event',
        category: 'invalid_category',
        impact_level: 5,
        event_date: '2025-01-15',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/life-events', () => {
  beforeAll(async () => {
    // Create additional life events in different categories
    await createTestLifeEvent(patient.id, {
      title: 'Family reunion',
      category: 'family',
      impact_level: 4,
      event_date: '2025-02-10',
    });
    await createTestLifeEvent(patient.id, {
      title: 'Health check',
      category: 'health',
      impact_level: 3,
      event_date: '2025-03-05',
    });
  });

  it('should list life events with pagination', async () => {
    const res = await request(app)
      .get('/api/life-events')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.life_events).toBeDefined();
    expect(Array.isArray(res.body.life_events)).toBe(true);
    expect(res.body.life_events.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('should filter by category', async () => {
    const res = await request(app)
      .get('/api/life-events?category=family')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.life_events).toBeDefined();
    expect(res.body.life_events.length).toBeGreaterThanOrEqual(1);
    res.body.life_events.forEach((event) => {
      expect(event.category).toBe('family');
    });
  });

  it('should support pagination parameters', async () => {
    const res = await request(app)
      .get('/api/life-events?page=1&limit=1')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.life_events.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});
