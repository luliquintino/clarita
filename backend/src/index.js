'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const professionalRoutes = require('./routes/professionals');
const emotionalLogRoutes = require('./routes/emotionalLogs');
const { symptomsRouter, patientSymptomsRouter } = require('./routes/symptoms');
const {
  medicationsRouter,
  patientMedicationsRouter,
  medicationLogsRouter,
} = require('./routes/medications');
const { assessmentsRouter, assessmentResultsRouter } = require('./routes/assessments');
const lifeEventRoutes = require('./routes/lifeEvents');
const clinicalNoteRoutes = require('./routes/clinicalNotes');
const insightRoutes = require('./routes/insights');
const alertRoutes = require('./routes/alerts');
const digitalTwinRoutes = require('./routes/digitalTwin');
const journalRoutes = require('./routes/journal');
const goalsRoutes = require('./routes/goals');
const chatRoutes = require('./routes/chat');
const summaryRoutes = require('./routes/summaries');
const onboardingRoutes = require('./routes/onboarding');
const documentRoutes = require('./routes/documents');
const examsRoutes = require('./routes/exams');
const invitationRoutes = require('./routes/invitations');
const userRoutes = require('./routes/users');
const anamnesisRoutes = require('./routes/anamnesis');
const medicalRecordRoutes = require('./routes/medicalRecords');
const recordSharingRoutes = require('./routes/recordSharing');
const psychTestRoutes = require('./routes/psychTests');
const icd11Routes = require('./routes/icd11');
const satepsiRoutes = require('./routes/satepsi');
const meRoutes = require('./routes/me');
const pushRoutes = require('./routes/pushSubscriptions');

const { pool } = require('./config/database');
const { startNoCheckinJob } = require('./jobs/noCheckinJob');
const { startCheckinReminderJob } = require('./jobs/checkinReminderJob');
const { startEveningReminderJob } = require('./jobs/eveningReminderJob');

// ---------------------------------------------------------------------------
// Auto-migrations: idempotent DDL run on every startup (CREATE IF NOT EXISTS)
// ---------------------------------------------------------------------------

async function runAutoMigrations() {
  const migrations = [
    // patient_diagnoses — CID-11 formal diagnoses linked to patients
    `CREATE TABLE IF NOT EXISTS patient_diagnoses (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       professional_id UUID NOT NULL REFERENCES users(id),
       icd_code VARCHAR(20) NOT NULL,
       icd_name TEXT NOT NULL,
       certainty VARCHAR(20) NOT NULL DEFAULT 'suspected'
         CHECK (certainty IN ('suspected','confirmed')),
       diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
       notes TEXT,
       clinical_note_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
       is_active BOOLEAN DEFAULT true,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient
       ON patient_diagnoses(patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_professional
       ON patient_diagnoses(professional_id)`,
    // clinical_notes — optional diagnosis_id backlink
    `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS diagnosis_id UUID`,
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('[auto-migration] Error:', err.message);
    }
  }
  console.log('[auto-migration] Completed');
}

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Banco de dados indisponível' });
  }
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/emotional-logs', emotionalLogRoutes);
app.use('/api/symptoms', symptomsRouter);
app.use('/api/patient-symptoms', patientSymptomsRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/patient-medications', patientMedicationsRouter);
app.use('/api/medication-logs', medicationLogsRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/assessment-results', assessmentResultsRouter);
app.use('/api/life-events', lifeEventRoutes);
app.use('/api/clinical-notes', clinicalNoteRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/digital-twin', digitalTwinRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/anamnesis', anamnesisRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/record-sharing', recordSharingRoutes);
app.use('/api/psych-tests', psychTestRoutes);
app.use('/api/icd11', icd11Routes);
app.use('/api/satepsi', satepsiRoutes);
app.use('/api/me', meRoutes);
app.use('/api/push', pushRoutes);

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message || 'Erro interno do servidor';

  res.status(statusCode).json({ error: message });
});

// ---------------------------------------------------------------------------
// Cron: Alert generation every 30 minutes
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const { generateAlertsForAllPatients } = require('./services/alertService');
      await generateAlertsForAllPatients();
      console.log('[cron] Alert generation completed');
    } catch (err) {
      console.error('[cron] Alert generation failed:', err.message);
    }
  });

  // Clean expired QR sharing tokens (daily at 3am)
  cron.schedule('0 3 * * *', async () => {
    try {
      const { cleanExpiredTokens } = require('./services/recordSharingService');
      await cleanExpiredTokens();
      console.log('[cron] Expired token cleanup completed');
    } catch (err) {
      console.error('[cron] Expired token cleanup failed:', err.message);
    }
  });

  // Expire overdue psychological test sessions (daily at 4am)
  cron.schedule('0 4 * * *', async () => {
    try {
      const { expireOverdueSessions } = require('./services/psychTestService');
      await expireOverdueSessions();
      console.log('[cron] Overdue test session expiry completed');
    } catch (err) {
      console.error('[cron] Overdue test session expiry failed:', err.message);
    }
  });

  // SATEPSI test validation sync (weekly on Sundays at 5am)
  cron.schedule('0 5 * * 0', async () => {
    try {
      const { syncSatepsiTests } = require('./services/satepsiService');
      const result = await syncSatepsiTests();
      console.log(`[cron] SATEPSI sync completed: ${result.testsUpdated} updated, ${result.testsDeactivated} deactivated`);
    } catch (err) {
      console.error('[cron] SATEPSI sync failed:', err.message);
    }
  });

  // No check-in reminder (daily at 09:00 BRT / 12:00 UTC)
  startNoCheckinJob();

  // Push check-in reminder (hourly, per-user configurable UTC hour)
  startCheckinReminderJob();

  // Evening reminder (daily at 22:00 UTC / 19:00 BRT)
  startEveningReminderJob();
}

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

if (require.main === module) {
  runAutoMigrations().then(() => {
    app.listen(PORT, () => {
      console.log(`CLARITA API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  });
}

module.exports = app;
