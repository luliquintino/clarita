#!/usr/bin/env node

/**
 * CLARITA - Seed Script: Professional + Patient Journeys
 *
 * Creates:
 * - 2 professionals: luiza.psiquiatra@teste.com (psychiatrist), luiza.psicologa@teste.com (psychologist)
 * - 1 test patient: luiza.paciente@teste.com (patient - for validating patient journey)
 * - 5 fictional patients with data
 * - Care relationships: 1 shared patient, 2 exclusive to each professional
 * - Emotional logs, assessments, medications, clinical notes, life events, alerts, AI insights
 *
 * Usage: node backend/db/seed_journeys.js
 * Requires: backend running on localhost:3001, PostgreSQL running
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function authedRequest(token, endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateOnly(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// 1. Register professionals
// ---------------------------------------------------------------------------

async function registerProfessionals() {
  console.log('\n👩‍⚕️ Registering professionals...');

  const psiquiatra = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Luiza',
      last_name: 'Psiquiatra',
      email: 'luiza.psiquiatra@teste.com',
      password: 'JCHh14025520',
      role: 'psychiatrist',
      license_number: 'CRM-SP 182456',
      specialization: 'Psiquiatria clínica e transtornos de humor',
      institution: 'Clínica Clarita',
    }),
  });

  if (psiquiatra.status === 409) {
    console.log('  ⚠️  Psiquiatra already exists, logging in...');
    const login = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'luiza.psiquiatra@teste.com', password: 'JCHh14025520' }),
    });
    if (login.status !== 200) throw new Error(`Login psiquiatra failed: ${login.status}`);
    return { ...login.body, existed: true };
  }
  if (psiquiatra.status !== 201) throw new Error(`Register psiquiatra failed: ${psiquiatra.status} - ${JSON.stringify(psiquiatra.body)}`);
  console.log(`  ✅ Psiquiatra: ${psiquiatra.body.user.id}`);
  return psiquiatra.body;
}

async function registerPsicologa() {
  const psicologa = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Luiza',
      last_name: 'Psicóloga',
      email: 'luiza.psicologa@teste.com',
      password: 'JCHh14025520',
      role: 'psychologist',
      license_number: 'CRP 06/198234',
      specialization: 'Terapia cognitivo-comportamental',
      institution: 'Clínica Clarita',
    }),
  });

  if (psicologa.status === 409) {
    console.log('  ⚠️  Psicóloga already exists, logging in...');
    const login = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'luiza.psicologa@teste.com', password: 'JCHh14025520' }),
    });
    if (login.status !== 200) throw new Error(`Login psicóloga failed: ${login.status}`);
    return { ...login.body, existed: true };
  }
  if (psicologa.status !== 201) throw new Error(`Register psicóloga failed: ${psicologa.status} - ${JSON.stringify(psicologa.body)}`);
  console.log(`  ✅ Psicóloga: ${psicologa.body.user.id}`);
  return psicologa.body;
}

async function registerLuizaPaciente() {
  console.log('\n🧑 Registering Luiza Paciente...');

  const paciente = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Luiza',
      last_name: 'Paciente',
      email: 'luiza.paciente@teste.com',
      password: 'JCHH14025520',
      role: 'patient',
      date_of_birth: '1996-05-20',
      gender: 'female',
    }),
  });

  if (paciente.status === 409) {
    console.log('  ⚠️  Luiza Paciente already exists, logging in...');
    const login = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'luiza.paciente@teste.com', password: 'JCHH14025520' }),
    });
    if (login.status !== 200) throw new Error(`Login luiza.paciente failed: ${login.status}`);
    return { ...login.body, existed: true };
  }
  if (paciente.status !== 201) throw new Error(`Register luiza.paciente failed: ${paciente.status} - ${JSON.stringify(paciente.body)}`);
  console.log(`  ✅ Luiza Paciente: ${paciente.body.user.id}`);
  return paciente.body;
}

// ---------------------------------------------------------------------------
// 2. Register patients
// ---------------------------------------------------------------------------

const PATIENTS = [
  {
    first_name: 'Ana',
    last_name: 'Oliveira',
    email: 'ana.oliveira@teste.com',
    password: 'Teste1234',
    date_of_birth: '1992-07-15',
    gender: 'female',
    // SHARED: both professionals
  },
  {
    first_name: 'Carlos',
    last_name: 'Santos',
    email: 'carlos.santos@teste.com',
    password: 'Teste1234',
    date_of_birth: '1985-03-22',
    gender: 'male',
    // Exclusive: psiquiatra
  },
  {
    first_name: 'Beatriz',
    last_name: 'Ferreira',
    email: 'beatriz.ferreira@teste.com',
    password: 'Teste1234',
    date_of_birth: '1998-11-08',
    gender: 'female',
    // Exclusive: psiquiatra
  },
  {
    first_name: 'Diego',
    last_name: 'Mendes',
    email: 'diego.mendes@teste.com',
    password: 'Teste1234',
    date_of_birth: '1990-01-30',
    gender: 'male',
    // Exclusive: psicologa
  },
  {
    first_name: 'Fernanda',
    last_name: 'Lima',
    email: 'fernanda.lima@teste.com',
    password: 'Teste1234',
    date_of_birth: '1995-06-12',
    gender: 'female',
    // Exclusive: psicologa
  },
];

async function registerPatients() {
  console.log('\n🧑‍🤝‍🧑 Registering patients...');
  const results = [];

  for (const p of PATIENTS) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...p, role: 'patient' }),
    });

    if (res.status === 409) {
      console.log(`  ⚠️  ${p.email} already exists, logging in...`);
      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: p.email, password: p.password }),
      });
      if (login.status !== 200) throw new Error(`Login ${p.email} failed: ${login.status}`);
      results.push({ ...login.body, existed: true });
    } else if (res.status === 201) {
      console.log(`  ✅ ${p.first_name} ${p.last_name}: ${res.body.user.id}`);
      results.push(res.body);
    } else {
      throw new Error(`Register ${p.email} failed: ${res.status} - ${JSON.stringify(res.body)}`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. Create care relationships & data permissions via SQL
// ---------------------------------------------------------------------------

async function setupRelationshipsSQL(psiquiatraId, psicologaId, patientIds, luizaPacienteId) {
  console.log('\n🔗 Setting up care relationships...');

  // We need direct DB access for this since there's no bulk API
  // Use the /patients/:id/connect endpoint instead
  // But that requires patient to initiate... let's do it via SQL through a helper endpoint
  // Actually, let's just insert directly via the backend's DB

  // Import pg to connect directly
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://clarita_user:clarita_secret_2024@localhost:5432/clarita',
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ana (index 0) - SHARED between both professionals
    // Carlos (index 1) - psiquiatra only
    // Beatriz (index 2) - psiquiatra only
    // Diego (index 3) - psicologa only
    // Fernanda (index 4) - psicologa only

    const relationships = [
      // Psiquiatra's patients
      { patient: patientIds[0], professional: psiquiatraId, type: 'psychiatrist' },
      { patient: patientIds[1], professional: psiquiatraId, type: 'psychiatrist' },
      { patient: patientIds[2], professional: psiquiatraId, type: 'psychiatrist' },
      // Psicóloga's patients
      { patient: patientIds[0], professional: psicologaId, type: 'psychologist' },
      { patient: patientIds[3], professional: psicologaId, type: 'psychologist' },
      { patient: patientIds[4], professional: psicologaId, type: 'psychologist' },
      // Luiza Paciente - assigned to both professionals
      { patient: luizaPacienteId, professional: psiquiatraId, type: 'psychiatrist' },
      { patient: luizaPacienteId, professional: psicologaId, type: 'psychologist' },
    ];

    for (const r of relationships) {
      await client.query(
        `INSERT INTO care_relationships (patient_id, professional_id, relationship_type, status, started_at)
         VALUES ($1, $2, $3, 'active', NOW() - interval '60 days')
         ON CONFLICT DO NOTHING`,
        [r.patient, r.professional, r.type]
      );
      console.log(`  ✅ ${r.type}: professional ${r.professional.slice(0, 8)}... → patient ${r.patient.slice(0, 8)}...`);
    }

    // Data permissions (grant all for each relationship)
    for (const r of relationships) {
      await client.query(
        `INSERT INTO data_permissions (patient_id, professional_id, permission_type, granted)
         VALUES ($1, $2, 'all', true)
         ON CONFLICT (patient_id, professional_id, permission_type) DO UPDATE SET granted = true`,
        [r.patient, r.professional]
      );
    }

    await client.query('COMMIT');
    console.log('  ✅ Data permissions granted');

    return { client, pool };
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    pool.end();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 4. Seed emotional logs
// ---------------------------------------------------------------------------

async function seedEmotionalLogs(client, patientIds) {
  console.log('\n📊 Seeding emotional logs...');

  // Generate 30 days of emotional logs for each patient with different patterns
  const patterns = {
    // Ana: improving trajectory (depression recovery)
    0: (day) => ({
      mood: Math.min(10, Math.max(1, Math.round(3 + (day / 30) * 5 + (Math.random() - 0.5) * 2))),
      anxiety: Math.min(10, Math.max(1, Math.round(7 - (day / 30) * 4 + (Math.random() - 0.5) * 2))),
      energy: Math.min(10, Math.max(1, Math.round(3 + (day / 30) * 4 + (Math.random() - 0.5) * 2))),
      sleep: ['poor', 'fair', 'fair', 'good', 'good'][Math.min(4, Math.floor(day / 7))],
      sleepHours: Math.round((5.5 + (day / 30) * 2 + (Math.random() - 0.5)) * 100) / 100,
    }),
    // Carlos: stable moderate depression with anxiety spikes
    1: (day) => ({
      mood: Math.min(10, Math.max(1, Math.round(4 + (Math.random() - 0.5) * 2))),
      anxiety: Math.min(10, Math.max(1, Math.round(6 + (day % 7 === 0 ? 3 : 0) + (Math.random() - 0.5) * 2))),
      energy: Math.min(10, Math.max(1, Math.round(4 + (Math.random() - 0.5) * 2))),
      sleep: ['fair', 'poor', 'fair', 'poor'][day % 4],
      sleepHours: Math.round((5 + (Math.random() * 2)) * 100) / 100,
    }),
    // Beatriz: high anxiety pattern, moderate mood
    2: (day) => ({
      mood: Math.min(10, Math.max(1, Math.round(5 + (Math.random() - 0.5) * 3))),
      anxiety: Math.min(10, Math.max(1, Math.round(7 + (Math.random() - 0.5) * 2))),
      energy: Math.min(10, Math.max(1, Math.round(5 + (Math.random() - 0.5) * 2))),
      sleep: ['fair', 'poor', 'very_poor', 'fair', 'poor'][day % 5],
      sleepHours: Math.round((4.5 + (Math.random() * 2.5)) * 100) / 100,
    }),
    // Diego: good baseline with recent dip (life event)
    3: (day) => ({
      mood: Math.min(10, Math.max(1, Math.round(day < 10 ? 7 : 4 + (Math.random() - 0.5) * 2))),
      anxiety: Math.min(10, Math.max(1, Math.round(day < 10 ? 3 : 6 + (Math.random() - 0.5) * 2))),
      energy: Math.min(10, Math.max(1, Math.round(day < 10 ? 7 : 4 + (Math.random() - 0.5) * 2))),
      sleep: day < 10 ? 'good' : ['fair', 'poor', 'fair'][day % 3],
      sleepHours: Math.round((day < 10 ? 7 : 5 + (Math.random() * 2)) * 100) / 100,
    }),
    // Fernanda: fluctuating mood (bipolar-like swings)
    4: (day) => {
      const cycle = Math.sin(day / 5 * Math.PI);
      return {
        mood: Math.min(10, Math.max(1, Math.round(5 + cycle * 3 + (Math.random() - 0.5)))),
        anxiety: Math.min(10, Math.max(1, Math.round(5 - cycle * 2 + (Math.random() - 0.5) * 2))),
        energy: Math.min(10, Math.max(1, Math.round(5 + cycle * 3 + (Math.random() - 0.5)))),
        sleep: cycle > 0 ? 'good' : 'poor',
        sleepHours: Math.round((5 + cycle * 2 + (Math.random())) * 100) / 100,
      };
    },
    // Luiza Paciente: mild anxiety with gradual improvement
    5: (day) => ({
      mood: Math.min(10, Math.max(1, Math.round(5 + (day / 30) * 3 + (Math.random() - 0.5) * 1.5))),
      anxiety: Math.min(10, Math.max(1, Math.round(6 - (day / 30) * 2 + (Math.random() - 0.5) * 2))),
      energy: Math.min(10, Math.max(1, Math.round(5 + (day / 30) * 2 + (Math.random() - 0.5) * 1.5))),
      sleep: ['fair', 'good', 'fair', 'good', 'good'][Math.min(4, Math.floor(day / 7))],
      sleepHours: Math.round((6 + (day / 30) * 1.5 + (Math.random() - 0.5)) * 100) / 100,
    }),
  };

  const notes = [
    'Dia difícil no trabalho, muita pressão.',
    'Consegui fazer exercício hoje, me senti melhor.',
    'Dormi mal, acordei várias vezes.',
    'Sessão de terapia foi boa, saí mais leve.',
    'Senti ansiedade no trânsito.',
    'Dia tranquilo, passei tempo com a família.',
    'Me senti muito cansada hoje.',
    'Consegui meditar pela manhã.',
    'Discussão com colega me deixou nervosa.',
    'Fui ao parque, natureza me fez bem.',
    null, null, null, // some days no notes
  ];

  let count = 0;
  for (let pIdx = 0; pIdx < patientIds.length; pIdx++) {
    for (let day = 29; day >= 0; day--) {
      const data = patterns[pIdx](30 - day);
      const note = notes[Math.floor(Math.random() * notes.length)];

      await client.query(
        `INSERT INTO emotional_logs (patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, notes, logged_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          patientIds[pIdx],
          data.mood,
          data.anxiety,
          data.energy,
          data.sleep,
          data.sleepHours,
          note,
          daysAgo(day),
        ]
      );
      count++;
    }
  }

  console.log(`  ✅ ${count} emotional logs created`);
}

// ---------------------------------------------------------------------------
// 5. Seed assessment results
// ---------------------------------------------------------------------------

async function seedAssessments(client, patientIds) {
  console.log('\n📋 Seeding assessment results...');

  // Get assessment IDs
  const { rows: assessments } = await client.query('SELECT id, name FROM assessments');
  const phq9 = assessments.find(a => a.name === 'PHQ-9');
  const gad7 = assessments.find(a => a.name === 'GAD-7');

  if (!phq9 || !gad7) {
    console.log('  ⚠️  Assessments not found, skipping. Run seed.sql first.');
    return;
  }

  // Assessment data per patient (multiple time points)
  const assessmentData = [
    // Ana - improving
    { patient: 0, assessment: phq9.id, score: 18, severity: 'moderately_severe', daysBack: 28, answers: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 1, 6: 3, 7: 2, 8: 1, 9: 1 } },
    { patient: 0, assessment: phq9.id, score: 12, severity: 'moderate', daysBack: 14, answers: { 1: 2, 2: 2, 3: 1, 4: 2, 5: 1, 6: 2, 7: 1, 8: 1, 9: 0 } },
    { patient: 0, assessment: phq9.id, score: 7, severity: 'mild', daysBack: 1, answers: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 1, 7: 1, 8: 1, 9: 0 } },
    { patient: 0, assessment: gad7.id, score: 14, severity: 'moderate', daysBack: 28, answers: { 1: 2, 2: 3, 3: 2, 4: 2, 5: 2, 6: 2, 7: 1 } },
    { patient: 0, assessment: gad7.id, score: 8, severity: 'mild', daysBack: 1, answers: { 1: 1, 2: 2, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 } },

    // Carlos - stable moderate
    { patient: 1, assessment: phq9.id, score: 14, severity: 'moderate', daysBack: 21, answers: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1, 6: 2, 7: 1, 8: 1, 9: 1 } },
    { patient: 1, assessment: phq9.id, score: 13, severity: 'moderate', daysBack: 7, answers: { 1: 2, 2: 2, 3: 1, 4: 2, 5: 1, 6: 2, 7: 1, 8: 1, 9: 1 } },
    { patient: 1, assessment: gad7.id, score: 11, severity: 'moderate', daysBack: 21, answers: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 2, 7: 1 } },

    // Beatriz - high anxiety
    { patient: 2, assessment: gad7.id, score: 16, severity: 'severe', daysBack: 25, answers: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2 } },
    { patient: 2, assessment: gad7.id, score: 15, severity: 'severe', daysBack: 10, answers: { 1: 2, 2: 3, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2 } },
    { patient: 2, assessment: phq9.id, score: 10, severity: 'moderate', daysBack: 25, answers: { 1: 1, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 0 } },

    // Diego - recent dip
    { patient: 3, assessment: phq9.id, score: 4, severity: 'minimal', daysBack: 25, answers: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0, 7: 1, 8: 0, 9: 0 } },
    { patient: 3, assessment: phq9.id, score: 12, severity: 'moderate', daysBack: 5, answers: { 1: 2, 2: 2, 3: 1, 4: 2, 5: 1, 6: 2, 7: 1, 8: 1, 9: 0 } },
    { patient: 3, assessment: gad7.id, score: 5, severity: 'mild', daysBack: 25, answers: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 1, 7: 0 } },
    { patient: 3, assessment: gad7.id, score: 10, severity: 'moderate', daysBack: 5, answers: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1 } },

    // Fernanda - fluctuating
    { patient: 4, assessment: phq9.id, score: 11, severity: 'moderate', daysBack: 20, answers: { 1: 2, 2: 1, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 } },
    { patient: 4, assessment: phq9.id, score: 8, severity: 'mild', daysBack: 5, answers: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 0 } },
    { patient: 4, assessment: gad7.id, score: 9, severity: 'mild', daysBack: 20, answers: { 1: 2, 2: 1, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1 } },

    // Luiza Paciente - mild anxiety improving
    { patient: 5, assessment: gad7.id, score: 11, severity: 'moderate', daysBack: 25, answers: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 2, 7: 1 } },
    { patient: 5, assessment: gad7.id, score: 7, severity: 'mild', daysBack: 10, answers: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 } },
    { patient: 5, assessment: phq9.id, score: 8, severity: 'mild', daysBack: 25, answers: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 0 } },
    { patient: 5, assessment: phq9.id, score: 5, severity: 'mild', daysBack: 10, answers: { 1: 1, 2: 1, 3: 0, 4: 1, 5: 0, 6: 1, 7: 1, 8: 0, 9: 0 } },
  ];

  for (const a of assessmentData) {
    await client.query(
      `INSERT INTO assessment_results (patient_id, assessment_id, answers, total_score, severity_level, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [patientIds[a.patient], a.assessment, JSON.stringify(a.answers), a.score, a.severity, daysAgo(a.daysBack)]
    );
  }

  console.log(`  ✅ ${assessmentData.length} assessment results created`);
}

// ---------------------------------------------------------------------------
// 6. Seed medications
// ---------------------------------------------------------------------------

async function seedMedications(client, patientIds, psiquiatraId) {
  console.log('\n💊 Seeding medications...');

  // Get medication IDs
  const { rows: meds } = await client.query('SELECT id, name FROM medications');
  const getMedId = (name) => meds.find(m => m.name === name)?.id;

  const prescriptions = [
    // Ana - on Escitalopram, started during treatment
    { patient: 0, med: 'Escitalopram', dosage: '10mg', frequency: 'Uma vez ao dia, pela manhã', startDays: 25, status: 'active' },
    // Carlos - on Sertraline + Clonazepam
    { patient: 1, med: 'Sertraline', dosage: '50mg', frequency: 'Uma vez ao dia, pela manhã', startDays: 45, status: 'active' },
    { patient: 1, med: 'Clonazepam', dosage: '0.5mg', frequency: 'À noite, antes de dormir', startDays: 45, status: 'active' },
    // Beatriz - on Paroxetine for anxiety
    { patient: 2, med: 'Paroxetine', dosage: '20mg', frequency: 'Uma vez ao dia, pela manhã', startDays: 30, status: 'active' },
    { patient: 2, med: 'Alprazolam', dosage: '0.25mg', frequency: 'SOS em crises de pânico', startDays: 30, status: 'active' },
    // Fernanda - Lamotrigine for mood stabilization
    { patient: 4, med: 'Lamotrigine', dosage: '100mg', frequency: 'Uma vez ao dia', startDays: 60, status: 'active' },
    { patient: 4, med: 'Quetiapine', dosage: '25mg', frequency: 'À noite para sono', startDays: 20, status: 'active' },
    // Luiza Paciente - Buspirone for anxiety
    { patient: 5, med: 'Buspirone', dosage: '10mg', frequency: 'Duas vezes ao dia', startDays: 20, status: 'active' },
  ];

  const prescriptionIds = [];
  for (const p of prescriptions) {
    const medId = getMedId(p.med);
    if (!medId) {
      console.log(`  ⚠️  Medication "${p.med}" not found, skipping`);
      continue;
    }
    const { rows } = await client.query(
      `INSERT INTO patient_medications (patient_id, medication_id, prescribed_by, dosage, frequency, start_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [patientIds[p.patient], medId, psiquiatraId, p.dosage, p.frequency, dateOnly(p.startDays), p.status,
       `Prescrito para ${p.patient === 0 ? 'depressão' : p.patient === 2 ? 'transtorno de ansiedade' : p.patient === 4 ? 'estabilização do humor' : 'tratamento'}`]
    );
    prescriptionIds.push({ id: rows[0].id, patient: p.patient });
  }

  // Add some medication logs (adherence tracking)
  let logCount = 0;
  for (const pres of prescriptionIds) {
    for (let day = 14; day >= 0; day--) {
      const skipped = Math.random() < 0.1; // 10% non-adherence
      await client.query(
        `INSERT INTO medication_logs (patient_medication_id, taken_at, skipped, skip_reason)
         VALUES ($1, $2, $3, $4)`,
        [pres.id, daysAgo(day), skipped, skipped ? 'Esqueci de tomar' : null]
      );
      logCount++;
    }
  }

  console.log(`  ✅ ${prescriptions.length} prescriptions, ${logCount} medication logs created`);
}

// ---------------------------------------------------------------------------
// 7. Seed clinical notes
// ---------------------------------------------------------------------------

async function seedClinicalNotes(client, patientIds, psiquiatraId, psicologaId) {
  console.log('\n📝 Seeding clinical notes...');

  const notes = [
    // Ana - shared patient, notes from both professionals
    {
      professional: psicologaId, patient: 0, type: 'session', daysBack: 25,
      content: 'Primeira sessão com a paciente. Ana relata sentimentos persistentes de tristeza e desesperança há 3 meses. Dificuldade para dormir, perda de apetite. Relação com término recente de relacionamento de 4 anos. Iniciamos trabalho com reestruturação cognitiva. Paciente receptiva ao processo terapêutico.'
    },
    {
      professional: psicologaId, patient: 0, type: 'session', daysBack: 18,
      content: 'Paciente relata leve melhora no humor. Conseguiu sair com amigas no fim de semana. Trabalhamos identificação de pensamentos automáticos negativos. Ana identificou padrão de "tudo ou nada" em relação ao término. Exercício para casa: registro de pensamentos.'
    },
    {
      professional: psicologaId, patient: 0, type: 'progress', daysBack: 11,
      content: 'Progresso significativo. Ana está dormindo melhor desde o início da medicação prescrita pela Dra. Luiza. Humor mais estável. Continua com exercícios de reestruturação cognitiva. Começou atividade física 3x por semana.'
    },
    {
      professional: psicologaId, patient: 0, type: 'session', daysBack: 4,
      content: 'Sessão produtiva. Ana relata estar se sentindo "mais como eu mesma". PHQ-9 caiu de 18 para 7 em 4 semanas. Trabalhamos prevenção de recaída e fortalecimento de estratégias de coping. Próxima sessão: explorar retomada de atividades sociais.'
    },
    {
      professional: psiquiatraId, patient: 0, type: 'observation', daysBack: 25,
      content: 'Avaliação psiquiátrica inicial. Quadro compatível com Episódio Depressivo Moderado (F32.1). Sintomas: humor deprimido, insônia inicial, redução de energia, anedonia parcial. Sem ideação suicida ativa. Início de Escitalopram 10mg/dia. Retorno em 2 semanas.'
    },
    {
      professional: psiquiatraId, patient: 0, type: 'observation', daysBack: 11,
      content: 'Retorno. Paciente tolerando bem Escitalopram 10mg. Relata melhora no sono e apetite. Sem efeitos colaterais significativos (leve náusea nos primeiros dias, já resolvida). Manter dose atual. Próximo retorno em 3 semanas.'
    },

    // Carlos - psiquiatra only
    {
      professional: psiquiatraId, patient: 1, type: 'session', daysBack: 40,
      content: 'Paciente com quadro de Transtorno Depressivo Maior com Ansiedade (F33.1 + F41.1). Em uso de Sertralina 50mg + Clonazepam 0.5mg há 45 dias. Resposta parcial. Considerar aumento de Sertralina para 100mg no próximo retorno se não houver melhora significativa.'
    },
    {
      professional: psiquiatraId, patient: 1, type: 'treatment_plan', daysBack: 35,
      content: 'Plano terapêutico atualizado:\n1. Manter Sertralina 50mg + Clonazepam 0.5mg\n2. Encaminhar para TCC (psicoterapia)\n3. Monitorar sono e ansiedade semanalmente\n4. Reavaliar em 2 semanas\n5. Considerar ajuste posológico se PHQ-9 permanecer >10\n6. Exames laboratoriais: TSH, hemograma, glicemia'
    },
    {
      professional: psiquiatraId, patient: 1, type: 'session', daysBack: 20,
      content: 'Carlos relata picos de ansiedade nas manhãs de segunda-feira (trabalho). Clonazepam controlando parcialmente. Humor levemente melhor mas ainda com anedonia importante. PHQ-9: 13. Manter medicação por mais 2 semanas antes de ajustar.'
    },
    {
      professional: psiquiatraId, patient: 1, type: 'observation', daysBack: 7,
      content: 'Retorno. Persistência do quadro depressivo moderado. Paciente refere não estar fazendo atividade física nem seguindo higiene do sono. Reforçada importância de medidas não farmacológicas. Considerar aumento de Sertralina para 100mg na próxima consulta.'
    },

    // Beatriz - psiquiatra only
    {
      professional: psiquiatraId, patient: 2, type: 'session', daysBack: 28,
      content: 'Avaliação inicial. Beatriz, 27 anos, apresenta Transtorno de Ansiedade Generalizada (F41.1) com ataques de pânico. Relata episódios de pânico 2-3x/semana. Evitação de situações sociais e transporte público. Início de Paroxetina 20mg + Alprazolam 0.25mg SOS.'
    },
    {
      professional: psiquiatraId, patient: 2, type: 'session', daysBack: 14,
      content: 'Retorno 2 semanas. Frequência de ataques de pânico reduziu para 1x/semana. Alprazolam sendo usado em média 2x/semana. Paciente relata efeitos colaterais leves da Paroxetina (sonolência, boca seca). Orientada que tende a melhorar com o tempo. GAD-7 caiu de 16 para 15.'
    },
    {
      professional: psiquiatraId, patient: 2, type: 'observation', daysBack: 3,
      content: 'Última crise de pânico há 5 dias, mais branda que as anteriores. Paciente conseguiu usar técnica de respiração aprendida na terapia antes de recorrer ao Alprazolam. Progresso gradual. Encaminhada para exposição gradual com psicóloga.'
    },

    // Diego - psicologa only
    {
      professional: psicologaId, patient: 3, type: 'session', daysBack: 28,
      content: 'Sessão inicial. Diego procurou atendimento após separação conjugal há 2 semanas. Relata tristeza intensa, dificuldade de concentração no trabalho, insônia. Histórico de bom funcionamento psicológico até o evento. Quadro sugestivo de reação de ajustamento.'
    },
    {
      professional: psicologaId, patient: 3, type: 'session', daysBack: 21,
      content: 'Diego relata piora dos sintomas. Dificuldade em aceitar o fim do casamento. Pensamentos ruminativos sobre "o que poderia ter feito diferente". Trabalhamos aceitação e processamento emocional. Paciente emocionou-se na sessão, o que considero positivo.'
    },
    {
      professional: psicologaId, patient: 3, type: 'session', daysBack: 14,
      content: 'Paciente mais reflexivo. Conseguiu identificar padrão de dependência emocional no relacionamento. Iniciou atividade física (caminhada diária). Ainda com sono prejudicado. Sugeri avaliação psiquiátrica se insônia persistir.'
    },
    {
      professional: psicologaId, patient: 3, type: 'treatment_plan', daysBack: 14,
      content: 'Plano terapêutico:\n1. Sessões semanais de TCC\n2. Foco: processamento do luto do relacionamento\n3. Reestruturação cognitiva para pensamentos ruminativos\n4. Ativação comportamental: atividade física + retomada de hobbies\n5. Monitoramento de sono\n6. Avaliar necessidade de encaminhamento psiquiátrico em 2 semanas'
    },
    {
      professional: psicologaId, patient: 3, type: 'session', daysBack: 7,
      content: 'Diego relata melhora parcial. Voltou a jogar futebol com amigos. Sono ainda irregular (5-6h/noite). No trabalho, rendimento melhorando. PHQ-9 caiu de 12 para 10. Mantemos foco em reestruturação cognitiva e ativação comportamental.'
    },

    // Fernanda - psicologa only
    {
      professional: psicologaId, patient: 4, type: 'session', daysBack: 55,
      content: 'Sessão inicial. Fernanda relata oscilações de humor intensas desde a adolescência. Períodos de alta energia e produtividade alternando com fases de apatia e tristeza. Diagnóstico prévio de Transtorno Bipolar tipo II por psiquiatra anterior. Em uso de Lamotrigina 100mg.'
    },
    {
      professional: psicologaId, patient: 4, type: 'session', daysBack: 40,
      content: 'Trabalhamos psicoeducação sobre transtorno bipolar. Fernanda relata dificuldade em manter rotina regular. Implementamos diário de humor e sono. Identificamos gatilhos: privação de sono e estresse no trabalho tendem a desencadear episódios.'
    },
    {
      professional: psicologaId, patient: 4, type: 'session', daysBack: 25,
      content: 'Fernanda passou por fase hipomaníaca leve (3 dias). Dormiu menos, fez compras impulsivas. Conseguiu identificar o padrão antes de escalar. Aplicamos técnicas de regulação: higiene do sono, atividade física moderada. Encaminhada para Dra. Luiza (psiquiatra) para revisão medicamentosa.'
    },
    {
      professional: psicologaId, patient: 4, type: 'progress', daysBack: 10,
      content: 'Progresso em regulação emocional. Fernanda está usando diário de humor consistentemente. Identificou que manter horários regulares de sono é fator protetor chave. Quetiapina 25mg à noite (prescrita pela psiquiatra) ajudou a estabilizar sono. PHQ-9: 8. Manter acompanhamento semanal.'
    },
    {
      professional: psicologaId, patient: 4, type: 'session', daysBack: 3,
      content: 'Sessão estável. Humor eutímico há 10 dias. Fernanda relata satisfação com tratamento integrado (terapia + medicação). Trabalhamos prevenção de recaída e plano de ação para quando identificar sinais de oscilação. Próxima sessão: relacionamentos interpessoais.'
    },

    // Luiza Paciente - both professionals
    {
      professional: psicologaId, patient: 5, type: 'session', daysBack: 22,
      content: 'Primeira sessão. Luiza relata ansiedade generalizada há 6 meses, intensificada com mudanças no trabalho. Dificuldade para relaxar, tensão muscular, preocupação excessiva com desempenho. Sem histórico psiquiátrico prévio. Início de TCC focada em ansiedade.'
    },
    {
      professional: psicologaId, patient: 5, type: 'session', daysBack: 15,
      content: 'Trabalhamos técnicas de respiração diafragmática e relaxamento muscular progressivo. Luiza praticou durante a semana e relata alguma melhora. Identificamos pensamento catastrófico como padrão principal. Exercício: registro de situações ansiogênicas.'
    },
    {
      professional: psiquiatraId, patient: 5, type: 'observation', daysBack: 20,
      content: 'Avaliação psiquiátrica. Quadro de Transtorno de Ansiedade Generalizada (F41.1). Sem comorbidades significativas. Início de Buspirona 10mg 2x/dia como suporte ao tratamento psicoterápico. Retorno em 3 semanas.'
    },
    {
      professional: psicologaId, patient: 5, type: 'progress', daysBack: 7,
      content: 'Progresso positivo. Luiza está aplicando técnicas de respiração no dia a dia. GAD-7 caiu de 11 para 7. Relata menos episódios de preocupação intensa. Buspirona sem efeitos colaterais relevantes. Continuamos com reestruturação cognitiva.'
    },
  ];

  for (const n of notes) {
    await client.query(
      `INSERT INTO clinical_notes (professional_id, patient_id, session_date, note_type, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [n.professional, patientIds[n.patient], dateOnly(n.daysBack), n.type, n.content]
    );
  }

  console.log(`  ✅ ${notes.length} clinical notes created`);
}

// ---------------------------------------------------------------------------
// 8. Seed life events
// ---------------------------------------------------------------------------

async function seedLifeEvents(client, patientIds) {
  console.log('\n🗓️ Seeding life events...');

  const events = [
    // Ana
    { patient: 0, title: 'Término de relacionamento', description: 'Fim de relacionamento de 4 anos. Decisão mútua mas com grande impacto emocional.', category: 'relationship', impact: 9, daysBack: 90 },
    { patient: 0, title: 'Início da terapia', description: 'Primeiro contato com psicóloga e psiquiatra. Início do tratamento.', category: 'health', impact: 7, daysBack: 25 },
    { patient: 0, title: 'Retomou academia', description: 'Voltou a fazer musculação 3x por semana.', category: 'achievement', impact: 6, daysBack: 12 },

    // Carlos
    { patient: 1, title: 'Promoção no trabalho', description: 'Promovido a gerente de projetos. Aumento de responsabilidades e pressão.', category: 'work', impact: 8, daysBack: 60 },
    { patient: 1, title: 'Conflito familiar', description: 'Discussão séria com irmão sobre herança familiar.', category: 'family', impact: 7, daysBack: 30 },

    // Beatriz
    { patient: 2, title: 'Mudança de cidade', description: 'Mudou de interior para São Paulo para trabalho. Sem rede de apoio local.', category: 'other', impact: 9, daysBack: 120 },
    { patient: 2, title: 'Primeiro ataque de pânico', description: 'Ataque de pânico no metrô. Pensou que estava tendo infarto.', category: 'health', impact: 10, daysBack: 45 },

    // Diego
    { patient: 3, title: 'Separação conjugal', description: 'Esposa pediu separação após 6 anos de casamento. Mudou para apartamento alugado.', category: 'relationship', impact: 10, daysBack: 30 },
    { patient: 3, title: 'Saiu do apartamento conjugal', description: 'Finalizou mudança para novo apartamento. Processo doloroso de dividir bens.', category: 'relationship', impact: 8, daysBack: 20 },
    { patient: 3, title: 'Voltou a jogar futebol', description: 'Reencontrou amigos do futebol de quinta. Sentiu-se acolhido.', category: 'achievement', impact: 6, daysBack: 7 },

    // Fernanda
    { patient: 4, title: 'Episódio hipomaníaco', description: 'Fase de 5 dias com pouco sono, compras impulsivas e projetos grandiosos.', category: 'health', impact: 8, daysBack: 25 },
    { patient: 4, title: 'Início de novo emprego', description: 'Começou como designer em agência criativa. Ambiente estimulante mas potencialmente gatilho.', category: 'work', impact: 7, daysBack: 45 },
    { patient: 4, title: 'Dificuldade financeira', description: 'Gastos impulsivos do último episódio causaram aperto financeiro.', category: 'financial', impact: 7, daysBack: 20 },

    // Luiza Paciente
    { patient: 5, title: 'Mudança de cargo no trabalho', description: 'Assumiu posição com mais responsabilidades. Aumento de estresse e cobrança.', category: 'work', impact: 7, daysBack: 180 },
    { patient: 5, title: 'Início do tratamento', description: 'Decidiu procurar ajuda profissional para ansiedade. Primeiro passo importante.', category: 'health', impact: 6, daysBack: 22 },
    { patient: 5, title: 'Começou yoga', description: 'Iniciou aulas de yoga 2x por semana como complemento ao tratamento.', category: 'achievement', impact: 5, daysBack: 10 },
  ];

  for (const e of events) {
    await client.query(
      `INSERT INTO life_events (patient_id, title, description, category, impact_level, event_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [patientIds[e.patient], e.title, e.description, e.category, e.impact, dateOnly(e.daysBack)]
    );
  }

  console.log(`  ✅ ${events.length} life events created`);
}

// ---------------------------------------------------------------------------
// 9. Seed alerts
// ---------------------------------------------------------------------------

async function seedAlerts(client, patientIds, psiquiatraId, psicologaId) {
  console.log('\n🚨 Seeding alerts...');

  const alerts = [
    {
      patient: 1, type: 'depressive_episode', severity: 'high',
      title: 'Sintomas depressivos persistentes',
      description: 'Carlos mantém PHQ-9 acima de 10 há 3 semanas sem melhora significativa. Considerar ajuste medicamentoso.',
      daysBack: 7, acknowledged: false, acknowledgedBy: null,
    },
    {
      patient: 2, type: 'high_anxiety', severity: 'high',
      title: 'GAD-7 em nível severo',
      description: 'Beatriz apresenta GAD-7 = 15, indicando ansiedade severa. Ataques de pânico continuam, embora com menor frequência.',
      daysBack: 10, acknowledged: true, acknowledgedBy: psiquiatraId,
    },
    {
      patient: 3, type: 'risk_pattern', severity: 'medium',
      title: 'Piora recente de humor',
      description: 'Diego apresentou queda significativa de humor nos últimos 10 dias, possivelmente relacionada à separação. Monitorar de perto.',
      daysBack: 5, acknowledged: false, acknowledgedBy: null,
    },
    {
      patient: 4, type: 'anomaly', severity: 'medium',
      title: 'Oscilação de humor detectada',
      description: 'Fernanda apresenta padrão de oscilação de humor compatível com ciclagem. Variação de 3+ pontos no humor em 48h em 2 ocasiões.',
      daysBack: 12, acknowledged: true, acknowledgedBy: psicologaId,
    },
    {
      patient: 0, type: 'medication_non_adherence', severity: 'low',
      title: 'Falha na adesão medicamentosa',
      description: 'Ana deixou de tomar Escitalopram em 2 dos últimos 7 dias. Reforçar importância da regularidade.',
      daysBack: 3, acknowledged: false, acknowledgedBy: null,
    },
  ];

  for (const a of alerts) {
    await client.query(
      `INSERT INTO alerts (patient_id, alert_type, severity, title, description, is_acknowledged, acknowledged_by, acknowledged_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        patientIds[a.patient], a.type, a.severity, a.title, a.description,
        a.acknowledged, a.acknowledgedBy,
        a.acknowledged ? daysAgo(a.daysBack - 1) : null,
        daysAgo(a.daysBack),
      ]
    );
  }

  console.log(`  ✅ ${alerts.length} alerts created`);
}

// ---------------------------------------------------------------------------
// 10. Seed AI insights
// ---------------------------------------------------------------------------

async function seedInsights(client, patientIds) {
  console.log('\n🤖 Seeding AI insights...');

  const insights = [
    {
      patient: 0, type: 'trend', impact: 'high',
      title: 'Trajetória de recuperação positiva',
      explanation: 'Ana apresenta tendência consistente de melhora nos últimos 25 dias. Humor subiu de 3 para 7, ansiedade caiu de 7 para 4. Padrão compatível com boa resposta ao tratamento combinado (psicoterapia + ISRS).',
      confidence: 0.87,
      recommendations: 'Manter protocolo atual. Considerar espaçamento gradual das sessões em 4-6 semanas se melhora persistir.',
    },
    {
      patient: 0, type: 'correlation', impact: 'medium',
      title: 'Exercício físico correlacionado com melhora de humor',
      explanation: 'Nos dias em que Ana registrou atividade física, o humor médio foi 2.3 pontos superior (p<0.05). Correlação forte entre exercício e qualidade de sono.',
      confidence: 0.79,
      recommendations: 'Encorajar manutenção da rotina de exercícios. Pode ser fator protetor contra recaída.',
    },
    {
      patient: 1, type: 'pattern', impact: 'high',
      title: 'Padrão de ansiedade aos domingos/segundas',
      explanation: 'Carlos apresenta pico de ansiedade consistente aos domingos à noite e segundas pela manhã (score médio 8.2 vs 5.4 nos outros dias). Padrão sugere ansiedade antecipatória relacionada ao trabalho.',
      confidence: 0.92,
      recommendations: 'Trabalhar técnicas de manejo de ansiedade antecipatória. Avaliar fatores estressores específicos do ambiente de trabalho.',
    },
    {
      patient: 2, type: 'risk', impact: 'high',
      title: 'Risco de evitação fóbica em expansão',
      explanation: 'Beatriz evita cada vez mais situações (metrô → ônibus → locais fechados). Padrão de generalização da fobia que pode levar a agorafobia se não tratado. GAD-7 mantém-se em nível severo.',
      confidence: 0.84,
      recommendations: 'Priorizar exposição gradual em terapia. Considerar aumento de Paroxetina para 30mg se ansiedade não responder em 2 semanas.',
    },
    {
      patient: 3, type: 'anomaly', impact: 'medium',
      title: 'Queda abrupta em múltiplos indicadores',
      explanation: 'Diego apresentou queda simultânea em humor (-3 pontos), energia (-3 pontos) e qualidade de sono nos últimos 10 dias. Coincide com período pós-separação. Padrão compatível com luto agudo.',
      confidence: 0.88,
      recommendations: 'Monitorar diariamente. Se piora persistir por mais 2 semanas, considerar avaliação psiquiátrica para suporte farmacológico.',
    },
    {
      patient: 4, type: 'pattern', impact: 'high',
      title: 'Ciclagem de humor com período de ~10 dias',
      explanation: 'Fernanda apresenta oscilações de humor com período aproximado de 10 dias (5 dias em fase "alta", 5 dias em fase "baixa"). Amplitude média: 4.5 pontos. Padrão consistente com Transtorno Bipolar tipo II.',
      confidence: 0.81,
      recommendations: 'Manter Lamotrigina. Monitorar adesão a horários de sono. Considerar diário de humor mais granular (2x/dia) para melhor detecção de ciclagem.',
    },
  ];

  for (const i of insights) {
    await client.query(
      `INSERT INTO ai_insights (patient_id, insight_type, title, explanation, confidence_score, impact_level, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [patientIds[i.patient], i.type, i.title, i.explanation, i.confidence, i.impact, i.recommendations]
    );
  }

  console.log(`  ✅ ${insights.length} AI insights created`);
}

// ---------------------------------------------------------------------------
// 11. Seed symptoms
// ---------------------------------------------------------------------------

async function seedSymptoms(client, patientIds) {
  console.log('\n🩺 Seeding patient symptoms...');

  const { rows: symptoms } = await client.query('SELECT id, name FROM symptoms');
  const getSymptomId = (name) => symptoms.find(s => s.name === name)?.id;

  const patientSymptoms = [
    // Ana
    { patient: 0, symptom: 'Depressed mood', severity: 7, daysBack: 25, notes: 'Tristeza persistente desde o término' },
    { patient: 0, symptom: 'Insomnia', severity: 6, daysBack: 25, notes: 'Demora para dormir, acorda de madrugada' },
    { patient: 0, symptom: 'Anhedonia', severity: 5, daysBack: 25, notes: 'Perda de interesse em atividades que gostava' },
    { patient: 0, symptom: 'Fatigue', severity: 6, daysBack: 20, notes: null },
    { patient: 0, symptom: 'Depressed mood', severity: 3, daysBack: 5, notes: 'Melhorando com tratamento' },

    // Carlos
    { patient: 1, symptom: 'Depressed mood', severity: 6, daysBack: 40, notes: null },
    { patient: 1, symptom: 'Generalized anxiety', severity: 7, daysBack: 40, notes: 'Ansiedade constante com picos no trabalho' },
    { patient: 1, symptom: 'Insomnia', severity: 5, daysBack: 30, notes: null },
    { patient: 1, symptom: 'Difficulty concentrating', severity: 6, daysBack: 20, notes: 'Afetando produtividade no trabalho' },
    { patient: 1, symptom: 'Restlessness', severity: 5, daysBack: 15, notes: null },

    // Beatriz
    { patient: 2, symptom: 'Panic attacks', severity: 9, daysBack: 30, notes: '2-3 ataques por semana' },
    { patient: 2, symptom: 'Generalized anxiety', severity: 8, daysBack: 30, notes: null },
    { patient: 2, symptom: 'Phobic avoidance', severity: 7, daysBack: 25, notes: 'Evita metrô e locais fechados' },
    { patient: 2, symptom: 'Insomnia', severity: 6, daysBack: 25, notes: 'Medo de ter ataque durante a noite' },
    { patient: 2, symptom: 'Somatic complaints', severity: 5, daysBack: 20, notes: 'Taquicardia, sudorese, tontura' },

    // Diego
    { patient: 3, symptom: 'Depressed mood', severity: 7, daysBack: 10, notes: 'Piora após separação' },
    { patient: 3, symptom: 'Insomnia', severity: 6, daysBack: 10, notes: 'Dificuldade para dormir sozinho' },
    { patient: 3, symptom: 'Appetite changes', severity: 5, daysBack: 10, notes: 'Comendo pouco' },
    { patient: 3, symptom: 'Social withdrawal', severity: 4, daysBack: 8, notes: null },

    // Fernanda
    { patient: 4, symptom: 'Mood swings', severity: 7, daysBack: 50, notes: 'Oscilações frequentes' },
    { patient: 4, symptom: 'Insomnia', severity: 5, daysBack: 25, notes: 'Sono irregular nas fases de hipomania' },
    { patient: 4, symptom: 'Racing thoughts', severity: 6, daysBack: 25, notes: 'Durante fases de humor elevado' },
    { patient: 4, symptom: 'Irritability', severity: 5, daysBack: 15, notes: null },

    // Luiza Paciente
    { patient: 5, symptom: 'Generalized anxiety', severity: 6, daysBack: 22, notes: 'Preocupação constante com trabalho' },
    { patient: 5, symptom: 'Restlessness', severity: 5, daysBack: 22, notes: 'Dificuldade para relaxar' },
    { patient: 5, symptom: 'Difficulty concentrating', severity: 4, daysBack: 15, notes: 'Pensamentos dispersos' },
    { patient: 5, symptom: 'Somatic complaints', severity: 4, daysBack: 15, notes: 'Tensão muscular no pescoço e ombros' },
    { patient: 5, symptom: 'Generalized anxiety', severity: 4, daysBack: 5, notes: 'Melhorando com tratamento' },
  ];

  let count = 0;
  for (const ps of patientSymptoms) {
    const symptomId = getSymptomId(ps.symptom);
    if (!symptomId) {
      console.log(`  ⚠️  Symptom "${ps.symptom}" not found, skipping`);
      continue;
    }
    await client.query(
      `INSERT INTO patient_symptoms (patient_id, symptom_id, severity, notes, reported_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [patientIds[ps.patient], symptomId, ps.severity, ps.notes, daysAgo(ps.daysBack)]
    );
    count++;
  }

  console.log(`  ✅ ${count} patient symptoms created`);
}

// ---------------------------------------------------------------------------
// 12. Seed digital twin states
// ---------------------------------------------------------------------------

async function seedDigitalTwin(client, patientIds) {
  console.log('\n🧬 Seeding digital twin states...');

  const twins = [
    {
      patient: 0,
      current_state: {
        mood: { current: 7, avg_7d: 6.5, avg_30d: 5.2, trend: 'improving', slope_7d: 0.35 },
        anxiety: { current: 4, avg_7d: 4.5, avg_30d: 5.8, trend: 'improving', slope_7d: -0.28 },
        energy: { current: 6, avg_7d: 6.0, avg_30d: 4.8, trend: 'improving', slope_7d: 0.22 },
        sleep: { current: 7, avg_7d: 6.5, avg_30d: 5.5, trend: 'improving', slope_7d: 0.18 },
      },
      correlations: [
        { variable_a: 'mood', variable_b: 'sleep', pearson_r: 0.72, p_value: 0.001, direction: 'positive', strength: 'strong', label_pt: 'Humor melhora com sono de qualidade' },
        { variable_a: 'energy', variable_b: 'mood', pearson_r: 0.68, p_value: 0.003, direction: 'positive', strength: 'moderate', label_pt: 'Energia e humor estão correlacionados' },
        { variable_a: 'anxiety', variable_b: 'sleep', pearson_r: -0.55, p_value: 0.01, direction: 'negative', strength: 'moderate', label_pt: 'Ansiedade prejudica qualidade do sono' },
      ],
      predictions: [
        { variable: 'mood', prediction: 'increase', risk_level: 'low', horizon_days: 7, confidence: 0.82, reasoning: 'Tendência de melhora consistente nos últimos 14 dias', based_on: ['emotional_logs', 'assessments'] },
        { variable: 'anxiety', prediction: 'decrease', risk_level: 'low', horizon_days: 7, confidence: 0.75, reasoning: 'Ansiedade em trajetória descendente com tratamento', based_on: ['emotional_logs', 'medications'] },
      ],
      confidence: 0.85, data_points: 30,
    },
    {
      patient: 1,
      current_state: {
        mood: { current: 4, avg_7d: 4.2, avg_30d: 4.1, trend: 'stable', slope_7d: -0.05 },
        anxiety: { current: 6, avg_7d: 6.3, avg_30d: 6.0, trend: 'stable', slope_7d: 0.08 },
        energy: { current: 4, avg_7d: 4.0, avg_30d: 4.2, trend: 'stable', slope_7d: -0.03 },
        sleep: { current: 5, avg_7d: 5.2, avg_30d: 5.0, trend: 'stable', slope_7d: 0.02 },
      },
      correlations: [
        { variable_a: 'anxiety', variable_b: 'energy', pearson_r: -0.61, p_value: 0.005, direction: 'negative', strength: 'moderate', label_pt: 'Ansiedade alta drena energia' },
        { variable_a: 'mood', variable_b: 'anxiety', pearson_r: -0.58, p_value: 0.008, direction: 'negative', strength: 'moderate', label_pt: 'Humor piora com aumento de ansiedade' },
      ],
      predictions: [
        { variable: 'mood', prediction: 'stable', risk_level: 'moderate', horizon_days: 7, confidence: 0.7, reasoning: 'Sem tendência clara de melhora. Medicação pode precisar de ajuste.', based_on: ['emotional_logs', 'assessments', 'medications'] },
      ],
      confidence: 0.72, data_points: 30,
    },
    {
      patient: 3,
      current_state: {
        mood: { current: 4, avg_7d: 4.5, avg_30d: 6.2, trend: 'worsening', slope_7d: -0.45 },
        anxiety: { current: 6, avg_7d: 5.8, avg_30d: 3.8, trend: 'worsening', slope_7d: 0.38 },
        energy: { current: 4, avg_7d: 4.3, avg_30d: 6.5, trend: 'worsening', slope_7d: -0.42 },
        sleep: { current: 5, avg_7d: 5.0, avg_30d: 7.0, trend: 'worsening', slope_7d: -0.35 },
      },
      correlations: [
        { variable_a: 'mood', variable_b: 'sleep', pearson_r: 0.78, p_value: 0.0005, direction: 'positive', strength: 'strong', label_pt: 'Sono e humor caíram juntos' },
      ],
      predictions: [
        { variable: 'mood', prediction: 'stable', risk_level: 'moderate', horizon_days: 7, confidence: 0.65, reasoning: 'Queda recente pode se estabilizar com suporte terapêutico. Monitorar de perto.', based_on: ['emotional_logs', 'life_events'] },
      ],
      confidence: 0.68, data_points: 30,
    },
  ];

  for (const t of twins) {
    await client.query(
      `INSERT INTO digital_twin_states (patient_id, current_state, correlations, predictions, data_points_used, confidence_overall, model_version)
       VALUES ($1, $2, $3, $4, $5, $6, '1.0')`,
      [
        patientIds[t.patient],
        JSON.stringify(t.current_state),
        JSON.stringify(t.correlations),
        JSON.stringify(t.predictions),
        t.data_points,
        t.confidence,
      ]
    );
  }

  console.log(`  ✅ ${twins.length} digital twin states created`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 CLARITA Seed: Professional + Patient Journeys');
  console.log('================================================');
  console.log(`Backend: ${BASE_URL}`);

  try {
    // 1. Register professionals
    const psiquiatra = await registerProfessionals();
    const psicologa = await registerPsicologa();

    const psiquiatraId = psiquiatra.user.id;
    const psicologaId = psicologa.user.id;

    console.log(`\n  Psiquiatra ID: ${psiquiatraId}`);
    console.log(`  Psicóloga ID: ${psicologaId}`);

    // 2. Register Luiza Paciente (test patient)
    const luizaPaciente = await registerLuizaPaciente();
    const luizaPacienteId = luizaPaciente.user.id;
    console.log(`\n  Luiza Paciente ID: ${luizaPacienteId}`);

    // 3. Register fictional patients
    const patients = await registerPatients();
    const patientIds = patients.map(p => p.user.id);

    console.log('\n  Patient IDs:');
    PATIENTS.forEach((p, i) => console.log(`    ${p.first_name} ${p.last_name}: ${patientIds[i]}`));

    // 4. Setup care relationships & data (direct SQL)
    const { client, pool } = await setupRelationshipsSQL(psiquiatraId, psicologaId, patientIds, luizaPacienteId);

    try {
      await client.query('BEGIN');

      // Include Luiza Paciente as index 5 in the array
      const allPatientIds = [...patientIds, luizaPacienteId];

      // 5-13. Seed all journey data
      await seedEmotionalLogs(client, allPatientIds);
      await seedAssessments(client, allPatientIds);
      await seedMedications(client, allPatientIds, psiquiatraId);
      await seedClinicalNotes(client, allPatientIds, psiquiatraId, psicologaId);
      await seedLifeEvents(client, allPatientIds);
      await seedAlerts(client, allPatientIds, psiquiatraId, psicologaId);
      await seedInsights(client, allPatientIds);
      await seedSymptoms(client, allPatientIds);
      await seedDigitalTwin(client, allPatientIds);

      await client.query('COMMIT');

      console.log('\n================================================');
      console.log('🎉 Seed completed successfully!');
      console.log('\n📋 Summary:');
      console.log('  Professionals:');
      console.log('    - luiza.psiquiatra@teste.com (psychiatrist) → 4 patients');
      console.log('    - luiza.psicologa@teste.com (psychologist) → 4 patients');
      console.log('  Patients:');
      console.log('    - Ana Oliveira (SHARED between both)');
      console.log('    - Carlos Santos (psiquiatra only)');
      console.log('    - Beatriz Ferreira (psiquiatra only)');
      console.log('    - Diego Mendes (psicóloga only)');
      console.log('    - Fernanda Lima (psicóloga only)');
      console.log('    - Luiza Paciente (SHARED between both - test patient)');
      console.log('\n🔑 Login credentials:');
      console.log('  Psiquiatra: luiza.psiquiatra@teste.com / JCHh14025520');
      console.log('  Psicóloga:  luiza.psicologa@teste.com / JCHh14025520');
      console.log('  Paciente:   luiza.paciente@teste.com / JCHH14025520');
      console.log('  Outros:     [name]@teste.com / Teste1234');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
      pool.end();
    }

    process.exit(0);
  } catch (err) {
    console.error('\n💥 Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
