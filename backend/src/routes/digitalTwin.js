'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { buildTwinObject } = require('../services/digitalTwinCompute');

router.use(authenticate);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ---------------------------------------------------------------------------
// Helper: fetch all data needed to build twin
// ---------------------------------------------------------------------------

async function fetchTwinData(patientId) {
  const [logsResult, assessmentResult, psychResult, diagnosisResult] = await Promise.all([
    query(
      `SELECT timestamp, mood, anxiety, energy, sleep_quality, sleep_hours, med_adherence
       FROM emotional_logs
       WHERE patient_id = $1 AND timestamp >= NOW() - INTERVAL '90 days'
       ORDER BY timestamp ASC`,
      [patientId]
    ),
    query(
      `SELECT ar.total_score, ar.severity_level, ar.completed_at, a.name AS instrument
       FROM assessment_results ar
       JOIN assessments a ON a.id = ar.assessment_id
       WHERE ar.patient_id = $1
       ORDER BY ar.completed_at DESC`,
      [patientId]
    ),
    query(
      `SELECT pts.total_score,
              NULL AS severity_level,
              pts.completed_at,
              pt.name AS instrument
       FROM patient_test_sessions pts
       JOIN psychological_tests pt ON pt.id = pts.test_id
       WHERE pts.patient_id = $1 AND pts.status = 'completed'
       ORDER BY pts.completed_at DESC`,
      [patientId]
    ),
    query(
      `SELECT icd_code, icd_name, certainty
       FROM patient_diagnoses
       WHERE patient_id = $1 AND is_active = true
       ORDER BY diagnosis_date DESC`,
      [patientId]
    ),
  ]);

  const testResults = [
    ...assessmentResult.rows,
    ...psychResult.rows.map((r) => ({
      ...r,
      total_score: r.total_score != null ? parseFloat(r.total_score) : 0,
    })),
  ].filter((r) => r.total_score != null && !isNaN(r.total_score));

  return {
    logs: logsResult.rows,
    testResults,
    diagnoses: diagnosisResult.rows,
  };
}

// ---------------------------------------------------------------------------
// Helper: save twin to digital_twin_states
// ---------------------------------------------------------------------------

async function saveTwin(patientId, twin) {
  await query(
    `INSERT INTO digital_twin_states
       (patient_id, current_state, correlations, baseline, predictions,
        treatment_responses, data_points_used, model_version, confidence_overall, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      patientId,
      JSON.stringify(twin.current_state),
      JSON.stringify({
        correlations: twin.correlations,
        clinical_score: twin.clinical_score,
        overall_trend: twin.overall_trend,
        diagnoses: twin.diagnoses,
        test_results_summary: twin.test_results_summary,
      }),
      JSON.stringify({}),
      JSON.stringify(twin.predictions),
      JSON.stringify([]),
      twin.data_points_used,
      twin.model_version,
      twin.confidence_overall,
      twin.computed_at,
    ]
  );
}

// ---------------------------------------------------------------------------
// GET /api/digital-twin/:patientId
// ---------------------------------------------------------------------------

router.get(
  '/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      // Check cache
      const cached = await query(
        `SELECT * FROM digital_twin_states
         WHERE patient_id = $1
         ORDER BY computed_at DESC LIMIT 1`,
        [patientId]
      );

      const cacheHit =
        cached.rows.length > 0 &&
        Date.now() - new Date(cached.rows[0].computed_at).getTime() < CACHE_TTL_MS;

      if (cacheHit) {
        const row = cached.rows[0];
        const extra = row.correlations || {};
        return res.json({
          ...row,
          clinical_score: extra.clinical_score ?? null,
          overall_trend: extra.overall_trend ?? 'stable',
          diagnoses: extra.diagnoses ?? [],
          test_results_summary: extra.test_results_summary ?? [],
        });
      }

      // Compute on-demand
      const { logs, testResults, diagnoses } = await fetchTwinData(patientId);
      const twin = buildTwinObject(patientId, logs, testResults, diagnoses);

      if (!twin) {
        return res.status(404).json({
          error: 'Dados insuficientes para o gêmeo digital. O paciente precisa de ao menos 3 check-ins.',
        });
      }

      await saveTwin(patientId, twin);
      return res.json(twin);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/digital-twin/:patientId/refresh
// ---------------------------------------------------------------------------

router.post(
  '/:patientId/refresh',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { logs, testResults, diagnoses } = await fetchTwinData(patientId);
      const twin = buildTwinObject(patientId, logs, testResults, diagnoses);

      if (!twin) {
        return res.status(404).json({
          error: 'Dados insuficientes para o gêmeo digital.',
        });
      }

      await saveTwin(patientId, twin);
      return res.json({ twin });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/digital-twin/:patientId/history
// ---------------------------------------------------------------------------

router.get(
  '/:patientId/history',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  requirePatientAccess('digital_twin'),
  async (req, res, next) => {
    try {
      const days = parseInt(req.query.days, 10) || 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const result = await query(
        `SELECT * FROM digital_twin_states
         WHERE patient_id = $1 AND computed_at >= $2
         ORDER BY computed_at ASC`,
        [req.params.patientId, since]
      );
      res.json({ history: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
