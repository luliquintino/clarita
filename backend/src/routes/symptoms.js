'use strict';

const { Router } = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const {
  symptomReportValidator,
  handleValidation,
  isUUID,
} = require('../validators');

// ---------------------------------------------------------------------------
// Router for GET /api/symptoms (reference data)
// ---------------------------------------------------------------------------

const symptomsRouter = Router();
symptomsRouter.use(authenticate);

symptomsRouter.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;

    let sql = 'SELECT * FROM symptoms';
    const params = [];

    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }

    sql += ' ORDER BY category, name';

    const result = await query(sql, params);
    res.json({ symptoms: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Router for /api/patient-symptoms
// ---------------------------------------------------------------------------

const patientSymptomsRouter = Router();
patientSymptomsRouter.use(authenticate);

// POST /api/patient-symptoms - Report a symptom (patient only)
patientSymptomsRouter.post('/', requireRole('patient'), symptomReportValidator, handleValidation, async (req, res, next) => {
  try {
    const { symptom_id, severity, notes, reported_at } = req.body;

    // Verify symptom exists
    const symptomResult = await query('SELECT id FROM symptoms WHERE id = $1', [symptom_id]);
    if (symptomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sintoma não encontrado' });
    }

    const result = await query(
      `INSERT INTO patient_symptoms (patient_id, symptom_id, severity, notes, reported_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, symptom_id, severity, notes || null, reported_at || new Date().toISOString()],
    );

    res.status(201).json({ patient_symptom: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/patient-symptoms - Get patient's own symptom history
patientSymptomsRouter.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { start_date, end_date, page = 1, limit = 30 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `
      SELECT ps.*, s.name AS symptom_name, s.category AS symptom_category
      FROM patient_symptoms ps
      JOIN symptoms s ON s.id = ps.symptom_id
      WHERE ps.patient_id = $1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (start_date) {
      sql += ` AND ps.reported_at >= $${paramIdx}`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      sql += ` AND ps.reported_at <= $${paramIdx}`;
      params.push(end_date);
      paramIdx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${sql}) AS filtered`,
      params,
    );

    sql += ` ORDER BY ps.reported_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      patient_symptoms: result.rows,
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

// GET /api/patient-symptoms/:patientId - Professional view
patientSymptomsRouter.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('symptoms'),
  async (req, res, next) => {
    try {
      const { start_date, end_date, page = 1, limit = 30 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `
        SELECT ps.*, s.name AS symptom_name, s.category AS symptom_category
        FROM patient_symptoms ps
        JOIN symptoms s ON s.id = ps.symptom_id
        WHERE ps.patient_id = $1
      `;
      const params = [req.params.patientId];
      let paramIdx = 2;

      if (start_date) {
        sql += ` AND ps.reported_at >= $${paramIdx}`;
        params.push(start_date);
        paramIdx++;
      }
      if (end_date) {
        sql += ` AND ps.reported_at <= $${paramIdx}`;
        params.push(end_date);
        paramIdx++;
      }

      const countResult = await query(
        `SELECT COUNT(*) FROM (${sql}) AS filtered`,
        params,
      );

      sql += ` ORDER BY ps.reported_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        patient_symptoms: result.rows,
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

module.exports = { symptomsRouter, patientSymptomsRouter };
