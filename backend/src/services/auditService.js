'use strict';

const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists at startup
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function logFileName() {
  const now = new Date();
  return path.join(
    LOG_DIR,
    `audit-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.jsonl`
  );
}

/**
 * Record an audit event to DB (non-blocking) and JSONL file (sync).
 *
 * @param {object} req     - Express request object
 * @param {string} action  - e.g. 'auth.login', 'exam.download'
 * @param {string} [resourceType]
 * @param {string} [resourceId]  - UUID
 * @param {object} [metadata]
 */
async function audit(req, action, resourceType = null, resourceId = null, metadata = {}) {
  const userId = req.user?.id ?? null;
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null;
  const userAgent = req.headers['user-agent'] ?? null;

  const entry = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: ip,
    user_agent: userAgent,
    metadata,
    created_at: new Date().toISOString(),
  };

  // DB write — fire and forget
  query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5::inet, $6, $7)`,
    [userId, action, resourceType, resourceId, ip, userAgent, JSON.stringify(metadata)]
  ).catch(err => console.error('[audit] DB write failed:', err.message));

  // JSONL file write — sync append
  try {
    fs.appendFileSync(logFileName(), JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error('[audit] File write failed:', err.message);
  }
}

/**
 * Delete audit_log entries older than 90 days.
 * Called by weekly cron in index.js.
 */
async function pruneOldLogs() {
  const result = await query(
    `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'`
  );
  console.log(`[audit] Pruned ${result.rowCount} old log entries`);
}

module.exports = { audit, pruneOldLogs };
