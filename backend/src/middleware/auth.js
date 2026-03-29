'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * JWT authentication middleware.
 * Reads token from httpOnly cookie first, falls back to Authorization header
 * for API/mobile clients that can't use cookies.
 */
async function authenticate(req, res, next) {
  try {
    // Prefer httpOnly cookie; fall back to Authorization header
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

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
