'use strict';

const { Router } = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { assessmentResultValidator, handleValidation, isUUID } = require('../validators');
const {
  calculateScore,
  classifySeverity,
  validateAnswers,
} = require('../services/assessmentService');

// ---------------------------------------------------------------------------
// Router for GET /api/assessments (reference data)
// ---------------------------------------------------------------------------

const assessmentsRouter = Router();
assessmentsRouter.use(authenticate);

assessmentsRouter.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM assessments ORDER BY name');
    res.json({ assessments: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Router for /api/assessment-results
// ---------------------------------------------------------------------------

const assessmentResultsRouter = Router();
assessmentResultsRouter.use(authenticate);

// POST /api/assessment-results - Submit assessment result with auto-score
assessmentResultsRouter.post(
  '/',
  requireRole('patient'),
  assessmentResultValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const { assessment_id, answers } = req.body;

      // Fetch assessment
      const assessmentResult = await query('SELECT * FROM assessments WHERE id = $1', [
        assessment_id,
      ]);

      if (assessmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Avaliação não encontrada' });
      }

      const assessment = assessmentResult.rows[0];

      // Validate answers structure
      const validation = validateAnswers(assessment.name, answers);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      // Calculate score and severity
      const totalScore = calculateScore(answers);
      const severityLevel = classifySeverity(assessment.name, totalScore);

      const result = await query(
        `INSERT INTO assessment_results
           (patient_id, assessment_id, answers, total_score, severity_level)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user.id, assessment_id, JSON.stringify(answers), totalScore, severityLevel]
      );

      res.status(201).json({
        assessment_result: result.rows[0],
        scoring: {
          total_score: totalScore,
          severity_level: severityLevel,
          assessment_name: assessment.name,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/assessment-results - Get patient's own assessment history
assessmentResultsRouter.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { assessment_id, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `
      SELECT ar.*, a.name AS assessment_name
      FROM assessment_results ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.patient_id = $1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (assessment_id) {
      sql += ` AND ar.assessment_id = $${paramIdx}`;
      params.push(assessment_id);
      paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

    sql += ` ORDER BY ar.completed_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      assessment_results: result.rows,
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

// GET /api/assessment-results/:patientId - Professional view
assessmentResultsRouter.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('assessments'),
  async (req, res, next) => {
    try {
      const { assessment_id, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `
        SELECT ar.*, a.name AS assessment_name
        FROM assessment_results ar
        JOIN assessments a ON a.id = ar.assessment_id
        WHERE ar.patient_id = $1
      `;
      const params = [req.params.patientId];
      let paramIdx = 2;

      if (assessment_id) {
        sql += ` AND ar.assessment_id = $${paramIdx}`;
        params.push(assessment_id);
        paramIdx++;
      }

      const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

      sql += ` ORDER BY ar.completed_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        assessment_results: result.rows,
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

module.exports = { assessmentsRouter, assessmentResultsRouter };
