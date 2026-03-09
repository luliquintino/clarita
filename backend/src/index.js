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
const { medicationsRouter, patientMedicationsRouter, medicationLogsRouter } = require('./routes/medications');
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

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

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

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
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
}

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`CLARITA API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
