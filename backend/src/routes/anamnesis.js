'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess, requireOwnership } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/anamnesis/templates
// Create anamnesis template (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/templates',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { title, description, questions } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Pelo menos uma pergunta é obrigatória' });
      }

      // Create template
      const templateResult = await query(
        `INSERT INTO anamnesis_templates (professional_id, title, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.user.id, title.trim(), description || null]
      );

      const template = templateResult.rows[0];

      // Create questions
      const createdQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_text || !q.question_type) {
          return res.status(400).json({ error: `Pergunta ${i + 1}: texto e tipo são obrigatórios` });
        }

        const validTypes = ['text', 'scale', 'multiple_choice', 'yes_no', 'date'];
        if (!validTypes.includes(q.question_type)) {
          return res.status(400).json({
            error: `Pergunta ${i + 1}: tipo inválido. Aceitos: ${validTypes.join(', ')}`,
          });
        }

        const qResult = await query(
          `INSERT INTO anamnesis_questions (template_id, question_text, question_type, options, display_order, is_required)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            template.id,
            q.question_text,
            q.question_type,
            q.options ? JSON.stringify(q.options) : null,
            i,
            q.is_required !== undefined ? q.is_required : true,
          ]
        );
        createdQuestions.push(qResult.rows[0]);
      }

      res.status(201).json({
        template: { ...template, questions: createdQuestions },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/anamnesis/templates
// List professional's templates
// ---------------------------------------------------------------------------

router.get(
  '/templates',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT t.*,
                (SELECT COUNT(*) FROM anamnesis_questions WHERE template_id = t.id) AS question_count,
                (SELECT COUNT(*) FROM anamnesis_responses WHERE template_id = t.id) AS response_count
         FROM anamnesis_templates t
         WHERE t.professional_id = $1 AND t.is_active = TRUE
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );

      res.json({ templates: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/anamnesis/templates/:id
// Get template detail with questions
// ---------------------------------------------------------------------------

router.get(
  '/templates/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const templateResult = await query(
        'SELECT * FROM anamnesis_templates WHERE id = $1 AND professional_id = $2',
        [req.params.id, req.user.id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      const questionsResult = await query(
        'SELECT * FROM anamnesis_questions WHERE template_id = $1 ORDER BY display_order',
        [req.params.id]
      );

      res.json({
        template: { ...templateResult.rows[0], questions: questionsResult.rows },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/anamnesis/templates/:id
// Update template (owner only)
// ---------------------------------------------------------------------------

router.put(
  '/templates/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  requireOwnership('anamnesis_templates', 'id', 'professional_id'),
  async (req, res, next) => {
    try {
      const { title, description, questions } = req.body;

      const updates = [];
      const values = [];
      let idx = 1;

      if (title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(title.trim());
      }
      if (description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(description);
      }

      if (updates.length > 0) {
        values.push(req.params.id);
        await query(
          `UPDATE anamnesis_templates SET ${updates.join(', ')} WHERE id = $${idx}`,
          values
        );
      }

      // If questions provided, replace all
      if (questions && Array.isArray(questions)) {
        await query('DELETE FROM anamnesis_questions WHERE template_id = $1', [req.params.id]);
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await query(
            `INSERT INTO anamnesis_questions (template_id, question_text, question_type, options, display_order, is_required)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.params.id,
              q.question_text,
              q.question_type,
              q.options ? JSON.stringify(q.options) : null,
              i,
              q.is_required !== undefined ? q.is_required : true,
            ]
          );
        }
      }

      // Return updated template with questions
      const templateResult = await query('SELECT * FROM anamnesis_templates WHERE id = $1', [
        req.params.id,
      ]);
      const questionsResult = await query(
        'SELECT * FROM anamnesis_questions WHERE template_id = $1 ORDER BY display_order',
        [req.params.id]
      );

      res.json({
        template: { ...templateResult.rows[0], questions: questionsResult.rows },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/anamnesis/templates/:id
// Soft-delete template (owner only)
// ---------------------------------------------------------------------------

router.delete(
  '/templates/:id',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('id'),
  handleValidation,
  requireOwnership('anamnesis_templates', 'id', 'professional_id'),
  async (req, res, next) => {
    try {
      await query('UPDATE anamnesis_templates SET is_active = FALSE WHERE id = $1', [
        req.params.id,
      ]);
      res.json({ message: 'Template desativado com sucesso' });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/anamnesis/send
// Send anamnesis to patient (creates response + alert)
// ---------------------------------------------------------------------------

router.post(
  '/send',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { template_id, patient_id, deadline } = req.body;

      if (!template_id || !patient_id) {
        return res.status(400).json({ error: 'template_id e patient_id são obrigatórios' });
      }

      // Verify template exists and belongs to this professional
      const templateResult = await query(
        'SELECT id, title FROM anamnesis_templates WHERE id = $1 AND professional_id = $2 AND is_active = TRUE',
        [template_id, req.user.id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Template não encontrado' });
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

      // Create response entry
      const deadlineDate = deadline ? new Date(deadline) : null;
      const responseResult = await query(
        `INSERT INTO anamnesis_responses (template_id, patient_id, professional_id, deadline)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [template_id, patient_id, req.user.id, deadlineDate]
      );

      // Create alert for patient
      await query(
        `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
         VALUES ($1, 'anamnesis_assigned', 'low', $2, $3, $4)`,
        [
          patient_id,
          'Nova anamnese atribuída',
          `${req.user.first_name} ${req.user.last_name} enviou uma anamnese: ${templateResult.rows[0].title}`,
          JSON.stringify({
            response_id: responseResult.rows[0].id,
            template_id,
            professional_id: req.user.id,
          }),
        ]
      );

      res.status(201).json({ response: responseResult.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/anamnesis/pending
// List pending anamneses for patient
// ---------------------------------------------------------------------------

router.get(
  '/pending',
  requireRole('patient'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT ar.*,
                at.title AS template_title,
                at.description AS template_description,
                u.first_name AS professional_first_name,
                u.last_name AS professional_last_name,
                (SELECT COUNT(*) FROM anamnesis_questions WHERE template_id = ar.template_id) AS question_count
         FROM anamnesis_responses ar
         JOIN anamnesis_templates at ON at.id = ar.template_id
         JOIN users u ON u.id = ar.professional_id
         WHERE ar.patient_id = $1 AND ar.status IN ('pending', 'in_progress')
         ORDER BY ar.created_at DESC`,
        [req.user.id]
      );

      res.json({ pending: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/anamnesis/responses/:id
// Get response detail (patient owns or professional who sent)
// ---------------------------------------------------------------------------

router.get(
  '/responses/:id',
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const responseResult = await query(
        `SELECT ar.*,
                at.title AS template_title,
                at.description AS template_description,
                u.first_name AS professional_first_name,
                u.last_name AS professional_last_name
         FROM anamnesis_responses ar
         JOIN anamnesis_templates at ON at.id = ar.template_id
         JOIN users u ON u.id = ar.professional_id
         WHERE ar.id = $1`,
        [req.params.id]
      );

      if (responseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Resposta não encontrada' });
      }

      const response = responseResult.rows[0];

      // Check access: patient owns it or professional who sent it
      if (response.patient_id !== req.user.id && response.professional_id !== req.user.id) {
        return res.status(403).json({ error: 'Sem permissão para ver esta resposta' });
      }

      // Get questions
      const questionsResult = await query(
        'SELECT * FROM anamnesis_questions WHERE template_id = $1 ORDER BY display_order',
        [response.template_id]
      );

      res.json({
        response: { ...response, questions: questionsResult.rows },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/anamnesis/responses/:id
// Patient submits answers
// ---------------------------------------------------------------------------

router.put(
  '/responses/:id',
  requireRole('patient'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { answers, status } = req.body;

      // Verify ownership
      const existing = await query(
        'SELECT * FROM anamnesis_responses WHERE id = $1 AND patient_id = $2',
        [req.params.id, req.user.id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Resposta não encontrada' });
      }

      if (existing.rows[0].status === 'completed') {
        return res.status(400).json({ error: 'Anamnese já foi completada' });
      }

      const newStatus = status || 'in_progress';
      const completedAt = newStatus === 'completed' ? new Date() : null;

      const result = await query(
        `UPDATE anamnesis_responses
         SET answers = $1, status = $2, completed_at = $3
         WHERE id = $4
         RETURNING *`,
        [JSON.stringify(answers || {}), newStatus, completedAt, req.params.id]
      );

      // If completed, create alert for the professional
      if (newStatus === 'completed') {
        const response = result.rows[0];
        await query(
          `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
           VALUES ($1, 'anamnesis_completed', 'low', $2, $3, $4)`,
          [
            response.patient_id,
            'Anamnese completada',
            `Paciente completou a anamnese`,
            JSON.stringify({
              response_id: response.id,
              template_id: response.template_id,
              professional_id: response.professional_id,
            }),
          ]
        );
      }

      res.json({ response: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/anamnesis/patient/:patientId
// Professional views responses for a patient (ONLY their own)
// ---------------------------------------------------------------------------

router.get(
  '/patient/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('anamnesis'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT ar.*,
                at.title AS template_title,
                at.description AS template_description,
                (SELECT COUNT(*) FROM anamnesis_questions WHERE template_id = ar.template_id) AS question_count
         FROM anamnesis_responses ar
         JOIN anamnesis_templates at ON at.id = ar.template_id
         WHERE ar.patient_id = $1 AND ar.professional_id = $2
         ORDER BY ar.created_at DESC`,
        [req.params.patientId, req.user.id]
      );

      res.json({ responses: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
