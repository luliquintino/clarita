'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header (Bearer <token>),
 * verifies it, loads the user from the database and attaches it to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      return res.status(401).json({ error: 'Token inválido' });
    }

    const result = await query(
      'SELECT id, email, role, first_name, last_name, is_active, display_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
