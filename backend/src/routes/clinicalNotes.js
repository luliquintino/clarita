'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess, requireOwnership } = require('../middleware/rbac');
const {
  clinicalNoteValidator,
  handleValidation,
  isUUID,
} = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/clinical-notes
// Create clinical note (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('psychologist', 'psychiatrist'),
  clinicalNoteValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const { patient_id, session_date, note_type, content, is_private } = req.body;

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patient_id],
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      const result = await query(
        `INSERT INTO clinical_notes
           (professional_id, patient_id, session_date, note_type, content, is_private)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.user.id, patient_id, session_date, note_type, content, is_private || false],
      );

      res.status(201).json({ clinical_note: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/clinical-notes/:patientId
// Get notes for patient
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('clinical_notes'),
  async (req, res, next) => {
    try {
      const patientId = req.params.patientId;
      const { note_type, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `
        SELECT cn.*,
               u.first_name AS professional_first_name,
               u.last_name AS professional_last_name,
               u.role AS professional_role
        FROM clinical_notes cn
        JOIN users u ON u.id = cn.professional_id
        WHERE cn.patient_id = $1
      `;
      const params = [patientId];
      let paramIdx = 2;

      // If the requester is a professional (not the patient themselves),
      // only show notes they authored or non-private notes
      if (req.user.role !== 'patient') {
        sql += ` AND (cn.professional_id = $${paramIdx} OR cn.is_private = FALSE)`;
        params.push(req.user.id);
        paramIdx++;
      } else {
        // Patients never see private notes
        sql += ' AND cn.is_private = FALSE';
      }

      if (note_type) {
        sql += ` AND cn.note_type = $${paramIdx}`;
        params.push(note_type);
        paramIdx++;
      }

      const countResult = await query(
        `SELECT COUNT(*) FROM (${sql}) AS filtered`,
        params,
      );

      sql += ` ORDER BY cn.session_date DESC, cn.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        clinical_notes: result.rows,
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
// PUT /api/clinical-notes/:id
// Update clinical note (only the author)
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  requireOwnership('clinical_notes', 'id', 'professional_id'),
  async (req, res, next) => {
    try {
      const { session_date, note_type, content, is_private } = req.body;

      const updates = [];
      const values = [];
      let idx = 1;

      if (session_date !== undefined) { updates.push(`session_date = $${idx++}`); values.push(session_date); }
      if (note_type !== undefined) { updates.push(`note_type = $${idx++}`); values.push(note_type); }
      if (content !== undefined) { updates.push(`content = $${idx++}`); values.push(content); }
      if (is_private !== undefined) { updates.push(`is_private = $${idx++}`); values.push(is_private); }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(req.params.id);

      const result = await query(
        `UPDATE clinical_notes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values,
      );

      res.json({ clinical_note: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
