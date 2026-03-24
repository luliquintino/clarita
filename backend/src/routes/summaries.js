'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { generatePatientSummary, compileProfessionalBrief } = require('../services/summaryService');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/summaries/:patientId/generate
// Generate a new AI summary for a patient (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/:patientId/generate',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('emotional_logs'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { period_days = 7, start_date, end_date } = req.body;

      let startDate, endDate;
      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
        startDate = new Date(endDate.getTime() - parseInt(period_days, 10) * 24 * 60 * 60 * 1000);
      }

      const summary = await generatePatientSummary(patientId, startDate, endDate);

      res.status(201).json({ summary });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/summaries/:patientId
// List summaries for a patient (professional only)
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('emotional_logs'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { limit = 10 } = req.query;

      const result = await query(
        `SELECT * FROM journal_summaries
         WHERE patient_id = $1
         ORDER BY generated_at DESC
         LIMIT $2`,
        [patientId, Math.min(50, parseInt(limit, 10))]
      );

      res.json({ summaries: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/summaries/:patientId/brief
// Get compiled professional brief (professional only)
// ---------------------------------------------------------------------------

router.get(
  '/:patientId/brief',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('emotional_logs'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const brief = await compileProfessionalBrief(patientId);
      res.json({ brief });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
