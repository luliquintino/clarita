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
             cr.status AS relationship_status, cr.relationship_type, cr.started_at,
             last_log.last_check_in,
             last_log.last_mood_score,
             last_log.last_anxiety_score,
             mood_trend.trend AS mood_trend,
             COALESCE(alert_count.active_alerts, 0) AS active_alerts
      FROM care_relationships cr
      JOIN users u ON u.id = cr.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT logged_at AS last_check_in, mood_score AS last_mood_score, anxiety_score AS last_anxiety_score
        FROM emotional_logs
        WHERE patient_id = u.id
        ORDER BY logged_at DESC
        LIMIT 1
      ) last_log ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(mood_score ORDER BY logged_at ASC) AS trend
        FROM (
          SELECT mood_score, logged_at
          FROM emotional_logs
          WHERE patient_id = u.id
          ORDER BY logged_at DESC
          LIMIT 10
        ) recent
      ) mood_trend ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS active_alerts
        FROM alerts
        WHERE patient_id = u.id AND is_acknowledged = FALSE
      ) alert_count ON TRUE
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
              pp.onboarding_completed, pp.onboarding_data,
              pp.self_reported_conditions, pp.psychiatrist_suspicions, pp.psychologist_suspicions
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'patient' AND u.is_active = TRUE`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const patient = result.rows[0];
      const role = req.user.role;

      // Build role-filtered response
      const selfReported = patient.self_reported_conditions || [];

      let suspicions = [];
      if (role === 'psychiatrist') {
        const ownSuspicions = (patient.psychiatrist_suspicions || []).map((label) => ({
          label,
          added_by: 'psychiatrist',
        }));
        const psychSuspicions = (patient.psychologist_suspicions || []).map((label) => ({
          label,
          added_by: 'psychologist',
        }));
        suspicions = [...ownSuspicions, ...psychSuspicions];
      } else if (role === 'psychologist') {
        const ownSuspicions = (patient.psychologist_suspicions || []).map((label) => ({
          label,
          added_by: 'psychologist',
        }));
        const psySuspicions = (patient.psychiatrist_suspicions || []).map((label) => ({
          label,
          added_by: 'psychiatrist',
        }));
        suspicions = [...psySuspicions, ...ownSuspicions];
      }
      // patients get no suspicions

      // Remove raw columns from response
      const { psychiatrist_suspicions, psychologist_suspicions, ...patientBase } = patient;

      res.json({
        patient: {
          ...patientBase,
          self_reported_conditions: selfReported,
          suspicions,
        },
      });
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

// ---------------------------------------------------------------------------
// PATCH /api/patients/:id/conditions
// Add or remove a condition/suspicion based on caller role
// ---------------------------------------------------------------------------

router.patch(
  '/:id/conditions',
  isUUID('id'),
  handleValidation,
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const role = req.user.role;
      const { action, value } = req.body;

      if (!['add', 'remove'].includes(action)) {
        return res.status(400).json({ error: 'action must be "add" or "remove"' });
      }
      if (!value || typeof value !== 'string' || value.trim() === '') {
        return res.status(400).json({ error: 'value is required' });
      }

      // Map role to column
      const columnMap = {
        patient: 'self_reported_conditions',
        psychiatrist: 'psychiatrist_suspicions',
        psychologist: 'psychologist_suspicions',
      };

      const column = columnMap[role];
      if (!column) {
        return res.status(403).json({ error: 'Role não autorizado a gerenciar condições' });
      }

      // Patient can only edit their own record
      if (role === 'patient' && req.user.id !== patientId) {
        return res.status(403).json({ error: 'Paciente só pode editar as próprias condições' });
      }

      let sql;
      let params;

      if (action === 'add') {
        // Append value if not already present
        sql = `
          UPDATE patient_profiles
          SET ${column} = CASE
            WHEN ${column} @> $2::jsonb THEN ${column}
            ELSE ${column} || $2::jsonb
          END
          WHERE user_id = $1
          RETURNING ${column}
        `;
        params = [patientId, JSON.stringify([value.trim()])];
      } else {
        // Remove the value from array
        sql = `
          UPDATE patient_profiles
          SET ${column} = (
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements_text(${column}) elem
            WHERE elem != $2
          )
          WHERE user_id = $1
          RETURNING ${column}
        `;
        params = [patientId, value.trim()];
      }

      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Perfil do paciente não encontrado' });
      }

      // Coerce null (when last element removed) to empty array
      const updated = result.rows[0][column] || [];

      res.json({ [column]: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/patients/:id/diagnoses
// Register a formal diagnosis for a patient (professionals only)
// ---------------------------------------------------------------------------
router.post(
  '/:id/diagnoses',
  requireRole('psychologist', 'psychiatrist'),
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const { icd_code, icd_name, certainty = 'suspected', diagnosis_date, notes } = req.body;

      if (!icd_code || !icd_name) {
        return res.status(400).json({ error: 'icd_code e icd_name são obrigatórios' });
      }
      if (!['suspected', 'confirmed'].includes(certainty)) {
        return res.status(400).json({ error: 'certainty deve ser suspected ou confirmed' });
      }

      const result = await query(
        `INSERT INTO patient_diagnoses
           (patient_id, professional_id, icd_code, icd_name, certainty, diagnosis_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          patientId,
          req.user.id,
          icd_code,
          icd_name,
          certainty,
          diagnosis_date || new Date().toISOString().split('T')[0],
          notes || null,
        ]
      );

      res.status(201).json({ diagnosis: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/patients/:id/diagnoses
// List all diagnoses for a patient
// Filtering by role: patients only see confirmed; professionals see all
// ---------------------------------------------------------------------------
router.get(
  '/:id/diagnoses',
  requirePatientAccess(),
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const role = req.user.role;

      let sql = `
        SELECT pd.*,
               u.first_name AS professional_first_name,
               u.last_name AS professional_last_name,
               u.role AS professional_role,
               cn.title AS clinical_note_title
        FROM patient_diagnoses pd
        JOIN users u ON u.id = pd.professional_id
        LEFT JOIN clinical_notes cn ON cn.id = pd.clinical_note_id
        WHERE pd.patient_id = $1 AND pd.is_active = true
      `;
      const params = [patientId];

      if (role === 'patient') {
        sql += ` AND pd.certainty = 'confirmed'`;
      }

      sql += ` ORDER BY pd.diagnosis_date DESC, pd.created_at DESC`;

      const result = await query(sql, params);
      res.json({ diagnoses: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/patients/:id/diagnoses/:diagId
// Update a diagnosis — only the professional who created it
// ---------------------------------------------------------------------------
router.patch(
  '/:id/diagnoses/:diagId',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { diagId } = req.params;
      const { certainty, notes, clinical_note_id, is_active } = req.body;

      const existing = await query(
        `SELECT * FROM patient_diagnoses WHERE id = $1`,
        [diagId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Diagnóstico não encontrado' });
      }
      if (existing.rows[0].professional_id !== req.user.id) {
        return res.status(403).json({ error: 'Somente o profissional que criou pode editar' });
      }

      const updates = [];
      const params = [];

      if (certainty !== undefined) {
        if (!['suspected', 'confirmed'].includes(certainty)) {
          return res.status(400).json({ error: 'certainty deve ser suspected ou confirmed' });
        }
        params.push(certainty);
        updates.push(`certainty = $${params.length}`);
      }
      if (notes !== undefined) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }
      if (clinical_note_id !== undefined) {
        params.push(clinical_note_id);
        updates.push(`clinical_note_id = $${params.length}`);
      }
      if (is_active !== undefined) {
        params.push(is_active);
        updates.push(`is_active = $${params.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      params.push(diagId);
      const result = await query(
        `UPDATE patient_diagnoses SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );

      res.json({ diagnosis: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
