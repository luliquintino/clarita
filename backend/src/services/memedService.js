'use strict';

const { query } = require('../config/database');

/**
 * Create a prescription record.
 * If MEMED_API_KEY is configured, calls the MEMED API; otherwise saves locally.
 */
async function createPrescription(professionalId, patientId, medications) {
  const memedApiKey = process.env.MEMED_API_KEY;
  const memedApiUrl = process.env.MEMED_API_URL || 'https://api.memed.com.br/v1';

  let memedPrescriptionId = null;
  let pdfUrl = null;
  let status = 'local';

  if (memedApiKey) {
    try {
      const response = await fetch(`${memedApiUrl}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memedApiKey}`,
        },
        body: JSON.stringify({
          patient_id: patientId,
          medications,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        memedPrescriptionId = data.id || data.prescription_id || null;
        pdfUrl = data.pdf_url || null;
        status = 'created';
      }
    } catch (_err) {
      // MEMED API unavailable — fall back to local
    }
  }

  const result = await query(
    `INSERT INTO memed_prescriptions
       (professional_id, patient_id, memed_prescription_id, pdf_url, medications_data, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [professionalId, patientId, memedPrescriptionId, pdfUrl, JSON.stringify(medications), status]
  );

  return result.rows[0];
}

/**
 * List prescriptions for a patient (visible to the requesting professional).
 */
async function listPrescriptions(patientId, { page = 1, limit = 20 } = {}) {
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * lim;

  const result = await query(
    `SELECT mp.*,
            u.first_name AS professional_first_name,
            u.last_name  AS professional_last_name
     FROM memed_prescriptions mp
     JOIN users u ON u.id = mp.professional_id
     WHERE mp.patient_id = $1
     ORDER BY mp.created_at DESC
     LIMIT $2 OFFSET $3`,
    [patientId, lim, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM memed_prescriptions WHERE patient_id = $1`,
    [patientId]
  );

  return {
    prescriptions: result.rows,
    pagination: { page: parseInt(page, 10), limit: lim, total: countResult.rows[0].total },
  };
}

/**
 * Get a single prescription by id.
 */
async function getPrescription(id) {
  const result = await query(
    `SELECT mp.*,
            u.first_name AS professional_first_name,
            u.last_name  AS professional_last_name,
            pu.first_name AS patient_first_name,
            pu.last_name  AS patient_last_name
     FROM memed_prescriptions mp
     JOIN users u  ON u.id  = mp.professional_id
     JOIN users pu ON pu.id = mp.patient_id
     WHERE mp.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { createPrescription, listPrescriptions, getPrescription };
