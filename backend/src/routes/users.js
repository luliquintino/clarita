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

    const result = await query(
      `SELECT u.id, u.display_id, u.first_name, u.last_name, u.role, u.avatar_url,
              pp.specialization, pp.institution
       FROM users u
       LEFT JOIN professional_profiles pp ON pp.user_id = u.id
       WHERE u.display_id = $1 AND u.is_active = TRUE`,
      [display_id.toUpperCase().trim()],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
