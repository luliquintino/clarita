'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/alerts
// Get alerts for the professional's patients
// ---------------------------------------------------------------------------

router.get('/', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const { severity, is_acknowledged, page = 1, limit = 30 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `
      SELECT a.*,
             u.first_name AS patient_first_name,
             u.last_name AS patient_last_name,
             ack.first_name AS acknowledged_by_first_name,
             ack.last_name AS acknowledged_by_last_name
      FROM alerts a
      JOIN care_relationships cr ON cr.patient_id = a.patient_id
        AND cr.professional_id = $1
        AND cr.status = 'active'
      JOIN users u ON u.id = a.patient_id
      LEFT JOIN users ack ON ack.id = a.acknowledged_by
      WHERE 1=1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (severity) {
      sql += ` AND a.severity = $${paramIdx}`;
      params.push(severity);
      paramIdx++;
    }

    if (is_acknowledged !== undefined) {
      sql += ` AND a.is_acknowledged = $${paramIdx}`;
      params.push(is_acknowledged === 'true');
      paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

    sql += ` ORDER BY a.is_acknowledged ASC, a.severity DESC, a.created_at DESC
             LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      alerts: result.rows,
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
// GET /api/alerts/:patientId
// Get alerts for a specific patient
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const { severity, is_acknowledged } = req.query;

      let sql = `
        SELECT a.*,
               ack.first_name AS acknowledged_by_first_name,
               ack.last_name AS acknowledged_by_last_name
        FROM alerts a
        LEFT JOIN users ack ON ack.id = a.acknowledged_by
        WHERE a.patient_id = $1
      `;
      const params = [req.params.patientId];
      let paramIdx = 2;

      if (severity) {
        sql += ` AND a.severity = $${paramIdx}`;
        params.push(severity);
        paramIdx++;
      }
      if (is_acknowledged !== undefined) {
        sql += ` AND a.is_acknowledged = $${paramIdx}`;
        params.push(is_acknowledged === 'true');
        paramIdx++;
      }

      sql += ' ORDER BY a.is_acknowledged ASC, a.severity DESC, a.created_at DESC';

      const result = await query(sql, params);

      res.json({ alerts: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/alerts/:id/acknowledge
// Acknowledge alert (professional only)
// ---------------------------------------------------------------------------

router.put(
  '/:id/acknowledge',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      // Fetch alert to get patient_id
      const alertResult = await query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);

      if (alertResult.rows.length === 0) {
        return res.status(404).json({ error: 'Alerta não encontrado' });
      }

      const alert = alertResult.rows[0];

      if (alert.is_acknowledged) {
        return res.status(400).json({ error: 'Alerta já reconhecido' });
      }

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, alert.patient_id]
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      const result = await query(
        `UPDATE alerts
         SET is_acknowledged = TRUE,
             acknowledged_by = $1,
             acknowledged_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      res.json({ alert: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
