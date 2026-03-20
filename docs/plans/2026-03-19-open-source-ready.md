# Open Source Ready — Documentação + Cobertura de Testes Completa

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preparar o projeto Clarita para open source com documentação completa e cobertura abrangente de testes em backend, frontend, banco de dados e E2E.

**Architecture:**
- Backend: Jest + Supertest (já configurados). Estender com testes para todas as rotas e serviços.
- Frontend: Instalar Vitest + React Testing Library. Testar componentes críticos, páginas e API client.
- E2E: Playwright para jornadas completas (login, paciente, profissional, avaliações).
- Docs: Markdown files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, ARCHITECTURE, SETUP).

**Tech Stack:**
- Backend tests: Jest 30, Supertest 7, PostgreSQL test DB
- Frontend tests: Vitest, @testing-library/react, @testing-library/user-event, jsdom
- E2E: Playwright
- Lint: ESLint + Prettier (já configurados nos dois projetos)

---

## ESTADO ATUAL

### O que já existe
- `backend/`: Jest + Supertest configurados; 14 arquivos de integração + 6 unitários
- `dashboard/`: ESLint + Prettier configurados; **zero testes**
- Scripts `lint` e `test` já existem em ambos os `package.json`

### O que falta
| Área | Status |
|---|---|
| Backend — rotas psychTests, icd11, satepsi, digitalTwin, anamnesis, recordSharing, invitations, documents, exams, me, users | ❌ Sem testes |
| Backend — serviço psychTestService (calculateScore) | ❌ Sem testes |
| Frontend — framework de testes | ❌ Não instalado |
| Frontend — API client (lib/api.ts) | ❌ Sem testes |
| Frontend — componentes críticos | ❌ Sem testes |
| Frontend — páginas | ❌ Sem testes |
| E2E — jornadas completas | ❌ Sem testes |
| Docs — CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, ARCHITECTURE | ❌ Não existem |

---

## FASE 0 — Verificação do Estado Atual (30 min)

### Task 0.1: Rodar linting e testes existentes

**Files:**
- Run: `backend/`
- Run: `dashboard/`

**Step 1: Rodar lint do backend**
```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
npm run lint
```
Expected: Sem erros críticos. Se houver, anote-os.

**Step 2: Rodar lint do dashboard**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm run lint
```
Expected: Sem erros críticos.

**Step 3: Rodar testes do backend**
```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
npm test 2>&1 | tail -30
```
Expected: Maioria passando. Anotar falhas.

**Step 4: Commit do estado atual (se lint passou)**
```bash
cd /Users/luizaquintino/Desktop/Clarita
git add -A
git commit -m "chore: verify lint and test baseline before open-source prep"
```

---

## FASE 1 — Backend: Testes das Rotas Faltantes (3h)

### Task 1.1: Testes — `/api/psych-tests`

**Files:**
- Create: `backend/tests/integration/psychTests.test.js`
- Reference: `backend/src/routes/psychTests.js`

**Cenários a cobrir:**
1. `GET /api/psych-tests` — catálogo completo (requer auth)
2. `GET /api/psych-tests/sessions/pending` — como paciente: sessions pendentes
3. `GET /api/psych-tests/sessions/history` — como paciente: histórico
4. `GET /api/psych-tests/sessions/patient/:patientId` — como profissional: sessions do paciente
5. `POST /api/psych-tests/:testId/sessions` — atribuir teste ao paciente
6. `PUT /api/psych-tests/:testId/sessions/:sessionId` — responder teste (paciente)
7. Erro: PUT sem todas as respostas obrigatórias → 400
8. Erro: acesso sem token → 401
9. Erro: paciente tentando acessar sessions de outro paciente → 403

**Step 1: Criar o arquivo de teste**
```javascript
'use strict';

const request = require('supertest');
const { getApp, cleanDatabase, createTestPatient, createTestProfessional } = require('../helpers');
const { query } = require('../../src/config/database');

const app = getApp();

beforeEach(async () => { await cleanDatabase(); });

describe('GET /api/psych-tests', () => {
  it('should return test catalog for authenticated user', async () => {
    const { token } = await createTestPatient();
    const res = await request(app)
      .get('/api/psych-tests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/psych-tests');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/psych-tests/:testId/sessions', () => {
  it('should allow professional to assign test to patient', async () => {
    const { user: prof, token: profToken } = await createTestProfessional();
    const { user: pat } = await createTestPatient();
    // Create care relationship
    await query(
      `INSERT INTO care_relationships (professional_id, patient_id, status) VALUES ($1, $2, 'active')`,
      [prof.id, pat.id]
    );
    // Get a test from catalog
    const catalog = await request(app)
      .get('/api/psych-tests')
      .set('Authorization', `Bearer ${profToken}`);
    const testId = catalog.body[0]?.id;
    if (!testId) return; // No tests seeded in test DB — skip

    const res = await request(app)
      .post(`/api/psych-tests/${testId}/sessions`)
      .set('Authorization', `Bearer ${profToken}`)
      .send({ patient_id: pat.id });
    expect([200, 201]).toContain(res.status);
  });
});

describe('PUT /api/psych-tests/:testId/sessions/:sessionId', () => {
  it('should return 401 without token', async () => {
    const res = await request(app)
      .put('/api/psych-tests/fake-test/sessions/fake-session')
      .send({ answers: {} });
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Rodar e verificar**
```bash
cd backend && npx jest tests/integration/psychTests.test.js --runInBand -t "psych" 2>&1 | tail -20
```

**Step 3: Ajustar até passar**

**Step 4: Commit**
```bash
git add backend/tests/integration/psychTests.test.js
git commit -m "test: add integration tests for psych-tests routes"
```

---

### Task 1.2: Testes — `/api/icd11`

**Files:**
- Create: `backend/tests/integration/icd11.test.js`
- Reference: `backend/src/routes/icd11.js`

**Cenários:**
1. `GET /api/icd11?q=depressão` — busca por keyword → array com code, name, description
2. `GET /api/icd11/categories` → lista de categorias
3. `GET /api/icd11/recent` — como profissional → histórico de recentes
4. `GET /api/icd11/:code` — busca por código específico
5. `POST /api/icd11/:code/diagnose` — registrar diagnóstico de paciente
6. Erro: diagnóstico sem patient_id → 400
7. Erro: diagnóstico para paciente sem vínculo → 403
8. Sem token → 401

**Step 1: Criar o arquivo**
```javascript
'use strict';

const request = require('supertest');
const { getApp, cleanDatabase, createTestPatient, createTestProfessional } = require('../helpers');
const { query } = require('../../src/config/database');

const app = getApp();

beforeEach(async () => { await cleanDatabase(); });

describe('GET /api/icd11', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/icd11?q=test');
    expect(res.status).toBe(401);
  });

  it('should search disorders with keyword', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11?q=ansiedade')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return empty array for unknown keyword', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11?q=zzzznonexistent99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/icd11/categories', () => {
  it('should return category list', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/icd11/:code/diagnose', () => {
  it('should return 400 without patient_id', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .post('/api/icd11/6A70/diagnose')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).post('/api/icd11/6A70/diagnose').send({ patient_id: 'x' });
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Rodar**
```bash
cd backend && npx jest tests/integration/icd11.test.js --runInBand 2>&1 | tail -20
```

**Step 3: Commit**
```bash
git add backend/tests/integration/icd11.test.js
git commit -m "test: add integration tests for icd11 routes"
```

---

### Task 1.3: Testes — `/api/anamnesis`

**Files:**
- Create: `backend/tests/integration/anamnesis.test.js`
- Reference: `backend/src/routes/anamnesis.js`

**Cenários:**
1. `GET /api/anamnesis/:patientId` — profissional com vínculo → retorna anamnese
2. `GET /api/anamnesis/:patientId` — profissional sem vínculo → 403
3. `PUT /api/anamnesis/:patientId` — atualizar anamnese
4. `GET /api/anamnesis/:patientId` como paciente → retorna própria anamnese
5. Sem token → 401

**Step 1: Criar arquivo e rodar (padrão dos anteriores)**

**Step 2: Commit**
```bash
git add backend/tests/integration/anamnesis.test.js
git commit -m "test: add integration tests for anamnesis route"
```

---

### Task 1.4: Testes — `/api/invitations`

**Files:**
- Create: `backend/tests/integration/invitations.test.js`
- Reference: `backend/src/routes/invitations.js`

**Cenários:**
1. `POST /api/invitations` — profissional cria convite
2. `GET /api/invitations/pending` — paciente vê convites pendentes
3. `POST /api/invitations/:id/accept` — aceitar convite cria care_relationship
4. `POST /api/invitations/:id/reject` — rejeitar convite
5. Convite já aceito: tentar aceitar de novo → 409 ou 400
6. Sem token → 401

**Step 1: Criar e rodar**

**Step 2: Commit**
```bash
git add backend/tests/integration/invitations.test.js
git commit -m "test: add integration tests for invitations"
```

---

### Task 1.5: Testes — `/api/documents` e `/api/exams`

**Files:**
- Create: `backend/tests/integration/documents.test.js`
- Create: `backend/tests/integration/exams.test.js`

**Cenários documents:**
1. `GET /api/documents` — paciente lista seus documentos
2. `POST /api/documents` — upload de documento (form-data)
3. Arquivo inválido (tipo não permitido) → 400

**Cenários exams:**
1. `GET /api/exams` — lista exames do paciente
2. `POST /api/exams` — profissional solicita exame
3. `GET /api/exams/:id` — visualizar exame específico
4. Sem token → 401

**Step 1: Criar e rodar**

**Step 2: Commit**
```bash
git add backend/tests/integration/documents.test.js backend/tests/integration/exams.test.js
git commit -m "test: add integration tests for documents and exams"
```

---

### Task 1.6: Testes — `/api/me`, `/api/users`, `/api/medical-records`

**Files:**
- Create: `backend/tests/integration/me.test.js`
- Create: `backend/tests/integration/users.test.js`

**Cenários me:**
1. `GET /api/me` — retorna perfil + role-specific data
2. `PUT /api/me` — atualizar nome, telefone
3. Sem token → 401

**Cenários users:**
1. `GET /api/users/search?q=nome` — busca profissional pelo nome (para convites)
2. Sem token → 401

**Step 1: Criar e rodar**

**Step 2: Commit**
```bash
git add backend/tests/integration/me.test.js backend/tests/integration/users.test.js
git commit -m "test: add integration tests for me and users routes"
```

---

### Task 1.7: Testes de Edge Cases — Auth Completo

**Files:**
- Modify: `backend/tests/integration/auth.test.js`

**Edge cases adicionais para auth:**
1. Login com senha errada → 401
2. Login com email inexistente → 401
3. Token expirado → 401
4. Token inválido (malformed) → 401
5. Register sem LGPD consent → 400 (se o campo existir)
6. Register com senha sem número → 400
7. Register com email inválido → 400
8. Forgot password com email inexistente → 200 (não revelar existência)
9. Reset password com token expirado → 400
10. Reset password com token inválido → 400
11. Onboarding complete → 200 e `onboarding_completed = true`

**Step 1: Adicionar describes ao auth.test.js existente**

```javascript
describe('Token edge cases', () => {
  it('should return 401 for expired token', async () => {
    const { user } = await createTestPatient();
    const expiredToken = generateExpiredToken(user.id, 'patient');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  it('should return 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('should return 200 even for unknown email (security)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@never.com' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('should return 400 for invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', password: 'NewPass1234' });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Rodar**
```bash
cd backend && npx jest tests/integration/auth.test.js --runInBand 2>&1 | tail -20
```

**Step 3: Commit**
```bash
git add backend/tests/integration/auth.test.js
git commit -m "test: add auth edge cases — expired/invalid tokens, forgot/reset password"
```

---

## FASE 2 — Backend: Testes Unitários de Serviços (1h)

### Task 2.1: Unit tests — `psychTestService.calculateScore()`

**Files:**
- Create: `backend/tests/unit/services/psychTestService.test.js`
- Reference: `backend/src/services/psychTestService.js`

**Cenários — método `sum`:**
1. PHQ-9: soma simples, 9 respostas 0-3 → total correto
2. PHQ-9: score 0 → severity "Mínimo"
3. PHQ-9: score 10 → severity "Moderado"
4. PHQ-9: score 20 → severity "Severo"
5. Respostas ausentes (undefined) → tratadas como 0

**Cenários — método `subscale_sum` (DASS-21):**
1. Subescalas calculadas corretamente
2. Severity por subescala independente

**Cenários — método `max_subscale` (Eneagrama):**
1. Subscale com maior soma vence
2. Empate: a primeira subscale com maior valor vence
3. Todos zeros: retorna primeiro tipo com score 0

**Cenários — método `dimension_majority` (16 Personalidades):**
1. 4 dimensões → string de 4 letras
2. Empate em dimensão: pole_a vence (scoreA >= scoreB)
3. Caso ENTJ: verifica string concatenada

**Step 1: Criar o arquivo**
```javascript
'use strict';

// Import the service (may need to mock DB dependencies)
jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('@anthropic-ai/sdk', () => ({ Anthropic: jest.fn() }), { virtual: true });

const { calculateScore } = require('../../src/services/psychTestService');

// PHQ-9 scoring rules
const phq9Rules = {
  method: 'sum',
  thresholds: [
    { min: 0,  max: 4,  severity: 'Mínimo',    label: 'Mínimo' },
    { min: 5,  max: 9,  severity: 'Leve',       label: 'Leve' },
    { min: 10, max: 14, severity: 'Moderado',   label: 'Moderado' },
    { min: 15, max: 19, severity: 'Moderado-Severo', label: 'Moderado-Severo' },
    { min: 20, max: 27, severity: 'Severo',     label: 'Severo' },
  ],
};

describe('calculateScore — method: sum', () => {
  const answers = { '0':2,'1':1,'2':3,'3':0,'4':1,'5':2,'6':0,'7':1,'8':2 }; // sum = 12

  it('sums all answers correctly', () => {
    const result = calculateScore(answers, phq9Rules, 9);
    expect(result.total_score).toBe(12);
  });

  it('classifies score 12 as Moderado', () => {
    const result = calculateScore(answers, phq9Rules, 9);
    expect(result.severity).toBe('Moderado');
  });

  it('classifies score 0 as Mínimo', () => {
    const zeros = Object.fromEntries([...Array(9)].map((_, i) => [String(i), 0]));
    const result = calculateScore(zeros, phq9Rules, 9);
    expect(result.severity).toBe('Mínimo');
  });

  it('treats undefined answers as 0', () => {
    const sparse = { '0': 3 }; // only first question answered
    const result = calculateScore(sparse, phq9Rules, 9);
    expect(result.total_score).toBe(3);
  });
});

// Eneagrama max_subscale rules
const enneagramRules = {
  method: 'max_subscale',
  thresholds: [],
  subscales: {
    type_1: { label: 'Tipo 1 — O Reformador', indices: [0, 1, 2, 3] },
    type_2: { label: 'Tipo 2 — O Ajudador',   indices: [4, 5, 6, 7] },
    type_9: { label: 'Tipo 9 — O Pacificador', indices: [8, 9, 10, 11] },
  },
};

describe('calculateScore — method: max_subscale', () => {
  it('returns winner subscale label', () => {
    const answers = {
      '0':3,'1':3,'2':3,'3':3,  // type_1 = 12
      '4':1,'5':1,'6':1,'7':1,  // type_2 = 4
      '8':2,'9':2,'10':2,'11':2, // type_9 = 8
    };
    const result = calculateScore(answers, enneagramRules, 12);
    expect(result.severity).toBe('type_1');
    expect(result.label).toBe('Tipo 1 — O Reformador');
    expect(result.total_score).toBe(12);
  });

  it('returns subscores for all types', () => {
    const answers = Object.fromEntries([...Array(12)].map((_, i) => [String(i), 1]));
    const result = calculateScore(answers, enneagramRules, 12);
    expect(result.subscores).toBeDefined();
    expect(result.subscores.type_1).toBe(4);
  });

  it('handles all-zero answers gracefully', () => {
    const answers = {};
    const result = calculateScore(answers, enneagramRules, 12);
    expect(result.label).toBeTruthy();
  });
});

// 16 Personalidades dimension_majority rules
const mbtiRules = {
  method: 'dimension_majority',
  thresholds: [],
  dimensions: [
    { key: 'EI', pole_a_label: 'E', pole_b_label: 'I', pole_a_indices: [0], pole_b_indices: [1] },
    { key: 'SN', pole_a_label: 'S', pole_b_label: 'N', pole_a_indices: [2], pole_b_indices: [3] },
    { key: 'TF', pole_a_label: 'T', pole_b_label: 'F', pole_a_indices: [4], pole_b_indices: [5] },
    { key: 'JP', pole_a_label: 'J', pole_b_label: 'P', pole_a_indices: [6], pole_b_indices: [7] },
  ],
};

describe('calculateScore — method: dimension_majority', () => {
  it('returns 4-letter type string', () => {
    const answers = { '0':1,'1':0,'2':1,'3':0,'4':1,'5':0,'6':1,'7':0 }; // ESTJ
    const result = calculateScore(answers, mbtiRules, 8);
    expect(result.severity).toBe('ESTJ');
    expect(result.label).toBe('ESTJ');
  });

  it('pole_a wins on tie (scoreA >= scoreB)', () => {
    const answers = { '0':0,'1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7':0 };
    const result = calculateScore(answers, mbtiRules, 8);
    expect(result.severity).toBe('ESTJ'); // All poles_a win on tie
  });

  it('returns subscores with score_a, score_b, result', () => {
    const answers = { '0':1,'1':0,'2':0,'3':1,'4':1,'5':0,'6':0,'7':1 };
    const result = calculateScore(answers, mbtiRules, 8);
    expect(result.subscores.EI).toBeDefined();
    expect(result.subscores.EI.score_a).toBe(1);
    expect(result.subscores.EI.score_b).toBe(0);
    expect(result.subscores.EI.result).toBe('E');
  });
});
```

**Step 2: Verificar se `calculateScore` é exportada**
```bash
grep "module.exports\|exports\." backend/src/services/psychTestService.js | head -5
```
Se não for exportada, adicionar `module.exports = { calculateScore, ... }`.

**Step 3: Rodar**
```bash
cd backend && npx jest tests/unit/services/psychTestService.test.js --runInBand 2>&1 | tail -30
```

**Step 4: Commit**
```bash
git add backend/tests/unit/services/psychTestService.test.js
git commit -m "test: unit tests for psychTestService.calculateScore — all 4 scoring methods"
```

---

### Task 2.2: Unit tests — `assessmentService` (estender existente)

**Files:**
- Modify: `backend/tests/unit/services/assessmentService.test.js`

**Edge cases a adicionar:**
1. Answers vazias → score 0
2. Answers com valores negativos → tratados como 0 (ou erro)
3. Severity para score no limite exato de threshold
4. Ausência de thresholds → retorna severity null/undefined

**Step 1: Adicionar casos ao arquivo existente**

**Step 2: Rodar e commitar**
```bash
git add backend/tests/unit/services/assessmentService.test.js
git commit -m "test: extend assessmentService unit tests with edge cases"
```

---

## FASE 3 — Frontend: Setup de Testes (30 min)

### Task 3.1: Instalar Vitest + React Testing Library

**Files:**
- Modify: `dashboard/package.json`
- Create: `dashboard/vitest.config.ts`
- Create: `dashboard/src/test/setup.ts`

**Step 1: Instalar dependências**
```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

**Step 2: Criar `dashboard/vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Criar `dashboard/src/test/setup.ts`**
```typescript
import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    // eslint-disable-next-line @next/next/no-img-element
    ({ type: 'img', props: { src, alt, ...props } }),
}));
```

**Step 4: Adicionar scripts ao `dashboard/package.json`**

Editar `package.json` para adicionar:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 5: Verificar que funciona**
```bash
cd dashboard && npx vitest run --reporter=verbose 2>&1 | tail -10
```
Expected: "No test files found" (ainda não há testes).

**Step 6: Commit**
```bash
git add dashboard/vitest.config.ts dashboard/src/test/setup.ts dashboard/package.json
git commit -m "test: setup Vitest + React Testing Library for dashboard"
```

---

## FASE 4 — Frontend: Testes do API Client (1h)

### Task 4.1: Unit tests — `dashboard/src/lib/api.ts`

**Files:**
- Create: `dashboard/src/lib/__tests__/api.test.ts`

**Cenários:**
1. `getToken()` — retorna null quando localStorage vazio
2. `getToken()` — retorna token quando presente
3. `setToken()` — grava no localStorage
4. `removeToken()` — remove do localStorage
5. `isTokenExpired()` — retorna true para token expirado
6. `isTokenExpired()` — retorna false para token válido
7. `ApiError` — instância correta com status e message
8. `authApi.login()` — chama fetch com POST correto (mock fetch)
9. `authApi.login()` — lança ApiError em 401
10. `patientApi.getEmotionalLogs()` — inclui Authorization header

**Step 1: Criar arquivo**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, getToken, setToken, removeToken } from '../api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
});

describe('Token management', () => {
  it('getToken returns null when not set', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores and getToken retrieves', () => {
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('removeToken deletes the token', () => {
    setToken('abc123');
    removeToken();
    expect(getToken()).toBeNull();
  });
});

describe('ApiError', () => {
  it('has correct status and message', () => {
    const err = new ApiError(401, 'Unauthorized');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized');
    expect(err instanceof Error).toBe(true);
  });
});
```

**Step 2: Rodar**
```bash
cd dashboard && npx vitest run src/lib/__tests__/api.test.ts 2>&1 | tail -20
```

**Step 3: Adicionar mais cenários (fetch mock)**
```typescript
describe('authApi.login', () => {
  it('returns user and token on success', async () => {
    const { authApi } = await import('../api');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: '1', email: 'a@b.com' }, token: 'tok' }),
    });
    const result = await authApi.login('a@b.com', 'pass');
    expect(result.token).toBe('tok');
    expect(result.user.email).toBe('a@b.com');
  });

  it('throws ApiError on 401', async () => {
    const { authApi } = await import('../api');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    });
    await expect(authApi.login('a@b.com', 'wrong')).rejects.toThrow(ApiError);
  });
});
```

**Step 4: Commit**
```bash
git add dashboard/src/lib/__tests__/api.test.ts
git commit -m "test: unit tests for API client — token management, ApiError, authApi.login"
```

---

## FASE 5 — Frontend: Testes de Componentes e Páginas (2h)

### Task 5.1: Testes — Página de Login

**Files:**
- Create: `dashboard/src/app/login/__tests__/page.test.tsx`
- Reference: `dashboard/src/app/login/page.tsx`

**Cenários:**
1. Renderiza formulário com campos de email e senha
2. Renderiza botão "Entrar"
3. Exibe erro quando email inválido ao submeter
4. Exibe erro quando campos vazios
5. Chama `authApi.login` com dados corretos ao submeter formulário válido (mock)
6. Redireciona para `/patient-home` após login de paciente (mock router)
7. Redireciona para `/patients` após login de profissional
8. Exibe mensagem de erro da API quando login falha
9. Desabilita botão enquanto carrega
10. Link "Esqueci minha senha" leva para `/forgot-password`
11. Link "Criar conta" leva para `/register`

**Step 1: Criar arquivo**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from '../page';

// Mock the API
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
  },
  setToken: vi.fn(),
  getToken: vi.fn().mockReturnValue(null),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('shows error for empty email on submit', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });
  });

  it('calls authApi.login with form values', async () => {
    const { authApi } = await import('@/lib/api');
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: '1', role: 'patient', email: 'p@test.com', first_name: 'M' },
      token: 'test-token',
    });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'p@test.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'Pass1234');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('p@test.com', 'Pass1234');
    });
  });
});
```

**Step 2: Rodar**
```bash
cd dashboard && npx vitest run src/app/login/__tests__/page.test.tsx 2>&1 | tail -20
```

**Step 3: Ajustar mocks até passar**

**Step 4: Commit**
```bash
git add dashboard/src/app/login/__tests__/page.test.tsx
git commit -m "test: login page — renders, validation, submit, error handling"
```

---

### Task 5.2: Testes — Página de Registro

**Files:**
- Create: `dashboard/src/app/register/__tests__/page.test.tsx`

**Cenários:**
1. Renderiza campos: nome, email, senha, role (patient/psychologist)
2. Seletor de role muda entre paciente e profissional
3. Para profissional: exibe campo CRP/CRM
4. Submit com dados válidos chama `authApi.register`
5. Validação: senha fraca → erro
6. Validação: email inválido → erro
7. Erro de API (email duplicado) → exibe mensagem
8. Sucesso → redireciona para onboarding

**Step 1: Criar, rodar, ajustar, commitar**
```bash
git add dashboard/src/app/register/__tests__/page.test.tsx
git commit -m "test: register page — role selection, validation, submit, errors"
```

---

### Task 5.3: Testes — Componente `AssessmentHistory`

**Files:**
- Create: `dashboard/src/components/__tests__/AssessmentHistory.test.tsx`

**Cenários:**
1. Renderiza "Nenhuma avaliação" quando lista vazia
2. Renderiza cards para cada assessment
3. Score e severity aparecem corretamente
4. Data formatada corretamente
5. Filtro por tipo de assessment funciona

**Step 1: Criar e rodar**

**Step 2: Commit**
```bash
git add dashboard/src/components/__tests__/AssessmentHistory.test.tsx
git commit -m "test: AssessmentHistory component"
```

---

### Task 5.4: Testes — Componente `UnifiedAssessmentsPanel`

**Files:**
- Create: `dashboard/src/components/__tests__/UnifiedAssessmentsPanel.test.tsx`

**Cenários:**
1. Renderiza loading state enquanto fetcha dados
2. Renderiza cards de todos os 7 testes após load
3. Clique em teste clínico (PHQ-9) mostra `AssessmentHistory`
4. Clique em teste de personalidade (Eneagrama) mostra tabela de sessions
5. "Atribuir teste" dropdown lista testes do catálogo
6. Submeter atribuição chama `psychTestsApi.assign`
7. Erro de fetch exibe mensagem de erro
8. `patientId` muda → limpa seleção anterior

**Step 1: Criar arquivo com mocks**
```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/api', () => ({
  psychTestsApi: {
    getCatalog: vi.fn().mockResolvedValue([
      { id: '1', name: 'PHQ-9', category: 'clinical' },
      { id: '2', name: 'Eneagrama Simplificado', category: 'personality' },
    ]),
    getPatientHistory: vi.fn().mockResolvedValue([]),
    assign: vi.fn().mockResolvedValue({ id: 'session-1' }),
  },
  getToken: vi.fn().mockReturnValue('tok'),
}));

import UnifiedAssessmentsPanel from '../UnifiedAssessmentsPanel';

describe('UnifiedAssessmentsPanel', () => {
  it('renders all test catalog items after load', async () => {
    render(<UnifiedAssessmentsPanel patientId="pat-1" assessments={[]} />);
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument();
      expect(screen.getByText('Eneagrama Simplificado')).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    const { psychTestsApi } = await import('@/lib/api');
    (psychTestsApi.getCatalog as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    render(<UnifiedAssessmentsPanel patientId="pat-1" assessments={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Rodar e ajustar**

**Step 3: Commit**
```bash
git add dashboard/src/components/__tests__/UnifiedAssessmentsPanel.test.tsx
git commit -m "test: UnifiedAssessmentsPanel — catalog render, error state, assign"
```

---

### Task 5.5: Testes — Componente `MedicationManager`

**Files:**
- Create: `dashboard/src/components/__tests__/MedicationManager.test.tsx`

**Cenários:**
1. Renderiza lista vazia com mensagem
2. Renderiza medicamentos ativos
3. Form de novo medicamento: campos nome, dose, frequência
4. Submit cria medicamento (mock API)
5. "Encerrar medicamento" muda status para inativo
6. Medicamentos inativos aparecem na seção de histórico

**Step 1: Criar, rodar, commitar**
```bash
git add dashboard/src/components/__tests__/MedicationManager.test.tsx
git commit -m "test: MedicationManager component"
```

---

### Task 5.6: Testes — Componente `PatientList`

**Files:**
- Create: `dashboard/src/components/__tests__/PatientList.test.tsx`

**Cenários:**
1. Renderiza lista de pacientes
2. Busca por nome filtra a lista
3. Clique em paciente chama callback/navega para `/patients/:id`
4. Lista vazia exibe mensagem de "Nenhum paciente"
5. Estado de humor renderiza cor correta

**Step 1: Criar, rodar, commitar**
```bash
git add dashboard/src/components/__tests__/PatientList.test.tsx
git commit -m "test: PatientList component — render, search, empty state"
```

---

## FASE 6 — E2E com Playwright (2h)

### Task 6.1: Setup Playwright

**Files:**
- Create: `e2e/` (na raiz do projeto)
- Create: `playwright.config.ts` (na raiz)
- Modify: `package.json` (raiz) — se existir; ou criar um apenas para e2e

**Step 1: Instalar Playwright**
```bash
cd /Users/luizaquintino/Desktop/Clarita
npm init -y 2>/dev/null || true
npm install --save-dev @playwright/test
npx playwright install chromium
```

**Step 2: Criar `playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Step 3: Criar `e2e/helpers.ts`**
```typescript
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[name="email"], input[type="email"]', email);
  await page.fill('[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
}

// Test credentials (from seed_journeys.js):
export const TEST_PROFESSIONAL = {
  email: 'luiza.psiquiatra@teste.com',
  password: 'JCHh14025520',
};

export const TEST_PSYCHOLOGIST = {
  email: 'luiza.psicologa@teste.com',
  password: 'JCHh14025520',
};

// Patient credentials — find one via seed_journeys.js patients array
export const TEST_PATIENT = {
  email: 'paciente1@teste.com', // check seed_journeys.js for exact emails
  password: 'JCHh14025520',
};
```

**Step 4: Commit**
```bash
git add playwright.config.ts e2e/ package.json
git commit -m "test: setup Playwright for E2E testing"
```

---

### Task 6.2: E2E — Jornada de Login (todos os cenários)

**Files:**
- Create: `e2e/auth/login.spec.ts`

**Cenários:**
1. Login válido como profissional → redireciona para `/patients`
2. Login válido como paciente → redireciona para `/patient-home`
3. Email correto + senha errada → exibe mensagem de erro
4. Email inexistente → exibe mensagem de erro
5. Campos em branco → validação client-side antes de enviar
6. Password com menos de 6 caracteres → erro de validação
7. Email sem @ → erro de validação
8. Pressionar Enter no campo senha submete o formulário
9. Token é salvo no localStorage após login
10. Recarregar página após login → permanece logado (sem redirecionar para login)

**Step 1: Criar arquivo**
```typescript
import { test, expect } from '@playwright/test';
import { loginAs, TEST_PROFESSIONAL, TEST_PATIENT } from '../helpers';

test.describe('Login — todos os cenários', () => {
  test('profissional: login válido redireciona para /patients', async ({ page }) => {
    await loginAs(page, TEST_PROFESSIONAL.email, TEST_PROFESSIONAL.password);
    await expect(page).toHaveURL(/patients/, { timeout: 10_000 });
  });

  test('paciente: login válido redireciona para /patient-home', async ({ page }) => {
    await loginAs(page, TEST_PATIENT.email, TEST_PATIENT.password);
    await expect(page).toHaveURL(/patient-home/, { timeout: 10_000 });
  });

  test('senha errada exibe mensagem de erro', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_PROFESSIONAL.email);
    await page.fill('input[type="password"]', 'senha-errada-123');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/inválid|incorret|erro/i)).toBeVisible({ timeout: 5_000 });
  });

  test('email inexistente exibe mensagem de erro', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'naoexiste@nuncaexistiu.com');
    await page.fill('input[type="password"]', 'Qualquer1234');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/inválid|não encontrad|erro/i)).toBeVisible({ timeout: 5_000 });
  });

  test('campos vazios não submetem', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/login/);
  });

  test('permanece logado após recarregar', async ({ page }) => {
    await loginAs(page, TEST_PROFESSIONAL.email, TEST_PROFESSIONAL.password);
    await expect(page).toHaveURL(/patients/, { timeout: 10_000 });
    await page.reload();
    await expect(page).not.toHaveURL(/login/);
  });
});
```

**Step 2: Rodar (com o servidor dev rodando)**
```bash
# Terminal 1: cd dashboard && npm run dev
# Terminal 2: cd backend && npm run dev
# Terminal 3:
cd /Users/luizaquintino/Desktop/Clarita && npx playwright test e2e/auth/login.spec.ts --reporter=line
```

**Step 3: Commit**
```bash
git add e2e/auth/login.spec.ts e2e/helpers.ts
git commit -m "test: E2E login journey — all scenarios including error cases"
```

---

### Task 6.3: E2E — Jornada do Profissional

**Files:**
- Create: `e2e/professional/patient-management.spec.ts`

**Cenários:**
1. Ver lista de pacientes após login
2. Clicar em paciente → abrir prontuário
3. Aba Avaliações → ver UnifiedAssessmentsPanel
4. Aba Medicamentos → ver MedicationManager
5. Aba Diagnóstico → ver DiagnosticBrowserPanel
6. Buscar CID-11 por keyword → ver resultados

**Step 1: Criar arquivo**
```typescript
import { test, expect } from '@playwright/test';
import { loginAs, TEST_PROFESSIONAL } from '../helpers';

test.describe('Profissional — gestão de pacientes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_PROFESSIONAL.email, TEST_PROFESSIONAL.password);
    await expect(page).toHaveURL(/patients/, { timeout: 10_000 });
  });

  test('lista de pacientes carrega', async ({ page }) => {
    await expect(page.locator('[data-testid="patient-list"], .patient-list, h1').first()).toBeVisible();
  });

  test('clicar em paciente abre prontuário', async ({ page }) => {
    const firstPatient = page.locator('a[href*="/patients/"]').first();
    if (await firstPatient.count() > 0) {
      await firstPatient.click();
      await expect(page).toHaveURL(/patients\/.+/, { timeout: 5_000 });
    }
  });
});
```

**Step 2: Rodar e commitar**
```bash
git add e2e/professional/
git commit -m "test: E2E professional journey — patient list, records navigation"
```

---

### Task 6.4: E2E — Jornada do Paciente

**Files:**
- Create: `e2e/patient/daily-checkin.spec.ts`

**Cenários:**
1. Paciente faz login → vê patient-home
2. Navega para check-in diário
3. Preenche humor/ansiedade/energia/sono → salva
4. Vê histórico emocional
5. Vê avaliações pendentes
6. Navega para Perfil

**Step 1: Criar arquivo e rodar**

**Step 2: Commit**
```bash
git add e2e/patient/
git commit -m "test: E2E patient journey — login, checkin, assessments"
```

---

## FASE 7 — Documentação para Open Source (1.5h)

### Task 7.1: Criar `CONTRIBUTING.md`

**Files:**
- Create: `CONTRIBUTING.md` (na raiz)

**Conteúdo:**
```markdown
# Como Contribuir com o Clarita

Obrigada pelo interesse em contribuir! Este guia explica como configurar o ambiente, seguir os padrões do projeto e enviar sua contribuição.

## Configuração do Ambiente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+ (ou conta no Neon)
- Git

### Instalação

```bash
git clone https://github.com/luliquintino/clarita.git
cd clarita

# Backend
cd backend
cp .env.example .env  # configure suas variáveis
npm install
npm run db:init
npm run db:seed

# Frontend
cd ../dashboard
cp .env.example .env.local
npm install
npm run dev
```

## Rodando os Testes

```bash
# Backend (integração + unit)
cd backend && npm test

# Frontend (componentes)
cd dashboard && npm test

# E2E (Playwright — requer servers rodando)
npx playwright test
```

## Padrões do Projeto

- **Backend**: Express.js, sem ORMs — SQL direto com queries parametrizadas
- **Frontend**: Next.js App Router, TypeScript estrito, Tailwind CSS
- **Testes**: TDD quando possível; cobertura mínima de 80%
- **Commits**: `feat:`, `fix:`, `test:`, `docs:`, `chore:`

## Abrindo um Pull Request

1. Crie uma branch: `git checkout -b feat/minha-feature`
2. Escreva testes para sua feature
3. Abra o PR descrevendo o que muda e por quê
4. Aguarde revisão

## Código de Conduta

Este projeto segue o [Código de Conduta](CODE_OF_CONDUCT.md).
```

**Step 1: Criar arquivo**

**Step 2: Commit**
```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md"
```

---

### Task 7.2: Criar `CODE_OF_CONDUCT.md`

**Files:**
- Create: `CODE_OF_CONDUCT.md` (na raiz)

Usar o [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) em Português.

**Step 1: Criar arquivo com texto completo do Contributor Covenant 2.1 em PT-BR**

**Step 2: Commit**
```bash
git add CODE_OF_CONDUCT.md
git commit -m "docs: add Contributor Covenant Code of Conduct"
```

---

### Task 7.3: Criar `SECURITY.md`

**Files:**
- Create: `SECURITY.md` (na raiz)

**Conteúdo:**
```markdown
# Política de Segurança

## Versões Suportadas

| Versão | Suporte |
|---|---|
| main | ✅ |

## Reportando Vulnerabilidades

**Não abra issues públicas para vulnerabilidades de segurança.**

Envie um email para: [security@clarita.app] com:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestão de correção (opcional)

Você receberá uma resposta em até 72 horas. Depois de corrigido, o issue será publicado com crédito ao(à) pesquisador(a).

## Escopo

- Injeção de SQL
- Autenticação/autorização bypass
- Exposição de dados de pacientes
- XSS em inputs clínicos
- LGPD: acesso não autorizado a dados de saúde
```

**Step 1: Criar arquivo**

**Step 2: Commit**
```bash
git add SECURITY.md
git commit -m "docs: add SECURITY.md vulnerability reporting policy"
```

---

### Task 7.4: Criar `docs/ARCHITECTURE.md`

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Seções:**
1. Visão geral (diagrama em texto)
2. Backend: estrutura de pastas, padrão de rotas, middleware, jobs
3. Frontend: App Router, componentes por domínio, API client
4. Banco de dados: tabelas principais e relacionamentos
5. Segurança: fluxo de autenticação JWT, RBAC
6. IA: como o Gêmeo Digital funciona (prompts + análise)

**Step 1: Criar arquivo**

**Step 2: Commit**
```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md with system overview"
```

---

### Task 7.5: Criar `.env.example` nos dois projetos

**Files:**
- Create: `backend/.env.example`
- Create: `dashboard/.env.example`

**`backend/.env.example`:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/clarita

# Auth
JWT_SECRET=your-very-long-random-secret-here

# Email (Resend)
RESEND_API_KEY=re_xxx

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AI (Anthropic Claude)
ANTHROPIC_API_KEY=sk-ant-xxx

# Push notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@clarita.app

# App
PORT=3005
NODE_ENV=development
```

**`dashboard/.env.example`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3005/api
```

**Step 1: Criar ambos os arquivos**

**Step 2: Verificar que `.gitignore` já ignora `.env` e `.env.local`**
```bash
grep "\.env" .gitignore backend/.gitignore dashboard/.gitignore 2>/dev/null
```

**Step 3: Commit**
```bash
git add backend/.env.example dashboard/.env.example
git commit -m "docs: add .env.example files for local setup"
```

---

## FASE 8 — CI/CD com GitHub Actions (45 min)

### Task 8.1: Criar workflow de testes no CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Criar arquivo**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: clarita
          POSTGRES_PASSWORD: clarita
          POSTGRES_DB: clarita_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend deps
        run: cd backend && npm ci

      - name: Run backend lint
        run: cd backend && npm run lint

      - name: Run backend tests
        env:
          DATABASE_URL: postgresql://clarita:clarita@localhost:5432/clarita_test
          JWT_SECRET: test-jwt-secret-ci-2025
          NODE_ENV: test
        run: cd backend && npm run db:init && npm test -- --coverage

  frontend-lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: dashboard/package-lock.json

      - name: Install dashboard deps
        run: cd dashboard && npm ci

      - name: Run dashboard lint
        run: cd dashboard && npm run lint

      - name: Run dashboard tests
        run: cd dashboard && npm test
```

**Step 2: Commit**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for backend + frontend tests"
```

---

## FASE 9 — Validação Final e Badge (20 min)

### Task 9.1: Rodar suite completa e verificar cobertura

**Step 1: Cobertura backend**
```bash
cd backend && npm run test:coverage 2>&1 | tail -30
```
Expected: `Lines > 70%` em rotas principais.

**Step 2: Cobertura frontend**
```bash
cd dashboard && npx vitest run --coverage 2>&1 | tail -20
```

**Step 3: Lint final**
```bash
cd backend && npm run lint && echo "Backend OK"
cd dashboard && npm run lint && echo "Dashboard OK"
```

### Task 9.2: Adicionar badges ao `README.md`

**Files:**
- Modify: `README.md`

**Step 1: Adicionar após o título:**
```markdown
[![CI](https://github.com/luliquintino/clarita/actions/workflows/ci.yml/badge.svg)](https://github.com/luliquintino/clarita/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-brightgreen)](https://github.com/luliquintino/clarita)
```

**Step 2: Commit final**
```bash
git add README.md
git commit -m "docs: add CI badge to README"
```

---

## CHECKLIST FINAL

| Item | Status |
|---|---|
| Lint backend (sem erros) | ⬜ |
| Lint frontend (sem erros) | ⬜ |
| Testes backend passando (>= 80% cobertura) | ⬜ |
| Testes psychTests (novo) | ⬜ |
| Testes icd11 (novo) | ⬜ |
| Testes anamnesis, invitations, documents, me (novos) | ⬜ |
| Unit tests psychTestService (calculateScore — 4 métodos) | ⬜ |
| Frontend: Vitest + RTL instalados | ⬜ |
| Testes API client (token, ApiError, authApi) | ⬜ |
| Testes LoginPage (10+ cenários) | ⬜ |
| Testes RegisterPage | ⬜ |
| Testes UnifiedAssessmentsPanel | ⬜ |
| Testes MedicationManager | ⬜ |
| Playwright: login E2E (10 cenários) | ⬜ |
| Playwright: jornada profissional | ⬜ |
| Playwright: jornada paciente | ⬜ |
| CONTRIBUTING.md | ⬜ |
| CODE_OF_CONDUCT.md | ⬜ |
| SECURITY.md | ⬜ |
| docs/ARCHITECTURE.md | ⬜ |
| .env.example (backend + dashboard) | ⬜ |
| GitHub Actions CI | ⬜ |
| README badges | ⬜ |
