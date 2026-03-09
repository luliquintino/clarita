'use strict';

const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadExam } = require('../middleware/upload');
const { handleValidation, isUUID } = require('../validators');

router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/exams
// Upload an exam (patient only)
// ---------------------------------------------------------------------------
router.post('/', requireRole('patient'), (req, res, next) => {
  uploadExam(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 10MB.' });
      }
      return res.status(400).json({ error: err.message || 'Erro no upload do arquivo.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    try {
      const { exam_type, exam_date, notes } = req.body;
      let professionalIds = [];
      try {
        professionalIds = JSON.parse(req.body.professional_ids || '[]');
      } catch (_e) {
        // ignore parse errors, treat as empty
      }

      if (!exam_type || !exam_date) {
        // Clean up file
        if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'exam_type e exam_date são obrigatórios.' });
      }

      // Insert exam record
      const examResult = await query(
        `INSERT INTO patient_exams
           (patient_id, exam_type, exam_date, file_name, original_name, mime_type, file_size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          req.user.id,
          exam_type,
          exam_date,
          req.file.filename,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          notes || null,
        ]
      );

      const exam = examResult.rows[0];

      // Grant permissions to selected professionals
      for (const profId of professionalIds) {
        // Verify care relationship exists before granting
        const relCheck = await query(
          `SELECT 1 FROM care_relationships
           WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
          [req.user.id, profId]
        );
        if (relCheck.rows.length > 0) {
          await query(
            `INSERT INTO exam_permissions (exam_id, professional_id, granted_by)
             VALUES ($1, $2, $3)
             ON CONFLICT (exam_id, professional_id) DO NOTHING`,
            [exam.id, profId, req.user.id]
          );
        }
      }

      // Create alert for the patient (visible to all caring professionals)
      await query(
        `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
         VALUES ($1, 'new_exam', 'low', $2, $3, $4)`,
        [
          req.user.id,
          `Novo exame: ${exam_type}`,
          `Paciente enviou um novo exame (${exam_type}) em ${exam_date}.`,
          JSON.stringify({ exam_id: exam.id, exam_type, professional_ids: professionalIds }),
        ]
      );

      // Fetch permissions for response
      const permsResult = await query(
        `SELECT professional_id FROM exam_permissions WHERE exam_id = $1`,
        [exam.id]
      );

      res.status(201).json({
        exam: { ...exam, permissions: permsResult.rows },
      });
    } catch (error) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      next(error);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/exams/my-exams
// List all exams for the authenticated patient
// ---------------------------------------------------------------------------
router.get('/my-exams', requireRole('patient'), async (req, res, next) => {
  try {
    const examsResult = await query(
      `SELECT * FROM patient_exams
       WHERE patient_id = $1
       ORDER BY exam_date DESC, created_at DESC`,
      [req.user.id]
    );

    // Fetch permissions for each exam
    const exams = [];
    for (const exam of examsResult.rows) {
      const permsResult = await query(
        `SELECT ep.professional_id, u.first_name, u.last_name, u.role
         FROM exam_permissions ep
         JOIN users u ON u.id = ep.professional_id
         WHERE ep.exam_id = $1`,
        [exam.id]
      );
      exams.push({ ...exam, permissions: permsResult.rows });
    }

    res.json({ exams });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/exams/patient/:patientId
// Professional views patient's exams (only those they have permission for)
// ---------------------------------------------------------------------------
router.get(
  '/patient/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      // Verify care relationship
      const relCheck = await query(
        `SELECT 1 FROM care_relationships
         WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
        [patientId, req.user.id]
      );

      if (relCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente.' });
      }

      // Fetch only exams with permission
      const result = await query(
        `SELECT pe.* FROM patient_exams pe
         INNER JOIN exam_permissions ep ON ep.exam_id = pe.id
         WHERE pe.patient_id = $1 AND ep.professional_id = $2
         ORDER BY pe.exam_date DESC, pe.created_at DESC`,
        [patientId, req.user.id]
      );

      res.json({ exams: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/exams/download/:examId
// Authenticated file download
// ---------------------------------------------------------------------------
router.get('/download/:examId', isUUID('examId'), handleValidation, async (req, res, next) => {
  try {
    const { examId } = req.params;

    const examResult = await query(`SELECT * FROM patient_exams WHERE id = $1`, [examId]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exame não encontrado.' });
    }

    const exam = examResult.rows[0];

    // Access control
    if (req.user.role === 'patient') {
      if (exam.patient_id !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
    } else {
      // Professional: check exam_permissions
      const permCheck = await query(
        `SELECT 1 FROM exam_permissions
           WHERE exam_id = $1 AND professional_id = $2`,
        [examId, req.user.id]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a este exame.' });
      }
    }

    // Serve file
    const filePath = path.join(__dirname, '../../uploads/exams', exam.file_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });
    }

    res.setHeader('Content-Type', exam.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${exam.original_name}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/exams/:examId
// Patient deletes own exam
// ---------------------------------------------------------------------------
router.delete(
  '/:examId',
  requireRole('patient'),
  isUUID('examId'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { examId } = req.params;

      const examResult = await query(
        `SELECT * FROM patient_exams WHERE id = $1 AND patient_id = $2`,
        [examId, req.user.id]
      );

      if (examResult.rows.length === 0) {
        return res.status(404).json({ error: 'Exame não encontrado.' });
      }

      const exam = examResult.rows[0];

      // Delete from DB (cascades to exam_permissions)
      await query(`DELETE FROM patient_exams WHERE id = $1`, [examId]);

      // Delete file from disk
      const filePath = path.join(__dirname, '../../uploads/exams', exam.file_name);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/exams/:examId/permissions
// Patient updates exam permissions
// ---------------------------------------------------------------------------
router.put(
  '/:examId/permissions',
  requireRole('patient'),
  isUUID('examId'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { examId } = req.params;
      const { professional_ids } = req.body;

      if (!Array.isArray(professional_ids)) {
        return res.status(400).json({ error: 'professional_ids deve ser um array.' });
      }

      // Verify ownership
      const examCheck = await query(
        `SELECT 1 FROM patient_exams WHERE id = $1 AND patient_id = $2`,
        [examId, req.user.id]
      );
      if (examCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Exame não encontrado.' });
      }

      // Get current permissions to detect newly added ones
      const currentPerms = await query(
        `SELECT professional_id FROM exam_permissions WHERE exam_id = $1`,
        [examId]
      );
      const currentIds = new Set(currentPerms.rows.map((r) => r.professional_id));

      // Delete all existing permissions
      await query(`DELETE FROM exam_permissions WHERE exam_id = $1`, [examId]);

      // Insert new permissions
      for (const profId of professional_ids) {
        const relCheck = await query(
          `SELECT 1 FROM care_relationships
           WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
          [req.user.id, profId]
        );
        if (relCheck.rows.length > 0) {
          await query(
            `INSERT INTO exam_permissions (exam_id, professional_id, granted_by)
             VALUES ($1, $2, $3)
             ON CONFLICT (exam_id, professional_id) DO NOTHING`,
            [examId, profId, req.user.id]
          );

          // Alert newly added professionals
          if (!currentIds.has(profId)) {
            const examData = await query(
              `SELECT exam_type, exam_date FROM patient_exams WHERE id = $1`,
              [examId]
            );
            if (examData.rows.length > 0) {
              const { exam_type, exam_date } = examData.rows[0];
              await query(
                `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
                 VALUES ($1, 'new_exam', 'low', $2, $3, $4)`,
                [
                  req.user.id,
                  `Novo exame compartilhado: ${exam_type}`,
                  `Paciente compartilhou um exame (${exam_type}) de ${exam_date} com você.`,
                  JSON.stringify({ exam_id: examId, exam_type }),
                ]
              );
            }
          }
        }
      }

      // Return updated permissions
      const result = await query(
        `SELECT ep.professional_id, u.first_name, u.last_name, u.role
         FROM exam_permissions ep
         JOIN users u ON u.id = ep.professional_id
         WHERE ep.exam_id = $1`,
        [examId]
      );

      res.json({ permissions: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
