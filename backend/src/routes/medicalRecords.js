'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const { requireRole, requirePatientAccess, requireOwnership } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// ---------------------------------------------------------------------------
// POST /api/medical-records
// Create private medical record (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { patient_id, title, content, record_date, category, tags } = req.body;

      if (!patient_id || !title || !content) {
        return res.status(400).json({ error: 'patient_id, title e content são obrigatórios' });
      }

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patient_id]
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      const result = await query(
        `INSERT INTO private_medical_records
           (professional_id, patient_id, title, content, record_date, category, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.user.id,
          patient_id,
          title.trim(),
          content,
          record_date || new Date().toISOString().split('T')[0],
          category || null,
          tags || null,
        ]
      );

      res.status(201).json({ record: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/medical-records/:patientId
// List records for patient (ONLY this professional's records)
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('private_records'),
  async (req, res, next) => {
    try {
      const { category, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

      let sql = `
        SELECT * FROM private_medical_records
        WHERE professional_id = $1 AND patient_id = $2
      `;
      const params = [req.user.id, req.params.patientId];
      let paramIdx = 3;

      if (category) {
        sql += ` AND category = $${paramIdx}`;
        params.push(category);
        paramIdx++;
      }

      const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

      sql += ` ORDER BY record_date DESC, created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(lim, offset);

      const result = await query(sql, params);

      res.json({
        records: result.rows,
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

// ---------------------------------------------------------------------------
// GET /api/medical-records/detail/:id
// Get record detail (owner only)
// ---------------------------------------------------------------------------

router.get(
  '/detail/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  requireOwnership('private_medical_records', 'id', 'professional_id'),
  async (req, res, next) => {
    try {
      const result = await query('SELECT * FROM private_medical_records WHERE id = $1', [
        req.params.id,
      ]);
      res.json({ record: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/medical-records/:id
// Update record (owner only)
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  requireOwnership('private_medical_records', 'id', 'professional_id'),
  async (req, res, next) => {
    try {
      const { title, content, record_date, category, tags } = req.body;

      const updates = [];
      const values = [];
      let idx = 1;

      if (title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(title.trim());
      }
      if (content !== undefined) {
        updates.push(`content = $${idx++}`);
        values.push(content);
      }
      if (record_date !== undefined) {
        updates.push(`record_date = $${idx++}`);
        values.push(record_date);
      }
      if (category !== undefined) {
        updates.push(`category = $${idx++}`);
        values.push(category);
      }
      if (tags !== undefined) {
        updates.push(`tags = $${idx++}`);
        values.push(tags);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(req.params.id);

      const result = await query(
        `UPDATE private_medical_records SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      res.json({ record: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/medical-records/:id
// Delete record (owner only)
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  requireOwnership('private_medical_records', 'id', 'professional_id'),
  async (req, res, next) => {
    try {
      await query('DELETE FROM private_medical_records WHERE id = $1', [req.params.id]);
      res.json({ message: 'Registro deletado com sucesso' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
