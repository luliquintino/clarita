'use strict';

const { query } = require('../config/database');

/**
 * Require one of the given roles.
 * @param  {...string} roles  Allowed roles, e.g. 'patient', 'psychologist', 'psychiatrist'
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Proibido: papel insuficiente',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

/**
 * Verify that the authenticated professional has an active care relationship
 * with the patient identified by req.params.patientId (or req.params.id when
 * the route param is named :id).
 *
 * Also checks that the professional has the required data permission unless
 * the permission type is not specified.
 */
function requirePatientAccess(permissionType) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária' });
      }

      // Patients accessing their own data pass through
      const patientId = req.params.patientId || req.params.id;
      if (req.user.role === 'patient' && req.user.id === patientId) {
        return next();
      }

      // Must be a professional from here on
      if (req.user.role === 'patient') {
        return res.status(403).json({ error: 'Proibido' });
      }

      // Check active care relationship
      const relResult = await query(
        `SELECT id FROM care_relationships
         WHERE professional_id = $1
           AND patient_id = $2
           AND status = 'active'
         LIMIT 1`,
        [req.user.id, patientId],
      );

      if (relResult.rows.length === 0) {
        return res.status(403).json({ error: 'Sem vínculo de cuidado ativo com este paciente' });
      }

      // If a specific permission type is required, check it
      // Default: allowed unless the patient has explicitly denied access
      if (permissionType) {
        const permResult = await query(
          `SELECT granted FROM data_permissions
           WHERE professional_id = $1
             AND patient_id = $2
             AND permission_type IN ($3, 'all')
           LIMIT 1`,
          [req.user.id, patientId, permissionType],
        );

        // Only deny if there's an explicit "granted = false" record
        if (permResult.rows.length > 0 && !permResult.rows[0].granted) {
          return res.status(403).json({
            error: 'Permissão negada para este tipo de dado',
            required: permissionType,
          });
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Verify that the current user owns the resource.
 * Accepts a function that, given the request, returns a Promise resolving to
 * the owner user id (UUID string), or a column-name string to look up.
 *
 * @param {string} table  Table name (safe literal, not user input)
 * @param {string} paramName  The req.params key holding the resource id
 * @param {string} ownerColumn  Column in the table that holds the owner id
 */
function requireOwnership(table, paramName = 'id', ownerColumn = 'professional_id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária' });
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({ error: `Parâmetro ausente: ${paramName}` });
      }

      // Build query with safe literal table/column names (never from user input)
      const sql = `SELECT "${ownerColumn}" AS owner_id FROM "${table}" WHERE id = $1`;
      const result = await query(sql, [resourceId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recurso não encontrado' });
      }

      if (result.rows[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não é proprietário deste recurso' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  requireRole,
  requirePatientAccess,
  requireOwnership,
};
