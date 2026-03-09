'use strict';

const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadDocument } = require('../middleware/upload');
const { handleValidation, isUUID } = require('../validators');

router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/documents
// Upload a document (patient only)
// ---------------------------------------------------------------------------
router.post('/', requireRole('patient'), (req, res, next) => {
  uploadDocument(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 10MB.' });
      }
      return res.status(400).json({ error: err.message || 'Erro no upload do arquivo.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    try {
      const { document_type, document_date, notes } = req.body;
      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      const fileType = ext === 'jpg' ? 'jpeg' : ext;

      const result = await query(
        `INSERT INTO patient_documents
           (patient_id, file_name, original_name, file_type, file_size, storage_path, document_type, document_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.user.id,
          req.file.filename,
          req.file.originalname,
          fileType,
          req.file.size,
          req.file.path,
          document_type || null,
          document_date || null,
          notes || null,
        ]
      );

      res.status(201).json({ document: result.rows[0] });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      next(error);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/documents
// List all documents for the authenticated patient
// ---------------------------------------------------------------------------
router.get('/', requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, patient_id, file_name, original_name, file_type, file_size,
              document_type, document_date, notes, uploaded_at, created_at
       FROM patient_documents
       WHERE patient_id = $1
       ORDER BY COALESCE(document_date, uploaded_at) DESC`,
      [req.user.id]
    );

    res.json({ documents: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:id/file
// Serve the actual file (authenticated, access-controlled)
// ---------------------------------------------------------------------------
router.get('/:id/file', isUUID('id'), handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;

    const docResult = await query(`SELECT * FROM patient_documents WHERE id = $1`, [id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const doc = docResult.rows[0];

    // If patient: must own the document
    if (req.user.role === 'patient') {
      if (doc.patient_id !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    } else {
      // Professional: check care relationship + documents permission + specific access
      const access = await query(
        `SELECT 1 FROM care_relationships cr
           JOIN data_permissions dp ON dp.patient_id = cr.patient_id
                                    AND dp.professional_id = cr.professional_id
                                    AND dp.permission_type = 'documents'
                                    AND dp.granted = true
           JOIN document_access da ON da.document_id = $1
                                   AND da.professional_id = $2
           WHERE cr.patient_id = $3
             AND cr.professional_id = $2
             AND cr.status = 'active'`,
        [id, req.user.id, doc.patient_id]
      );

      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a este documento' });
      }
    }

    // Serve file
    const filePath = doc.storage_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    const mimeTypes = {
      pdf: 'application/pdf',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };

    res.setHeader('Content-Type', mimeTypes[doc.file_type] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/documents/:id
// Delete a document (patient only, must own)
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  requireRole('patient'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const docResult = await query(
        `SELECT * FROM patient_documents WHERE id = $1 AND patient_id = $2`,
        [id, req.user.id]
      );

      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      const doc = docResult.rows[0];

      // Delete from DB (cascades to document_access)
      await query(`DELETE FROM patient_documents WHERE id = $1`, [id]);

      // Delete file from disk
      if (doc.storage_path && fs.existsSync(doc.storage_path)) {
        fs.unlink(doc.storage_path, () => {});
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/documents/:id/access
// List which professionals have access to a specific document (patient only)
// ---------------------------------------------------------------------------
router.get(
  '/:id/access',
  requireRole('patient'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verify ownership
      const docCheck = await query(
        `SELECT 1 FROM patient_documents WHERE id = $1 AND patient_id = $2`,
        [id, req.user.id]
      );
      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      const result = await query(
        `SELECT da.id, da.document_id, da.professional_id, da.granted_at,
                u.first_name, u.last_name, u.role
         FROM document_access da
         JOIN users u ON u.id = da.professional_id
         WHERE da.document_id = $1`,
        [id]
      );

      res.json({ access: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/documents/:id/access
// Grant or revoke a professional's access to a specific document (patient only)
// ---------------------------------------------------------------------------
router.put(
  '/:id/access',
  requireRole('patient'),
  isUUID('id'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { professional_id, granted } = req.body;

      if (!professional_id) {
        return res.status(400).json({ error: 'professional_id é obrigatório' });
      }

      // Verify ownership
      const docCheck = await query(
        `SELECT 1 FROM patient_documents WHERE id = $1 AND patient_id = $2`,
        [id, req.user.id]
      );
      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Verify care relationship exists
      const relCheck = await query(
        `SELECT 1 FROM care_relationships
         WHERE patient_id = $1 AND professional_id = $2 AND status = 'active'`,
        [req.user.id, professional_id]
      );
      if (relCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Profissional não vinculado' });
      }

      if (granted) {
        await query(
          `INSERT INTO document_access (document_id, professional_id, granted_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (document_id, professional_id) DO NOTHING`,
          [id, professional_id, req.user.id]
        );
      } else {
        await query(`DELETE FROM document_access WHERE document_id = $1 AND professional_id = $2`, [
          id,
          professional_id,
        ]);
      }

      // Return updated access list
      const result = await query(
        `SELECT da.id, da.document_id, da.professional_id, da.granted_at,
                u.first_name, u.last_name, u.role
         FROM document_access da
         JOIN users u ON u.id = da.professional_id
         WHERE da.document_id = $1`,
        [id]
      );

      res.json({ access: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/documents/patient/:patientId
// List documents shared with a professional (professional only)
// ---------------------------------------------------------------------------
router.get(
  '/patient/:patientId',
  requireRole('psychologist', 'psychiatrist'),
  isUUID('patientId'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      // Verify care relationship + general documents permission
      const access = await query(
        `SELECT 1 FROM care_relationships cr
         JOIN data_permissions dp ON dp.patient_id = cr.patient_id
                                  AND dp.professional_id = cr.professional_id
                                  AND dp.permission_type = 'documents'
                                  AND dp.granted = true
         WHERE cr.patient_id = $1
           AND cr.professional_id = $2
           AND cr.status = 'active'`,
        [patientId, req.user.id]
      );

      if (access.rows.length === 0) {
        return res.json({ documents: [] });
      }

      // Return only documents with specific access granted
      const result = await query(
        `SELECT pd.id, pd.patient_id, pd.file_name, pd.original_name,
                pd.file_type, pd.file_size, pd.document_type, pd.document_date,
                pd.notes, pd.uploaded_at
         FROM patient_documents pd
         JOIN document_access da ON da.document_id = pd.id AND da.professional_id = $2
         WHERE pd.patient_id = $1
         ORDER BY COALESCE(pd.document_date, pd.uploaded_at) DESC`,
        [patientId, req.user.id]
      );

      res.json({ documents: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
