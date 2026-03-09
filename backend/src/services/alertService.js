'use strict';

const { query } = require('../config/database');

// ---------------------------------------------------------------------------
// Individual alert checks
// ---------------------------------------------------------------------------

/**
 * Check for depressive pattern: mood_score <= 3 for 7 or more consecutive days.
 * @param {string} patientId  UUID
 * @returns {Promise<object|null>}  Alert data or null
 */
async function checkDepressivePattern(patientId) {
  const result = await query(
    `SELECT COUNT(*) AS low_days
     FROM emotional_logs
     WHERE patient_id = $1
       AND mood_score <= 3
       AND logged_at >= NOW() - INTERVAL '7 days'`,
    [patientId],
  );

  const lowDays = parseInt(result.rows[0].low_days, 10);

  if (lowDays >= 7) {
    return {
      patient_id: patientId,
      alert_type: 'depressive_episode',
      severity: lowDays >= 10 ? 'critical' : 'high',
      title: 'Humor persistentemente baixo detectado',
      description: `Paciente reportou pontuações de humor de 3 ou menos por ${lowDays} dos últimos 7 dias.`,
      trigger_data: { low_days: lowDays, threshold: 7, period_days: 7 },
    };
  }

  return null;
}

/**
 * Check for anxiety pattern: anxiety_score >= 7 for 3 or more consecutive days.
 * @param {string} patientId  UUID
 * @returns {Promise<object|null>}
 */
async function checkAnxietyPattern(patientId) {
  const result = await query(
    `SELECT COUNT(*) AS high_days
     FROM emotional_logs
     WHERE patient_id = $1
       AND anxiety_score >= 7
       AND logged_at >= NOW() - INTERVAL '3 days'`,
    [patientId],
  );

  const highDays = parseInt(result.rows[0].high_days, 10);

  if (highDays >= 3) {
    return {
      patient_id: patientId,
      alert_type: 'high_anxiety',
      severity: highDays >= 5 ? 'critical' : 'high',
      title: 'Ansiedade elevada detectada',
      description: `Paciente reportou pontuações de ansiedade de 7 ou acima por ${highDays} dos últimos 3 dias.`,
      trigger_data: { high_days: highDays, threshold: 3, period_days: 3 },
    };
  }

  return null;
}

/**
 * Check medication adherence: missed (skipped) 4 or more doses in the last 7 days.
 * @param {string} patientId  UUID
 * @returns {Promise<object|null>}
 */
async function checkMedicationAdherence(patientId) {
  const result = await query(
    `SELECT COUNT(*) AS missed_count
     FROM medication_logs ml
     JOIN patient_medications pm ON pm.id = ml.patient_medication_id
     WHERE pm.patient_id = $1
       AND ml.skipped = TRUE
       AND ml.taken_at >= NOW() - INTERVAL '7 days'`,
    [patientId],
  );

  const missedCount = parseInt(result.rows[0].missed_count, 10);

  if (missedCount >= 4) {
    return {
      patient_id: patientId,
      alert_type: 'medication_non_adherence',
      severity: missedCount >= 7 ? 'critical' : 'medium',
      title: 'Não adesão à medicação detectada',
      description: `Paciente pulou ${missedCount} doses de medicação nos últimos 7 dias.`,
      trigger_data: { missed_count: missedCount, threshold: 4, period_days: 7 },
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Run all alert checks for a single patient.
 * Only creates an alert if one with the same type hasn't been created
 * for this patient in the last 24 hours (to avoid duplicates).
 *
 * @param {string} patientId
 * @returns {Promise<object[]>}  Created alerts
 */
async function generateAlerts(patientId) {
  const checks = [
    checkDepressivePattern(patientId),
    checkAnxietyPattern(patientId),
    checkMedicationAdherence(patientId),
  ];

  const results = await Promise.all(checks);
  const created = [];

  for (const alertData of results) {
    if (!alertData) continue;

    // Avoid duplicate alerts within 24 h
    const existing = await query(
      `SELECT id FROM alerts
       WHERE patient_id = $1
         AND alert_type = $2
         AND created_at >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [patientId, alertData.alert_type],
    );

    if (existing.rows.length > 0) continue;

    const insertResult = await query(
      `INSERT INTO alerts (patient_id, alert_type, severity, title, description, trigger_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        alertData.patient_id,
        alertData.alert_type,
        alertData.severity,
        alertData.title,
        alertData.description,
        JSON.stringify(alertData.trigger_data),
      ],
    );

    created.push(insertResult.rows[0]);
  }

  return created;
}

/**
 * Run alert generation for every active patient.
 * Intended to be called by the cron scheduler.
 */
async function generateAlertsForAllPatients() {
  const result = await query(
    `SELECT id FROM users WHERE role = 'patient' AND is_active = TRUE`,
  );

  const allCreated = [];

  for (const row of result.rows) {
    try {
      const alerts = await generateAlerts(row.id);
      allCreated.push(...alerts);
    } catch (err) {
      console.error(`[alertService] Error generating alerts for patient ${row.id}:`, err.message);
    }
  }

  return allCreated;
}

module.exports = {
  checkDepressivePattern,
  checkAnxietyPattern,
  checkMedicationAdherence,
  generateAlerts,
  generateAlertsForAllPatients,
};
