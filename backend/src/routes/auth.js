'use strict';

const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const {
  registrationValidator,
  loginValidator,
  forgotPasswordValidation,
  resetPasswordValidation,
  handleValidation,
} = require('../validators');
const { sendPasswordResetEmail } = require('../services/emailService');
const { generateDisplayId } = require('../utils/generateDisplayId');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

router.post('/register', registrationValidator, handleValidation, async (req, res, next) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      phone,
      // Professional fields
      license_number,
      specialization,
      institution,
      bio,
      years_of_experience,
      // Patient fields
      date_of_birth,
      gender,
    } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Professionals must provide license_number
    if ((role === 'psychologist' || role === 'psychiatrist') && !license_number) {
      return res.status(400).json({ error: 'Número de registro é obrigatório para profissionais' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate unique display ID
    const displayId = await generateDisplayId();

    // Insert user
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, display_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role, first_name, last_name, phone, display_id, created_at`,
      [email, passwordHash, role, first_name, last_name, phone || null, displayId]
    );

    const user = userResult.rows[0];

    // Create role-specific profile
    if (role === 'patient') {
      await query(
        `INSERT INTO patient_profiles (user_id, date_of_birth, gender)
         VALUES ($1, $2, $3)`,
        [user.id, date_of_birth || null, gender || null]
      );
    } else {
      await query(
        `INSERT INTO professional_profiles (user_id, license_number, specialization, institution, bio, years_of_experience)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          license_number,
          specialization || null,
          institution || null,
          bio || null,
          years_of_experience || null,
        ]
      );
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

router.post('/login', loginValidator, handleValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, email, password_hash, role, first_name, last_name, is_active, display_id
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    // Remove password_hash from response
    const { password_hash: _, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

router.get('/me', authenticate, async (req, res, next) => {
  try {
    let profile = null;

    if (req.user.role === 'patient') {
      const result = await query(`SELECT * FROM patient_profiles WHERE user_id = $1`, [
        req.user.id,
      ]);
      profile = result.rows[0] || null;
    } else {
      const result = await query(`SELECT * FROM professional_profiles WHERE user_id = $1`, [
        req.user.id,
      ]);
      profile = result.rows[0] || null;
    }

    res.json({ user: req.user, profile });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/auth/me
// ---------------------------------------------------------------------------

router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { first_name, last_name, phone, avatar_url } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${idx++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${idx++}`);
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, email, role, first_name, last_name, phone, avatar_url, updated_at`,
      values
    );

    // Update role-specific profile if fields are provided
    if (req.user.role === 'patient') {
      const { date_of_birth, gender, emergency_contact_name, emergency_contact_phone } = req.body;
      const profUpdates = [];
      const profValues = [];
      let profIdx = 1;

      if (date_of_birth !== undefined) {
        profUpdates.push(`date_of_birth = $${profIdx++}`);
        profValues.push(date_of_birth);
      }
      if (gender !== undefined) {
        profUpdates.push(`gender = $${profIdx++}`);
        profValues.push(gender);
      }
      if (emergency_contact_name !== undefined) {
        profUpdates.push(`emergency_contact_name = $${profIdx++}`);
        profValues.push(emergency_contact_name);
      }
      if (emergency_contact_phone !== undefined) {
        profUpdates.push(`emergency_contact_phone = $${profIdx++}`);
        profValues.push(emergency_contact_phone);
      }

      if (profUpdates.length > 0) {
        profValues.push(req.user.id);
        await query(
          `UPDATE patient_profiles SET ${profUpdates.join(', ')} WHERE user_id = $${profIdx}`,
          profValues
        );
      }
    } else {
      const { specialization, institution, bio, years_of_experience } = req.body;
      const profUpdates = [];
      const profValues = [];
      let profIdx = 1;

      if (specialization !== undefined) {
        profUpdates.push(`specialization = $${profIdx++}`);
        profValues.push(specialization);
      }
      if (institution !== undefined) {
        profUpdates.push(`institution = $${profIdx++}`);
        profValues.push(institution);
      }
      if (bio !== undefined) {
        profUpdates.push(`bio = $${profIdx++}`);
        profValues.push(bio);
      }
      if (years_of_experience !== undefined) {
        profUpdates.push(`years_of_experience = $${profIdx++}`);
        profValues.push(years_of_experience);
      }

      if (profUpdates.length > 0) {
        profValues.push(req.user.id);
        await query(
          `UPDATE professional_profiles SET ${profUpdates.join(', ')} WHERE user_id = $${profIdx}`,
          profValues
        );
      }
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

router.post(
  '/forgot-password',
  forgotPasswordValidation,
  handleValidation,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      // Always return the same response to avoid revealing whether email exists
      const successMessage =
        'Se este email estiver cadastrado, você receberá um link para redefinir sua senha';

      const result = await query('SELECT id, first_name FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.json({ message: successMessage });
      }

      const user = result.rows[0];

      // Generate a secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token and expiry in the database
      await query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [
        resetToken,
        resetTokenExpires,
        user.id,
      ]);

      // Send the reset email
      await sendPasswordResetEmail(email, resetToken, user.first_name);

      res.json({ message: successMessage });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

router.post(
  '/reset-password',
  resetPasswordValidation,
  handleValidation,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Find user with valid (non-expired) reset token
      const result = await query(
        `SELECT id FROM users
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      const user = result.rows[0];

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update password and clear reset token fields
      await query(
        `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
        [passwordHash, user.id]
      );

      res.json({ message: 'Senha redefinida com sucesso' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
