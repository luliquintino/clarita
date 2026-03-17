'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/users/search?display_id=CLA-XXXXXX
// Search for a user by display_id (returns basic info, no sensitive data)
// ---------------------------------------------------------------------------

router.get('/search', async (req, res, next) => {
  try {
    const { display_id } = req.query;

    if (!display_id) {
      return res.status(400).json({ error: 'display_id é obrigatório' });
    }

    // Normalize: accept with or without hyphen (e.g. "CLABA5A3" → "CLA-BA5A3")
    let normalizedId = display_id.toUpperCase().trim();
    if (/^CLA[0-9A-F]{5,8}$/i.test(normalizedId)) {
      normalizedId = 'CLA-' + normalizedId.slice(3);
    }

    const result = await query(
      `SELECT u.id, u.display_id, u.first_name, u.last_name, u.role, u.avatar_url,
              pp.specialization, pp.institution
       FROM users u
       LEFT JOIN professional_profiles pp ON pp.user_id = u.id
       WHERE u.display_id = $1 AND u.is_active = TRUE`,
      [normalizedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/search-professionals?q=...
// Search professionals by name or display_id — never returns patients
// ---------------------------------------------------------------------------

router.get('/search-professionals', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const term = q.trim();

    // Normalize display_id queries (e.g. "CLABA5A3" → "CLA-BA5A3")
    let normalizedId = term.toUpperCase();
    if (/^CLA[0-9A-F]{5,8}$/i.test(normalizedId)) {
      normalizedId = 'CLA-' + normalizedId.slice(3);
    }

    const result = await query(
      `SELECT u.id, u.display_id, u.first_name, u.last_name, u.role, u.avatar_url,
              pp.specialization, pp.institution
       FROM users u
       LEFT JOIN professional_profiles pp ON pp.user_id = u.id
       WHERE u.role != 'patient'
         AND u.is_active = TRUE
         AND u.id != $3
         AND (
           u.display_id ILIKE $1
           OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $2
           OR u.first_name ILIKE $2
           OR u.last_name ILIKE $2
         )
       ORDER BY u.first_name, u.last_name
       LIMIT 10`,
      [`${normalizedId}%`, `%${term}%`, req.user.id]
    );

    res.json({ professionals: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
