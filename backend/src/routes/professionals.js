'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/professionals
// List professionals (available to all authenticated users)
// ---------------------------------------------------------------------------

router.get('/', async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let sql = `
      SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.avatar_url,
             pp.license_number, pp.specialization, pp.institution, pp.bio, pp.years_of_experience
      FROM users u
      JOIN professional_profiles pp ON pp.user_id = u.id
      WHERE u.role IN ('psychologist', 'psychiatrist')
        AND u.is_active = TRUE
    `;
    const params = [];
    let paramIdx = 1;

    if (role && ['psychologist', 'psychiatrist'].includes(role)) {
      sql += ` AND u.role = $${paramIdx}`;
      params.push(role);
      paramIdx++;
    }

    if (search) {
      sql += ` AND (u.first_name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx} OR pp.specialization ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Count
    const countParams = [...params];
    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, countParams);

    sql += ` ORDER BY u.last_name, u.first_name LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(lim, offset);

    const result = await query(sql, params);

    res.json({
      professionals: result.rows,
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
// GET /api/professionals/my-patients
// Get patients for the current professional
// ---------------------------------------------------------------------------

router.get('/my-patients', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.created_at,
              pp.date_of_birth, pp.gender, pp.onboarding_completed,
              cr.status AS relationship_status, cr.relationship_type, cr.started_at
       FROM care_relationships cr
       JOIN users u ON u.id = cr.patient_id
       LEFT JOIN patient_profiles pp ON pp.user_id = u.id
       WHERE cr.professional_id = $1
         AND cr.status = 'active'
         AND u.is_active = TRUE
       ORDER BY u.last_name, u.first_name`,
      [req.user.id]
    );

    res.json({ patients: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/professionals/:id
// Get professional detail
// ---------------------------------------------------------------------------

router.get('/:id', isUUID('id'), handleValidation, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.avatar_url, u.created_at,
              pp.license_number, pp.specialization, pp.institution, pp.bio, pp.years_of_experience
       FROM users u
       JOIN professional_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1 AND u.role IN ('psychologist', 'psychiatrist') AND u.is_active = TRUE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    res.json({ professional: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
