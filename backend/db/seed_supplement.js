#!/usr/bin/env node
'use strict';

/**
 * CLARITA — Seed Supplement
 * Adds missing demo data without removing existing records:
 *   - CID-11 diagnoses for Maria and João (via Pedro)
 *   - Assessment results (PHQ-9 + GAD-7) at 3 time points per patient
 *   - Completes 4 pending psych test sessions with realistic answers
 *   - Adds Pedro's clinical notes and goals for both patients
 *
 * Usage: node db/seed_supplement.js
 */

const API = process.env.API_URL || 'https://clarita-production.up.railway.app/api';

const MARIA_ID = '95849831-6ac5-43bc-b7c2-485760dd12fc';
const JOAO_ID  = 'b93ed0ca-462c-431f-8683-dc8fcc410265';
const PEDRO_ID = '0cc389e7-04d0-4584-8f4c-e08c2f64aa21';

// Psych test session IDs (already assigned, pending completion)
const MARIA_DASS21_SESSION = '77f60bf4-351b-4cf2-9645-1d350f4f2329';
const MARIA_PHQ9_SESSION   = '0f6a1f48-930f-497d-8c51-e60c91e6704a';
const JOAO_BAI_SESSION     = '96cdd5c6-64d6-44fa-ac06-4f812390ad88';
const JOAO_GAD7_SESSION    = '9e2aa627-3cdc-4f24-8fd3-08e19be951f0';

// Standard assessment IDs (for /assessment-results)
const GAD7_ASSESSMENT_ID = '9e11d69c-e46e-4a8f-bbfb-965b5a9ea506';
const PHQ9_ASSESSMENT_ID = '4eed65e1-5559-4212-a919-22172973965f';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function api(endpoint, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  const { status, data } = await api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (status !== 200 || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.token;
}

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

// ---------------------------------------------------------------------------
// 1. Diagnoses (Pedro assigns CID-11 diagnoses)
// ---------------------------------------------------------------------------

async function seedDiagnoses(pedroToken) {
  console.log('\n[1/5] Diagnoses...');

  const diagnoses = [
    // Maria — depressive pattern improving
    {
      patientId: MARIA_ID,
      icd_code: 'F33.1',
      icd_name: 'Transtorno depressivo recorrente, episódio atual moderado',
      certainty: 'confirmed',
      notes: 'Paciente apresenta episódio moderado com resposta gradual ao tratamento. Monitoramento quinzenal.',
    },
    {
      patientId: MARIA_ID,
      icd_code: 'F41.1',
      icd_name: 'Transtorno de ansiedade generalizada',
      certainty: 'suspected',
      notes: 'Sintomas ansiosos presentes, possivelmente secundários ao quadro depressivo. Reavaliar em 30 dias.',
    },
    // João — anxiety pattern
    {
      patientId: JOAO_ID,
      icd_code: 'F41.1',
      icd_name: 'Transtorno de ansiedade generalizada',
      certainty: 'confirmed',
      notes: 'Quadro estabelecido há 8 meses. Paciente relativamente estável com intervenções psiquiátricas.',
    },
    {
      patientId: JOAO_ID,
      icd_code: 'F41.0',
      icd_name: 'Transtorno de pânico',
      certainty: 'suspected',
      notes: 'Relato de episódios compatíveis com pânico nos últimos 2 meses. Investigação em andamento.',
    },
  ];

  for (const d of diagnoses) {
    const { status, data } = await api(`/patients/${d.patientId}/diagnoses`, {
      method: 'POST',
      token: pedroToken,
      body: {
        icd_code: d.icd_code,
        icd_name: d.icd_name,
        certainty: d.certainty,
        notes: d.notes,
      },
    });
    if (status === 201) {
      console.log(`  ✓ ${d.patientId === MARIA_ID ? 'Maria' : 'João'}: ${d.icd_code} (${d.certainty})`);
    } else {
      console.log(`  ⚠ ${d.icd_code} → ${status}: ${JSON.stringify(data).slice(0, 100)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Assessment results (patients submit PHQ-9 + GAD-7 at 3 time points)
//    Note: /assessment-results requires patient role
// ---------------------------------------------------------------------------

async function seedAssessmentResults(mariaToken, joaoToken) {
  console.log('\n[2/5] Assessment results (3 time points × 2 patients)...');

  // Maria: depressive pattern improving over time
  // Time points: 60 days ago, 30 days ago, 7 days ago
  // PHQ-9 scores: 18 → 13 → 8 (moderate → mild improvement)
  // GAD-7 scores: 14 → 11 → 7 (moderate → mild improvement)

  const mariaAssessments = [
    // 60 days ago — severe/moderate
    {
      assessment_id: PHQ9_ASSESSMENT_ID,
      answers: { '0': 3, '1': 2, '2': 3, '3': 2, '4': 2, '5': 1, '6': 2, '7': 0, '8': 3 }, // sum=18
      notes: 'Semana muito difícil. Praticamente não consegui sair da cama.',
    },
    {
      assessment_id: GAD7_ASSESSMENT_ID,
      answers: { '0': 3, '1': 2, '2': 2, '3': 2, '4': 2, '5': 2, '6': 1 }, // sum=14
      notes: 'Ansiedade constante, difícil de controlar.',
    },
  ];

  const mariaAssessmentsMid = [
    // 30 days ago — improving
    {
      assessment_id: PHQ9_ASSESSMENT_ID,
      answers: { '0': 2, '1': 2, '2': 2, '3': 1, '4': 2, '5': 1, '6': 1, '7': 0, '8': 2 }, // sum=13
      notes: 'Algumas melhoras com o tratamento, mas ainda difícil.',
    },
    {
      assessment_id: GAD7_ASSESSMENT_ID,
      answers: { '0': 2, '1': 2, '2': 1, '3': 2, '4': 1, '5': 2, '6': 1 }, // sum=11
      notes: 'Ansiedade um pouco menor.',
    },
  ];

  const mariaAssessmentsRecent = [
    // 7 days ago — mild
    {
      assessment_id: PHQ9_ASSESSMENT_ID,
      answers: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 0, '8': 1 }, // sum=8
      notes: 'Semana melhor! Consegui sair algumas vezes.',
    },
    {
      assessment_id: GAD7_ASSESSMENT_ID,
      answers: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 }, // sum=7
      notes: 'Ansiedade mais controlável.',
    },
  ];

  // João: stable anxiety pattern
  // PHQ-9 scores: 9 → 8 → 7 (mild, stable)
  // GAD-7 scores: 15 → 14 → 13 (moderate-high, relatively stable)

  const joaoAssessmentsOld = [
    {
      assessment_id: PHQ9_ASSESSMENT_ID,
      answers: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1 }, // sum=9
      notes: 'Humor razoável, mas nervoso constantemente.',
    },
    {
      assessment_id: GAD7_ASSESSMENT_ID,
      answers: { '0': 3, '1': 2, '2': 2, '3': 2, '4': 2, '5': 2, '6': 2 }, // sum=15
      notes: 'Ansiedade intensa essa semana, tive um episódio de pânico.',
    },
  ];

  const joaoAssessmentsMid = [
    {
      assessment_id: PHQ9_ASSESSMENT_ID,
      answers: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 0, '8': 1 }, // sum=8
      notes: 'Estável, sem episódios novos.',
    },
    {
      assessment_id: GAD7_ASSESSMENT_ID,
      answers: { '0': 3, '1': 2, '2': 2, '3': 2, '4': 2, '5': 1, '6': 2 }, // sum=14
      notes: 'Ansiedade persistente mas gerenciável.',
    },
  ];

  const joaoAssessmentsRecent = [
    {
      assessment_id: PHQ9_ASSESSMENT_ID,
      answers: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 0, '5': 1, '6': 1, '7': 0, '8': 1 }, // sum=7
      notes: 'Semana tranquila, consegui trabalhar bem.',
    },
    {
      assessment_id: GAD7_ASSESSMENT_ID,
      answers: { '0': 2, '1': 2, '2': 2, '3': 2, '4': 2, '5': 2, '6': 1 }, // sum=13
      notes: 'Ansiedade um pouco menor que de costume.',
    },
  ];

  // Submit all assessment results
  const batches = [
    { token: mariaToken, name: 'Maria', sets: [mariaAssessments, mariaAssessmentsMid, mariaAssessmentsRecent], daysBack: [60, 30, 7] },
    { token: joaoToken, name: 'João', sets: [joaoAssessmentsOld, joaoAssessmentsMid, joaoAssessmentsRecent], daysBack: [60, 30, 7] },
  ];

  for (const { token, name, sets, daysBack } of batches) {
    for (let i = 0; i < sets.length; i++) {
      for (const assessment of sets[i]) {
        const { status, data } = await api('/assessment-results', {
          method: 'POST',
          token,
          body: {
            assessment_id: assessment.assessment_id,
            answers: assessment.answers,
            notes: assessment.notes,
          },
        });
        const testName = assessment.assessment_id === PHQ9_ASSESSMENT_ID ? 'PHQ-9' : 'GAD-7';
        if (status === 201) {
          console.log(`  ✓ ${name}: ${testName} (T-${daysBack[i]}d)`);
        } else {
          console.log(`  ⚠ ${name} ${testName} T-${daysBack[i]}d → ${status}: ${JSON.stringify(data).slice(0, 100)}`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Complete pending psych test sessions (patients answer)
// ---------------------------------------------------------------------------

async function seedPsychTestSessions(mariaToken, joaoToken) {
  console.log('\n[3/5] Completing psych test sessions...');

  // Maria's DASS-21 — moderate depression + stress, improving
  // 21 questions (0-3), subscales: depression (7), anxiety (7), stress (7)
  const mariaDASS21Answers = {};
  // Depression subscale: items 3,5,10,13,16,17,21 → moderate scores
  // Anxiety subscale: items 2,4,7,9,15,19,20 → mild scores
  // Stress subscale: items 1,6,8,11,12,14,18 → mild-moderate scores
  const dass21Scores = [1,1,2,1,2,0,1,1,2,1,1,2,2,1,0,2,2,1,0,1,2];
  for (let i = 0; i < 21; i++) mariaDASS21Answers[String(i)] = dass21Scores[i];

  // Maria's PHQ-9 — moderate depression
  const mariaPHQ9Answers = {};
  const phq9Scores = [2,1,2,1,2,1,1,0,1]; // sum=11 moderate
  for (let i = 0; i < 9; i++) mariaPHQ9Answers[String(i)] = phq9Scores[i];

  // João's BAI — moderate anxiety (21 questions, 0-3)
  const joaoBAIAnswers = {};
  const baiScores = [2,1,2,1,1,2,1,2,1,1,2,1,2,1,1,2,1,2,1,1,2]; // sum=31 moderate
  for (let i = 0; i < 21; i++) joaoBAIAnswers[String(i)] = baiScores[i];

  // João's GAD-7 — moderate anxiety (7 questions, 0-3)
  const joaoGAD7Answers = {};
  const gad7Scores = [2,2,2,2,2,2,1]; // sum=13 moderate
  for (let i = 0; i < 7; i++) joaoGAD7Answers[String(i)] = gad7Scores[i];

  const sessions = [
    { sessionId: MARIA_DASS21_SESSION, token: mariaToken, name: 'Maria DASS-21', answers: mariaDASS21Answers },
    { sessionId: MARIA_PHQ9_SESSION,   token: mariaToken, name: 'Maria PHQ-9',   answers: mariaPHQ9Answers },
    { sessionId: JOAO_BAI_SESSION,     token: joaoToken,  name: 'João BAI',      answers: joaoBAIAnswers },
    { sessionId: JOAO_GAD7_SESSION,    token: joaoToken,  name: 'João GAD-7',    answers: joaoGAD7Answers },
  ];

  for (const { sessionId, token, name, answers } of sessions) {
    const { status, data } = await api(`/psych-tests/sessions/${sessionId}`, {
      method: 'PUT',
      token,
      body: { answers },
    });
    if (status === 200) {
      const score = data.score?.total_score ?? '?';
      console.log(`  ✓ ${name} completed (score: ${score})`);
    } else if (status === 400 && data.error?.includes('já foi completada')) {
      console.log(`  ↩ ${name} already completed`);
    } else {
      console.log(`  ⚠ ${name} → ${status}: ${JSON.stringify(data).slice(0, 120)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Pedro's clinical notes for both patients
// ---------------------------------------------------------------------------

async function seedPedroClinicalNotes(pedroToken) {
  console.log('\n[4/5] Pedro\'s clinical notes...');

  const notes = [
    // Maria — 3 notes
    {
      patientId: MARIA_ID,
      note_type: 'consultation',
      content: 'Paciente compareceu em bom estado geral. Relata melhora parcial do humor nas últimas 2 semanas após ajuste de dose. Sono ainda irregular — dificuldade para iniciar. Apetite retornando gradualmente. Nega ideação suicida. Mantida medicação atual com retorno em 15 dias.',
      session_date: dateOnly(45),
    },
    {
      patientId: MARIA_ID,
      note_type: 'consultation',
      content: 'Retorno de acompanhamento. PHQ-9 = 13 (moderado), com melhora em relação à avaliação anterior (18). Paciente referiu conseguir sair de casa com mais frequência. Ainda relata anedonia matinal. Introduzida psicoeducação sobre higiene do sono.',
      session_date: dateOnly(21),
    },
    {
      patientId: MARIA_ID,
      note_type: 'observation',
      content: 'Avaliação quinzenal. PHQ-9 = 8 — melhora significativa. Paciente demonstra maior engajamento nas atividades cotidianas. Humor mais estável. Proposta redução gradual de acompanhamento para mensal caso manutenção da melhora.',
      session_date: dateOnly(5),
    },
    // João — 3 notes
    {
      patientId: JOAO_ID,
      note_type: 'consultation',
      content: 'Primeira consulta com Pedro. João encaminhado pela psicóloga Ana com quadro de ansiedade generalizada + episódios compatíveis com pânico. Avaliação psiquiátrica inicial realizada. GAD-7 = 15 (grave). Iniciada farmacoterapia ansiolítica com orientações.',
      session_date: dateOnly(55),
    },
    {
      patientId: JOAO_ID,
      note_type: 'consultation',
      content: 'Retorno 30 dias. Paciente refere tolerância adequada à medicação. GAD-7 = 14 — estabilização do quadro. Sem novos episódios de pânico documentados. Revisadas técnicas de respiração. Mantida dose atual.',
      session_date: dateOnly(25),
    },
    {
      patientId: JOAO_ID,
      note_type: 'observation',
      content: 'Acompanhamento periódico. João estável. BAI recentemente completado demonstra ansiedade moderada (score 31), compatível com quadro em tratamento. Considera-se evolução positiva comparada ao início. Continuar acompanhamento conjunto com psicóloga Ana.',
      session_date: dateOnly(3),
    },
  ];

  for (const note of notes) {
    const { status, data } = await api('/clinical-notes', {
      method: 'POST',
      token: pedroToken,
      body: {
        patient_id: note.patientId,
        note_type: note.note_type,
        content: note.content,
        session_date: note.session_date,
      },
    });
    if (status === 201) {
      const patName = note.patientId === MARIA_ID ? 'Maria' : 'João';
      console.log(`  ✓ ${patName}: ${note.note_type} (${note.session_date})`);
    } else {
      console.log(`  ⚠ Note → ${status}: ${JSON.stringify(data).slice(0, 100)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Pedro's goals for both patients
// ---------------------------------------------------------------------------

async function seedPedroGoals(pedroToken) {
  console.log('\n[5/5] Pedro\'s goals...');

  const goals = [
    // Maria
    {
      patient_id: MARIA_ID,
      title: 'Estabelecer rotina de sono regular',
      description: 'Dormir e acordar no mesmo horário todos os dias. Evitar telas 1h antes de dormir. Meta: 7 dias consecutivos com horário consistente.',
      target_date: dateOnly(-30), // 30 days in the future
      priority: 'high',
    },
    {
      patient_id: MARIA_ID,
      title: 'Retomar atividade física leve',
      description: 'Começar com caminhadas de 15 minutos, 3x por semana. Aumentar gradualmente conforme tolerância. Foco no processo, não no desempenho.',
      target_date: dateOnly(-45),
      priority: 'medium',
    },
    // João
    {
      patient_id: JOAO_ID,
      title: 'Praticar técnica de respiração diária',
      description: 'Realizar respiração diafragmática (4-7-8) por 10 minutos todas as manhãs. Registrar no diário de humor nos dias que praticar.',
      target_date: dateOnly(-14),
      priority: 'high',
    },
    {
      patient_id: JOAO_ID,
      title: 'Reduzir consumo de cafeína',
      description: 'Limitar consumo a no máximo 2 cafés por dia, todos antes das 14h. Substituir bebidas cafeinadas à tarde por chás sem cafeína.',
      target_date: dateOnly(-21),
      priority: 'medium',
    },
  ];

  for (const goal of goals) {
    const { status, data } = await api('/goals', {
      method: 'POST',
      token: pedroToken,
      body: goal,
    });
    if (status === 201) {
      const patName = goal.patient_id === MARIA_ID ? 'Maria' : 'João';
      console.log(`  ✓ ${patName}: "${goal.title}"`);
    } else {
      console.log(`  ⚠ Goal "${goal.title}" → ${status}: ${JSON.stringify(data).slice(0, 100)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Clarita Demo Supplement Seed ===');
  console.log('Target:', API);

  console.log('\nLogging in...');
  const [pedroToken, mariaToken, joaoToken] = await Promise.all([
    login('pedro@clarita.demo', 'Demo1234'),
    login('maria@clarita.demo', 'Demo1234'),
    login('joao@clarita.demo', 'Demo1234'),
  ]);
  console.log('  ✓ All tokens obtained');

  await seedDiagnoses(pedroToken);
  await seedAssessmentResults(mariaToken, joaoToken);
  await seedPsychTestSessions(mariaToken, joaoToken);
  await seedPedroClinicalNotes(pedroToken);
  await seedPedroGoals(pedroToken);

  console.log('\n=== Supplement seed complete! ===');
  console.log('\nCredentials:');
  console.log('  pedro@clarita.demo / Demo1234  (psychiatrist)');
  console.log('  ana@clarita.demo   / Demo1234  (psychologist)');
  console.log('  maria@clarita.demo / Demo1234  (patient)');
  console.log('  joao@clarita.demo  / Demo1234  (patient)');
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
