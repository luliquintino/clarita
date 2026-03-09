'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requirePatientAccess } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/patients
// List patients for the authenticated professional (filtered by care relationships)
// ---------------------------------------------------------------------------

router.get('/', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.display_id, u.created_at,
             pp.date_of_birth, pp.gender, pp.onboarding_completed,
             cr.status AS relationship_status, cr.relationship_type, cr.started_at
      FROM care_relationships cr
      JOIN users u ON u.id = cr.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      WHERE cr.professional_id = $1
        AND cr.status = 'active'
        AND u.is_active = TRUE
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (search) {
      sql += ` AND (u.first_name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Count
    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);

    sql += ` ORDER BY u.last_name, u.first_name LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      patients: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: lim,
        total: parseInt(countResult.rows[0].count, 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/patients/revoke-access
// Patient revokes a professional's access (soft — data never deleted)
// ---------------------------------------------------------------------------

router.put('/revoke-access', requireRole('patient'), async (req, res, next) => {
  try {
    const { professional_id } = req.body;
    const patientId = req.user.id;

    if (!professional_id) {
      return res.status(400).json({ error: 'professional_id é obrigatório' });
    }

    const result = await query(
      `UPDATE care_relationships
       SET status = 'inactive', ended_at = NOW()
       WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'
       RETURNING *`,
      [patientId, professional_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vínculo ativo não encontrado' });
    }

    // data_permissions are NOT deleted — they persist for history restoration
    res.json({ relationship: result.rows[0], message: 'Acesso revogado com sucesso' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/patients/my-professionals
// Patient gets their linked professionals
// ---------------------------------------------------------------------------

router.get('/my-professionals', requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.avatar_url, u.display_id,
              pp.specialization, pp.institution, pp.license_number,
              cr.relationship_type, cr.started_at
       FROM care_relationships cr
       JOIN users u ON u.id = cr.professional_id
       LEFT JOIN professional_profiles pp ON pp.user_id = u.id
       WHERE cr.patient_id = $1
         AND cr.status = 'active'
         AND u.is_active = TRUE
       ORDER BY u.last_name, u.first_name`,
      [req.user.id]
    );

    // Also get permissions for each professional
    const permResult = await query(`SELECT * FROM data_permissions WHERE patient_id = $1`, [
      req.user.id,
    ]);

    const permsByProfessional = {};
    for (const perm of permResult.rows) {
      if (!permsByProfessional[perm.professional_id]) {
        permsByProfessional[perm.professional_id] = [];
      }
      permsByProfessional[perm.professional_id].push(perm);
    }

    const professionals = result.rows.map((p) => ({
      ...p,
      permissions: permsByProfessional[p.id] || [],
    }));

    res.json({ professionals });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/patients/:id
// Get patient detail with profile
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  isUUID('id'),
  handleValidation,
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.avatar_url, u.created_at,
              pp.date_of_birth, pp.gender, pp.emergency_contact_name, pp.emergency_contact_phone,
              pp.onboarding_completed, pp.onboarding_data
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'patient' AND u.is_active = TRUE`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      res.json({ patient: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/patients/:id/timeline
// Unified timeline: emotional logs + life events + medication changes + symptoms + assessments
// ---------------------------------------------------------------------------

router.get(
  '/:id/timeline',
  isUUID('id'),
  handleValidation,
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const { start_date, end_date, limit = 50 } = req.query;
      const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));

      let dateFilter = '';
      const params = [patientId];
      let paramIdx = 2;

      if (start_date) {
        dateFilter += ` AND event_date >= $${paramIdx}`;
        params.push(start_date);
        paramIdx++;
      }
      if (end_date) {
        dateFilter += ` AND event_date <= $${paramIdx}`;
        params.push(end_date);
        paramIdx++;
      }

      params.push(lim);

      const sql = `
      SELECT * FROM (
        -- Emotional logs
        SELECT
          'emotional_log' AS event_type,
          el.id,
          el.logged_at AS event_date,
          json_build_object(
            'mood_score', el.mood_score,
            'anxiety_score', el.anxiety_score,
            'energy_score', el.energy_score,
            'sleep_quality', el.sleep_quality,
            'notes', el.notes
          ) AS data
        FROM emotional_logs el
        WHERE el.patient_id = $1

        UNION ALL

        -- Life events
        SELECT
          'life_event' AS event_type,
          le.id,
          le.event_date::timestamptz AS event_date,
          json_build_object(
            'title', le.title,
            'description', le.description,
            'category', le.category,
            'impact_level', le.impact_level
          ) AS data
        FROM life_events le
        WHERE le.patient_id = $1

        UNION ALL

        -- Patient medications (changes)
        SELECT
          'medication_change' AS event_type,
          pm.id,
          pm.created_at AS event_date,
          json_build_object(
            'medication_name', m.name,
            'dosage', pm.dosage,
            'frequency', pm.frequency,
            'status', pm.status
          ) AS data
        FROM patient_medications pm
        JOIN medications m ON m.id = pm.medication_id
        WHERE pm.patient_id = $1

        UNION ALL

        -- Patient symptoms
        SELECT
          'symptom_report' AS event_type,
          ps.id,
          ps.reported_at AS event_date,
          json_build_object(
            'symptom_name', s.name,
            'severity', ps.severity,
            'notes', ps.notes
          ) AS data
        FROM patient_symptoms ps
        JOIN symptoms s ON s.id = ps.symptom_id
        WHERE ps.patient_id = $1

        UNION ALL

        -- Assessment results
        SELECT
          'assessment' AS event_type,
          ar.id,
          ar.completed_at AS event_date,
          json_build_object(
            'assessment_name', a.name,
            'total_score', ar.total_score,
            'severity_level', ar.severity_level
          ) AS data
        FROM assessment_results ar
        JOIN assessments a ON a.id = ar.assessment_id
        WHERE ar.patient_id = $1

      ) AS timeline
      WHERE 1=1 ${dateFilter}
      ORDER BY event_date DESC
      LIMIT $${paramIdx}
    `;

      const result = await query(sql, params);

      res.json({ timeline: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/patients/:id/connect
// DEPRECATED: Use POST /api/invitations instead
// ---------------------------------------------------------------------------

router.post(
  '/:id/connect',
  isUUID('id'),
  handleValidation,
  requireRole('psychologist', 'psychiatrist'),
  async (_req, res) => {
    res.status(410).json({
      error: 'Este endpoint foi descontinuado. Use POST /api/invitations para enviar convites.',
    });
  }
);

// ---------------------------------------------------------------------------
// PUT /api/patients/:id/permissions
// Update data permissions (patient only - for their own data)
// ---------------------------------------------------------------------------

router.put('/:id/permissions', isUUID('id'), handleValidation, async (req, res, next) => {
  try {
    const patientId = req.params.id;

    // Only the patient themselves can update their permissions
    if (req.user.role !== 'patient' || req.user.id !== patientId) {
      return res
        .status(403)
        .json({ error: 'Apenas o paciente pode atualizar suas próprias permissões' });
    }

    const { professional_id, permissions } = req.body;
    // permissions: [{ permission_type: 'emotional_logs', granted: true }, ...]

    if (!professional_id || !Array.isArray(permissions)) {
      return res
        .status(400)
        .json({ error: 'professional_id e array de permissões são obrigatórios' });
    }

    // Verify care relationship exists
    const relResult = await query(
      `SELECT id FROM care_relationships
       WHERE patient_id = $1 AND professional_id = $2 AND status IN ('active', 'pending')`,
      [patientId, professional_id]
    );

    if (relResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Nenhum vínculo de cuidado encontrado com este profissional' });
    }

    const updatedPermissions = [];

    for (const perm of permissions) {
      const { permission_type, granted } = perm;

      const result = await query(
        `INSERT INTO data_permissions (patient_id, professional_id, permission_type, granted)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (patient_id, professional_id, permission_type)
         DO UPDATE SET granted = $4
         RETURNING *`,
        [patientId, professional_id, permission_type, granted]
      );

      updatedPermissions.push(result.rows[0]);
    }

    res.json({ permissions: updatedPermissions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
