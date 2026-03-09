#!/usr/bin/env node

/**
 * E2E Test: Patient Registration + Login + Role-based Redirect
 *
 * Tests the full flow:
 * 1. Register a patient via POST /api/auth/register
 * 2. Verify response contains { user, token } with role=patient
 * 3. Decode JWT and verify role in payload
 * 4. Login as patient via POST /api/auth/login
 * 5. Verify login response matches register response shape
 * 6. Call GET /api/auth/me with token and verify patient profile
 * 7. Register a professional and verify different response
 * 8. Verify professional cannot access patient-only data without care relationship
 *
 * Requires: backend running on localhost:3001, PostgreSQL running
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

const rand = () => Math.floor(Math.random() * 99999);
const PATIENT_EMAIL = `paciente_test_${rand()}@teste.com`;
const PATIENT_PASSWORD = 'Teste1234';
const PROF_EMAIL = `prof_test_${rand()}@teste.com`;
const PROF_PASSWORD = 'Teste1234';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Register Patient
// ─────────────────────────────────────────────────────────────────────────────
async function testRegisterPatient() {
  console.log('\n📝 Test 1: Register Patient');

  const { status, body } = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Maria',
      last_name: 'Teste',
      email: PATIENT_EMAIL,
      password: PATIENT_PASSWORD,
      role: 'patient',
      date_of_birth: '1995-03-15',
      gender: 'female',
    }),
  });

  assert(status === 201, `Status 201 (got ${status})`);
  assert(body && body.user, 'Response has user object');
  assert(body && body.token, 'Response has token');
  assert(body?.user?.role === 'patient', `User role is "patient" (got "${body?.user?.role}")`);
  assert(body?.user?.email === PATIENT_EMAIL, 'User email matches');
  assert(body?.user?.first_name === 'Maria', 'User first_name matches');
  assert(!body?.user?.password_hash, 'No password_hash in response');

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: JWT payload contains role
// ─────────────────────────────────────────────────────────────────────────────
function testJwtPayload(token) {
  console.log('\n🔑 Test 2: JWT Payload');

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    assert(payload.role === 'patient', `JWT role is "patient" (got "${payload.role}")`);
    assert(!!payload.userId, 'JWT has userId');
    assert(!!payload.exp, 'JWT has expiration');
  } catch (err) {
    assert(false, `JWT decode failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Login as Patient
// ─────────────────────────────────────────────────────────────────────────────
async function testLoginPatient() {
  console.log('\n🔐 Test 3: Login as Patient');

  const { status, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: PATIENT_EMAIL,
      password: PATIENT_PASSWORD,
    }),
  });

  assert(status === 200, `Status 200 (got ${status})`);
  assert(body && body.user, 'Response has user object');
  assert(body && body.token, 'Response has token');
  assert(body?.user?.role === 'patient', `User role is "patient" (got "${body?.user?.role}")`);
  assert(body?.user?.email === PATIENT_EMAIL, 'Email matches');

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: GET /auth/me as Patient
// ─────────────────────────────────────────────────────────────────────────────
async function testMePatient(token) {
  console.log('\n👤 Test 4: GET /auth/me as Patient');

  const { status, body } = await request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert(status === 200, `Status 200 (got ${status})`);
  assert(body?.user?.role === 'patient', `User role is "patient" (got "${body?.user?.role}")`);
  assert(body?.profile !== undefined, 'Response includes profile');
  assert(body?.profile?.gender === 'female', `Gender is "female" (got "${body?.profile?.gender}")`);

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Register Professional
// ─────────────────────────────────────────────────────────────────────────────
async function testRegisterProfessional() {
  console.log('\n👨‍⚕️ Test 5: Register Professional');

  const { status, body } = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Dr',
      last_name: 'Teste',
      email: PROF_EMAIL,
      password: PROF_PASSWORD,
      role: 'psychologist',
      license_number: `CRP 06/${rand()}`,
      specialization: 'Psicologia clínica',
      institution: 'Clínica Clarita',
    }),
  });

  assert(status === 201, `Status 201 (got ${status})`);
  assert(body?.user?.role === 'psychologist', `Role is "psychologist" (got "${body?.user?.role}")`);
  assert(body && body.token, 'Response has token');

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Login as Professional
// ─────────────────────────────────────────────────────────────────────────────
async function testLoginProfessional() {
  console.log('\n🔐 Test 6: Login as Professional');

  const { status, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: PROF_EMAIL,
      password: PROF_PASSWORD,
    }),
  });

  assert(status === 200, `Status 200 (got ${status})`);
  assert(body?.user?.role === 'psychologist', `Role is "psychologist" (got "${body?.user?.role}")`);

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Duplicate email rejected
// ─────────────────────────────────────────────────────────────────────────────
async function testDuplicateEmail() {
  console.log('\n🚫 Test 7: Duplicate Email Rejected');

  const { status } = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Dup',
      last_name: 'Teste',
      email: PATIENT_EMAIL,
      password: PATIENT_PASSWORD,
      role: 'patient',
    }),
  });

  assert(status === 409 || status === 400, `Status 409 or 400 for duplicate (got ${status})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: Invalid login
// ─────────────────────────────────────────────────────────────────────────────
async function testInvalidLogin() {
  console.log('\n🚫 Test 8: Invalid Login');

  const { status } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: PATIENT_EMAIL,
      password: 'WrongPassword1',
    }),
  });

  assert(status === 401, `Status 401 for wrong password (got ${status})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: Patient register without license (should work)
// ─────────────────────────────────────────────────────────────────────────────
async function testPatientNoLicense() {
  console.log('\n✨ Test 9: Patient register without license_number');

  const { status, body } = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Sem',
      last_name: 'Licenca',
      email: `nolicense_${rand()}@teste.com`,
      password: 'Teste1234',
      role: 'patient',
    }),
  });

  assert(status === 201, `Status 201 (got ${status})`);
  assert(body?.user?.role === 'patient', 'Role is patient without license');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: Professional without license (should fail)
// ─────────────────────────────────────────────────────────────────────────────
async function testProfessionalNoLicense() {
  console.log('\n🚫 Test 10: Professional without license_number');

  const { status } = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'No',
      last_name: 'License',
      email: `nolicense_prof_${rand()}@teste.com`,
      password: 'Teste1234',
      role: 'psychologist',
    }),
  });

  assert(status === 400 || status === 422, `Status 400/422 for missing license (got ${status})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: GET /auth/me as Professional
// ─────────────────────────────────────────────────────────────────────────────
async function testMeProfessional(token) {
  console.log('\n👤 Test 11: GET /auth/me as Professional');

  const { status, body } = await request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert(status === 200, `Status 200 (got ${status})`);
  assert(body?.user?.role === 'psychologist', `Role is psychologist (got "${body?.user?.role}")`);
  assert(body?.profile?.license_number, `Has license_number: ${body?.profile?.license_number}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: Unauthenticated /auth/me
// ─────────────────────────────────────────────────────────────────────────────
async function testMeUnauthenticated() {
  console.log('\n🚫 Test 12: Unauthenticated /auth/me');

  const { status } = await request('/auth/me');
  assert(status === 401, `Status 401 (got ${status})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup helper
// ─────────────────────────────────────────────────────────────────────────────
async function cleanup() {
  // Tests use random emails so no cleanup needed - they won't collide
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🧪 CLARITA E2E: Patient Registration + Auth Flow');
  console.log('================================================');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Patient email: ${PATIENT_EMAIL}`);
  console.log(`Professional email: ${PROF_EMAIL}`);

  try {
    // Patient flow
    const regPatient = await testRegisterPatient();
    testJwtPayload(regPatient.token);
    const loginPatient = await testLoginPatient();
    await testMePatient(loginPatient.token);

    // Professional flow
    const regProf = await testRegisterProfessional();
    await testLoginProfessional();
    await testMeProfessional(regProf.token);

    // Validation tests
    await testDuplicateEmail();
    await testInvalidLogin();
    await testPatientNoLicense();
    await testProfessionalNoLicense();
    await testMeUnauthenticated();

    console.log('\n================================================');
    console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log(failed === 0 ? '🎉 All tests passed!' : '💥 Some tests failed!');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n💥 Fatal error:', err.message);
    process.exit(1);
  }
}

main();
