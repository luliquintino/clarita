'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/onboarding
// Returns current onboarding data for the authenticated patient
// ---------------------------------------------------------------------------
router.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pp.onboarding_completed, pp.onboarding_data,
              pp.date_of_birth, pp.gender,
              pp.emergency_contact_name, pp.emergency_contact_phone,
              u.phone
       FROM patient_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        profile: {
          onboarding_completed: false,
          onboarding_data: {},
          date_of_birth: null,
          gender: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          phone: null,
        },
      });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/onboarding
// Save full onboarding form and mark as completed
// ---------------------------------------------------------------------------
router.put('/', requireRole('patient'), async (req, res, next) => {
  try {
    const {
      personal,
      physical,
      gynecological,
      medical,
      family_history,
      current_treatments,
      date_of_birth,
      gender,
      full_name,
      email,
      phone,
      emergency_contact_name,
      emergency_contact_phone,
    } = req.body;

    // Build the JSONB onboarding_data
    const onboardingData = {
      personal: personal || {},
      physical: physical || {},
      gynecological: gynecological || {},
      medical: medical || {},
      family_history: family_history || '',
      current_treatments: current_treatments || '',
    };

    // Update patient_profiles
    await query(
      `UPDATE patient_profiles
       SET onboarding_completed = true,
           onboarding_data = $1,
           date_of_birth = $2,
           gender = $3,
           emergency_contact_name = $4,
           emergency_contact_phone = $5,
           updated_at = NOW()
       WHERE user_id = $6`,
      [
        JSON.stringify(onboardingData),
        date_of_birth || null,
        gender || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        req.user.id,
      ]
    );

    // Update user data on users table (phone, name, email)
    const userUpdates = [];
    const userValues = [];
    let paramIndex = 1;

    if (phone !== undefined) {
      userUpdates.push(`phone = $${paramIndex++}`);
      userValues.push(phone);
    }
    if (full_name) {
      const nameParts = full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      userUpdates.push(`first_name = $${paramIndex++}`);
      userValues.push(firstName);
      userUpdates.push(`last_name = $${paramIndex++}`);
      userValues.push(lastName);
    }
    if (email) {
      userUpdates.push(`email = $${paramIndex++}`);
      userValues.push(email);
    }

    if (userUpdates.length > 0) {
      userValues.push(req.user.id);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramIndex}`,
        userValues
      );
    }

    // Return updated profile
    const result = await query(
      `SELECT pp.onboarding_completed, pp.onboarding_data,
              pp.date_of_birth, pp.gender,
              pp.emergency_contact_name, pp.emergency_contact_phone,
              u.phone
       FROM patient_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.user_id = $1`,
      [req.user.id]
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
