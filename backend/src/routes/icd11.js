'use strict';

const router = require('express').Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidation, isUUID } = require('../validators');

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/icd11
// List ICD-11 disorders (professionals only)
// Supports ?category= and ?search= query params
// ---------------------------------------------------------------------------

router.get('/', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let sql = `SELECT id, icd_code, disorder_name, description, symptom_keywords, category, created_at
               FROM icd11_disorders`;
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(disorder_name ILIKE $${params.length} OR icd_code ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY icd_code';

    const result = await query(sql, params);
    res.json({ disorders: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/icd11/categories
// List distinct ICD-11 categories
// ---------------------------------------------------------------------------

router.get('/categories', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT category FROM icd11_disorders WHERE category IS NOT NULL ORDER BY category`
    );
    res.json({ categories: result.rows.map((r) => r.category) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/icd11/recent
// Returns up to 8 most-used ICD codes by the authenticated professional
// ---------------------------------------------------------------------------
router.get('/recent', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pd.icd_code, pd.icd_name,
              COUNT(*) AS usage_count,
              MAX(pd.created_at) AS last_used_at
       FROM patient_diagnoses pd
       WHERE pd.professional_id = $1 AND pd.is_active = true
       GROUP BY pd.icd_code, pd.icd_name
       ORDER BY usage_count DESC, last_used_at DESC
       LIMIT 8`,
      [req.user.id]
    );
    res.json({ recent: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/icd11/:code
// ICD-11 disorder detail by code
// ---------------------------------------------------------------------------

router.get('/:code', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM icd11_disorders WHERE icd_code = $1`,
      [req.params.code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transtorno CID-11 não encontrado' });
    }
    res.json({ disorder: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/icd11/:code/tests
// Suggested psychological tests for a given ICD-11 disorder
// Uses icd_test_mapping + filters by SATEPSI active status
// ---------------------------------------------------------------------------

router.get('/:code/tests', requireRole('psychologist', 'psychiatrist'), async (req, res, next) => {
  try {
    const disorder = await query(
      `SELECT id, icd_code, disorder_name FROM icd11_disorders WHERE icd_code = $1`,
      [req.params.code]
    );
    if (disorder.rows.length === 0) {
      return res.status(404).json({ error: 'Transtorno CID-11 não encontrado' });
    }

    const result = await query(
      `SELECT pt.id, pt.name, pt.description, pt.category, pt.dsm_references,
              itm.relevance_score, itm.notes,
              st.test_name AS satepsi_name, st.approval_status AS satepsi_status,
              st.expiry_date AS satepsi_expiry
       FROM icd_test_mapping itm
       JOIN psychological_tests pt ON pt.id = itm.test_id
       LEFT JOIN satepsi_tests st ON st.id = pt.satepsi_test_id
       WHERE itm.disorder_id = $1
         AND pt.is_active = true
         AND (pt.requires_satepsi_approval = false
              OR (st.id IS NOT NULL AND st.approval_status = 'active'))
       ORDER BY itm.relevance_score DESC, pt.name`,
      [disorder.rows[0].id]
    );

    res.json({
      disorder: disorder.rows[0],
      suggested_tests: result.rows,
      disclaimer: 'Resultados de testes e insights de IA são ferramentas de apoio clínico e não substituem o julgamento profissional.',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/icd11/suggest-by-symptoms
// Suggest ICD-11 disorders based on symptom keywords
// POST body: { symptoms: ["insonia", "fadiga", ...] }
// ---------------------------------------------------------------------------

router.post(
  '/suggest-by-symptoms',
  requireRole('psychologist', 'psychiatrist'),
  async (req, res, next) => {
    try {
      const { symptoms } = req.body;
      if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ error: 'symptoms array é obrigatório' });
      }

      // Match disorders whose symptom_keywords overlap with provided symptoms
      // Build ILIKE conditions for flexible matching
      const likePatterns = symptoms.map((s) => `%${s.toLowerCase()}%`);
      const result = await query(
        `SELECT id, icd_code, disorder_name, description, symptom_keywords, category,
                (SELECT COUNT(*) FROM unnest(symptom_keywords) kw,
                 unnest($1::text[]) pattern WHERE LOWER(kw) LIKE pattern) AS match_count
         FROM icd11_disorders
         WHERE EXISTS (
           SELECT 1 FROM unnest(symptom_keywords) kw, unnest($1::text[]) pattern
           WHERE LOWER(kw) LIKE pattern
         )
         ORDER BY match_count DESC, disorder_name
         LIMIT 10`,
        [likePatterns]
      );

      res.json({
        suggestions: result.rows,
        disclaimer: 'Sugestões diagnósticas são ferramentas de apoio clínico e não substituem o julgamento profissional. O sistema NÃO gera diagnósticos automaticamente.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
