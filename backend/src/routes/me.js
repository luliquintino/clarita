'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/me/export — baixar todos os dados do usuário como JSON
router.get('/export', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { audit } = require('../services/auditService');

    const [
      user,
      emotionalLogs,
      patientMedications,
      goals,
      assessmentResults,
      clinicalNotes,
      symptoms,
      lifeEvents,
      diagnoses,
      examMetadata,
    ] = await Promise.all([
      query(
        'SELECT id, email, first_name, last_name, role, phone, created_at, consent_accepted_at FROM users WHERE id = $1',
        [userId]
      ),
      query(
        `SELECT id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours,
                notes, journal_entry, logged_at, created_at
         FROM emotional_logs WHERE patient_id = $1 ORDER BY created_at DESC`,
        [userId]
      ),
      query(
        'SELECT id, medication_id, dosage, frequency, start_date, end_date, status, notes, created_at FROM patient_medications WHERE patient_id = $1',
        [userId]
      ),
      query(
        'SELECT id, title, description, status, target_date, achieved_at, created_at FROM goals WHERE patient_id = $1',
        [userId]
      ),
      query(
        'SELECT id, assessment_id, answers, total_score, severity_level, completed_at, created_at FROM assessment_results WHERE patient_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
      query(
        `SELECT id, title, content, note_type, created_at FROM clinical_notes
         WHERE patient_id = $1 ORDER BY created_at DESC`,
        [userId]
      ),
      query(
        `SELECT ps.id, s.name AS symptom_name, ps.severity, ps.notes, ps.reported_at
         FROM patient_symptoms ps
         JOIN symptoms s ON s.id = ps.symptom_id
         WHERE ps.patient_id = $1 ORDER BY ps.reported_at DESC`,
        [userId]
      ),
      query(
        'SELECT id, title, description, category, impact_level, event_date, created_at FROM life_events WHERE patient_id = $1 ORDER BY event_date DESC',
        [userId]
      ),
      query(
        `SELECT id, icd_code, icd_name, certainty, diagnosis_date, notes, created_at
         FROM patient_diagnoses
         WHERE patient_id = $1 AND certainty = 'confirmed' AND is_active = true`,
        [userId]
      ),
      query(
        `SELECT id, exam_type, exam_date, original_name, file_size, created_at
         FROM patient_exams
         WHERE patient_id = $1 AND is_professional_only = false ORDER BY exam_date DESC`,
        [userId]
      ),
    ]);

    const exportData = {
      data_version: '2',
      exported_at: new Date().toISOString(),
      user: user.rows[0],
      emotional_logs: emotionalLogs.rows,
      medications: patientMedications.rows,
      goals: goals.rows,
      assessment_results: assessmentResults.rows,
      clinical_notes: clinicalNotes.rows,
      symptoms: symptoms.rows,
      life_events: lifeEvents.rows,
      diagnoses: diagnoses.rows,
      exam_metadata: examMetadata.rows,
    };

    audit(req, 'data.export', 'user', userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clarita-meus-dados-${userId}.json"`
    );
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/me — anonimizar e desativar conta
router.delete('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { audit } = require('../services/auditService');

    const userResult = await query('SELECT is_active FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0] || !userResult.rows[0].is_active) {
      return res.status(404).json({ error: 'Conta não encontrada ou já removida.' });
    }

    // 1. Anonymize user record
    await query(
      `UPDATE users SET
        email = 'deleted_' || id || '@clarita.deleted',
        first_name = 'Conta',
        last_name = 'Removida',
        phone = NULL,
        password_hash = 'DELETED',
        is_active = false,
        avatar_url = NULL
      WHERE id = $1 AND is_active = true`,
      [userId]
    );

    // 2. Clear emotional log content
    await query(
      'UPDATE emotional_logs SET notes = NULL, journal_entry = NULL WHERE patient_id = $1',
      [userId]
    );

    // 3. Anonymize clinical notes
    await query(
      `UPDATE clinical_notes SET title = 'Nota removida', content = '[conteúdo removido]'
       WHERE patient_id = $1 OR professional_id = $1`,
      [userId]
    );

    // 4. Clear diagnosis notes
    await query('UPDATE patient_diagnoses SET notes = NULL WHERE patient_id = $1', [userId]);

    // 5. Clear medication notes
    await query('UPDATE patient_medications SET notes = NULL WHERE patient_id = $1', [userId]);

    // 6. Anonymize life events
    await query(
      `UPDATE life_events SET title = '[removido]', description = NULL WHERE patient_id = $1`,
      [userId]
    );

    // 7. Anonymize goals
    await query(
      `UPDATE goals SET title = '[removido]', description = NULL WHERE patient_id = $1`,
      [userId]
    );

    // 8. Clear assessment notes
    await query('UPDATE assessment_results SET notes = NULL WHERE patient_id = $1', [userId]);

    // 9. Clear emergency contact
    await query(
      `UPDATE patient_profiles SET emergency_contact_name = NULL, emergency_contact_phone = NULL
       WHERE user_id = $1`,
      [userId]
    );

    // 10. Revoke all exam permissions
    await query(
      `DELETE FROM exam_permissions WHERE exam_id IN (
        SELECT id FROM patient_exams WHERE patient_id = $1
      )`,
      [userId]
    );

    // 11. Cancel active record sharing tokens
    await query(
      `UPDATE record_sharing_tokens SET is_active = false
       WHERE patient_id = $1 AND is_active = true`,
      [userId]
    );

    audit(req, 'account.delete', 'user', userId);

    res.json({ message: 'Conta removida com sucesso. Seus dados pessoais foram anonimizados.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
