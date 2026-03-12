'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/satepsi
// List SATEPSI-approved tests (active only by default)
// Supports ?status=all to include expired/revoked
// ---------------------------------------------------------------------------

router.get('/', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    let sql = `SELECT id, test_name, test_author, approval_status, approval_date,
                      expiry_date, test_category, cfp_code, last_updated
               FROM satepsi_tests`;
    const params = [];
    const conditions = [];

    if (status !== 'all') {
      conditions.push(`approval_status = 'active'`);
    }

    if (category) {
      params.push(category);
      conditions.push(`test_category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(test_name ILIKE $${params.length} OR test_author ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY test_name';

    const result = await query(sql, params);
    res.json({ tests: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/satepsi/categories
// List distinct SATEPSI test categories
// ---------------------------------------------------------------------------

router.get('/categories', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT test_category FROM satepsi_tests WHERE test_category IS NOT NULL ORDER BY test_category`
    );
    res.json({ categories: result.rows.map((r) => r.test_category) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/satepsi/sync-status
// Last SATEPSI sync status
// ---------------------------------------------------------------------------

router.get('/sync-status', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM satepsi_sync_log ORDER BY synced_at DESC LIMIT 1`
    );
    res.json({
      last_sync: result.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/satepsi/:id
// SATEPSI test detail
// ---------------------------------------------------------------------------

router.get('/:id', isUUID('id'), handleValidation, requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM satepsi_tests WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teste SATEPSI não encontrado' });
    }

    // Also show linked psychological_tests
    const linked = await query(
      `SELECT id, name, category, is_active
       FROM psychological_tests
       WHERE satepsi_test_id = $1`,
      [req.params.id]
    );

    res.json({
      satepsi_test: result.rows[0],
      linked_tests: linked.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/satepsi/validate/:testId
// Check if a psychological test has valid SATEPSI approval
// ---------------------------------------------------------------------------

router.get(
  '/validate/:testId',
  isUUID('testId'),
  handleValidation,
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT pt.id, pt.name, pt.requires_satepsi_approval,
                st.id AS satepsi_id, st.test_name AS satepsi_name,
                st.approval_status, st.expiry_date
         FROM psychological_tests pt
         LEFT JOIN satepsi_tests st ON st.id = pt.satepsi_test_id
         WHERE pt.id = $1`,
        [req.params.testId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      const test = result.rows[0];
      const isApproved = !test.requires_satepsi_approval ||
        (test.satepsi_id && test.approval_status === 'active');

      res.json({
        test_id: test.id,
        test_name: test.name,
        requires_satepsi: test.requires_satepsi_approval,
        satepsi_approved: isApproved,
        satepsi_status: test.approval_status || null,
        satepsi_expiry: test.expiry_date || null,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
