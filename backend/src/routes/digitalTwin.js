'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/digital-twin/:patientId
// Get latest digital twin state for a patient
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT id, patient_id, current_state, correlations, baseline,
                predictions, treatment_responses,
                data_points_used, model_version, confidence_overall,
                computed_at, created_at
         FROM digital_twin_states
         WHERE patient_id = $1
         ORDER BY computed_at DESC
         LIMIT 1`,
        [req.params.patientId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Gêmeo digital ainda não disponível para este paciente',
        });
      }

      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/digital-twin/:patientId/history
// Get digital twin evolution over time
// ---------------------------------------------------------------------------

router.get(
  '/:patientId/history',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const days = parseInt(req.query.days, 10) || 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await query(
        `SELECT id, patient_id, current_state, correlations, baseline,
                predictions, treatment_responses,
                data_points_used, model_version, confidence_overall,
                computed_at, created_at
         FROM digital_twin_states
         WHERE patient_id = $1 AND computed_at >= $2
         ORDER BY computed_at ASC`,
        [req.params.patientId, since],
      );

      res.json({ history: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/digital-twin/:patientId/predictions
// Get current predictions only (lightweight)
// ---------------------------------------------------------------------------

router.get(
  '/:patientId/predictions',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT predictions, confidence_overall, computed_at
         FROM digital_twin_states
         WHERE patient_id = $1
         ORDER BY computed_at DESC
         LIMIT 1`,
        [req.params.patientId],
      );

      if (result.rows.length === 0) {
        return res.json({ predictions: [], computed_at: null });
      }

      res.json({
        predictions: result.rows[0].predictions,
        confidence_overall: result.rows[0].confidence_overall,
        computed_at: result.rows[0].computed_at,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/digital-twin/:patientId/refresh
// Trigger a fresh twin computation via AI engine
// ---------------------------------------------------------------------------

router.post(
  '/:patientId/refresh',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:5001';

      const response = await fetch(`${aiEngineUrl}/analyze/${req.params.patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(result);
      }

      res.json({
        status: 'success',
        message: 'Gêmeo digital atualizado com sucesso',
        analysis: result,
      });
    } catch (err) {
      // If AI engine is unavailable, return a friendly error
      if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Motor de IA indisponível. Tente novamente mais tarde.',
        });
      }
      next(err);
    }
  },
);

module.exports = router;
