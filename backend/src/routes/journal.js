'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { body } = require('express-validator');
const { generateAlerts } = require('../services/alertService');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const journalValidator = [
  body('mood_score')
    .isInt({ min: 1, max: 10 })
    .withMessage('Humor deve ser entre 1 e 10'),
  body('anxiety_score')
    .isInt({ min: 1, max: 10 })
    .withMessage('Ansiedade deve ser entre 1 e 10'),
  body('energy_score')
    .isInt({ min: 1, max: 10 })
    .withMessage('Energia deve ser entre 1 e 10'),
  body('sleep_hours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Horas de sono deve ser entre 0 e 24'),
  body('journal_entry')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Texto do diário deve ter no máximo 10000 caracteres'),
];

// ---------------------------------------------------------------------------
// POST /api/journal
// Create a daily check-in with journal entry (patient only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('patient'),
  journalValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        mood_score,
        anxiety_score,
        energy_score,
        sleep_quality,
        sleep_hours,
        journal_entry,
        notes,
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
        ],
      );

      // Trigger alert checks asynchronously
      generateAlerts(req.user.id).catch((err) => {
        console.error('[journal] Alert generation failed:', err.message);
      });

      res.status(201).json({ journal: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/journal
// Get journal entries for the authenticated patient
// ---------------------------------------------------------------------------

router.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { start_date, end_date, page = 1, limit = 20 } = req.query;
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

    const countResult = await query(
      `SELECT COUNT(*) FROM (${sql}) AS filtered`,
      params,
    );

    sql += ` ORDER BY logged_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      journals: result.rows,
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
// GET /api/journal/:patientId
// Professional accesses a patient's journal entries (requires permission)
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('journal_entries'),
  async (req, res, next) => {
    try {
      const { start_date, end_date, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `SELECT * FROM emotional_logs WHERE patient_id = $1 AND journal_entry IS NOT NULL`;
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

      const countResult = await query(
        `SELECT COUNT(*) FROM (${sql}) AS filtered`,
        params,
      );

      sql += ` ORDER BY logged_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        journals: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: lim,
          total: parseInt(countResult.rows[0].count, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
