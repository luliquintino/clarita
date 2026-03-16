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

    // journal_entries does not exist as a separate table; journal text is stored
    // in the emotional_logs.journal_entry column alongside the check-in data.
    // assessments holds assessment templates; patient responses are in assessment_results.
    const [user, emotionalLogs, patientMedications, goals, assessmentResults] = await Promise.all([
      query(
        'SELECT id, email, first_name, last_name, role, phone, created_at, consent_accepted_at FROM users WHERE id = $1',
        [userId]
      ),
      query(
        'SELECT id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, notes, logged_at, created_at FROM emotional_logs WHERE patient_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
      query(
        'SELECT id, medication_id, dosage, frequency, start_date, end_date, status, notes, created_at, updated_at FROM patient_medications WHERE patient_id = $1',
        [userId]
      ),
      query(
        'SELECT id, title, description, status, target_date, achieved_at, created_at, updated_at FROM goals WHERE patient_id = $1',
        [userId]
      ),
      query(
        'SELECT id, assessment_id, answers, total_score, severity_level, completed_at, created_at FROM assessment_results WHERE patient_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: user.rows[0],
      // emotional_logs includes the journal_entry field when present
      emotional_logs: emotionalLogs.rows,
      medications: patientMedications.rows,
      goals: goals.rows,
      assessment_results: assessmentResults.rows,
    };

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

    // Idempotency guard — reject if account is already inactive
    const userResult = await query('SELECT is_active FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0] || !userResult.rows[0].is_active) {
      return res.status(404).json({ error: 'Conta não encontrada ou já removida.' });
    }

    // Anonimizar dados pessoais
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

    // Remover notas sensíveis dos registros emocionais (journal_entry e notes)
    await query(
      'UPDATE emotional_logs SET notes = NULL, journal_entry = NULL WHERE patient_id = $1',
      [userId]
    );

    res.json({
      message: 'Conta removida com sucesso. Seus dados pessoais foram anonimizados.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
