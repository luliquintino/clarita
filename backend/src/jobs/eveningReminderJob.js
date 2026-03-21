'use strict';

const cron = require('node-cron');
const { query } = require('../config/database');
const { sendPushToUser } = require('../services/pushService');

function startEveningReminderJob() {
  // 22:00 UTC = 19:00 BRT
  cron.schedule('0 22 * * *', async () => {
    console.log('[eveningReminder] Sending 19h reminders...');
    try {
      const result = await query(`
        SELECT ps.user_id
        FROM push_subscriptions ps
        JOIN users u ON u.id = ps.user_id
        WHERE u.role = 'patient'
          AND u.is_active = TRUE
          AND ps.user_id NOT IN (
            SELECT patient_id FROM emotional_logs
            WHERE logged_at >= CURRENT_DATE
          )
      `);

      for (const row of result.rows) {
        sendPushToUser(row.user_id, {
          title: 'Não esqueça do seu check-in hoje 🌙',
          body: 'Como foi o seu dia? Leva menos de 1 minuto.',
          url: '/patient-home',
          tag: 'evening-reminder',
        }).catch(err =>
          console.error('[eveningReminder] push failed for', row.user_id, err.message)
        );
      }

      console.log(`[eveningReminder] ${result.rows.length} lembrete(s) enviado(s).`);
    } catch (err) {
      console.error('[eveningReminder] Erro:', err.message);
    }
  });

  console.log('[eveningReminderJob] Agendado para 22:00 UTC (19:00 BRT) diariamente.');
}

module.exports = { startEveningReminderJob };
