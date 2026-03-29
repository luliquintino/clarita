'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole, requireOwnership } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');
const {
  generateAccessToken,
  verifyAndAccess,
} = require('../services/recordSharingService');
const { audit } = require('../services/auditService');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/record-sharing/generate-token
// Generate QR sharing token (20-day expiry)
// ---------------------------------------------------------------------------

router.post(
  '/generate-token',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { patient_id } = req.body;

      if (!patient_id) {
        return res.status(400).json({ error: 'patient_id é obrigatório' });
      }

      // Verify care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1 AND patient_id = $2 AND status = 'active'`,
        [req.user.id, patient_id]
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      const tokenRecord = await generateAccessToken(req.user.id, patient_id);

      audit(req, 'record.share', 'record_sharing_token', tokenRecord.id, { patient_id: req.user.id });

      res.status(201).json({ access_token: tokenRecord });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/record-sharing/verify/:token
// Verify token validity (without accessing records)
// ---------------------------------------------------------------------------

router.get(
  '/verify/:token',
  async (req, res, next) => {
    try {
      const tokenResult = await query(
        `SELECT rat.id, rat.expires_at, rat.is_revoked, rat.accessed_at,
                u.first_name AS granting_first_name, u.last_name AS granting_last_name,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name
         FROM record_access_tokens rat
         JOIN users u ON u.id = rat.granting_professional_id
         JOIN users p ON p.id = rat.patient_id
         WHERE rat.token = $1`,
        [req.params.token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(404).json({ error: 'Token não encontrado' });
      }

      const token = tokenResult.rows[0];
      const isValid = !token.is_revoked && new Date(token.expires_at) > new Date();

      res.json({
        valid: isValid,
        expires_at: token.expires_at,
        granting_professional: `${token.granting_first_name} ${token.granting_last_name}`,
        patient: `${token.patient_first_name} ${token.patient_last_name}`,
        already_accessed: !!token.accessed_at,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/record-sharing/access/:token
// Access records via token (professional only)
// ---------------------------------------------------------------------------

router.post(
  '/access/:token',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const result = await verifyAndAccess(req.params.token, req.user.id);

      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        records: result.records,
        token_info: {
          id: result.token.id,
          expires_at: result.token.expires_at,
          patient_id: result.token.patient_id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/record-sharing/my-shares
// List shares made/received by this professional
// ---------------------------------------------------------------------------

router.get(
  '/my-shares',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      // Shares I created (granted)
      const granted = await query(
        `SELECT rat.*,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name,
                ap.first_name AS accessed_by_first_name, ap.last_name AS accessed_by_last_name
         FROM record_access_tokens rat
         JOIN users p ON p.id = rat.patient_id
         LEFT JOIN users ap ON ap.id = rat.accessed_by_professional_id
         WHERE rat.granting_professional_id = $1
         ORDER BY rat.created_at DESC`,
        [req.user.id]
      );

      // Shares I received (accessed)
      const received = await query(
        `SELECT smr.*,
                rat.patient_id, rat.expires_at,
                gp.first_name AS granting_first_name, gp.last_name AS granting_last_name,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name
         FROM shared_medical_records smr
         JOIN record_access_tokens rat ON rat.id = smr.access_token_id
         JOIN users gp ON gp.id = rat.granting_professional_id
         JOIN users p ON p.id = rat.patient_id
         WHERE smr.receiving_professional_id = $1
         ORDER BY smr.shared_at DESC`,
        [req.user.id]
      );

      res.json({
        granted: granted.rows,
        received: received.rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/record-sharing/save-summary
// Save summary of shared records before expiry
// ---------------------------------------------------------------------------

router.post(
  '/save-summary',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { access_token_id, summary } = req.body;

      if (!access_token_id || !summary) {
        return res.status(400).json({ error: 'access_token_id e summary são obrigatórios' });
      }

      const result = await query(
        `UPDATE shared_medical_records
         SET summary_content = $1, saved_at = NOW()
         WHERE access_token_id = $2 AND receiving_professional_id = $3
         RETURNING *`,
        [summary, access_token_id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Compartilhamento não encontrado' });
      }

      res.json({ shared_record: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/record-sharing/revoke/:tokenId
// Revoke a sharing token (owner only)
// ---------------------------------------------------------------------------

router.delete(
  '/revoke/:tokenId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('tokenId'),
  handleValidation,
  requireOwnership('record_access_tokens', 'tokenId', 'granting_professional_id'),
  async (req, res, next) => {
    try {
      await query(
        'UPDATE record_access_tokens SET is_revoked = TRUE WHERE id = $1',
        [req.params.tokenId]
      );
      res.json({ message: 'Token revogado com sucesso' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
