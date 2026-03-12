'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

/**
 * Generate a secure access token for QR-based record sharing.
 * Token expires in 20 days.
 */
async function generateAccessToken(professionalId, patientId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 20);

  const result = await query(
    `INSERT INTO record_access_tokens (granting_professional_id, patient_id, token, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [professionalId, patientId, token, expiresAt]
  );

  return result.rows[0];
}

/**
 * Verify token and grant access to the requesting professional.
 * Returns the granting professional's medical records for this patient.
 */
async function verifyAndAccess(token, accessingProfessionalId) {
  const tokenResult = await query(
    `SELECT * FROM record_access_tokens
     WHERE token = $1 AND is_revoked = FALSE AND expires_at > NOW()`,
    [token]
  );

  if (tokenResult.rows.length === 0) {
    return { valid: false, error: 'Token inválido, revogado ou expirado' };
  }

  const tokenRecord = tokenResult.rows[0];

  if (tokenRecord.granting_professional_id === accessingProfessionalId) {
    return { valid: false, error: 'Você não pode acessar seus próprios registros via token' };
  }

  // Mark token as accessed
  await query(
    `UPDATE record_access_tokens
     SET accessed_by_professional_id = $1, accessed_at = NOW()
     WHERE id = $2`,
    [accessingProfessionalId, tokenRecord.id]
  );

  // Fetch the granting professional's records for this patient
  const records = await query(
    `SELECT pmr.*, u.first_name AS professional_first_name, u.last_name AS professional_last_name
     FROM private_medical_records pmr
     JOIN users u ON u.id = pmr.professional_id
     WHERE pmr.professional_id = $1 AND pmr.patient_id = $2
     ORDER BY pmr.record_date DESC`,
    [tokenRecord.granting_professional_id, tokenRecord.patient_id]
  );

  // Create shared_medical_records entry
  await query(
    `INSERT INTO shared_medical_records (access_token_id, receiving_professional_id, original_records_count)
     VALUES ($1, $2, $3)`,
    [tokenRecord.id, accessingProfessionalId, records.rows.length]
  );

  return {
    valid: true,
    token: tokenRecord,
    records: records.rows,
  };
}

/**
 * Clean up expired tokens (called by cron job).
 */
async function cleanExpiredTokens() {
  const result = await query(
    `UPDATE record_access_tokens
     SET is_revoked = TRUE
     WHERE expires_at < NOW() AND is_revoked = FALSE
     RETURNING id`
  );

  return result.rows.length;
}

module.exports = {
  generateAccessToken,
  verifyAndAccess,
  cleanExpiredTokens,
};
