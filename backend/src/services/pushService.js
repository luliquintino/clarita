'use strict';

const webpush = require('web-push');
const { query } = require('../config/database');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@clarita.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId, { title, body, url = '/patient-home', tag = 'clarita' }) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log(`[push] (dev) → user ${userId}: ${title} — ${body}`);
    return;
  }

  const result = await query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return;

  const subscription = result.rows[0].subscription;
  const payload = JSON.stringify({ title, body, url, tag });

  try {
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    if (err.statusCode === 410) {
      // Expired subscription — remove it
      await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    } else {
      console.error('[push] sendNotification error:', err.message);
    }
  }
}

module.exports = { sendPushToUser };
