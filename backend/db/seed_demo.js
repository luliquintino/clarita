#!/usr/bin/env node
'use strict';

/**
 * CLARITA — Demo Seed Script
 *
 * Populates complete demo data for all user profiles directly via DB.
 * No running backend required. Safe to run multiple times (idempotent).
 *
 * Usage: node db/seed_demo.js  OR  npm run db:demo
 *
 * Demo credentials:
 *   Psychiatrist : pedro@clarita.demo / Demo1234
 *   Psychologist : ana@clarita.demo   / Demo1234
 *   Patient      : maria@clarita.demo / Demo1234
 *   Patient      : joao@clarita.demo  / Demo1234
 *
 * Prerequisites: npm run db:init && npm run db:seed
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateOnly(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ---------------------------------------------------------------------------
// Demo user definitions
// ---------------------------------------------------------------------------

const DEMO_USERS = {
  pedro: {
    email: 'pedro@clarita.demo',
    first_name: 'Pedro',
    last_name: 'Alves',
    role: 'psychiatrist',
    license_number: 'CRM-SP 999001',
    specialization: 'Psiquiatria clínica e transtornos de humor',
    institution: 'Clínica Clarita Demo',
    years_of_experience: 12,
  },
  ana: {
    email: 'ana@clarita.demo',
    first_name: 'Ana',
    last_name: 'Costa',
    role: 'psychologist',
    license_number: 'CRP 06/999002',
    specialization: 'Terapia cognitivo-comportamental',
    institution: 'Clínica Clarita Demo',
    years_of_experience: 8,
  },
  maria: {
    email: 'maria@clarita.demo',
    first_name: 'Maria',
    last_name: 'Santos',
    role: 'patient',
    date_of_birth: '1992-04-10',
    gender: 'feminino',
  },
  joao: {
    email: 'joao@clarita.demo',
    first_name: 'João',
    last_name: 'Ferreira',
    role: 'patient',
    date_of_birth: '1988-09-22',
    gender: 'masculino',
  },
};

// ---------------------------------------------------------------------------
// Upsert user (returns id)
// ---------------------------------------------------------------------------

async function generateDisplayId(client) {
  for (let i = 0; i < 5; i++) {
    const code = 'CLA-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const { rows } = await client.query('SELECT 1 FROM users WHERE display_id = $1', [code]);
    if (rows.length === 0) return code;
  }
  return 'CLA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function upsertUser(client, userData, hash) {
  // Check if user already exists
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [userData.email]);
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE users SET password_hash = $1, email_verified = true, is_active = true WHERE email = $2`,
      [hash, userData.email]
    );
    return existing.rows[0].id;
  }

  const displayId = await generateDisplayId(client);
  const { rows } = await client.query(
    `INSERT INTO users (id, email, password_hash, role, first_name, last_name, email_verified, is_active, display_id)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true, true, $6)
     RETURNING id`,
    [userData.email, hash, userData.role, userData.first_name, userData.last_name, displayId]
  );
  return rows[0].id;
}

// ---------------------------------------------------------------------------
// Clean existing demo data (idempotency)
// ---------------------------------------------------------------------------

async function cleanDemoData(client, ids) {
  console.log('  Cleaning previous demo data...');
  const patientIds = [ids.maria, ids.joao];
  const professionalIds = [ids.pedro, ids.ana];

  // Delete in FK-safe order
  await client.query('DELETE FROM patient_test_sessions WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM assessment_results WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM emotional_logs WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM life_events WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM goals WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM patient_medications WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM clinical_notes WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM care_relationships WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM data_permissions WHERE patient_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM patient_profiles WHERE user_id = ANY($1)', [patientIds]);
  await client.query('DELETE FROM professional_profiles WHERE user_id = ANY($1)', [professionalIds]);
}

// ---------------------------------------------------------------------------
// Seed profiles
// ---------------------------------------------------------------------------

async function seedProfiles(client, ids) {
  console.log('  Seeding profiles...');

  // Patient profiles
  for (const [key, data] of [['maria', DEMO_USERS.maria], ['joao', DEMO_USERS.joao]]) {
    await client.query(
      `INSERT INTO patient_profiles (user_id, date_of_birth, gender, onboarding_completed)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id) DO NOTHING`,
      [ids[key], data.date_of_birth, data.gender]
    );
  }

  // Professional profiles
  for (const [key, data] of [['pedro', DEMO_USERS.pedro], ['ana', DEMO_USERS.ana]]) {
    await client.query(
      `INSERT INTO professional_profiles
         (user_id, license_number, specialization, institution, years_of_experience)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO NOTHING`,
      [ids[key], data.license_number, data.specialization, data.institution, data.years_of_experience]
    );
  }
}

// ---------------------------------------------------------------------------
// Seed care relationships
// ---------------------------------------------------------------------------

async function seedCareRelationships(client, ids) {
  console.log('  Seeding care relationships...');
  const pairs = [
    [ids.maria, ids.pedro, 'psychiatrist'],
    [ids.maria, ids.ana,   'psychologist'],
    [ids.joao,  ids.pedro, 'psychiatrist'],
    [ids.joao,  ids.ana,   'psychologist'],
  ];
  for (const [patientId, professionalId, type] of pairs) {
    await client.query(
      `INSERT INTO care_relationships
         (patient_id, professional_id, relationship_type, status, started_at)
       VALUES ($1, $2, $3, 'active', NOW() - interval '60 days')`,
      [patientId, professionalId, type]
    );
  }
}

// ---------------------------------------------------------------------------
// Seed data permissions
// ---------------------------------------------------------------------------

async function seedDataPermissions(client, ids) {
  console.log('  Seeding data permissions...');
  const permissions = ['emotional_logs', 'symptoms', 'medications', 'assessments', 'life_events', 'clinical_notes'];
  const pairs = [
    [ids.maria, ids.pedro],
    [ids.maria, ids.ana],
    [ids.joao,  ids.pedro],
    [ids.joao,  ids.ana],
  ];
  for (const [patientId, professionalId] of pairs) {
    for (const perm of permissions) {
      await client.query(
        `INSERT INTO data_permissions (patient_id, professional_id, permission_type, granted)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (patient_id, professional_id, permission_type) DO UPDATE SET granted = true`,
        [patientId, professionalId, perm]
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Seed emotional logs (30 days each patient)
// ---------------------------------------------------------------------------

async function seedEmotionalLogs(client, ids) {
  console.log('  Seeding emotional logs (30 days × 2 patients)...');

  // Check if journal_entry column exists
  const { rows: jeCols } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='emotional_logs' AND column_name='journal_entry'`
  );
  const hasJournalEntry = jeCols.length > 0;

  const journalPool = [
    'Hoje foi difícil. Senti muita ansiedade no trabalho, mas consegui usar a respiração.',
    'Sessão de terapia foi importante. Percebi padrões que não via antes.',
    'Dormi mal novamente. Acordei várias vezes pensando no trabalho.',
    'Consegui sair para caminhar. Me senti muito melhor depois do exercício.',
    'Dia mais tranquilo. Passei tempo com a família e isso me fez bem.',
  ];
  const journalDays = [25, 20, 15, 10, 5];

  // Maria: depression improving trend
  for (let day = 29; day >= 0; day--) {
    const progress = (29 - day) / 29; // 0 → 1 as days pass
    const mood = clamp(Math.round(3 + progress * 4 + (Math.random() - 0.5)), 1, 10);
    const anxiety = clamp(Math.round(8 - progress * 3.5 + (Math.random() - 0.5)), 1, 10);
    const energy = clamp(Math.round(3 + progress * 3 + (Math.random() - 0.5)), 1, 10);
    const sleepOptions = ['poor', 'poor', 'fair', 'fair', 'good'];
    const sleepIdx = Math.min(Math.floor(progress * sleepOptions.length), sleepOptions.length - 1);
    const sleepQuality = sleepOptions[sleepIdx];
    const sleepHours = +(5 + progress * 2 + (Math.random() - 0.5)).toFixed(1);

    const journalIdx = journalDays.indexOf(day);
    const journalEntry = hasJournalEntry && journalIdx >= 0 ? journalPool[journalIdx] : null;

    const cols = hasJournalEntry
      ? '(patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, journal_entry, logged_at)'
      : '(patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, logged_at)';
    const vals = hasJournalEntry
      ? [ids.maria, mood, anxiety, energy, sleepQuality, sleepHours, journalEntry, daysAgo(day)]
      : [ids.maria, mood, anxiety, energy, sleepQuality, sleepHours, daysAgo(day)];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

    await client.query(`INSERT INTO emotional_logs ${cols} VALUES (${placeholders})`, vals);
  }

  // João: anxiety-dominant, stable mood
  for (let day = 29; day >= 0; day--) {
    const mood = clamp(Math.round(5 + (Math.random() - 0.5) * 2), 1, 10);
    const anxiety = clamp(Math.round(8 + Math.sin(day * 0.7) * 1.5 + (Math.random() - 0.5)), 1, 10);
    const energy = clamp(Math.round(5 + (Math.random() - 0.5) * 2), 1, 10);
    const sleepQuality = ['fair', 'poor', 'fair', 'fair', 'good'][Math.floor(Math.random() * 5)];
    const sleepHours = +(6 + (Math.random() - 0.5)).toFixed(1);

    const journalIdx = journalDays.indexOf(day);
    const journalEntry = hasJournalEntry && journalIdx >= 0 ? journalPool[journalIdx] : null;

    const cols = hasJournalEntry
      ? '(patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, journal_entry, logged_at)'
      : '(patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, logged_at)';
    const vals = hasJournalEntry
      ? [ids.joao, mood, anxiety, energy, sleepQuality, sleepHours, journalEntry, daysAgo(day)]
      : [ids.joao, mood, anxiety, energy, sleepQuality, sleepHours, daysAgo(day)];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

    await client.query(`INSERT INTO emotional_logs ${cols} VALUES (${placeholders})`, vals);
  }
}

// ---------------------------------------------------------------------------
// Seed medications
// ---------------------------------------------------------------------------

async function seedMedications(client, ids) {
  console.log('  Seeding medications...');

  const { rows: meds } = await client.query(
    `SELECT id, name FROM medications WHERE name IN ('Escitalopram', 'Sertralina', 'Clonazepam', 'Buspirona',
     'Sertraline', 'Buspirone', 'Clonazepam (Rivotril)', 'Escitalopram (Lexapro)')`
  );

  if (meds.length === 0) {
    console.log('  ⚠ No medications found in DB — run npm run db:seed first. Skipping medications.');
    return;
  }

  const byName = {};
  for (const m of meds) byName[m.name.toLowerCase()] = m.id;

  const getMedId = (names) => {
    for (const n of names) {
      const id = byName[n.toLowerCase()];
      if (id) return id;
    }
    return null;
  };

  const mariaMeds = [
    { names: ['Escitalopram', 'escitalopram (lexapro)'], dosage: '10mg', frequency: 'Uma vez ao dia, pela manhã', days: 45 },
    { names: ['Clonazepam', 'clonazepam (rivotril)'], dosage: '0,5mg', frequency: 'À noite, antes de dormir', days: 45 },
  ];
  const joaoMeds = [
    { names: ['Sertralina', 'sertraline'], dosage: '50mg', frequency: 'Uma vez ao dia, pela manhã', days: 30 },
    { names: ['Buspirona', 'buspirone'], dosage: '10mg', frequency: 'Duas vezes ao dia', days: 30 },
  ];

  for (const med of mariaMeds) {
    const medId = getMedId(med.names);
    if (!medId) { console.log(`  ⚠ Medication not found: ${med.names[0]}`); continue; }
    await client.query(
      `INSERT INTO patient_medications (patient_id, medication_id, prescribed_by, dosage, frequency, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [ids.maria, medId, ids.pedro, med.dosage, med.frequency, dateOnly(med.days)]
    );
  }

  for (const med of joaoMeds) {
    const medId = getMedId(med.names);
    if (!medId) { console.log(`  ⚠ Medication not found: ${med.names[0]}`); continue; }
    await client.query(
      `INSERT INTO patient_medications (patient_id, medication_id, prescribed_by, dosage, frequency, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [ids.joao, medId, ids.pedro, med.dosage, med.frequency, dateOnly(med.days)]
    );
  }
}

// ---------------------------------------------------------------------------
// Seed assessment results
// ---------------------------------------------------------------------------

async function seedAssessmentResults(client, ids) {
  console.log('  Seeding assessment results...');

  const { rows: assessments } = await client.query(
    `SELECT id, name FROM assessments WHERE name IN ('PHQ-9', 'GAD-7')`
  );

  if (assessments.length === 0) {
    console.log('  ⚠ No assessments found in DB — run npm run db:seed first. Skipping.');
    return;
  }

  const byName = {};
  for (const a of assessments) byName[a.name] = a.id;

  const sessions = [
    // Maria — PHQ-9 (depression, improving)
    { patientId: ids.maria, assessmentName: 'PHQ-9', daysBack: 28, score: 16, severity: 'moderately_severe',
      answers: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 1, 6: 2, 7: 2, 8: 1, 9: 0 } },
    { patientId: ids.maria, assessmentName: 'PHQ-9', daysBack: 7, score: 9, severity: 'mild',
      answers: { 1: 1, 2: 1, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 0 } },
    // João — GAD-7 (anxiety, stable-high)
    { patientId: ids.joao, assessmentName: 'GAD-7', daysBack: 28, score: 15, severity: 'severe',
      answers: { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2 } },
    { patientId: ids.joao, assessmentName: 'GAD-7', daysBack: 7, score: 11, severity: 'moderate',
      answers: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 2, 7: 1 } },
  ];

  for (const s of sessions) {
    const assessmentId = byName[s.assessmentName];
    if (!assessmentId) { console.log(`  ⚠ Assessment not found: ${s.assessmentName}`); continue; }
    await client.query(
      `INSERT INTO assessment_results
         (patient_id, assessment_id, answers, total_score, severity_level, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.patientId, assessmentId, JSON.stringify(s.answers), s.score, s.severity, daysAgo(s.daysBack)]
    );
  }
}

// ---------------------------------------------------------------------------
// Seed life events
// ---------------------------------------------------------------------------

async function seedLifeEvents(client, ids) {
  console.log('  Seeding life events...');

  const events = [
    // Maria
    { patientId: ids.maria, title: 'Separação do marido',
      description: 'Término de um relacionamento de 7 anos. Período de grande instabilidade emocional.',
      category: 'relationship', impact: 9, daysBack: 90 },
    { patientId: ids.maria, title: 'Início do tratamento psiquiátrico',
      description: 'Primeira consulta com psiquiatra e início do uso de medicação.',
      category: 'health', impact: 7, daysBack: 45 },
    { patientId: ids.maria, title: 'Retomou aulas de pilates',
      description: 'Voltou à prática de exercícios físicos após período de isolamento.',
      category: 'achievement', impact: 5, daysBack: 15 },
    // João
    { patientId: ids.joao, title: 'Demissão do emprego',
      description: 'Demitido após reestruturação da empresa onde trabalhava há 5 anos.',
      category: 'work', impact: 9, daysBack: 60 },
    { patientId: ids.joao, title: 'Início da terapia',
      description: 'Primeiro atendimento psicológico. Decisão de buscar ajuda profissional.',
      category: 'health', impact: 7, daysBack: 30 },
    { patientId: ids.joao, title: 'Conseguiu novo emprego',
      description: 'Contratado para nova posição com salário melhor e maior flexibilidade.',
      category: 'achievement', impact: 8, daysBack: 10 },
  ];

  for (const e of events) {
    await client.query(
      `INSERT INTO life_events (patient_id, title, description, category, impact_level, event_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [e.patientId, e.title, e.description, e.category, e.impact, dateOnly(e.daysBack)]
    );
  }
}

// ---------------------------------------------------------------------------
// Seed clinical notes
// ---------------------------------------------------------------------------

async function seedClinicalNotes(client, ids) {
  console.log('  Seeding clinical notes (8 total)...');

  const notes = [
    // Maria ← Pedro (psychiatrist)
    { professionalId: ids.pedro, patientId: ids.maria, noteType: 'observation', daysBack: 40,
      content: 'Avaliação psiquiátrica inicial. Paciente apresenta sintomas compatíveis com Episódio Depressivo Maior (CID-10 F32.1). Relata humor deprimido persistente, anedonia, insônia inicial e pensamentos negativos recorrentes há aproximadamente 3 meses, associados à separação conjugal. Sem ideação suicida. Iniciada farmacoterapia com Escitalopram 10mg/dia e Clonazepam 0,5mg à noite. Retorno em 30 dias.' },
    { professionalId: ids.pedro, patientId: ids.maria, noteType: 'progress', daysBack: 14,
      content: 'Retorno após 30 dias. Paciente relata boa tolerância à medicação, sem efeitos adversos significativos. Melhora parcial do sono e do humor. Ainda apresenta episódios de choro e ruminação. Mantida conduta atual. Reforçada a importância da adesão ao tratamento e da psicoterapia.' },
    // Maria ← Ana (psychologist)
    { professionalId: ids.ana, patientId: ids.maria, noteType: 'session', daysBack: 35,
      content: 'Primeira sessão de psicoterapia. Paciente demonstra bom insight sobre seu quadro. Trabalho focado na identificação de pensamentos automáticos negativos relacionados à separação. Abordagem: TCC. Identificados padrões de catastrofização e leitura mental. Tarefas de casa: diário de pensamentos e registro de atividades prazerosas.' },
    { professionalId: ids.ana, patientId: ids.maria, noteType: 'progress', daysBack: 10,
      content: 'Progressos significativos nas últimas semanas. Paciente retomou atividades de lazer (pilates, encontros com amigas). Maior flexibilidade cognitiva ao lidar com pensamentos sobre a separação. Continua trabalhando a autoimagem e autonomia emocional. Próximo foco: estabelecer rotina de autocuidado.' },
    // João ← Pedro (psychiatrist)
    { professionalId: ids.pedro, patientId: ids.joao, noteType: 'observation', daysBack: 28,
      content: 'Avaliação psiquiátrica. Paciente com Transtorno de Ansiedade Generalizada (CID-10 F41.1). Relata preocupação excessiva e incontrolável, tensão muscular, dificuldade de concentração e insônia de manutenção. Quadro exacerbado após demissão recente. Iniciados Sertralina 50mg/dia e Buspirona 10mg 2x/dia. Orientado sobre técnicas de relaxamento.' },
    { professionalId: ids.pedro, patientId: ids.joao, noteType: 'session', daysBack: 10,
      content: 'Reavaliação após 18 dias. Resposta parcial à farmacoterapia. Ansiedade ainda elevada, especialmente em situações sociais e relacionadas ao trabalho. Sono com melhora discreta. Mantida conduta. Reforçada a prática de técnicas de respiração diafragmática e a continuidade da psicoterapia.' },
    // João ← Ana (psychologist)
    { professionalId: ids.ana, patientId: ids.joao, noteType: 'session', daysBack: 25,
      content: 'Primeira sessão. Paciente apresenta padrões de pensamento catastrófico, especialmente em relação à carreira e futuro financeiro. Identificados gatilhos principais: reuniões profissionais, conversas sobre emprego e mídias sociais. Abordagem TCC. Iniciado trabalho de reestruturação cognitiva e exposição gradual.' },
    { professionalId: ids.ana, patientId: ids.joao, noteType: 'treatment_plan', daysBack: 12,
      content: 'Plano terapêutico estabelecido: sessões semanais por 3 meses. Objetivos: (1) reduzir frequência e intensidade das preocupações excessivas, (2) desenvolver estratégias de enfrentamento adaptativas, (3) melhorar qualidade do sono. Técnicas: TCC, mindfulness, treino de relaxamento muscular progressivo e resolução de problemas.' },
  ];

  for (const n of notes) {
    await client.query(
      `INSERT INTO clinical_notes
         (professional_id, patient_id, session_date, note_type, content, is_private)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [n.professionalId, n.patientId, daysAgo(n.daysBack), n.noteType, n.content]
    );
  }
}

// ---------------------------------------------------------------------------
// Seed goals
// ---------------------------------------------------------------------------

async function seedGoals(client, ids) {
  console.log('  Seeding goals...');

  // Check if patient_status column exists
  const { rows: gCols } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='goals' AND column_name='patient_status'`
  );
  const hasPatientStatus = gCols.length > 0;

  const goals = [
    { patientId: ids.maria, createdBy: ids.ana,
      title: 'Estabelecer rotina de sono regular',
      description: 'Dormir e acordar no mesmo horário todos os dias, incluindo fins de semana. Meta: 7-8 horas por noite.',
      daysUntilTarget: 30 },
    { patientId: ids.maria, createdBy: ids.ana,
      title: 'Retomar atividade física',
      description: 'Praticar exercício moderado pelo menos 3 vezes por semana. Qualquer atividade conta: caminhada, pilates, natação.',
      daysUntilTarget: 60 },
    { patientId: ids.joao, createdBy: ids.ana,
      title: 'Reduzir ansiedade no trabalho',
      description: 'Aplicar técnicas de respiração e mindfulness antes de reuniões importantes. Registrar no app como se sentiu.',
      daysUntilTarget: 45 },
    { patientId: ids.joao, createdBy: ids.pedro,
      title: 'Manter diário de humor diário',
      description: 'Registrar humor, ansiedade e energia todos os dias no aplicativo Clarita. Ajuda a identificar padrões e gatilhos.',
      daysUntilTarget: 30 },
  ];

  for (const g of goals) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + g.daysUntilTarget);

    if (hasPatientStatus) {
      await client.query(
        `INSERT INTO goals
           (patient_id, created_by, title, description, status, target_date, patient_status, responded_at)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, 'accepted', NOW())`,
        [g.patientId, g.createdBy, g.title, g.description, targetDate.toISOString().split('T')[0]]
      );
    } else {
      await client.query(
        `INSERT INTO goals (patient_id, created_by, title, description, status, target_date)
         VALUES ($1, $2, $3, $4, 'in_progress', $5)`,
        [g.patientId, g.createdBy, g.title, g.description, targetDate.toISOString().split('T')[0]]
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Seed psych test sessions (optional — guarded)
// ---------------------------------------------------------------------------

async function seedPsychTestSessions(client, ids) {
  // Check if psychological_tests table exists
  const { rows: tr } = await client.query(
    `SELECT to_regclass('public.psychological_tests') AS t`
  );
  if (!tr[0].t) {
    console.log('  ⚠ Skipping psych test sessions (psychological_tests table not found — run seed_psych_tests.sql first)');
    return;
  }

  const { rows: tests } = await client.query(
    `SELECT id, name FROM psychological_tests WHERE name IN ('PHQ-9', 'GAD-7') AND is_active = true`
  );
  if (tests.length === 0) {
    console.log('  ⚠ Skipping psych test sessions (PHQ-9/GAD-7 not found in psychological_tests)');
    return;
  }

  console.log('  Seeding psych test sessions...');
  const byName = {};
  for (const t of tests) byName[t.name] = t.id;

  const sessions = [
    { patientId: ids.maria, testName: 'PHQ-9', assignedBy: ids.pedro, daysBack: 7,
      score: 9, answers: { 0: 1, 1: 1, 2: 2, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 0 } },
    { patientId: ids.joao, testName: 'GAD-7', assignedBy: ids.ana, daysBack: 7,
      score: 11, answers: { 0: 2, 1: 2, 2: 2, 3: 1, 4: 1, 5: 2, 6: 1 } },
  ];

  for (const s of sessions) {
    const testId = byName[s.testName];
    if (!testId) continue;
    await client.query(
      `INSERT INTO patient_test_sessions
         (test_id, patient_id, assigned_by, status, answers, total_score, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6)`,
      [testId, s.patientId, s.assignedBy, JSON.stringify(s.answers), s.score, daysAgo(s.daysBack)]
    );
  }
}

// ---------------------------------------------------------------------------
// Print summary
// ---------------------------------------------------------------------------

function printSummary() {
  console.log('\n' + '='.repeat(54));
  console.log('Demo seed completed successfully!\n');
  console.log('Login credentials:');
  console.log('  Psiquiatra : pedro@clarita.demo / Demo1234');
  console.log('  Psicóloga  : ana@clarita.demo   / Demo1234');
  console.log('  Paciente   : maria@clarita.demo  / Demo1234');
  console.log('  Paciente   : joao@clarita.demo   / Demo1234');
  console.log('\nData seeded per patient:');
  console.log('  · 30 emotional logs (incl. 5 journal entries)');
  console.log('  · 2 active medications');
  console.log('  · 2 assessment results (PHQ-9 or GAD-7)');
  console.log('  · 3 life events');
  console.log('  · 4 clinical notes (2 per professional)');
  console.log('  · 2 goals');
  console.log('='.repeat(54) + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\nCLARITA Demo Seed');
  console.log('=================');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set. Create backend/.env with DATABASE_URL.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('\n[1/2] Upserting demo users...');
    const hash = await bcrypt.hash('Demo1234', 10);

    const ids = {};
    for (const [key, data] of Object.entries(DEMO_USERS)) {
      ids[key] = await upsertUser(client, data, hash);
      console.log(`  ✓ ${data.first_name} ${data.last_name} (${data.role}) — ${ids[key]}`);
    }

    console.log('\n[2/2] Seeding demo data...');
    await client.query('BEGIN');

    await cleanDemoData(client, ids);
    await seedProfiles(client, ids);
    await seedCareRelationships(client, ids);
    await seedDataPermissions(client, ids);
    await seedEmotionalLogs(client, ids);
    await seedMedications(client, ids);
    await seedAssessmentResults(client, ids);
    await seedLifeEvents(client, ids);
    await seedClinicalNotes(client, ids);
    await seedGoals(client, ids);
    await seedPsychTestSessions(client, ids);

    await client.query('COMMIT');
    printSummary();
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n✗ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
