'use strict';

const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

// GET /api/push/vapid-public-key — no auth required (public key is public)
router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// All routes below require authentication
router.use(authenticate);

// POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Subscription inválida.' });

    await query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET subscription = $2`,
      [req.user.id, JSON.stringify(subscription)]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    await query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
