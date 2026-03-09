'use strict';

const { Router } = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { medicationValidator, handleValidation, isUUID } = require('../validators');
const { generateAlerts } = require('../services/alertService');

// ---------------------------------------------------------------------------
// Router for GET /api/medications (reference data)
// ---------------------------------------------------------------------------

const medicationsRouter = Router();
medicationsRouter.use(authenticate);

medicationsRouter.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query;

    let sql = 'SELECT * FROM medications WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (category) {
      sql += ` AND category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }

    if (search) {
      sql += ` AND name ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY category, name';

    const result = await query(sql, params);
    res.json({ medications: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Router for /api/patient-medications
// ---------------------------------------------------------------------------

const patientMedicationsRouter = Router();
patientMedicationsRouter.use(authenticate);

// POST /api/patient-medications - Prescribe medication (psychiatrist only)
patientMedicationsRouter.post(
  '/',
  requireRole('psychiatrist'),
  medicationValidator,
  handleValidation,
  async (req, res, next) => {
    try {
      const { patient_id, medication_id, dosage, frequency, start_date, end_date, notes } =
        req.body;

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patient_id]
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      // Verify medication exists
      const medResult = await query('SELECT id FROM medications WHERE id = $1', [medication_id]);
      if (medResult.rows.length === 0) {
        return res.status(404).json({ error: 'Medicamento não encontrado' });
      }

      const result = await query(
        `INSERT INTO patient_medications
           (patient_id, medication_id, prescribed_by, dosage, frequency, start_date, end_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          patient_id,
          medication_id,
          req.user.id,
          dosage,
          frequency,
          start_date,
          end_date || null,
          notes || null,
        ]
      );

      res.status(201).json({ patient_medication: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/patient-medications/:id - Update prescription (psychiatrist only)
patientMedicationsRouter.put(
  '/:id',
  requireRole('psychiatrist'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      // Verify the psychiatrist has care relationship with this patient
      const pmResult = await query(
        `SELECT pm.*, cr.professional_id
         FROM patient_medications pm
         JOIN care_relationships cr ON cr.patient_id = pm.patient_id
           AND cr.professional_id = $1
           AND cr.status = 'active'
         WHERE pm.id = $2`,
        [req.user.id, req.params.id]
      );

      if (pmResult.rows.length === 0) {
        return res.status(404).json({ error: 'Prescrição não encontrada ou sem acesso' });
      }

      const { dosage, frequency, end_date, status, notes } = req.body;

      const updates = [];
      const values = [];
      let idx = 1;

      if (dosage !== undefined) {
        updates.push(`dosage = $${idx++}`);
        values.push(dosage);
      }
      if (frequency !== undefined) {
        updates.push(`frequency = $${idx++}`);
        values.push(frequency);
      }
      if (end_date !== undefined) {
        updates.push(`end_date = $${idx++}`);
        values.push(end_date);
      }
      if (status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(status);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${idx++}`);
        values.push(notes);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(req.params.id);

      const result = await query(
        `UPDATE patient_medications SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      res.json({ patient_medication: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/patient-medications - Get patient's medications
patientMedicationsRouter.get('/', async (req, res, next) => {
  try {
    let patientId;

    if (req.user.role === 'patient') {
      patientId = req.user.id;
    } else {
      patientId = req.query.patient_id;
      if (!patientId) {
        return res
          .status(400)
          .json({ error: 'Parâmetro patient_id é obrigatório para profissionais' });
      }

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patientId]
      );
      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }
    }

    const { status: medStatus } = req.query;

    let sql = `
      SELECT pm.*, m.name AS medication_name, m.category AS medication_category,
             u.first_name AS prescriber_first_name, u.last_name AS prescriber_last_name
      FROM patient_medications pm
      JOIN medications m ON m.id = pm.medication_id
      LEFT JOIN users u ON u.id = pm.prescribed_by
      WHERE pm.patient_id = $1
    `;
    const params = [patientId];
    let paramIdx = 2;

    if (medStatus) {
      sql += ` AND pm.status = $${paramIdx}`;
      params.push(medStatus);
      paramIdx++;
    }

    sql += ' ORDER BY pm.start_date DESC';

    const result = await query(sql, params);
    res.json({ patient_medications: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Router for /api/medication-logs
// ---------------------------------------------------------------------------

const medicationLogsRouter = Router();
medicationLogsRouter.use(authenticate);

// POST /api/medication-logs - Log medication taken/skipped (patient only)
medicationLogsRouter.post('/', requireRole('patient'), async (req, res, next) => {
  try {
    const { patient_medication_id, taken_at, skipped, skip_reason, notes } = req.body;

    if (!patient_medication_id) {
      return res.status(400).json({ error: 'patient_medication_id é obrigatório' });
    }

    // Verify patient owns this medication prescription
    const pmResult = await query(
      'SELECT id FROM patient_medications WHERE id = $1 AND patient_id = $2',
      [patient_medication_id, req.user.id]
    );

    if (pmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prescrição não encontrada' });
    }

    if (skipped && !skip_reason) {
      return res
        .status(400)
        .json({ error: 'skip_reason é obrigatório quando a medicação é pulada' });
    }

    const result = await query(
      `INSERT INTO medication_logs (patient_medication_id, taken_at, skipped, skip_reason, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        patient_medication_id,
        taken_at || new Date().toISOString(),
        skipped || false,
        skip_reason || null,
        notes || null,
      ]
    );

    // Trigger alert checks if medication was skipped
    if (skipped) {
      generateAlerts(req.user.id).catch((err) => {
        console.error('[medicationLogs] Alert generation failed:', err.message);
      });
    }

    res.status(201).json({ medication_log: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/medication-logs - Get medication adherence data
medicationLogsRouter.get('/', async (req, res, next) => {
  try {
    let patientId;

    if (req.user.role === 'patient') {
      patientId = req.user.id;
    } else {
      patientId = req.query.patient_id;
      if (!patientId) {
        return res
          .status(400)
          .json({ error: 'Parâmetro patient_id é obrigatório para profissionais' });
      }

      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patientId]
      );
      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }
    }

    const { patient_medication_id, start_date, end_date } = req.query;

    let sql = `
      SELECT ml.*, pm.dosage, pm.frequency, m.name AS medication_name
      FROM medication_logs ml
      JOIN patient_medications pm ON pm.id = ml.patient_medication_id
      JOIN medications m ON m.id = pm.medication_id
      WHERE pm.patient_id = $1
    `;
    const params = [patientId];
    let paramIdx = 2;

    if (patient_medication_id) {
      sql += ` AND ml.patient_medication_id = $${paramIdx}`;
      params.push(patient_medication_id);
      paramIdx++;
    }
    if (start_date) {
      sql += ` AND ml.taken_at >= $${paramIdx}`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      sql += ` AND ml.taken_at <= $${paramIdx}`;
      params.push(end_date);
      paramIdx++;
    }

    sql += ' ORDER BY ml.taken_at DESC';

    const result = await query(sql, params);

    // Compute adherence summary
    const total = result.rows.length;
    const taken = result.rows.filter((r) => !r.skipped).length;
    const skippedCount = result.rows.filter((r) => r.skipped).length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : null;

    res.json({
      medication_logs: result.rows,
      summary: { total, taken, skipped: skippedCount, adherence_rate: adherenceRate },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = { medicationsRouter, patientMedicationsRouter, medicationLogsRouter };
