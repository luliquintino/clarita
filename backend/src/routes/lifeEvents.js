'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { lifeEventValidator, handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/life-events
// Create life event (patient only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('patient'),
  lifeEventValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const { title, description, category, impact_level, event_date } = req.body;

      const result = await query(
        `INSERT INTO life_events (patient_id, title, description, category, impact_level, event_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
        [req.user.id, title, description || null, category, impact_level, event_date]
      );

      res.status(201).json({ life_event: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/life-events
// Get patient's own life events
// ---------------------------------------------------------------------------

router.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { category, start_date, end_date, page = 1, limit = 30 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = 'SELECT * FROM life_events WHERE patient_id = $1';
    const params = [req.user.id];
    let paramIdx = 2;

    if (category) {
      sql += ` AND category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }
    if (start_date) {
      sql += ` AND event_date >= $${paramIdx}`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      sql += ` AND event_date <= $${paramIdx}`;
      params.push(end_date);
      paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

    sql += ` ORDER BY event_date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      life_events: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: lim,
        total: parseInt(countResult.rows[0].count, 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/life-events/:patientId
// Professional creates a life event for a patient
// ---------------------------------------------------------------------------

router.post(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('life_events'),
  lifeEventValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const { title, description, category, impact_level, event_date } = req.body;

      const result = await query(
        `INSERT INTO life_events (patient_id, title, description, category, impact_level, event_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.params.patientId, title, description || null, category, impact_level, event_date]
      );

      res.status(201).json({ life_event: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/life-events/:patientId
// Professional view of patient's life events
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('life_events'),
  async (req, res, next) => {
    try {
      const { category, start_date, end_date, page = 1, limit = 30 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = 'SELECT * FROM life_events WHERE patient_id = $1';
      const params = [req.params.patientId];
      let paramIdx = 2;

      if (category) {
        sql += ` AND category = $${paramIdx}`;
        params.push(category);
        paramIdx++;
      }
      if (start_date) {
        sql += ` AND event_date >= $${paramIdx}`;
        params.push(start_date);
        paramIdx++;
      }
      if (end_date) {
        sql += ` AND event_date <= $${paramIdx}`;
        params.push(end_date);
        paramIdx++;
      }

      const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

      sql += ` ORDER BY event_date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        life_events: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: lim,
          total: parseInt(countResult.rows[0].count, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
