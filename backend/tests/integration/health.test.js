'use strict';

const request = require('supertest');
const { getApp } = require('../helpers');

const app = getApp();

describe('GET /api/health', () => {
  it('should return 200 with status ok when database is connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/rota-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
