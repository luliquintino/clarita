'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { handleValidation, isUUID } = require('../validators');

router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/invitations
// Send an invitation to connect (both patients and professionals can invite)
// ---------------------------------------------------------------------------

router.post('/', async (req, res, next) => {
  try {
    const { display_id, message } = req.body;

    if (!display_id) {
      return res.status(400).json({ error: 'display_id é obrigatório' });
    }

    // 1. Find target user by display_id
    const targetResult = await query(
      `SELECT id, role, display_id, first_name, last_name FROM users
       WHERE display_id = $1 AND is_active = TRUE`,
      [display_id.toUpperCase().trim()],
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado com este ID' });
    }

    const targetUser = targetResult.rows[0];
    const sender = req.user;

    // 2. Cannot invite yourself
    if (targetUser.id === sender.id) {
      return res.status(400).json({ error: 'Você não pode enviar um convite para si mesmo' });
    }

    // 3. Validate: one must be patient, other must be professional
    const senderIsPatient = sender.role === 'patient';
    const targetIsPatient = targetUser.role === 'patient';

    if (senderIsPatient === targetIsPatient) {
      return res.status(400).json({
        error: 'O convite deve ser entre um paciente e um profissional',
      });
    }

    const patientId = senderIsPatient ? sender.id : targetUser.id;
    const professionalId = senderIsPatient ? targetUser.id : sender.id;
    const professionalRole = senderIsPatient ? targetUser.role : sender.role;
    const relationshipType = professionalRole === 'psychiatrist' ? 'psychiatrist' : 'psychologist';

    // 4. Check existing active/pending relationship
    const existing = await query(
      `SELECT id, status FROM care_relationships
       WHERE patient_id = $1 AND professional_id = $2 AND status IN ('active', 'pending')`,
      [patientId, professionalId],
    );

    if (existing.rows.length > 0) {
      const status = existing.rows[0].status;
      const msg = status === 'active'
        ? 'Já existe um vínculo ativo com este usuário'
        : 'Já existe um convite pendente com este usuário';
      return res.status(409).json({ error: msg, status });
    }

    // 5. Check for existing inactive relationship (for reactivation)
    const inactive = await query(
      `SELECT id FROM care_relationships
       WHERE patient_id = $1 AND professional_id = $2 AND status = 'inactive'
       ORDER BY created_at DESC LIMIT 1`,
      [patientId, professionalId],
    );

    let result;

    if (inactive.rows.length > 0) {
      // Reactivate: update existing row to pending
      result = await query(
        `UPDATE care_relationships
         SET status = 'pending', invited_by = $2, invitation_message = $3,
             ended_at = NULL, responded_at = NULL, started_at = NULL
         WHERE id = $1
         RETURNING *`,
        [inactive.rows[0].id, sender.id, message || null],
      );
    } else {
      // New invitation
      result = await query(
        `INSERT INTO care_relationships
           (patient_id, professional_id, relationship_type, status, invited_by, invitation_message)
         VALUES ($1, $2, $3, 'pending', $4, $5)
         RETURNING *`,
        [patientId, professionalId, relationshipType, sender.id, message || null],
      );
    }

    // Return with user info for the response
    const invitation = result.rows[0];

    res.status(201).json({
      invitation: {
        ...invitation,
        other_first_name: targetUser.first_name,
        other_last_name: targetUser.last_name,
        other_role: targetUser.role,
        other_display_id: targetUser.display_id,
      },
      reactivation: inactive.rows.length > 0,
    });
  } catch (err) {
    // Handle unique constraint violation (race condition)
    if (err.code === '23505' && err.constraint?.includes('unique_active')) {
      return res.status(409).json({ error: 'Já existe um vínculo ativo ou pendente com este usuário' });
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/invitations/pending
// List pending invitations received by the current user
// ---------------------------------------------------------------------------

router.get('/pending', async (req, res, next) => {
  try {
    const isPatient = req.user.role === 'patient';
    const myColumn = isPatient ? 'cr.patient_id' : 'cr.professional_id';
    const otherJoin = isPatient ? 'cr.professional_id' : 'cr.patient_id';

    const result = await query(
      `SELECT cr.id, cr.patient_id, cr.professional_id, cr.relationship_type,
              cr.status, cr.invited_by, cr.invitation_message, cr.created_at,
              cr.responded_at,
              u.first_name AS other_first_name, u.last_name AS other_last_name,
              u.role AS other_role, u.display_id AS other_display_id, u.avatar_url AS other_avatar_url,
              pp.specialization, pp.institution
       FROM care_relationships cr
       JOIN users u ON u.id = ${otherJoin}
       LEFT JOIN professional_profiles pp ON pp.user_id = cr.professional_id
       WHERE ${myColumn} = $1 AND cr.status = 'pending' AND cr.invited_by != $1
       ORDER BY cr.created_at DESC`,
      [req.user.id],
    );

    res.json({ invitations: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/invitations/sent
// List pending invitations sent by the current user
// ---------------------------------------------------------------------------

router.get('/sent', async (req, res, next) => {
  try {
    const isPatient = req.user.role === 'patient';
    const otherJoin = isPatient ? 'cr.professional_id' : 'cr.patient_id';

    const result = await query(
      `SELECT cr.id, cr.patient_id, cr.professional_id, cr.relationship_type,
              cr.status, cr.invited_by, cr.invitation_message, cr.created_at,
              u.first_name AS other_first_name, u.last_name AS other_last_name,
              u.role AS other_role, u.display_id AS other_display_id, u.avatar_url AS other_avatar_url,
              pp.specialization, pp.institution
       FROM care_relationships cr
       JOIN users u ON u.id = ${otherJoin}
       LEFT JOIN professional_profiles pp ON pp.user_id = cr.professional_id
       WHERE cr.invited_by = $1 AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [req.user.id],
    );

    res.json({ invitations: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/invitations/:id/respond
// Accept or reject an invitation (only the recipient can respond)
// ---------------------------------------------------------------------------

router.put(
  '/:id/respond',
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { action } = req.body;

      if (!action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'action deve ser "accept" ou "reject"' });
      }

      // Find the invitation
      const invResult = await query(
        `SELECT * FROM care_relationships WHERE id = $1 AND status = 'pending'`,
        [id],
      );

      if (invResult.rows.length === 0) {
        return res.status(404).json({ error: 'Convite não encontrado ou já respondido' });
      }

      const invitation = invResult.rows[0];

      // The sender cannot respond to their own invitation
      if (invitation.invited_by === req.user.id) {
        return res.status(403).json({ error: 'Você não pode responder ao próprio convite' });
      }

      // Verify current user is part of this relationship
      if (req.user.id !== invitation.patient_id && req.user.id !== invitation.professional_id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      let result;

      if (action === 'accept') {
        result = await query(
          `UPDATE care_relationships
           SET status = 'active', started_at = NOW(), responded_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id],
        );
      } else {
        // reject
        result = await query(
          `UPDATE care_relationships
           SET status = 'inactive', ended_at = NOW(), responded_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id],
        );
      }

      res.json({ relationship: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/invitations/:id
// Cancel a sent invitation (only the sender can cancel)
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const invResult = await query(
        `SELECT * FROM care_relationships WHERE id = $1 AND status = 'pending'`,
        [id],
      );

      if (invResult.rows.length === 0) {
        return res.status(404).json({ error: 'Convite não encontrado ou já respondido' });
      }

      const invitation = invResult.rows[0];

      // Only the sender can cancel
      if (invitation.invited_by !== req.user.id) {
        return res.status(403).json({ error: 'Apenas quem enviou pode cancelar o convite' });
      }

      await query(
        `UPDATE care_relationships
         SET status = 'inactive', ended_at = NOW()
         WHERE id = $1`,
        [id],
      );

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
