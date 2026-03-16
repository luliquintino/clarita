'use strict';

const cron = require('node-cron');
const { query } = require('../config/database');
const { sendNoCheckinReminderEmail } = require('../services/emailService');

// Runs daily at 09:00 BRT (12:00 UTC)
function startNoCheckinJob() {
  cron.schedule('0 12 * * *', async () => {
    console.log('[noCheckinJob] Checking patients without check-in...');
    try {
      const result = await query(`
        SELECT
          u_prof.id AS prof_id,
          u_prof.email AS prof_email,
          u_prof.first_name AS prof_first,
          u_prof.last_name AS prof_last,
          u_pat.first_name || ' ' || u_pat.last_name AS patient_name,
          EXTRACT(DAY FROM NOW() - MAX(el.created_at))::int AS days_since
        FROM care_relationships cr
        JOIN users u_prof ON u_prof.id = cr.professional_id
        JOIN users u_pat ON u_pat.id = cr.patient_id
        LEFT JOIN emotional_logs el ON el.patient_id = cr.patient_id
        WHERE cr.status = 'active'
        GROUP BY cr.id, u_prof.id, u_prof.email, u_prof.first_name, u_prof.last_name, u_pat.first_name, u_pat.last_name
        HAVING MAX(el.created_at) IS NULL OR MAX(el.created_at) < NOW() - INTERVAL '3 days'
      `);

      if (result.rows.length === 0) {
        console.log('[noCheckinJob] No patients missing check-in.');
        return;
      }

      // Group by professional
      const byProf = {};
      for (const row of result.rows) {
        if (!byProf[row.prof_id]) {
          byProf[row.prof_id] = {
            email: row.prof_email,
            name: `${row.prof_first} ${row.prof_last}`,
            patients: [],
          };
        }
        byProf[row.prof_id].patients.push({
          name: row.patient_name,
          days_since: row.days_since ?? '3+',
        });
      }

      for (const prof of Object.values(byProf)) {
        await sendNoCheckinReminderEmail(prof.email, prof.name, prof.patients)
          .catch(err => console.error('[noCheckinJob] Email failed:', err.message));
      }

      console.log(`[noCheckinJob] Notified ${Object.keys(byProf).length} professional(s).`);
    } catch (err) {
      console.error('[noCheckinJob] Error:', err.message);
    }
  });

  console.log('[noCheckinJob] Scheduled for 09:00 BRT daily.');
}

module.exports = { startNoCheckinJob };
