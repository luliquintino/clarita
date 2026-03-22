#!/usr/bin/env node
'use strict';

/**
 * CLARITA — Ana's Full Demo Seed
 * Populates all features for Ana (psychologist) with Maria and João as patients.
 * Usage: node db/seed_ana_demo.js
 */

const API = process.env.API_URL || 'https://clarita-production.up.railway.app/api';

const MARIA_ID = '95849831-6ac5-43bc-b7c2-485760dd12fc';
const JOAO_ID  = 'b93ed0ca-462c-431f-8683-dc8fcc410265';

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

function ok(label, res) {
  const good = res.status >= 200 && res.status < 300;
  const icon = good ? '✓' : '✗';
  const extra = good ? '' : ` → ${res.status}: ${JSON.stringify(res.data).slice(0, 80)}`;
  console.log(`  ${icon} ${label}${extra}`);
  return good;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function futureDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

async function login() {
  console.log('\n[1/9] Logging in...');
  const creds = [
    ['ana',   'ana@clarita.demo'],
    ['maria', 'maria@clarita.demo'],
    ['joao',  'joao@clarita.demo'],
  ];
  const tokens = {};
  for (const [key, email] of creds) {
    const res = await api('/auth/login', { method: 'POST', body: { email, password: 'Demo1234' } });
    if (!res.data?.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
    tokens[key] = res.data.token;
    console.log(`  ✓ ${res.data.user.first_name} (${res.data.user.role})`);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Emotional logs (as patients)
// ---------------------------------------------------------------------------

async function seedEmotionalLogs(tokens) {
  console.log('\n[2/9] Seeding emotional logs (30 days × 2 patients)...');

  // Maria — depression improving trend
  let ok1 = 0;
  for (let day = 29; day >= 0; day--) {
    const p = (29 - day) / 29;
    const mood    = clamp(Math.round(3 + p * 4 + (Math.random() - 0.5)), 1, 10);
    const anxiety = clamp(Math.round(8 - p * 3.5 + (Math.random() - 0.5)), 1, 10);
    const energy  = clamp(Math.round(3 + p * 3 + (Math.random() - 0.5)), 1, 10);
    const sleepOpts = ['poor','poor','fair','fair','good'];
    const sleep   = sleepOpts[Math.min(Math.floor(p * 5), 4)];
    const hours   = +(5 + p * 2 + (Math.random() - 0.5)).toFixed(1);
    const journals = { 25: 'Hoje foi difícil. Usei a técnica de respiração e ajudou.', 18: 'Sessão com a Ana foi reveladora. Percebi padrões que não via antes.', 12: 'Dormi mal novamente. Pensamentos ruminativos sobre a separação.', 7: 'Consegui sair para caminhar! Me senti muito melhor depois.', 2: 'Almocei com minha irmã. Dia tranquilo e reconfortante.' };
    const r = await api('/emotional-logs', { method: 'POST', token: tokens.maria, body: { mood_score: mood, anxiety_score: anxiety, energy_score: energy, sleep_quality: sleep, sleep_hours: hours, ...(journals[day] ? { journal_entry: journals[day] } : {}), logged_at: new Date(Date.now() - day * 86400000).toISOString() } });
    if (r.status < 300) ok1++;
  }
  console.log(`  ✓ Maria: ${ok1}/30 logs`);

  // João — anxiety dominant
  let ok2 = 0;
  for (let day = 29; day >= 0; day--) {
    const mood    = clamp(Math.round(5 + (Math.random() - 0.5) * 2), 1, 10);
    const anxiety = clamp(Math.round(8 + Math.sin(day * 0.7) + (Math.random() - 0.5)), 1, 10);
    const energy  = clamp(Math.round(5 + (Math.random() - 0.5) * 2), 1, 10);
    const sleepOpts = ['fair','poor','fair','fair','good'];
    const sleep   = sleepOpts[Math.floor(Math.random() * 5)];
    const hours   = +(6 + (Math.random() - 0.5)).toFixed(1);
    const journals = { 22: 'Reunião foi um gatilho. Tentei a respiração diafragmática antes.', 15: 'Acordei ansioso sem motivo aparente. A medicação está ajudando um pouco.', 8: 'Consegui novo emprego! Ainda nervoso, mas é um passo importante.', 3: 'Primeiro dia no emprego. Usei grounding antes de entrar. Correu bem.' };
    const r = await api('/emotional-logs', { method: 'POST', token: tokens.joao, body: { mood_score: mood, anxiety_score: anxiety, energy_score: energy, sleep_quality: sleep, sleep_hours: hours, ...(journals[day] ? { journal_entry: journals[day] } : {}), logged_at: new Date(Date.now() - day * 86400000).toISOString() } });
    if (r.status < 300) ok2++;
  }
  console.log(`  ✓ João: ${ok2}/30 logs`);
}

// ---------------------------------------------------------------------------
// Clinical notes (as Ana — POST /clinical-notes with patient_id in body)
// ---------------------------------------------------------------------------

async function seedClinicalNotes(tokens) {
  console.log('\n[3/9] Seeding clinical notes...');

  const notes = [
    { patient_id: MARIA_ID, session_date: daysAgo(35), note_type: 'session',
      content: 'Primeira sessão de psicoterapia. Paciente demonstra bom insight sobre seu quadro. Identificados padrões de catastrofização e leitura mental. Tarefas: diário de pensamentos e registro de atividades prazerosas. Abordagem TCC.' },
    { patient_id: MARIA_ID, session_date: daysAgo(21), note_type: 'progress',
      content: 'Boa evolução. Trouxe diário preenchido. Trabalhou reestruturação cognitiva de 3 situações-gatilho. Retomou pilates 2x/semana. Ainda com episódios de choro, porém com maior senso de agência.' },
    { patient_id: MARIA_ID, session_date: daysAgo(7), note_type: 'progress',
      content: 'Progressos significativos. Retomou atividades de lazer (pilates, encontros com amigas). Maior flexibilidade cognitiva. Continua trabalhando autoimagem e autonomia emocional. Próximo foco: rotina de autocuidado.' },
    { patient_id: MARIA_ID, session_date: daysAgo(2), note_type: 'treatment_plan',
      content: 'Plano: sessões quinzenais a partir do próximo mês. Novos objetivos: (1) fortalecer autoestima pós-separação, (2) elaborar projeto de vida individual, (3) manter sono regular. Técnicas: TCC, ACT e ativação comportamental.' },
    { patient_id: JOAO_ID, session_date: daysAgo(28), note_type: 'session',
      content: 'Primeira sessão. Pensamento catastrófico em relação à carreira e finanças. Gatilhos: reuniões, conversas sobre emprego e redes sociais. Iniciado trabalho de reestruturação cognitiva e exposição gradual. Abordagem TCC.' },
    { patient_id: JOAO_ID, session_date: daysAgo(14), note_type: 'session',
      content: 'Paciente conseguiu novo emprego. Sentimentos ambivalentes: alívio + ansiedade antecipatória. Trabalhamos diferença entre preocupação funcional e disfuncional. Dessensibilização imagética para o novo ambiente de trabalho.' },
    { patient_id: JOAO_ID, session_date: daysAgo(5), note_type: 'observation',
      content: 'Boa adaptação ao novo emprego. Usou técnica de grounding antes do primeiro dia. Equipe receptiva. Ansiedade em queda nas últimas 2 semanas (confirmado pelos logs do app). Reforçar estratégias de regulação emocional.' },
    { patient_id: JOAO_ID, session_date: daysAgo(1), note_type: 'treatment_plan',
      content: 'Plano atualizado: sessões semanais por mais 6 semanas. Foco: (1) consolidar regulação da ansiedade no trabalho, (2) desenvolver assertividade em liderança, (3) autoconfiança. Técnicas: TCC, mindfulness, treino de habilidades sociais.' },
  ];

  for (const note of notes) {
    const name = note.patient_id === MARIA_ID ? 'Maria' : 'João';
    const res = await api('/clinical-notes', { method: 'POST', token: tokens.ana, body: { ...note, is_private: false } });
    ok(`${note.note_type} → ${name}`, res);
  }
}

// ---------------------------------------------------------------------------
// Life events (as patients — POST /life-events)
// ---------------------------------------------------------------------------

async function seedLifeEvents(tokens) {
  console.log('\n[4/9] Seeding life events...');

  const events = [
    { token: tokens.maria, body: { title: 'Separação do marido', description: 'Término de relacionamento de 7 anos. Grande instabilidade emocional e mudança de residência.', category: 'relationship', impact_level: 9, event_date: daysAgo(90) } },
    { token: tokens.maria, body: { title: 'Início do acompanhamento psicológico', description: 'Primeira sessão com a psicóloga Ana. Decisão de buscar ajuda profissional.', category: 'health', impact_level: 7, event_date: daysAgo(35) } },
    { token: tokens.maria, body: { title: 'Retomou aulas de pilates', description: 'Voltou à prática de exercícios físicos após período de isolamento. Mais disposição.', category: 'achievement', impact_level: 6, event_date: daysAgo(20) } },
    { token: tokens.maria, body: { title: 'Reencontrou a irmã', description: 'Almoço com a irmã depois de meses sem se ver. Suporte afetivo importante.', category: 'relationship', impact_level: 5, event_date: daysAgo(3) } },
    { token: tokens.joao, body: { title: 'Demissão do emprego', description: 'Demitido após reestruturação da empresa onde trabalhava há 5 anos. Principal gatilho da ansiedade.', category: 'work', impact_level: 9, event_date: daysAgo(60) } },
    { token: tokens.joao, body: { title: 'Início da psicoterapia', description: 'Primeiro atendimento psicológico. Reconheceu a necessidade de ajuda profissional.', category: 'health', impact_level: 7, event_date: daysAgo(28) } },
    { token: tokens.joao, body: { title: 'Conseguiu novo emprego', description: 'Contratado para posição com salário melhor e maior flexibilidade. Marco positivo no tratamento.', category: 'achievement', impact_level: 8, event_date: daysAgo(8) } },
    { token: tokens.joao, body: { title: 'Primeiro dia no novo emprego', description: 'Usou técnicas de grounding. Equipe receptiva. Ansiedade manejável.', category: 'achievement', impact_level: 6, event_date: daysAgo(3) } },
  ];

  for (const e of events) {
    const name = e.token === tokens.maria ? 'Maria' : 'João';
    const res = await api('/life-events', { method: 'POST', token: e.token, body: e.body });
    ok(`"${e.body.title}" → ${name}`, res);
  }
}

// ---------------------------------------------------------------------------
// Goals (as Ana — POST /goals with patient_id in body)
// ---------------------------------------------------------------------------

async function seedGoals(tokens) {
  console.log('\n[5/9] Seeding goals...');

  const goals = [
    { patient_id: MARIA_ID, title: 'Manter rotina de sono regular', description: 'Dormir e acordar no mesmo horário todos os dias. Meta: 7-8 horas por noite. Registrar qualidade no app.', target_date: futureDays(30) },
    { patient_id: MARIA_ID, title: 'Atividade física 3x por semana', description: 'Pilates, caminhada ou natação. Qualquer atividade moderada. Registrar humor antes e depois.', target_date: futureDays(45) },
    { patient_id: MARIA_ID, title: 'Diário de pensamentos diário', description: 'Registrar um pensamento automático por dia e a reestruturação cognitiva — caderno ou app Clarita.', target_date: futureDays(21) },
    { patient_id: JOAO_ID,  title: 'Respiração antes de reuniões', description: 'Técnica 4-7-8 antes de cada reunião importante. Registrar ansiedade antes e depois no Clarita.', target_date: futureDays(30) },
    { patient_id: JOAO_ID,  title: 'Reduzir redes sociais para 30min/dia', description: 'Gatilho identificado. Usar timer do celular. Máximo 30 minutos por dia durante 3 semanas.', target_date: futureDays(21) },
    { patient_id: JOAO_ID,  title: 'Mindfulness 10 minutos por dia', description: 'App Headspace ou Insight Timer. Pelo menos 5 dias por semana. Marcar no calendário.', target_date: futureDays(30) },
  ];

  for (const goal of goals) {
    const name = goal.patient_id === MARIA_ID ? 'Maria' : 'João';
    const res = await api('/goals', { method: 'POST', token: tokens.ana, body: { ...goal, status: 'in_progress' } });
    ok(`"${goal.title}" → ${name}`, res);
  }
}

// ---------------------------------------------------------------------------
// Psychological tests (as Ana — POST /psych-tests/assign)
// ---------------------------------------------------------------------------

async function seedPsychTests(tokens) {
  console.log('\n[6/9] Seeding psychological test assignments...');

  const list = await api('/psych-tests', { token: tokens.ana });
  const tests = list.data?.tests || [];
  if (!tests.length) { console.log('  ⚠ No tests available'); return; }

  const byName = Object.fromEntries(tests.map(t => [t.name, t.id]));
  const wanted = [
    { name: 'PHQ-9',   patientId: MARIA_ID, deadline: futureDays(7) },
    { name: 'DASS-21', patientId: MARIA_ID, deadline: futureDays(10) },
    { name: 'GAD-7',   patientId: JOAO_ID,  deadline: futureDays(7) },
    { name: 'BAI',     patientId: JOAO_ID,  deadline: futureDays(10) },
  ];

  for (const w of wanted) {
    const testId = byName[w.name];
    const pName = w.patientId === MARIA_ID ? 'Maria' : 'João';
    if (!testId) { console.log(`  ⚠ Test not found: ${w.name}`); continue; }
    const res = await api('/psych-tests/assign', { method: 'POST', token: tokens.ana, body: { test_id: testId, patient_id: w.patientId, deadline: w.deadline } });
    ok(`Assigned ${w.name} → ${pName}`, res);
  }
}

// ---------------------------------------------------------------------------
// ICD-11 diagnoses (as Ana)
// ---------------------------------------------------------------------------

async function seedDiagnoses(tokens) {
  console.log('\n[7/9] Seeding ICD-11 diagnoses...');

  const diagnoses = [
    {
      patientId: MARIA_ID, certainty: 'confirmed',
      icd_code: '6A70', icd_name: 'Transtorno Depressivo de Episodio Unico',
      notes: 'Episódio depressivo moderado com sintomas ansiosos. Início há ~3 meses associado à separação conjugal.',
    },
    {
      patientId: MARIA_ID, certainty: 'confirmed',
      icd_code: 'F51.0', icd_name: 'Insônia não-orgânica',
      notes: 'Dificuldade de início e manutenção do sono. Correlacionada ao quadro depressivo.',
    },
    {
      patientId: JOAO_ID, certainty: 'confirmed',
      icd_code: '6B00', icd_name: 'Transtorno de Ansiedade Generalizada',
      notes: 'TAG com foco em carreira e finanças. Desencadeado por demissão e insegurança financeira.',
    },
  ];

  for (const d of diagnoses) {
    const pName = d.patientId === MARIA_ID ? 'Maria' : 'João';
    const res = await api(`/patients/${d.patientId}/diagnoses`, {
      method: 'POST', token: tokens.ana,
      body: { icd_code: d.icd_code, icd_name: d.icd_name, certainty: d.certainty, notes: d.notes },
    });
    ok(`Diagnosis ${d.icd_code} → ${pName}`, res);
  }
}

// ---------------------------------------------------------------------------
// Medications via Pedro (psychiatrist)
// ---------------------------------------------------------------------------

async function seedMedications(tokens) {
  console.log('\n[8/9] Seeding medications (via Pedro)...');

  const pedroRes = await api('/auth/login', { method: 'POST', body: { email: 'pedro@clarita.demo', password: 'Demo1234' } });
  if (!pedroRes.data?.token) { console.log('  ⚠ Pedro login failed'); return; }
  const pedroToken = pedroRes.data.token;

  // Get medication list
  const medList = await api('/medications', { token: pedroToken });
  const meds = medList.data?.medications || medList.data || [];
  if (!meds.length) { console.log('  ⚠ No medications in DB — skipping'); return; }

  const findMed = (names) => meds.find(m => names.some(n => m.name?.toLowerCase().includes(n.toLowerCase())));

  const prescriptions = [
    { med: findMed(['Escitalopram', 'Lexapro']), patientId: MARIA_ID, dosage: '10mg', frequency: 'Uma vez ao dia, pela manhã', days: 45 },
    { med: findMed(['Clonazepam', 'Rivotril']),  patientId: MARIA_ID, dosage: '0,5mg', frequency: 'À noite, antes de dormir', days: 45 },
    { med: findMed(['Sertralina', 'Sertraline', 'Zoloft']), patientId: JOAO_ID, dosage: '50mg', frequency: 'Uma vez ao dia, pela manhã', days: 30 },
    { med: findMed(['Buspirona', 'Buspirone']),   patientId: JOAO_ID, dosage: '10mg', frequency: 'Duas vezes ao dia', days: 30 },
  ];

  for (const p of prescriptions) {
    if (!p.med) { console.log(`  ⚠ Medication not found`); continue; }
    const pName = p.patientId === MARIA_ID ? 'Maria' : 'João';
    const startDate = new Date(Date.now() - p.days * 86400000).toISOString().split('T')[0];
    const res = await api(`/patient-medications`, {
      method: 'POST', token: pedroToken,
      body: { patient_id: p.patientId, medication_id: p.med.id, dosage: p.dosage, frequency: p.frequency, start_date: startDate, status: 'active' },
    });
    ok(`${p.med.name} ${p.dosage} → ${pName}`, res);
  }
}

// ---------------------------------------------------------------------------
// Symptoms (as patients)
// ---------------------------------------------------------------------------

async function seedSymptoms(tokens) {
  console.log('\n[9/9] Seeding symptoms...');

  // Symptom IDs from the reference table (GET /symptoms)
  const INSOMNIA_ID     = 'a953bba2-b550-4a2e-90fa-891594619abd'; // Insomnia [sleep]
  const FATIGUE_ID      = '1cee2121-f60c-435b-985a-d4e1e0ef65ab'; // Fatigue [physical]
  const DEP_MOOD_ID     = '6bc72624-d473-41db-9e8e-376440b412cb'; // Depressed mood [mood]
  const ANHEDONIA_ID    = '35ba057b-02e5-4cdd-a4fa-b3c777e83226'; // Anhedonia [mood]
  const GEN_ANXIETY_ID  = '7ece5d25-f4ba-4798-99fd-024595a3dadc'; // Generalized anxiety [anxiety]
  const SLEEP_FRAG_ID   = 'e356359b-cef6-4105-944b-0731c9c2a26f'; // Sleep fragmentation [sleep]
  const IRRITABILITY_ID = '25d95e62-3d71-4758-920a-1f0bd87b07f6'; // Irritability [mood]
  const RESTLESSNESS_ID = 'd6558111-aaff-4dea-8396-3b822e76e1fc'; // Restlessness [anxiety]

  const symptomsData = [
    { token: tokens.maria, label: 'Insomnia', body: { symptom_id: INSOMNIA_ID, severity: 7, notes: 'Dificuldade para adormecer com ruminações sobre a separação.', reported_at: new Date(Date.now() - 90 * 86400000).toISOString() } },
    { token: tokens.maria, label: 'Depressed mood', body: { symptom_id: DEP_MOOD_ID, severity: 6, notes: 'Episódios de choro frequentes, especialmente ao acordar.', reported_at: new Date(Date.now() - 85 * 86400000).toISOString() } },
    { token: tokens.maria, label: 'Fatigue', body: { symptom_id: FATIGUE_ID, severity: 5, notes: 'Cansaço constante, dificuldade para realizar tarefas diárias.', reported_at: new Date(Date.now() - 80 * 86400000).toISOString() } },
    { token: tokens.maria, label: 'Anhedonia', body: { symptom_id: ANHEDONIA_ID, severity: 6, notes: 'Perda de interesse em atividades antes prazerosas.', reported_at: new Date(Date.now() - 75 * 86400000).toISOString() } },
    { token: tokens.joao,  label: 'Generalized anxiety', body: { symptom_id: GEN_ANXIETY_ID, severity: 8, notes: 'Preocupação excessiva com carreira e finanças, difícil de controlar.', reported_at: new Date(Date.now() - 60 * 86400000).toISOString() } },
    { token: tokens.joao,  label: 'Sleep fragmentation', body: { symptom_id: SLEEP_FRAG_ID, severity: 6, notes: 'Acorda 2-3 vezes por noite com pensamentos sobre o trabalho.', reported_at: new Date(Date.now() - 60 * 86400000).toISOString() } },
    { token: tokens.joao,  label: 'Irritability', body: { symptom_id: IRRITABILITY_ID, severity: 5, notes: 'Impaciência em situações de incerteza, especialmente profissional.', reported_at: new Date(Date.now() - 55 * 86400000).toISOString() } },
    { token: tokens.joao,  label: 'Restlessness', body: { symptom_id: RESTLESSNESS_ID, severity: 7, notes: 'Tensão e inquietação constante, especialmente antes de reuniões.', reported_at: new Date(Date.now() - 55 * 86400000).toISOString() } },
  ];

  for (const s of symptomsData) {
    const name = s.token === tokens.maria ? 'Maria' : 'João';
    const res = await api('/patient-symptoms', { method: 'POST', token: s.token, body: s.body });
    ok(`"${s.label}" → ${name}`, res);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\nCLARITA — Ana\'s Full Demo Seed');
  console.log('================================');
  console.log(`API: ${API}`);

  try {
    const tokens = await login();
    await seedEmotionalLogs(tokens);
    await seedClinicalNotes(tokens);
    await seedLifeEvents(tokens);
    await seedGoals(tokens);
    await seedPsychTests(tokens);
    await seedDiagnoses(tokens);
    await seedMedications(tokens);
    await seedSymptoms(tokens);

    console.log('\n' + '='.repeat(55));
    console.log('✅ Done! Login at www.clarita.tec.br\n');
    console.log('  Psicóloga : ana@clarita.demo / Demo1234');
    console.log('  Paciente  : maria@clarita.demo / Demo1234');
    console.log('  Paciente  : joao@clarita.demo / Demo1234');
    console.log('='.repeat(55) + '\n');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Failed:', err.message);
    process.exit(1);
  }
}

main();
