'use strict';

const router = require('express').Router();
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const {
  createPrescription,
  listPrescriptions,
  getPrescription,
} = require('../services/memedService');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/prescriptions
// Create a new prescription (psychiatrist only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('psychiatrist'),
  [
    body('patient_id').isUUID().withMessage('patient_id is required'),
    body('medications').isArray({ min: 1 }).withMessage('medications array is required'),
    body('medications.*.name').isString().notEmpty().withMessage('medication name is required'),
    body('medications.*.dosage').isString().notEmpty().withMessage('dosage is required'),
    body('medications.*.frequency').isString().notEmpty().withMessage('frequency is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { patient_id, medications } = req.body;

      // Verify care relationship
      const { query: dbQuery } = require('../config/database');
      const rel = await dbQuery(
        `SELECT 1 FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patient_id]
      );
      if (rel.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo ativo com este paciente' });
      }

      const prescription = await createPrescription(req.user.id, patient_id, medications);
      res.status(201).json({ prescription });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/prescriptions/my
// Patient lists their own prescriptions (reads patient_id from JWT)
// ---------------------------------------------------------------------------
router.get(
  '/my',
  requireRole('patient'),
  async (req, res, next) => {
    try {
      const data = await listPrescriptions(req.user.id, { page: req.query.page, limit: req.query.limit });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/prescriptions/:patientId
// List prescriptions for a patient
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  isUUID('patientId'),
  handleValidation,
  requireRole('psychologist', 'psychiatrist'),
  requirePatientAccess('medications'),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      const data = await listPrescriptions(req.params.patientId, { page, limit });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/prescriptions/detail/:id
// Get a single prescription
// ---------------------------------------------------------------------------

router.get(
  '/detail/:id',
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const prescription = await getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: 'Prescrição não encontrada' });
      }

      // Professional who created it or patient it belongs to
      if (
        req.user.id !== prescription.professional_id &&
        req.user.id !== prescription.patient_id
      ) {
        // Check if requesting professional has access to patient
        const { query: dbQuery } = require('../config/database');
        const rel = await dbQuery(
          `SELECT 1 FROM care_relationships
           WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
          [req.user.id, prescription.patient_id]
        );
        if (rel.rows.length === 0) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
      }

      res.json({ prescription });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
