'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { body } = require('express-validator');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/goals
// Create a goal for a patient (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole('psychologist', 'psychiatrist'),
  [
    body('patient_id').isUUID().withMessage('patient_id is required'),
    body('title')
      .isString()
      .isLength({ min: 1, max: 300 })
      .withMessage('Title is required (max 300 chars)'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('target_date').optional().isISO8601(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { patient_id, title, description, target_date } = req.body;

      // Verify professional has access to this patient
      const access = await query(
        `SELECT 1 FROM care_relationships
         WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
        [patient_id, req.user.id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a este paciente' });
      }

      const result = await query(
        `INSERT INTO goals (patient_id, created_by, title, description, target_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [patient_id, req.user.id, title, description || null, target_date || null]
      );

      res.status(201).json({ goal: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/goals/:patientId
// List goals for a patient (professional or patient themselves)
// ---------------------------------------------------------------------------

router.get('/:patientId', isUUID('patientId'), handleValidation, async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Allow patient to see own goals, or professional with access
    if (req.user.role === 'patient') {
      if (req.user.id !== patientId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    } else {
      const access = await query(
        `SELECT 1 FROM care_relationships
           WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
        [patientId, req.user.id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a este paciente' });
      }
    }

    const result = await query(
      `SELECT g.*,
                u.first_name AS created_by_first_name,
                u.last_name AS created_by_last_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         WHERE g.patient_id = $1
         ORDER BY
           CASE g.patient_status
             WHEN 'pending' THEN 0
             WHEN 'accepted' THEN 1
             WHEN 'rejected' THEN 2
           END,
           CASE g.status
             WHEN 'in_progress' THEN 0
             WHEN 'paused' THEN 1
             WHEN 'achieved' THEN 2
             WHEN 'cancelled' THEN 3
           END,
           g.created_at DESC`,
      [patientId]
    );

    res.json({ goals: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/goals/:id
// Update a goal (professional only)
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  [
    body('title').optional().isString().isLength({ min: 1, max: 300 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('status').optional().isIn(['in_progress', 'paused', 'cancelled']),
    body('target_date').optional().isISO8601(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, description, status, target_date } = req.body;

      // Verify goal exists and professional has access
      const goalCheck = await query(
        `SELECT g.patient_id, g.patient_status FROM goals g
         JOIN care_relationships cr ON cr.patient_id = g.patient_id AND cr.professional_id = $2 AND cr.status = 'active'
         WHERE g.id = $1`,
        [id, req.user.id]
      );
      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meta não encontrada ou acesso negado' });
      }

      // Block status changes on pending goals
      if (goalCheck.rows[0].patient_status === 'pending' && status) {
        return res
          .status(400)
          .json({ error: 'Não é possível alterar o status de uma meta pendente de aceitação' });
      }

      const fields = [];
      const values = [];
      let idx = 1;

      if (title !== undefined) {
        fields.push(`title = $${idx}`);
        values.push(title);
        idx++;
      }
      if (description !== undefined) {
        fields.push(`description = $${idx}`);
        values.push(description);
        idx++;
      }
      if (status !== undefined) {
        fields.push(`status = $${idx}`);
        values.push(status);
        idx++;
      }
      if (target_date !== undefined) {
        fields.push(`target_date = $${idx}`);
        values.push(target_date);
        idx++;
      }
      fields.push(`updated_at = NOW()`);

      if (fields.length === 1) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(id);
      const result = await query(
        `UPDATE goals SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      res.json({ goal: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/goals/:id/achieve
// Mark a goal as achieved (professional only)
// ---------------------------------------------------------------------------

router.put(
  '/:id/achieve',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verify access
      const goalCheck = await query(
        `SELECT g.patient_id, g.patient_status FROM goals g
         JOIN care_relationships cr ON cr.patient_id = g.patient_id AND cr.professional_id = $2 AND cr.status = 'active'
         WHERE g.id = $1`,
        [id, req.user.id]
      );
      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meta não encontrada ou acesso negado' });
      }

      // Goal must be accepted by patient before it can be achieved
      if (goalCheck.rows[0].patient_status !== 'accepted') {
        return res
          .status(400)
          .json({ error: 'Meta precisa ser aceita pelo paciente antes de ser conquistada' });
      }

      const result = await query(
        `UPDATE goals SET status = 'achieved', achieved_at = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );

      res.json({ goal: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/goals/:id/respond
// Patient accepts or rejects a goal
// ---------------------------------------------------------------------------

router.put(
  '/:id/respond',
  requireRole('patient'),
  isUUID('id'),
  [
    body('action').isIn(['accept', 'reject']).withMessage('action deve ser accept ou reject'),
    body('rejection_reason').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body;

      // Verify goal exists, belongs to this patient, and is pending
      const goalCheck = await query(
        `SELECT g.* FROM goals g WHERE g.id = $1 AND g.patient_id = $2`,
        [id, req.user.id]
      );

      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meta não encontrada' });
      }

      const goal = goalCheck.rows[0];

      if (goal.patient_status !== 'pending') {
        return res.status(400).json({ error: 'Esta meta já foi respondida' });
      }

      if (action === 'accept') {
        const result = await query(
          `UPDATE goals
           SET patient_status = 'accepted', responded_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id]
        );
        return res.json({ goal: result.rows[0] });
      }

      // --- Rejection flow ---
      const result = await query(
        `UPDATE goals
         SET patient_status = 'rejected',
             status = 'cancelled',
             rejection_reason = $2,
             responded_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, rejection_reason || null]
      );

      const rejectedGoal = result.rows[0];

      // Create alert for all professionals linked to this patient
      const patientName = `${req.user.first_name} ${req.user.last_name}`;

      await query(
        `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
         VALUES ($1, 'goal_rejected', 'medium', $2, $3, $4)`,
        [
          req.user.id,
          `Meta recusada: ${rejectedGoal.title}`,
          `O paciente ${patientName} recusou a meta "${rejectedGoal.title}". ${
            rejection_reason ? `Motivo: ${rejection_reason}. ` : ''
          }Considere revisar a meta para melhor se adequar à capacidade do paciente.`,
          JSON.stringify({
            goal_id: rejectedGoal.id,
            goal_title: rejectedGoal.title,
            rejection_reason: rejection_reason || null,
            rejected_at: new Date().toISOString(),
          }),
        ]
      );

      res.json({ goal: rejectedGoal });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/milestones
// Create a milestone (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/milestones',
  requireRole('psychologist', 'psychiatrist'),
  [
    body('patient_id').isUUID().withMessage('patient_id is required'),
    body('title').isString().isLength({ min: 1, max: 300 }).withMessage('Title is required'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('milestone_type')
      .isIn(['positive', 'difficult'])
      .withMessage('Type must be positive or difficult'),
    body('event_date').isISO8601().withMessage('event_date is required'),
    body('goal_id').optional().isUUID(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { patient_id, title, description, milestone_type, event_date, goal_id } = req.body;

      // Verify access
      const access = await query(
        `SELECT 1 FROM care_relationships
         WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
        [patient_id, req.user.id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a este paciente' });
      }

      const result = await query(
        `INSERT INTO milestones (patient_id, goal_id, title, description, milestone_type, event_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          patient_id,
          goal_id || null,
          title,
          description || null,
          milestone_type,
          event_date,
          req.user.id,
        ]
      );

      res.status(201).json({ milestone: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/goals/milestones/:patientId
// List milestones for a patient
// ---------------------------------------------------------------------------

router.get(
  '/milestones/:patientId',
  isUUID('patientId'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      // Allow patient to see own milestones, or professional with access
      if (req.user.role === 'patient') {
        if (req.user.id !== patientId) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
      } else {
        const access = await query(
          `SELECT 1 FROM care_relationships
           WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
          [patientId, req.user.id]
        );
        if (access.rows.length === 0) {
          return res.status(403).json({ error: 'Acesso negado a este paciente' });
        }
      }

      const result = await query(
        `SELECT m.*,
                u.first_name AS created_by_first_name,
                u.last_name AS created_by_last_name,
                g.title AS goal_title
         FROM milestones m
         JOIN users u ON u.id = m.created_by
         LEFT JOIN goals g ON g.id = m.goal_id
         WHERE m.patient_id = $1
         ORDER BY m.event_date DESC`,
        [patientId]
      );

      res.json({ milestones: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
