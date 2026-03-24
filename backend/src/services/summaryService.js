'use strict';

const { query } = require('../config/database');

/**
 * Generate a patient summary using all available data sources.
 * Uses Claude API if ANTHROPIC_API_KEY is set, otherwise falls back to manual logic.
 */
async function generatePatientSummary(patientId, periodDaysOrStartDate = 7, endDateArg = null) {
  let startDate, endDate;

  if (endDateArg instanceof Date) {
    startDate = periodDaysOrStartDate;
    endDate = endDateArg;
  } else {
    endDate = new Date();
    startDate = new Date(endDate.getTime() - periodDaysOrStartDate * 24 * 60 * 60 * 1000);
  }

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  const startDate_ = startDate.toISOString().split('T')[0];
  const endDate_ = endDate.toISOString().split('T')[0];

  // Aggregate all data in parallel
  const [logsResult, symptomsResult, eventsResult, goalsResult, assessmentsResult] =
    await Promise.allSettled([
      query(
        `SELECT mood_score, anxiety_score, energy_score, sleep_hours, journal_entry, logged_at
         FROM emotional_logs
         WHERE patient_id = $1 AND logged_at >= $2 AND logged_at <= $3
         ORDER BY logged_at DESC`,
        [patientId, startISO, endISO]
      ),
      query(
        `SELECT ps.severity, ps.reported_at, s.name AS symptom_name, s.category
         FROM patient_symptoms ps
         JOIN symptoms s ON s.id = ps.symptom_id
         WHERE ps.patient_id = $1 AND ps.reported_at >= $2 AND ps.reported_at <= $3
         ORDER BY ps.reported_at DESC`,
        [patientId, startISO, endISO]
      ),
      query(
        `SELECT title, category, impact_level, event_date
         FROM life_events
         WHERE patient_id = $1 AND event_date >= $2 AND event_date <= $3
         ORDER BY event_date DESC`,
        [patientId, startDate_, endDate_]
      ),
      query(
        `SELECT title, status FROM goals
         WHERE patient_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [patientId]
      ),
      query(
        `SELECT type, score, severity, timestamp
         FROM assessment_results
         WHERE patient_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp DESC`,
        [patientId, startISO, endISO]
      ),
    ]);

  const logs = logsResult.status === 'fulfilled' ? logsResult.value.rows : [];
  const symptoms = symptomsResult.status === 'fulfilled' ? symptomsResult.value.rows : [];
  const events = eventsResult.status === 'fulfilled' ? eventsResult.value.rows : [];
  const goals = goalsResult.status === 'fulfilled' ? goalsResult.value.rows : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value.rows : [];

  // Calculate emotional averages
  const avgMood = logs.length
    ? parseFloat((logs.reduce((s, l) => s + l.mood_score, 0) / logs.length).toFixed(1))
    : null;
  const avgAnxiety = logs.length
    ? parseFloat((logs.reduce((s, l) => s + l.anxiety_score, 0) / logs.length).toFixed(1))
    : null;
  const avgEnergy = logs.length
    ? parseFloat((logs.reduce((s, l) => s + l.energy_score, 0) / logs.length).toFixed(1))
    : null;
  const sleepLogs = logs.filter((l) => l.sleep_hours);
  const avgSleep = sleepLogs.length
    ? parseFloat(
        (sleepLogs.reduce((s, l) => s + parseFloat(l.sleep_hours), 0) / sleepLogs.length).toFixed(1)
      )
    : null;

  // Mood trend
  let moodTrend = 'estável';
  if (logs.length >= 2) {
    const firstHalf = logs.slice(Math.floor(logs.length / 2));
    const secondHalf = logs.slice(0, Math.floor(logs.length / 2));
    const firstAvg = firstHalf.reduce((s, l) => s + l.mood_score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, l) => s + l.mood_score, 0) / secondHalf.length;
    moodTrend = secondAvg > firstAvg + 0.5 ? 'melhora' : secondAvg < firstAvg - 0.5 ? 'declínio' : 'estável';
  }

  const journalEntries = logs.filter((l) => l.journal_entry).map((l) => l.journal_entry);

  // Build summary data object
  const summaryData = {
    period: { start: startDate_, end: endDate_ },
    emotional: {
      log_count: logs.length,
      avg_mood: avgMood,
      avg_anxiety: avgAnxiety,
      avg_energy: avgEnergy,
      avg_sleep: avgSleep,
      mood_trend: moodTrend,
      journal_count: journalEntries.length,
    },
    symptoms: symptoms.map((s) => ({
      name: s.symptom_name,
      category: s.category,
      severity: s.severity,
      date: s.reported_at,
    })),
    life_events: events.map((e) => ({
      title: e.title,
      category: e.category,
      impact: e.impact_level,
      date: e.event_date,
    })),
    goals: {
      in_progress: goals.filter((g) => g.status === 'in_progress').map((g) => g.title),
      achieved: goals.filter((g) => g.status === 'achieved').map((g) => g.title),
    },
    assessments: assessments.map((a) => ({
      type: a.type,
      score: a.score,
      severity: a.severity,
      date: a.timestamp,
    })),
  };

  const summaryText = process.env.ANTHROPIC_API_KEY
    ? await generateWithClaude(summaryData)
    : generateManualSummary(summaryData);

  // Save to journal_summaries
  const saved = await query(
    `INSERT INTO journal_summaries (patient_id, summary_text, period_start, period_end)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [patientId, summaryText, startDate_, endDate_]
  );

  return {
    ...saved.rows[0],
    data: {
      log_count: logs.length,
      avg_mood: avgMood,
      avg_anxiety: avgAnxiety,
      avg_energy: avgEnergy,
      avg_sleep: avgSleep,
      mood_trend: moodTrend,
      journal_count: journalEntries.length,
    },
  };
}

async function generateWithClaude(data) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Você é um assistente clínico especializado em apoio a psicólogos. Abaixo estão os dados registrados pelo paciente no período ${data.period.start} a ${data.period.end}.

Sua tarefa é escrever uma interpretação clínica em texto corrido — prosa fluida, sem marcadores, sem listas, sem títulos em negrito, sem numeração. Escreva como um psicólogo escreveria uma nota de evolução.

Diretrizes:
- Cruze os dados: conecte eventos de vida, sintomas, padrão emocional e metas em uma narrativa coesa
- Se houve evento de vida relevante (ex: perda de emprego, conflito) e ao mesmo tempo humor caiu ou ansiedade aumentou, mencione essa possível relação em texto
- Se sintomas coincidem com quedas de humor ou eventos, interprete em prosa
- Inclua progresso nas metas de forma natural no texto
- Finalize com 1-2 pontos de atenção ou tópicos sugeridos para a próxima sessão, escritos como parte do texto

Formato obrigatório: apenas texto corrido em 3-4 parágrafos. Sem asteriscos, sem bullets, sem numeração, sem títulos. Linguagem clínica acessível, sem julgamentos morais, sem inventar dados.

DADOS DO PERÍODO:
${JSON.stringify(data, null, 2)}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0].text;
  } catch (err) {
    console.error('[SummaryService] Claude API error:', err.message);
    return generateManualSummary(data);
  }
}

function generateManualSummary(data) {
  const lines = [];
  const { emotional, symptoms, life_events, goals, assessments, period } = data;

  lines.push(`Resumo do período ${period.start} a ${period.end}:`);
  lines.push('');

  if (emotional.log_count > 0) {
    lines.push(`**Padrão emocional (${emotional.log_count} registros):**`);
    if (emotional.avg_mood !== null)
      lines.push(`Humor médio: ${emotional.avg_mood}/10 (${emotional.mood_trend})`);
    if (emotional.avg_anxiety !== null)
      lines.push(`Ansiedade média: ${emotional.avg_anxiety}/10`);
    if (emotional.avg_energy !== null)
      lines.push(`Energia média: ${emotional.avg_energy}/10`);
    if (emotional.avg_sleep !== null)
      lines.push(`Sono médio: ${emotional.avg_sleep}h`);
    if (emotional.avg_anxiety >= 7)
      lines.push('⚠️ Ansiedade elevada no período.');
    if (emotional.avg_mood <= 4)
      lines.push('⚠️ Humor consistentemente baixo.');
    if (emotional.avg_sleep !== null && emotional.avg_sleep < 6)
      lines.push('⚠️ Sono insuficiente (menos de 6h em média).');
    lines.push('');
  } else {
    lines.push('Nenhum check-in emocional registrado neste período.');
    lines.push('');
  }

  if (symptoms.length > 0) {
    lines.push(`**Sintomas relatados (${symptoms.length}):**`);
    symptoms.slice(0, 5).forEach((s) => {
      lines.push(`• ${s.name} — intensidade ${s.severity}/10`);
    });
    lines.push('');
  }

  if (life_events.length > 0) {
    lines.push(`**Eventos de vida (${life_events.length}):**`);
    life_events.slice(0, 3).forEach((e) => {
      lines.push(`• ${e.title} (impacto ${e.impact}/10)`);
    });
    lines.push('');
  }

  if (goals.in_progress.length > 0 || goals.achieved.length > 0) {
    lines.push(`**Metas:** ${goals.in_progress.length} em andamento · ${goals.achieved.length} concluídas`);
    lines.push('');
  }

  if (assessments.length > 0) {
    lines.push('**Avaliações no período:**');
    assessments.forEach((a) => {
      lines.push(`• ${a.type}: ${a.score} pontos (${a.severity})`);
    });
  }

  return lines.join('\n');
}

/**
 * Compile a professional brief for a patient.
 */
async function compileProfessionalBrief(patientId) {
  const [emotionalResult, medsResult, alertsResult, goalsResult] = await Promise.allSettled([
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
    query(
      `SELECT pm.id, m.name AS medication_name, pm.dosage, pm.frequency, pm.status
       FROM patient_medications pm
       JOIN medications m ON m.id = pm.medication_id
       WHERE pm.patient_id = $1 AND pm.status = 'active'`,
      [patientId]
    ),
    query(
      `SELECT id, alert_type, title, severity, created_at
       FROM alerts
       WHERE patient_id = $1 AND is_acknowledged = false
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
      [patientId]
    ),
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

module.exports = { generatePatientSummary, compileProfessionalBrief };
