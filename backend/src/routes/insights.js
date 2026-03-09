'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/insights
// Get patient's own AI insights
// ---------------------------------------------------------------------------

router.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { insight_type, impact_level, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `
      SELECT ai.*,
             u.first_name AS reviewer_first_name,
             u.last_name AS reviewer_last_name
      FROM ai_insights ai
      LEFT JOIN users u ON u.id = ai.reviewed_by
      WHERE ai.patient_id = $1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (insight_type) {
      sql += ` AND ai.insight_type = $${paramIdx}`;
      params.push(insight_type);
      paramIdx++;
    }

    if (impact_level) {
      sql += ` AND ai.impact_level = $${paramIdx}`;
      params.push(impact_level);
      paramIdx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${sql}) AS filtered`,
      params,
    );

    sql += ` ORDER BY ai.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      insights: result.rows,
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
// GET /api/insights/:patientId
// Professional view of patient's insights
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const { insight_type, impact_level, is_reviewed, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `
        SELECT ai.*,
               u.first_name AS reviewer_first_name,
               u.last_name AS reviewer_last_name
        FROM ai_insights ai
        LEFT JOIN users u ON u.id = ai.reviewed_by
        WHERE ai.patient_id = $1
      `;
      const params = [req.params.patientId];
      let paramIdx = 2;

      if (insight_type) {
        sql += ` AND ai.insight_type = $${paramIdx}`;
        params.push(insight_type);
        paramIdx++;
      }
      if (impact_level) {
        sql += ` AND ai.impact_level = $${paramIdx}`;
        params.push(impact_level);
        paramIdx++;
      }
      if (is_reviewed !== undefined) {
        sql += ` AND ai.is_reviewed = $${paramIdx}`;
        params.push(is_reviewed === 'true');
        paramIdx++;
      }

      const countResult = await query(
        `SELECT COUNT(*) FROM (${sql}) AS filtered`,
        params,
      );

      sql += ` ORDER BY ai.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        insights: result.rows,
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

// ---------------------------------------------------------------------------
// PUT /api/insights/:id/review
// Mark insight as reviewed (professional only)
// ---------------------------------------------------------------------------

router.put(
  '/:id/review',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      // Fetch the insight to get patient_id
      const insightResult = await query(
        'SELECT * FROM ai_insights WHERE id = $1',
        [req.params.id],
      );

      if (insightResult.rows.length === 0) {
        return res.status(404).json({ error: 'Insight não encontrado' });
      }

      const insight = insightResult.rows[0];

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, insight.patient_id],
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      const result = await query(
        `UPDATE ai_insights
         SET is_reviewed = TRUE, reviewed_by = $1
         WHERE id = $2
         RETURNING *`,
        [req.user.id, req.params.id],
      );

      res.json({ insight: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
