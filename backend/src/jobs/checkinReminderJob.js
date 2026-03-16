'use strict';

const cron = require('node-cron');
const { query } = require('../config/database');
const { sendPushToUser } = require('../services/pushService');

// Runs every hour to check who needs a reminder at this UTC hour
function startCheckinReminderJob() {
  cron.schedule('0 * * * *', async () => {
    const currentHourUTC = new Date().getUTCHours();

    try {
      const result = await query(`
        SELECT DISTINCT
          cr.patient_id,
          COALESCE(cr.checkin_reminder_hour, 20) AS reminder_hour
        FROM care_relationships cr
        WHERE cr.status = 'active'
          AND COALESCE(cr.checkin_reminder_hour, 20) = $1
          AND cr.patient_id NOT IN (
            SELECT patient_id FROM emotional_logs
            WHERE logged_at >= CURRENT_DATE
          )
      `, [currentHourUTC]);

      for (const row of result.rows) {
        sendPushToUser(row.patient_id, {
          title: 'Como você está hoje? 🌱',
          body: 'Faça seu check-in diário no Clarita. Leva menos de 1 minuto.',
          url: '/patient-home',
          tag: 'checkin-reminder',
        }).catch(err => console.error('[checkinReminder] push failed:', err.message));
      }

      if (result.rows.length > 0) {
        console.log(`[checkinReminder] ${result.rows.length} lembrete(s) enviado(s).`);
      }
    } catch (err) {
      console.error('[checkinReminder] Erro:', err.message);
    }
  });

  console.log('[checkinReminderJob] Agendado (verificação a cada hora).');
}

module.exports = { startCheckinReminderJob };
