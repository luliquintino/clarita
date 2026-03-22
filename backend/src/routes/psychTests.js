'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { body } = require('express-validator');
const { calculateScore, generateAIAnalysis } = require('../services/psychTestService');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/psych-tests
// Catalog of available tests (professionals only)
// ---------------------------------------------------------------------------

router.get('/', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pt.id, pt.name, pt.description, pt.category, pt.dsm_references,
              pt.is_active, pt.requires_satepsi_approval, pt.created_at,
              st.test_name AS satepsi_name, st.approval_status AS satepsi_status,
              st.expiry_date AS satepsi_expiry, st.cfp_code AS satepsi_cfp_code
       FROM psychological_tests pt
       LEFT JOIN satepsi_tests st ON st.id = pt.satepsi_test_id
       WHERE pt.is_active = true
         AND (pt.requires_satepsi_approval = false
              OR pt.requires_satepsi_approval IS NULL
              OR (st.id IS NOT NULL AND st.approval_status = 'active'))
       ORDER BY pt.category, pt.name`
    );
    res.json({
      tests: result.rows,
      disclaimer: 'Resultados de testes e insights de IA são ferramentas de apoio clínico e não substituem o julgamento profissional.',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/dsm-criteria
// List DSM criteria
// ---------------------------------------------------------------------------

router.get('/dsm-criteria', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, code, name, category, version, created_at FROM dsm_criteria ORDER BY code`
    );
    res.json({ criteria: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/dsm-criteria/:code
// DSM criteria detail by code
// ---------------------------------------------------------------------------

router.get('/dsm-criteria/:code', async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM dsm_criteria WHERE code = $1`, [req.params.code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Critério DSM não encontrado' });
    }
    res.json({ criteria: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/sessions/pending
// Pending test sessions for the authenticated patient
// ---------------------------------------------------------------------------

router.get('/sessions/pending', requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pts.*, pt.name AS test_name, pt.description AS test_description,
              pt.category AS test_category,
              u.first_name AS assigned_by_first_name, u.last_name AS assigned_by_last_name
       FROM patient_test_sessions pts
       JOIN psychological_tests pt ON pt.id = pts.test_id
       JOIN users u ON u.id = pts.assigned_by
       WHERE pts.patient_id = $1 AND pts.status IN ('pending', 'in_progress')
       ORDER BY pts.deadline ASC NULLS LAST, pts.created_at DESC`,
      [req.user.id]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/sessions/history
// Completed test history for the authenticated patient
// ---------------------------------------------------------------------------

router.get('/sessions/history', requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pts.*, pt.name AS test_name, pt.description AS test_description,
              pt.category AS test_category,
              u.first_name AS assigned_by_first_name, u.last_name AS assigned_by_last_name
       FROM patient_test_sessions pts
       JOIN psychological_tests pt ON pt.id = pts.test_id
       JOIN users u ON u.id = pts.assigned_by
       WHERE pts.patient_id = $1 AND pts.status = 'completed'
       ORDER BY pts.completed_at DESC`,
      [req.user.id]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/psych-tests/sessions/patient/:patientId
// Patient test history (professionals)
// ---------------------------------------------------------------------------

router.get(
  '/sessions/patient/:patientId',
  isUUID('patientId'),
  handleValidation,
  requireRole('psychologist', 'psychiatrist'),
  requirePatientAccess('psychological_tests'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * lim;

      const result = await query(
        `SELECT pts.*, pt.name AS test_name, pt.category AS test_category,
                u.first_name AS assigned_by_first_name, u.last_name AS assigned_by_last_name
         FROM patient_test_sessions pts
         JOIN psychological_tests pt ON pt.id = pts.test_id
         JOIN users u ON u.id = pts.assigned_by
         WHERE pts.patient_id = $1
         ORDER BY pts.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.params.patientId, lim, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM patient_test_sessions WHERE patient_id = $1`,
        [req.params.patientId]
      );

      res.json({
        sessions: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: lim,
          total: countResult.rows[0].total,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/psych-tests/:id
// Test detail (anyone authenticated)
// ---------------------------------------------------------------------------

router.get('/:id', isUUID('id'), handleValidation, async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM psychological_tests WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
    res.json({ test: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/psych-tests/assign
// Assign a test to a patient (professionals only)
// ---------------------------------------------------------------------------

router.post(
  '/assign',
  requireRole('psychologist', 'psychiatrist'),
  [
    body('test_id').isUUID().withMessage('test_id is required'),
    body('patient_id').isUUID().withMessage('patient_id is required'),
    body('deadline').optional().isISO8601().withMessage('deadline must be ISO8601'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { test_id, patient_id, deadline } = req.body;

      // Check care relationship
      const rel = await query(
        `SELECT 1 FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patient_id]
      );
      if (rel.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo ativo com este paciente' });
      }

      // Check test exists and SATEPSI approval
      const test = await query(
        `SELECT pt.id, pt.name, pt.requires_satepsi_approval,
                st.approval_status AS satepsi_status
         FROM psychological_tests pt
         LEFT JOIN satepsi_tests st ON st.id = pt.satepsi_test_id
         WHERE pt.id = $1 AND pt.is_active = true`,
        [test_id]
      );
      if (test.rows.length === 0) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      // Block assignment if test requires SATEPSI approval but is not approved
      const t = test.rows[0];
      if (t.requires_satepsi_approval && t.satepsi_status !== 'active') {
        return res.status(403).json({
          error: 'Este teste requer aprovação SATEPSI ativa para ser utilizado.',
          satepsi_status: t.satepsi_status || 'not_linked',
        });
      }

      // Default deadline: 7 days
      const deadlineDate = deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const session = await query(
        `INSERT INTO patient_test_sessions (test_id, patient_id, assigned_by, deadline)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [test_id, patient_id, req.user.id, deadlineDate]
      );

      // Create alert for the patient
      await query(
        `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
         VALUES ($1, 'test_assigned', 'low', 'Novo teste atribuído', $2, $3)`,
        [
          patient_id,
          `Um teste psicológico foi atribuído a você. Prazo: ${new Date(deadlineDate).toLocaleDateString('pt-BR')}`,
          JSON.stringify({ test_id, assigned_by: req.user.id }),
        ]
      );

      res.status(201).json({ session: session.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/psych-tests/sessions/:id
// Session detail
// ---------------------------------------------------------------------------

router.get(
  '/sessions/:id',
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT pts.*, pt.name AS test_name, pt.description AS test_description,
                pt.category AS test_category, pt.questions AS test_questions,
                pt.scoring_rules, pt.interpretation_guide, pt.dsm_references,
                u.first_name AS assigned_by_first_name, u.last_name AS assigned_by_last_name
         FROM patient_test_sessions pts
         JOIN psychological_tests pt ON pt.id = pts.test_id
         JOIN users u ON u.id = pts.assigned_by
         WHERE pts.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      const session = result.rows[0];

      // Patient can see own session, professional who assigned or has access can see
      if (req.user.id !== session.patient_id && req.user.id !== session.assigned_by) {
        const rel = await query(
          `SELECT 1 FROM care_relationships
           WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
          [req.user.id, session.patient_id]
        );
        if (rel.rows.length === 0) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
      }

      // Hide answers from professionals if not completed yet (only patient sees in-progress)
      if (req.user.role !== 'patient' && session.status !== 'completed') {
        session.answers = null;
      }

      res.json({ session });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/psych-tests/sessions/:id
// Patient submits answers
// ---------------------------------------------------------------------------

router.put(
  '/sessions/:id',
  requireRole('patient'),
  isUUID('id'),
  [body('answers').isObject().withMessage('answers object is required')],
  handleValidation,
  async (req, res, next) => {
    try {
      const { answers } = req.body;

      // Verify ownership
      const existing = await query(
        `SELECT pts.*, pt.questions, pt.scoring_rules, pt.interpretation_guide, pt.dsm_references,
                pt.name AS test_name
         FROM patient_test_sessions pts
         JOIN psychological_tests pt ON pt.id = pts.test_id
         WHERE pts.id = $1 AND pts.patient_id = $2`,
        [req.params.id, req.user.id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      const session = existing.rows[0];

      if (session.status === 'completed') {
        return res.status(400).json({ error: 'Esta sessão já foi completada' });
      }
      if (session.status === 'expired') {
        return res.status(400).json({ error: 'Esta sessão expirou' });
      }

      // Calculate score
      const test = {
        questions: session.questions,
        scoring_rules: session.scoring_rules,
        interpretation_guide: session.interpretation_guide,
        dsm_references: session.dsm_references,
      };
      const { total_score, subscores, interpretation } = calculateScore(test, answers);

      // Generate AI analysis
      const aiAnalysis = await generateAIAnalysis(
        { total_score, answers, ...session },
        test
      );

      // Build DSM mapping from AI analysis
      const dsmMapping = aiAnalysis.dsm_mapping || [];

      // Update session
      const updated = await query(
        `UPDATE patient_test_sessions
         SET answers = $1, total_score = $2, ai_analysis = $3, dsm_mapping = $4,
             status = 'completed', completed_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [JSON.stringify(answers), total_score, JSON.stringify(aiAnalysis), JSON.stringify(dsmMapping), req.params.id]
      );

      // Save individual responses
      const answerEntries = Object.entries(answers);
      for (const [idx, answer] of answerEntries) {
        await query(
          `INSERT INTO test_responses (session_id, question_index, answer)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [req.params.id, parseInt(idx, 10), JSON.stringify(answer)]
        );
      }

      // Create alert for the patient (self) on completion
      await query(
        `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
         VALUES ($1, 'test_completed', 'low', 'Teste completado', $2, $3)`,
        [
          req.user.id,
          `Você completou o teste "${session.test_name}". Escore: ${total_score}.`,
          JSON.stringify({ session_id: req.params.id, total_score, assigned_by: session.assigned_by }),
        ]
      );

      res.json({
        session: updated.rows[0],
        score: { total_score, subscores, interpretation },
        ai_analysis: aiAnalysis,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/psych-tests/admin
// Create a custom test (professionals only)
// ---------------------------------------------------------------------------

router.post(
  '/admin',
  requireRole('psychologist', 'psychiatrist'),
  [
    body('name').isString().isLength({ min: 1, max: 300 }).withMessage('name is required'),
    body('category').isString().notEmpty().withMessage('category is required'),
    body('questions').isArray({ min: 1 }).withMessage('questions array is required'),
    body('scoring_rules').isObject().withMessage('scoring_rules object is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, description, category, dsm_references, questions, scoring_rules, interpretation_guide } = req.body;

      const result = await query(
        `INSERT INTO psychological_tests
           (name, description, category, dsm_references, questions, scoring_rules, interpretation_guide)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          name,
          description || null,
          category,
          dsm_references || null,
          JSON.stringify(questions),
          JSON.stringify(scoring_rules),
          interpretation_guide ? JSON.stringify(interpretation_guide) : null,
        ]
      );

      res.status(201).json({ test: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
