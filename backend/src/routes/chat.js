'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const { body } = require('express-validator');

// All routes require authentication & professional role
router.use(authenticate);
router.use(requireRole('psychologist', 'psychiatrist'));

// ---------------------------------------------------------------------------
// GET /api/chat/conversations
// List conversations for the authenticated professional
// ---------------------------------------------------------------------------

router.get('/conversations', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        c.id,
        c.patient_id,
        p_user.first_name AS patient_first_name,
        p_user.last_name AS patient_last_name,
        -- The other participant
        other.user_id AS other_user_id,
        other_user.first_name AS other_first_name,
        other_user.last_name AS other_last_name,
        other_user.role AS other_role,
        -- Last message
        last_msg.content AS last_message,
        last_msg.created_at AS last_message_at,
        last_msg.sender_id AS last_message_sender_id,
        -- Unread count
        COALESCE(unread.count, 0)::int AS unread_count,
        c.created_at
      FROM conversations c
      JOIN conversation_participants my_part ON my_part.conversation_id = c.id AND my_part.user_id = $1
      JOIN conversation_participants other ON other.conversation_id = c.id AND other.user_id != $1
      JOIN users other_user ON other_user.id = other.user_id
      JOIN users p_user ON p_user.id = c.patient_id
      LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id FROM messages
        WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      ) last_msg ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count FROM messages
        WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL
      ) unread ON true
      ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC`,
      [req.user.id]
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat/conversations
// Create or get existing conversation between 2 professionals about a patient
// ---------------------------------------------------------------------------

router.post(
  '/conversations',
  [
    body('other_user_id').isUUID().withMessage('other_user_id is required'),
    body('patient_id').isUUID().withMessage('patient_id is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { other_user_id, patient_id } = req.body;

      // Check both professionals have access to the patient
      const access = await query(
        `SELECT professional_id FROM care_relationships
         WHERE patient_id = $1 AND professional_id IN ($2, $3) AND status = 'active'`,
        [patient_id, req.user.id, other_user_id]
      );
      if (access.rows.length < 2) {
        return res.status(403).json({ error: 'Ambos profissionais devem ter acesso ao paciente' });
      }

      // Check if conversation already exists
      const existing = await query(
        `SELECT c.id FROM conversations c
         JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
         JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
         WHERE c.patient_id = $3
         LIMIT 1`,
        [req.user.id, other_user_id, patient_id]
      );

      if (existing.rows.length > 0) {
        return res.json({ conversation: { id: existing.rows[0].id, existing: true } });
      }

      // Create new conversation
      const conv = await query(`INSERT INTO conversations (patient_id) VALUES ($1) RETURNING *`, [
        patient_id,
      ]);
      const convId = conv.rows[0].id;

      // Add participants
      await query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [convId, req.user.id, other_user_id]
      );

      res.status(201).json({ conversation: { id: convId, existing: false } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/chat/conversations/:id/messages
// Get messages for a conversation (with pagination)
// ---------------------------------------------------------------------------

router.get(
  '/conversations/:id/messages',
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * lim;

      // Verify participation
      const participant = await query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
      if (participant.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a esta conversa' });
      }

      const result = await query(
        `SELECT m.*, u.first_name AS sender_first_name, u.last_name AS sender_last_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC
         LIMIT $2 OFFSET $3`,
        [id, lim, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM messages WHERE conversation_id = $1`,
        [id]
      );

      res.json({
        messages: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: lim,
          total: countResult.rows[0].total,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/messages
// Send a message
// ---------------------------------------------------------------------------

router.post(
  '/conversations/:id/messages',
  isUUID('id'),
  [body('content').isString().isLength({ min: 1, max: 10000 }).withMessage('Content is required')],
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Verify participation
      const participant = await query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
      if (participant.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a esta conversa' });
      }

      const result = await query(
        `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [id, req.user.id, content]
      );

      res.status(201).json({ message: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/chat/conversations/:id/read
// Mark messages as read
// ---------------------------------------------------------------------------

router.put('/conversations/:id/read', isUUID('id'), handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Mark all unread messages from others as read
    await query(
      `UPDATE messages SET read_at = NOW()
         WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [id, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/unread-count
// Get total unread message count for the authenticated professional
// ---------------------------------------------------------------------------

router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
       WHERE m.sender_id != $1 AND m.read_at IS NULL`,
      [req.user.id]
    );

    res.json({ unread_count: result.rows[0].unread_count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
