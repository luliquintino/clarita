'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const {
  emotionalLogValidator,
  handleValidation,
  isUUID,
  optionalDateRange,
} = require('../validators');
const { generateAlerts } = require('../services/alertService');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/emotional-logs
// Create emotional log (patient only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('patient'),
  emotionalLogValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        mood_score,
        anxiety_score,
        energy_score,
        sleep_quality,
        sleep_hours,
        notes,
        journal_entry,
        logged_at,
      } = req.body;

      const result = await query(
        `INSERT INTO emotional_logs
         (patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, notes, journal_entry, logged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          req.user.id,
          mood_score,
          anxiety_score,
          energy_score,
          sleep_quality || null,
          sleep_hours || null,
          notes || null,
          journal_entry || null,
          logged_at || new Date().toISOString(),
        ]
      );

      // Trigger alert checks asynchronously (do not block response)
      generateAlerts(req.user.id).catch((err) => {
        console.error('[emotionalLogs] Alert generation failed:', err.message);
      });

      res.status(201).json({ emotional_log: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/emotional-logs
// Get logs for the authenticated patient (with date range filters)
// ---------------------------------------------------------------------------

router.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { start_date, end_date, page = 1, limit = 30 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `SELECT * FROM emotional_logs WHERE patient_id = $1`;
    const params = [req.user.id];
    let paramIdx = 2;

    if (start_date) {
      sql += ` AND logged_at >= $${paramIdx}`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      sql += ` AND logged_at <= $${paramIdx}`;
      params.push(end_date);
      paramIdx++;
    }

    // Count
    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

    sql += ` ORDER BY logged_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      emotional_logs: result.rows,
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
// GET /api/emotional-logs/trends
// Get trend data (averages over time periods)
// ---------------------------------------------------------------------------

router.get('/trends', requireRole('patient'), async (req, res, next) => {
  try {
    const { period = 'weekly', start_date, end_date } = req.query;

    const DATE_TRUNC_BY_PERIOD = { daily: 'day', weekly: 'week', monthly: 'month' };
    const dateTrunc = DATE_TRUNC_BY_PERIOD[period] ?? 'week';

    let sql = `
      SELECT
        date_trunc('${dateTrunc}', logged_at) AS period_start,
        ROUND(AVG(mood_score), 2) AS avg_mood,
        ROUND(AVG(anxiety_score), 2) AS avg_anxiety,
        ROUND(AVG(energy_score), 2) AS avg_energy,
        ROUND(AVG(sleep_hours), 2) AS avg_sleep_hours,
        COUNT(*) AS log_count
      FROM emotional_logs
      WHERE patient_id = $1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (start_date) {
      sql += ` AND logged_at >= $${paramIdx}`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      sql += ` AND logged_at <= $${paramIdx}`;
      params.push(end_date);
      paramIdx++;
    }

    sql += ` GROUP BY period_start ORDER BY period_start ASC`;

    const result = await query(sql, params);

    res.json({ trends: result.rows, period });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/emotional-logs/:patientId
// Get logs for specific patient (professional only, requires access)
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('emotional_logs'),
  async (req, res, next) => {
    try {
      const { start_date, end_date, page = 1, limit = 30 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `SELECT * FROM emotional_logs WHERE patient_id = $1`;
      const params = [req.params.patientId];
      let paramIdx = 2;

      if (start_date) {
        sql += ` AND logged_at >= $${paramIdx}`;
        params.push(start_date);
        paramIdx++;
      }
      if (end_date) {
        sql += ` AND logged_at <= $${paramIdx}`;
        params.push(end_date);
        paramIdx++;
      }

      const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

      sql += ` ORDER BY logged_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        emotional_logs: result.rows,
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
