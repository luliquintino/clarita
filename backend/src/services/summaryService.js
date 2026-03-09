'use strict';

const { query } = require('../config/database');

/**
 * Generate a structured summary for a patient based on recent data.
 * In production, this would call an AI API (OpenAI, Anthropic, etc.).
 * For now, it compiles data into a structured summary.
 */
async function generatePatientSummary(patientId, periodDays = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Gather emotional logs for the period
  const logsResult = await query(
    `SELECT mood_score, anxiety_score, energy_score, sleep_hours, journal_entry, logged_at
     FROM emotional_logs
     WHERE patient_id = $1 AND logged_at >= $2 AND logged_at <= $3
     ORDER BY logged_at DESC`,
    [patientId, startDate.toISOString(), endDate.toISOString()]
  );

  const logs = logsResult.rows;

  if (logs.length === 0) {
    return {
      summary_text: 'Sem dados suficientes para gerar resumo neste período.',
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      data: { log_count: 0 },
    };
  }

  // Calculate averages
  const avgMood = (logs.reduce((s, l) => s + l.mood_score, 0) / logs.length).toFixed(1);
  const avgAnxiety = (logs.reduce((s, l) => s + l.anxiety_score, 0) / logs.length).toFixed(1);
  const avgEnergy = (logs.reduce((s, l) => s + l.energy_score, 0) / logs.length).toFixed(1);
  const avgSleep =
    logs.filter((l) => l.sleep_hours).length > 0
      ? (
          logs.filter((l) => l.sleep_hours).reduce((s, l) => s + parseFloat(l.sleep_hours), 0) /
          logs.filter((l) => l.sleep_hours).length
        ).toFixed(1)
      : null;

  // Mood trend
  const firstHalf = logs.slice(Math.floor(logs.length / 2));
  const secondHalf = logs.slice(0, Math.floor(logs.length / 2));
  const firstAvg = firstHalf.reduce((s, l) => s + l.mood_score, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, l) => s + l.mood_score, 0) / (secondHalf.length || 1);
  const moodTrend =
    secondAvg > firstAvg + 0.5 ? 'melhora' : secondAvg < firstAvg - 0.5 ? 'declínio' : 'estável';

  // Journal entries
  const journalEntries = logs.filter((l) => l.journal_entry).map((l) => l.journal_entry);

  // Build summary text
  const lines = [];
  lines.push(`Resumo dos últimos ${periodDays} dias (${logs.length} registros):`);
  lines.push('');
  lines.push(`**Humor médio:** ${avgMood}/10 (tendência: ${moodTrend})`);
  lines.push(`**Ansiedade média:** ${avgAnxiety}/10`);
  lines.push(`**Energia média:** ${avgEnergy}/10`);
  if (avgSleep) lines.push(`**Sono médio:** ${avgSleep} horas`);
  lines.push('');

  if (parseFloat(avgAnxiety) >= 7) {
    lines.push('⚠️ **Atenção:** Níveis de ansiedade elevados no período.');
  }
  if (parseFloat(avgMood) <= 4) {
    lines.push('⚠️ **Atenção:** Humor consistentemente baixo no período.');
  }
  if (avgSleep && parseFloat(avgSleep) < 6) {
    lines.push('⚠️ **Atenção:** Sono insuficiente (menos de 6h em média).');
  }

  if (journalEntries.length > 0) {
    lines.push('');
    lines.push(`**Entradas no diário:** ${journalEntries.length} registros textuais no período.`);
  }

  // Save to journal_summaries
  const summaryText = lines.join('\n');
  const savedResult = await query(
    `INSERT INTO journal_summaries (patient_id, summary_text, period_start, period_end)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      patientId,
      summaryText,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]
  );

  return {
    ...savedResult.rows[0],
    data: {
      log_count: logs.length,
      avg_mood: parseFloat(avgMood),
      avg_anxiety: parseFloat(avgAnxiety),
      avg_energy: parseFloat(avgEnergy),
      avg_sleep: avgSleep ? parseFloat(avgSleep) : null,
      mood_trend: moodTrend,
      journal_count: journalEntries.length,
    },
  };
}

/**
 * Compile a professional brief for a patient.
 * Combines emotional data, medications, alerts into a single view.
 */
async function compileProfessionalBrief(patientId) {
  const [emotionalResult, medsResult, alertsResult, goalsResult] = await Promise.allSettled([
    // Last 7 days emotional data
    query(
      `SELECT
        ROUND(AVG(mood_score), 1) AS avg_mood,
        ROUND(AVG(anxiety_score), 1) AS avg_anxiety,
        ROUND(AVG(energy_score), 1) AS avg_energy,
        ROUND(AVG(sleep_hours), 1) AS avg_sleep,
        COUNT(*) AS log_count,
        MIN(mood_score) AS min_mood,
        MAX(mood_score) AS max_mood
      FROM emotional_logs
      WHERE patient_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'`,
      [patientId]
    ),
    // Active medications
    query(
      `SELECT pm.id, m.name AS medication_name, pm.dosage, pm.frequency, pm.status
       FROM patient_medications pm
       JOIN medications m ON m.id = pm.medication_id
       WHERE pm.patient_id = $1 AND pm.status = 'active'`,
      [patientId]
    ),
    // Active alerts
    query(
      `SELECT id, alert_type, title, severity, created_at
       FROM alerts
       WHERE patient_id = $1 AND is_acknowledged = false
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
      [patientId]
    ),
    // Active goals
    query(
      `SELECT id, title, status, target_date FROM goals
       WHERE patient_id = $1 AND status = 'in_progress'
       ORDER BY created_at DESC`,
      [patientId]
    ),
  ]);

  const emotional = emotionalResult.status === 'fulfilled' ? emotionalResult.value.rows[0] : {};
  const medications = medsResult.status === 'fulfilled' ? medsResult.value.rows : [];
  const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value.rows : [];
  const goals = goalsResult.status === 'fulfilled' ? goalsResult.value.rows : [];

  return {
    emotional: {
      avg_mood: parseFloat(emotional.avg_mood) || 0,
      avg_anxiety: parseFloat(emotional.avg_anxiety) || 0,
      avg_energy: parseFloat(emotional.avg_energy) || 0,
      avg_sleep: parseFloat(emotional.avg_sleep) || 0,
      log_count: parseInt(emotional.log_count) || 0,
      min_mood: parseInt(emotional.min_mood) || 0,
      max_mood: parseInt(emotional.max_mood) || 0,
    },
    medications,
    alerts,
    goals,
    generated_at: new Date().toISOString(),
  };
}

module.exports = {
  generatePatientSummary,
  compileProfessionalBrief,
};
