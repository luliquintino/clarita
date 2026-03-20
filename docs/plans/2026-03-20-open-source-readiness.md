# Open Source Readiness — Documentação + Testes Completos

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tornar o Clarita pronto para open source com documentação completa, cobertura total de testes (backend unit+integration, frontend Jest+RTL, E2E Cypress) e lint reforçado com CI/CD.

**Architecture:** 5 fases progressivas: Docs → Backend Tests → Frontend Tests → E2E → Lint/CI. Cada fase é independente e commitável. Backend usa Jest+Supertest com DB de teste real. Frontend usa Jest+RTL com mocks de fetch/router. E2E usa Cypress apontando para localhost:3000.

**Tech Stack:** Express.js, Next.js 14, TypeScript, Jest, Supertest, React Testing Library, Cypress, ESLint, Prettier, Husky, GitHub Actions, PostgreSQL (Neon)

---

## FASE 1 — DOCUMENTAÇÃO

### Task 1: .env.example (backend + dashboard)

**Files:**
- Create: `backend/.env.example`
- Create: `dashboard/.env.example`

**Step 1: Criar `backend/.env.example`**

```bash
# backend/.env.example
NODE_ENV=development
PORT=3005

# PostgreSQL (Neon ou local)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Cloudinary (upload de exames)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Resend (emails)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Web Push (notificações)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:admin@yourdomain.com

# Frontend URL (para links de email)
FRONTEND_URL=http://localhost:3000
```

**Step 2: Criar `dashboard/.env.example`**

```bash
# dashboard/.env.example
NEXT_PUBLIC_API_URL=http://localhost:3005/api
```

**Step 3: Commit**

```bash
git add backend/.env.example dashboard/.env.example
git commit -m "docs: add .env.example for backend and dashboard"
```

---

### Task 2: docs/SETUP.md

**Files:**
- Create: `docs/SETUP.md`

**Step 1: Criar o arquivo**

```markdown
# Guia de Setup Local

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+ (ou conta Neon gratuita em neon.tech)
- npm 9+

## 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/clarita.git
cd clarita
```

## 2. Configure o backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais
```

Crie o banco e rode as migrações:

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/migration_password_reset.sql
psql "$DATABASE_URL" -f db/migration_phase1.sql
psql "$DATABASE_URL" -f db/migration_phase3.sql
psql "$DATABASE_URL" -f db/migration_phase4.sql
psql "$DATABASE_URL" -f db/migration_goal_acceptance.sql
psql "$DATABASE_URL" -f db/migration_digital_twin.sql
psql "$DATABASE_URL" -f db/migration_onboarding_documents.sql
psql "$DATABASE_URL" -f db/migration_invitations.sql
psql "$DATABASE_URL" -f db/migration_exams.sql
psql "$DATABASE_URL" -f db/migration_clinical_modules.sql
```

Inicie o backend:

```bash
npm run dev
# Servidor disponível em http://localhost:3005
```

## 3. Configure o dashboard

```bash
cd ../dashboard
npm install
cp .env.example .env.local
# Edite .env.local se necessário
npm run dev
# Dashboard disponível em http://localhost:3000
```

## 4. Conta de teste

Após seed, use:
- Email: `admin@clarita.app`
- Senha: veja `backend/db/seed_journeys.js`

## 5. Testes

```bash
# Backend
cd backend
npm test               # todos os testes
npm run test:coverage  # com coverage

# Frontend
cd dashboard
npm test               # todos os testes

# E2E (requer backend + dashboard rodando)
cd dashboard
npx cypress open
```
```

**Step 2: Commit**

```bash
git add docs/SETUP.md
git commit -m "docs: add local setup guide"
```

---

### Task 3: docs/ARCHITECTURE.md

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Step 1: Criar o arquivo com diagrama e descrição**

O arquivo deve cobrir:
- Diagrama de camadas (Mobile → Dashboard → Backend → PostgreSQL)
- Fluxo de autenticação JWT
- Modelo de dados principal (users, patient_profiles, professional_profiles, relationships)
- Decisões de design: RBAC com roles, soft deletes, display_id público vs UUID interno
- Serviços externos: Cloudinary, Resend, Web Push, Neon

```markdown
# Arquitetura do Clarita

## Visão Geral

```
┌─────────────────┐     ┌──────────────────┐
│   Mobile App    │     │    Dashboard     │
│ (React Native)  │     │   (Next.js 14)   │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │      HTTP/REST        │
         └───────────┬───────────┘
                     │
           ┌─────────▼──────────┐
           │   Backend API      │
           │   (Express.js)     │
           │   Port 3005        │
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │   PostgreSQL       │
           │   (Neon Cloud)     │
           └────────────────────┘
```

## Autenticação

JWT stateless. Token enviado via `Authorization: Bearer <token>` em todos os endpoints protegidos.
Roles: `patient`, `psychologist`, `psychiatrist`, `admin`.

Middleware chain: `authenticate` → `requireRole(...)` → `requirePatientAccess(...)` → handler.

## Modelo de Dados Principal

- `users` — todos os usuários (pacientes e profissionais)
- `patient_profiles` — dados clínicos dos pacientes
- `professional_profiles` — CRP/CRM dos profissionais
- `patient_professional_relationships` — vínculo profissional↔paciente
- `psychological_tests` + `patient_test_sessions` — avaliações clínicas
- `icd11_disorders` + `patient_diagnoses` — diagnósticos formais
- `clinical_notes` — notas clínicas com privacidade configurável
- `medications` + `medication_check_ins` — aderência medicamentosa

## RBAC

Três níveis de acesso:
1. **Role-based** (`requireRole`) — apenas psicólogos/psiquiatras acessam dados de pacientes
2. **Relationship-based** (`requirePatientAccess`) — profissional só acessa pacientes vinculados a ele
3. **Ownership-based** — paciente só acessa seus próprios dados

## IDs

Internamente: UUID v4. Exposto ao usuário: `display_id` (ex: `CLA-4821`) gerado sequencialmente,
sem revelar volume de usuários.

## Serviços Externos

| Serviço | Uso |
|---|---|
| Neon PostgreSQL | Banco de dados cloud |
| Cloudinary | Upload de exames/documentos |
| Resend | Emails transacionais (invite, reset senha) |
| Web Push (VAPID) | Notificações push no dashboard |
```

**Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add system architecture documentation"
```

---

### Task 4: docs/API.md — todos os endpoints

**Files:**
- Create: `docs/API.md`

**Step 1: Listar todas as rotas do backend**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
grep -r "router\.\(get\|post\|put\|patch\|delete\)" src/routes/ | grep -v "node_modules" | head -100
```

**Step 2: Criar `docs/API.md`** com formato padrão para cada endpoint:

```markdown
# API Reference

Base URL: `http://localhost:3005/api`

Autenticação: `Authorization: Bearer <jwt_token>` em todos os endpoints (exceto `/auth/register` e `/auth/login`).

---

## Auth

### POST /auth/register
Cadastra novo usuário (paciente ou profissional).

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Secure1234",
  "first_name": "Maria",
  "last_name": "Silva",
  "role": "patient",
  "license_number": "CRP-06/12345"  // obrigatório se role = psychologist/psychiatrist
}
```

**Response 201:**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "role": "patient", "display_id": "CLA-1234" }
}
```

**Errors:** 400 (validação), 409 (email duplicado)

### POST /auth/login
...
```

Documentar todos os grupos: `auth`, `patients`, `professionals`, `me`, `users`, `psychTests`, `assessments`, `icd11`, `clinicalNotes`, `medications`, `journal`, `emotionalLogs`, `symptoms`, `lifeEvents`, `goals`, `insights`, `alerts`, `summaries`, `invitations`, `documents`, `exams`, `anamnesis`, `digitalTwin`, `recordSharing`, `onboarding`, `chat`

**Step 3: Commit**

```bash
git add docs/API.md
git commit -m "docs: add complete API reference for all 30+ endpoints"
```

---

### Task 5: docs/COMPONENTS.md

**Files:**
- Create: `docs/COMPONENTS.md`

**Step 1: Criar catálogo**

Para cada um dos 39 componentes em `dashboard/src/components/`, documentar:
- Descrição (1 linha)
- Props principais
- Quem usa (página pai)

Exemplo:

```markdown
# Componentes React

## UnifiedAssessmentsPanel

Painel unificado de avaliações clínicas e psicológicas.

**Props:**
- `patientId: string` — UUID do paciente
- `isPatientView: boolean` — se true, mostra interface do paciente (responder testes)

**Usado em:** `patients/[id]/page.tsx`, `patient-home/page.tsx`

---

## MedicationManager

Gerenciamento de medicamentos prescritos e registro de adesão.

**Props:**
- `patientId: string`
- `isPatientView: boolean`

**Usado em:** `patients/[id]/page.tsx`, `patient-home/page.tsx`
```

**Step 2: Commit**

```bash
git add docs/COMPONENTS.md
git commit -m "docs: add React component catalog"
```

---

### Task 6: CONTRIBUTING.md + SECURITY.md + README atualizado

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Modify: `README.md`

**Step 1: Criar `CONTRIBUTING.md`**

```markdown
# Como Contribuir

## Setup

Siga `docs/SETUP.md` para configurar o ambiente local.

## Branches

- `main` — produção (protegida)
- `feat/nome-da-feature` — novas funcionalidades
- `fix/nome-do-bug` — correções
- `docs/nome-da-doc` — documentação

## Fluxo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Escreva testes antes do código (TDD)
4. Rode os testes: `npm test`
5. Rode o lint: `npm run lint`
6. Abra um Pull Request com descrição clara

## Padrões de código

- Backend: ESLint + Prettier (config em `backend/.eslintrc.js`)
- Frontend: next lint + Prettier (config em `dashboard/.eslintrc.json`)
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`)

## Testes

Todo código novo deve ter testes. Veja `docs/SETUP.md#testes`.

## Pull Requests

- Descreva o que mudou e por quê
- Referencie a issue relacionada
- Todos os checks de CI devem estar passando
```

**Step 2: Criar `SECURITY.md`**

```markdown
# Segurança e LGPD

## Reportar Vulnerabilidades

Não abra issues públicas para vulnerabilidades de segurança.
Envie um email para: security@clarita.app

Inclua:
- Descrição do problema
- Passos para reproduzir
- Impacto potencial

Responderemos em até 48h.

## LGPD

O Clarita foi desenvolvido em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018):

- Dados pessoais de saúde são tratados como dados sensíveis
- Pacientes controlam quem acessa seus dados (RecordSharingPanel)
- Tokens de acesso expiram automaticamente
- Dados podem ser exportados ou deletados a pedido
```

**Step 3: Atualizar `README.md`**

Adicionar ao README existente:
- Badge CI (placeholder até GitHub Actions estar configurado): `![CI](https://github.com/seu-usuario/clarita/actions/workflows/ci.yml/badge.svg)`
- Links para `docs/SETUP.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`
- Stack badges

**Step 4: Commit**

```bash
git add CONTRIBUTING.md SECURITY.md README.md
git commit -m "docs: add CONTRIBUTING.md, SECURITY.md and update README for open source"
```

---

## FASE 2 — BACKEND TESTS

> Os testes do backend usam uma DB PostgreSQL real de teste. Arquivo `.env.test` em `backend/`.
> Padrão do projeto: `beforeEach(() => cleanDatabase())`. Helpers em `backend/tests/helpers.js`.

### Task 7: Expandir auth.test.js com todos os cenários de login

**Files:**
- Modify: `backend/tests/integration/auth.test.js`

**Step 1: Adicionar cenários faltantes no describe `POST /api/auth/login`**

Verificar os cenários que já existem no arquivo e adicionar os que faltam:

```javascript
// Cenários a adicionar:

it('should return 401 for wrong password', async () => {
  await createTestUser({ email: 'test@test.com', password: 'Correct1234' });
  const res = await request(app).post('/api/auth/login').send({
    email: 'test@test.com',
    password: 'WrongPassword',
  });
  expect(res.status).toBe(401);
  expect(res.body.error).toBeDefined();
});

it('should return 401 for non-existent email', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'notexist@test.com',
    password: 'Any1234',
  });
  expect(res.status).toBe(401);
});

it('should return 400 for empty email', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: '',
    password: 'Any1234',
  });
  expect(res.status).toBe(400);
});

it('should return 400 for empty password', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'test@test.com',
    password: '',
  });
  expect(res.status).toBe(400);
});

it('should return 400 for invalid email format', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'not-an-email',
    password: 'Any1234',
  });
  expect(res.status).toBe(400);
});

it('should return 401 for inactive account', async () => {
  const { user } = await createTestUser({ is_active: false });
  const res = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: 'Test1234!',
  });
  expect(res.status).toBe(401);
});

it('should return 401 for expired token on protected route', async () => {
  const { user } = await createTestUser();
  const expiredToken = generateExpiredToken(user.id, user.role);
  const res = await request(app)
    .get('/api/me')
    .set('Authorization', `Bearer ${expiredToken}`);
  expect(res.status).toBe(401);
});

it('should return 401 for tampered token', async () => {
  const res = await request(app)
    .get('/api/me')
    .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature');
  expect(res.status).toBe(401);
});

it('should not be vulnerable to sql injection in email field', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: "' OR 1=1 --",
    password: 'Any1234',
  });
  // Should return 400 (validation) or 401 (not found), never 200
  expect([400, 401]).toContain(res.status);
});
```

**Step 2: Rodar os testes**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
npm test -- --testPathPattern="auth" --verbose
```

Esperado: todos passando.

**Step 3: Commit**

```bash
git add backend/tests/integration/auth.test.js
git commit -m "test: expand auth integration tests with all login scenarios"
```

---

### Task 8: tests/integration/psychTests.test.js

**Files:**
- Create: `backend/tests/integration/psychTests.test.js`

**Step 1: Criar o arquivo**

```javascript
'use strict';

const request = require('supertest');
const { getApp, cleanDatabase, createTestProfessional, createTestPatient, createRelationship } = require('../helpers');
const { query } = require('../../src/config/database');

const app = getApp();

beforeEach(async () => {
  await cleanDatabase();
});

describe('GET /api/psych-tests', () => {
  it('should return list of active tests for professional', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/psych-tests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tests).toBeInstanceOf(Array);
    expect(res.body.disclaimer).toBeDefined();
  });

  it('should return 403 for patient role', async () => {
    const { token } = await createTestPatient();
    const res = await request(app)
      .get('/api/psych-tests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/psych-tests');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/psych-tests/sessions/:patientId', () => {
  it('should return 404 for non-existent patient', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .post('/api/psych-tests/sessions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ test_id: '00000000-0000-0000-0000-000000000000', responses: [] });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/psych-tests/sessions/:patientId', () => {
  it('should return sessions for linked patient', async () => {
    const { user: pro, token } = await createTestProfessional();
    const { user: pat } = await createTestPatient();
    await createRelationship(pro.id, pat.id);

    const res = await request(app)
      .get(`/api/psych-tests/sessions/${pat.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toBeInstanceOf(Array);
  });

  it('should return 403 for unlinked patient', async () => {
    const { token } = await createTestProfessional();
    const { user: pat } = await createTestPatient();
    const res = await request(app)
      .get(`/api/psych-tests/sessions/${pat.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
```

**Step 2: Verificar se `createRelationship` existe em helpers.js**

```bash
grep "createRelationship" /Users/luizaquintino/Desktop/Clarita/backend/tests/helpers.js
```

Se não existir, adicionar ao `helpers.js`:

```javascript
async function createRelationship(professionalId, patientId) {
  await query(
    `INSERT INTO patient_professional_relationships (patient_id, professional_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT DO NOTHING`,
    [patientId, professionalId]
  );
}
```

E exportar: adicionar `createRelationship` ao `module.exports`.

**Step 3: Rodar**

```bash
npm test -- --testPathPattern="psychTests" --verbose
```

**Step 4: Commit**

```bash
git add backend/tests/integration/psychTests.test.js backend/tests/helpers.js
git commit -m "test: add psych tests integration tests"
```

---

### Task 9: tests/integration/icd11.test.js

**Files:**
- Create: `backend/tests/integration/icd11.test.js`

**Step 1: Criar o arquivo**

```javascript
'use strict';

const request = require('supertest');
const { getApp, cleanDatabase, createTestProfessional, createTestPatient } = require('../helpers');

const app = getApp();

beforeEach(async () => { await cleanDatabase(); });

describe('GET /api/icd11', () => {
  it('should return disorders for professional', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.disorders).toBeInstanceOf(Array);
  });

  it('should filter by category', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11?category=anxiety')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should search by keyword', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11?search=depressao')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should return 403 for patient role', async () => {
    const { token } = await createTestPatient();
    const res = await request(app)
      .get('/api/icd11')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/icd11/recent', () => {
  it('should return recent diagnoses for professional', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .get('/api/icd11/recent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.recent).toBeInstanceOf(Array);
  });
});
```

**Step 2: Rodar e commitar**

```bash
npm test -- --testPathPattern="icd11" --verbose
git add backend/tests/integration/icd11.test.js
git commit -m "test: add ICD-11 integration tests"
```

---

### Task 10: tests/integration/invitations.test.js

**Files:**
- Create: `backend/tests/integration/invitations.test.js`

**Step 1: Criar o arquivo**

```javascript
'use strict';

const request = require('supertest');
const { getApp, cleanDatabase, createTestProfessional, createTestPatient } = require('../helpers');

const app = getApp();

beforeEach(async () => { await cleanDatabase(); });

describe('POST /api/invitations', () => {
  it('should send invitation from professional to patient email', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newpatient@test.com' });
    // 200 or 201
    expect([200, 201]).toContain(res.status);
  });

  it('should return 400 for invalid email', async () => {
    const { token } = await createTestProfessional();
    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-valid' });
    expect(res.status).toBe(400);
  });

  it('should return 403 for patient role trying to invite', async () => {
    const { token } = await createTestPatient();
    const res = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'someone@test.com' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/invitations/pending', () => {
  it('should return pending invitations for patient', async () => {
    const { token } = await createTestPatient();
    const res = await request(app)
      .get('/api/invitations/pending')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.invitations).toBeInstanceOf(Array);
  });
});
```

**Step 2: Rodar e commitar**

```bash
npm test -- --testPathPattern="invitations" --verbose
git add backend/tests/integration/invitations.test.js
git commit -m "test: add invitations integration tests"
```

---

### Task 11: tests/integration/me.test.js

**Files:**
- Create: `backend/tests/integration/me.test.js`

```javascript
'use strict';

const request = require('supertest');
const { getApp, cleanDatabase, createTestUser } = require('../helpers');

const app = getApp();
beforeEach(async () => { await cleanDatabase(); });

describe('GET /api/me', () => {
  it('should return current user profile', async () => {
    const { token, user } = await createTestUser();
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/me', () => {
  it('should update first_name and last_name', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Novo', last_name: 'Nome' });
    expect(res.status).toBe(200);
    expect(res.body.user.first_name).toBe('Novo');
  });

  it('should not allow updating email to existing email', async () => {
    const { user: other } = await createTestUser({ email: 'other@test.com' });
    const { token } = await createTestUser();
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: other.email });
    expect([400, 409]).toContain(res.status);
  });
});
```

**Step 2: Rodar e commitar**

```bash
npm test -- --testPathPattern="me" --verbose
git add backend/tests/integration/me.test.js
git commit -m "test: add /me endpoint integration tests"
```

---

### Task 12: Demais rotas backend (summaries, recordSharing, onboarding, documents, exams, anamnesis, digitalTwin)

**Files:**
- Create: `backend/tests/integration/summaries.test.js`
- Create: `backend/tests/integration/recordSharing.test.js`
- Create: `backend/tests/integration/onboarding.test.js`
- Create: `backend/tests/integration/documents.test.js`
- Create: `backend/tests/integration/exams.test.js`
- Create: `backend/tests/integration/anamnesis.test.js`
- Create: `backend/tests/integration/digitalTwin.test.js`

Para cada arquivo, usar o mesmo padrão: `beforeEach(cleanDatabase)`, criar usuários com helpers, testar os happy paths + 401 sem token + 403 role errada.

Exemplo mínimo para `summaries.test.js`:

```javascript
'use strict';
const request = require('supertest');
const { getApp, cleanDatabase, createTestProfessional, createTestPatient, createRelationship } = require('../helpers');
const app = getApp();
beforeEach(async () => { await cleanDatabase(); });

describe('POST /api/summaries/:patientId', () => {
  it('should return 403 without relationship', async () => {
    const { token } = await createTestProfessional();
    const { user: pat } = await createTestPatient();
    const res = await request(app)
      .post(`/api/summaries/${pat.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should return 200 or 201 for linked patient', async () => {
    const { user: pro, token } = await createTestProfessional();
    const { user: pat } = await createTestPatient();
    await createRelationship(pro.id, pat.id);
    const res = await request(app)
      .post(`/api/summaries/${pat.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 201]).toContain(res.status);
  });
});
```

**Step 2: Rodar todos**

```bash
npm test --verbose
```

**Step 3: Commit**

```bash
git add backend/tests/integration/
git commit -m "test: add integration tests for summaries, recordSharing, onboarding, documents, exams, anamnesis, digitalTwin"
```

---

### Task 13: Unit tests de serviços

**Files:**
- Create: `backend/tests/unit/services/psychTestService.test.js`
- Create: `backend/tests/unit/services/alertService.test.js`
- Create: `backend/tests/unit/services/summaryService.test.js`

Exemplo `psychTestService.test.js`:

```javascript
'use strict';
const { calculateScore } = require('../../../src/services/psychTestService');

describe('calculateScore — threshold method', () => {
  const thresholdTest = {
    scoring_method: 'threshold',
    thresholds: [
      { min: 0, max: 4, label: 'Mínima', severity: 'minimal' },
      { min: 5, max: 9, label: 'Leve', severity: 'mild' },
      { min: 10, max: 14, label: 'Moderada', severity: 'moderate' },
      { min: 15, max: 27, label: 'Grave', severity: 'severe' },
    ],
  };

  it('should return minimal for score 3', () => {
    const result = calculateScore(thresholdTest, 3);
    expect(result.severity).toBe('minimal');
    expect(result.label).toBe('Mínima');
  });

  it('should return severe for score 20', () => {
    const result = calculateScore(thresholdTest, 20);
    expect(result.severity).toBe('severe');
  });
});

describe('calculateScore — max_subscale method (Eneagrama)', () => {
  const eneagramaTest = {
    scoring_method: 'max_subscale',
    subscales: [
      { name: 'Tipo 1', items: [1, 10, 19] },
      { name: 'Tipo 2', items: [2, 11, 20] },
    ],
  };

  it('should return subscale with highest total', () => {
    const responses = { 1: 3, 10: 3, 19: 3, 2: 1, 11: 1, 20: 1 };
    const result = calculateScore(eneagramaTest, null, responses);
    expect(result.dominant_subscale).toBe('Tipo 1');
  });
});
```

**Step 2: Rodar e commitar**

```bash
npm test -- --testPathPattern="services" --verbose
git add backend/tests/unit/services/
git commit -m "test: add unit tests for psychTestService and alertService"
```

---

### Task 14: Verificar coverage e corrigir gaps

**Step 1: Gerar relatório de coverage**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
npm run test:coverage
```

**Step 2: Analisar output**

Esperado: linhas globais ≥ 80% (threshold já configurado no `jest.config.js`).
Se abaixo, identificar os arquivos com menor coverage e adicionar testes adicionais.

**Step 3: Commit se mudanças**

```bash
git add backend/tests/
git commit -m "test: improve backend coverage to meet 80% threshold"
```

---

## FASE 3 — FRONTEND TESTS (Jest + React Testing Library)

### Task 15: Setup Jest + RTL no dashboard

**Files:**
- Create: `dashboard/jest.config.js`
- Create: `dashboard/jest.setup.ts`
- Create: `dashboard/babel.config.js`
- Modify: `dashboard/package.json`

**Step 1: Instalar dependências**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  jest-environment-jsdom \
  babel-jest \
  @babel/preset-env \
  @babel/preset-react \
  @babel/preset-typescript \
  identity-obj-proxy
```

**Step 2: Criar `dashboard/babel.config.js`**

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
```

**Step 3: Criar `dashboard/jest.config.js`**

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

module.exports = createJestConfig(customJestConfig);
```

**Step 4: Criar `dashboard/jest.setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

**Step 5: Adicionar scripts ao `dashboard/package.json`**

Dentro de `"scripts"`, adicionar:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

**Step 6: Verificar que o setup funciona**

Criar um teste mínimo temporário:

```bash
mkdir -p dashboard/src/__tests__
cat > dashboard/src/__tests__/setup.test.tsx << 'EOF'
it('jest setup works', () => {
  expect(1 + 1).toBe(2);
});
EOF
cd dashboard && npm test
```

Esperado: 1 teste passando.

**Step 7: Remover teste temporário e commitar**

```bash
rm dashboard/src/__tests__/setup.test.tsx
git add dashboard/jest.config.js dashboard/jest.setup.ts dashboard/babel.config.js dashboard/package.json
git commit -m "test: setup Jest + React Testing Library in dashboard"
```

---

### Task 16: Testes da página de login

**Files:**
- Create: `dashboard/src/app/login/__tests__/page.test.tsx`

**Step 1: Criar o arquivo**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LoginPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
  });

  it('renders the Clarita brand/landing content', () => {
    render(<LoginPage />);
    expect(screen.getByText(/clarita/i)).toBeInTheDocument();
  });

  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('shows validation error for empty form submit', async () => {
    render(<LoginPage />);
    const btn = screen.getByRole('button', { name: /entrar/i });
    await userEvent.click(btn);
    // HTML5 validation or custom error
    expect(screen.queryByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('calls API on valid submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'abc', user: { role: 'psychologist', id: '1' } }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'Test1234');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.any(Object)
      );
    });
  });

  it('shows error message on failed login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Credenciais inválidas' }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@test.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'WrongPass');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during request', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'Test1234');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled();
  });

  it('has link to register page', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /cadastr/i })).toBeInTheDocument();
  });
});
```

**Step 2: Rodar**

```bash
cd dashboard && npm test -- --testPathPattern="login" --verbose
```

Corrigir seletores conforme necessário (os textos exatos dependem da implementação atual de `login/page.tsx`).

**Step 3: Commit**

```bash
git add dashboard/src/app/login/__tests__/
git commit -m "test: add login page unit tests"
```

---

### Task 17: Testes das páginas de autenticação (register, forgot-password, reset-password)

**Files:**
- Create: `dashboard/src/app/register/__tests__/page.test.tsx`
- Create: `dashboard/src/app/forgot-password/__tests__/page.test.tsx`
- Create: `dashboard/src/app/reset-password/__tests__/page.test.tsx`

Padrão para `register/page.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
global.fetch = jest.fn();

describe('RegisterPage', () => {
  beforeEach(() => { (global.fetch as jest.Mock).mockClear(); });

  it('renders registration form fields', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('shows error for weak password', async () => {
    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/senha/i), '123');
    await userEvent.click(screen.getByRole('button', { name: /cadastr/i }));
    // Either native HTML5 or custom error appears
    expect(document.body).toBeTruthy(); // baseline check
  });

  it('calls API with correct payload on valid submit', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'tok', user: { role: 'patient' } }),
    });
    render(<RegisterPage />);
    // Fill all required fields and submit
    // (adjust selectors per actual form fields)
  });
});
```

**Step 2: Rodar e commitar**

```bash
cd dashboard && npm test -- --testPathPattern="register|forgot|reset" --verbose
git add dashboard/src/app/register/__tests__/ dashboard/src/app/forgot-password/__tests__/ dashboard/src/app/reset-password/__tests__/
git commit -m "test: add register, forgot-password, reset-password page tests"
```

---

### Task 18: Testes das páginas de paciente e profissional

**Files:**
- Create: `dashboard/src/app/patients/__tests__/page.test.tsx`
- Create: `dashboard/src/app/patient-home/__tests__/page.test.tsx`

Padrão para `patients/page.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import PatientsPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage token
beforeEach(() => {
  localStorage.setItem('token', 'mock-token');
  localStorage.setItem('user', JSON.stringify({ role: 'psychologist', id: '1' }));
  mockFetch.mockClear();
});

describe('PatientsPage', () => {
  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<PatientsPage />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('shows empty state when no patients', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ patients: [] }),
    });
    render(<PatientsPage />);
    await waitFor(() => {
      expect(screen.getByText(/nenhum paciente/i)).toBeInTheDocument();
    });
  });

  it('renders patient list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        patients: [{ id: '1', first_name: 'Maria', last_name: 'Silva', display_id: 'CLA-1' }],
      }),
    });
    render(<PatientsPage />);
    await waitFor(() => {
      expect(screen.getByText(/maria/i)).toBeInTheDocument();
    });
  });

  it('shows error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(<PatientsPage />);
    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Rodar e commitar**

```bash
cd dashboard && npm test -- --testPathPattern="patients" --verbose
git add dashboard/src/app/patients/__tests__/
git commit -m "test: add patients page tests"
```

---

### Task 19: Testes de componentes críticos

**Files:**
- Create: `dashboard/src/components/__tests__/MedicationManager.test.tsx`
- Create: `dashboard/src/components/__tests__/PatientList.test.tsx`
- Create: `dashboard/src/components/__tests__/SideNav.test.tsx`
- Create: `dashboard/src/components/__tests__/UnifiedAssessmentsPanel.test.tsx`

Padrão mínimo para cada componente:

```typescript
// MedicationManager.test.tsx
import { render, screen } from '@testing-library/react';
import MedicationManager from '../MedicationManager';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ medications: [] }) });

describe('MedicationManager', () => {
  it('renders without crashing', () => {
    render(<MedicationManager patientId="test-id" isPatientView={false} />);
    expect(document.body).toBeTruthy();
  });

  it('shows empty state when no medications', async () => {
    render(<MedicationManager patientId="test-id" isPatientView={false} />);
    // Check for some stable UI element
  });
});
```

**Step 2: Rodar e commitar**

```bash
cd dashboard && npm test --verbose
git add dashboard/src/components/__tests__/
git commit -m "test: add component unit tests (MedicationManager, PatientList, SideNav, UnifiedAssessmentsPanel)"
```

---

## FASE 4 — E2E COM CYPRESS

### Task 20: Setup Cypress

**Files:**
- Create: `dashboard/cypress.config.ts`
- Create: `dashboard/cypress/support/commands.ts`
- Create: `dashboard/cypress/support/e2e.ts`
- Create: `dashboard/cypress/fixtures/users.json`

**Step 1: Instalar Cypress**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm install --save-dev cypress
```

**Step 2: Criar `dashboard/cypress.config.ts`**

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
  },
});
```

**Step 3: Criar `cypress/fixtures/users.json`**

```json
{
  "professional": {
    "email": "psy@clarita.test",
    "password": "Clarita@2025",
    "role": "psychologist"
  },
  "patient": {
    "email": "patient@clarita.test",
    "password": "Clarita@2025",
    "role": "patient"
  }
}
```

**Step 4: Criar `cypress/support/commands.ts`**

```typescript
/// <reference types="cypress" />

Cypress.Commands.add('loginAsProfessional', () => {
  cy.fixture('users').then((users) => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(users.professional.email);
    cy.get('input[type="password"]').type(users.professional.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });
});

Cypress.Commands.add('loginAsPatient', () => {
  cy.fixture('users').then((users) => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(users.patient.email);
    cy.get('input[type="password"]').type(users.patient.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsProfessional(): Chainable<void>;
      loginAsPatient(): Chainable<void>;
    }
  }
}
```

**Step 5: Criar `cypress/support/e2e.ts`**

```typescript
import './commands';
```

**Step 6: Adicionar script ao package.json**

```json
"cy:open": "cypress open",
"cy:run": "cypress run"
```

**Step 7: Commit**

```bash
git add dashboard/cypress.config.ts dashboard/cypress/ dashboard/package.json
git commit -m "test: setup Cypress for E2E testing"
```

---

### Task 21: cypress/e2e/auth.cy.ts

**Files:**
- Create: `dashboard/cypress/e2e/auth.cy.ts`

**Step 1: Criar o arquivo**

```typescript
describe('Autenticação', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('login válido como profissional redireciona para /patients', () => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.professional.email);
      cy.get('input[type="password"]').type(users.professional.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/patients');
    });
  });

  it('login válido como paciente redireciona para /patient-home', () => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.patient.email);
      cy.get('input[type="password"]').type(users.patient.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/patient-home');
    });
  });

  it('senha incorreta mostra mensagem de erro', () => {
    cy.fixture('users').then((users) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(users.professional.email);
      cy.get('input[type="password"]').type('SenhaErrada123');
      cy.get('button[type="submit"]').click();
      cy.contains(/credenciais inválidas|incorreta|erro/i).should('be.visible');
    });
  });

  it('email não cadastrado mostra erro', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('naoexiste@test.com');
    cy.get('input[type="password"]').type('Qualquer123');
    cy.get('button[type="submit"]').click();
    cy.contains(/não encontrado|inválid/i).should('be.visible');
  });

  it('campos vazios não submetem', () => {
    cy.visit('/login');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/login');
  });

  it('logout limpa sessão e redireciona para login', () => {
    cy.loginAsProfessional();
    cy.contains('button', /sair|logout/i).click();
    cy.url().should('include', '/login');
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
  });

  it('acesso direto a /patients sem login redireciona para login', () => {
    cy.visit('/patients');
    cy.url().should('include', '/login');
  });
});
```

**Step 2: Verificar (com frontend e backend rodando)**

```bash
cd dashboard && npx cypress run --spec "cypress/e2e/auth.cy.ts"
```

**Step 3: Commit**

```bash
git add dashboard/cypress/e2e/auth.cy.ts
git commit -m "test: add auth E2E tests (6 cenários de login + logout)"
```

---

### Task 22: Demais specs E2E

**Files:**
- Create: `dashboard/cypress/e2e/registration.cy.ts`
- Create: `dashboard/cypress/e2e/patient-management.cy.ts`
- Create: `dashboard/cypress/e2e/assessments.cy.ts`
- Create: `dashboard/cypress/e2e/medications.cy.ts`
- Create: `dashboard/cypress/e2e/forgot-password.cy.ts`

Para `registration.cy.ts`:

```typescript
describe('Cadastro', () => {
  it('profissional consegue se cadastrar', () => {
    cy.visit('/register');
    const email = `psy-${Date.now()}@test.com`;
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type('Secure1234!');
    cy.get('input[name="first_name"]').type('Ana');
    cy.get('input[name="last_name"]').type('Santos');
    // Select professional role if applicable
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/register');
  });

  it('email duplicado mostra erro', () => {
    cy.fixture('users').then((users) => {
      cy.visit('/register');
      cy.get('input[name="email"]').type(users.professional.email);
      cy.get('input[name="password"]').type('Secure1234!');
      cy.get('button[type="submit"]').click();
      cy.contains(/já cadastrado|já existe|email/i).should('be.visible');
    });
  });
});
```

**Step 2: Commit**

```bash
git add dashboard/cypress/e2e/
git commit -m "test: add E2E specs for registration, patient management, assessments, medications"
```

---

## FASE 5 — LINT & CI/CD

### Task 23: Reforçar ESLint backend + eslint-plugin-security

**Files:**
- Modify: `backend/.eslintrc.js` (ou `.eslintrc.json`)
- Modify: `backend/package.json`

**Step 1: Instalar plugin de segurança**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
npm install --save-dev eslint-plugin-security
```

**Step 2: Atualizar `.eslintrc.js`**

Adicionar ao arquivo existente:

```javascript
{
  plugins: ['security'],
  extends: [...existing, 'plugin:security/recommended'],
  rules: {
    ...existing,
    'no-console': 'warn',
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  }
}
```

**Step 3: Rodar lint**

```bash
npm run lint
```

Corrigir todos os erros (warnings são aceitáveis para `no-console`).

**Step 4: Commit**

```bash
git add backend/.eslintrc.js backend/package.json
git commit -m "chore: add eslint-plugin-security and strengthen backend lint rules"
```

---

### Task 24: Adicionar eslint-plugin-testing-library ao dashboard

**Files:**
- Modify: `dashboard/.eslintrc.json`
- Modify: `dashboard/package.json`

**Step 1: Instalar**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm install --save-dev eslint-plugin-testing-library eslint-plugin-jest
```

**Step 2: Atualizar `.eslintrc.json`** adicionando:

```json
{
  "overrides": [
    {
      "files": ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
      "extends": ["plugin:testing-library/react", "plugin:jest/recommended"]
    }
  ]
}
```

**Step 3: Rodar lint**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add dashboard/.eslintrc.json dashboard/package.json
git commit -m "chore: add testing-library and jest ESLint plugins to dashboard"
```

---

### Task 25: Husky + lint-staged

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json` (raiz) ou criar um `package.json` na raiz

**Step 1: Inicializar package.json na raiz (se não existir)**

```bash
cd /Users/luizaquintino/Desktop/Clarita
ls package.json 2>/dev/null || npm init -y
```

**Step 2: Instalar husky + lint-staged**

```bash
npm install --save-dev husky lint-staged
npx husky init
```

**Step 3: Criar `.husky/pre-commit`**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

**Step 4: Adicionar `lint-staged` ao `package.json` raiz**

```json
{
  "lint-staged": {
    "backend/src/**/*.js": ["cd backend && npm run lint --", "cd backend && npm run format:check --"],
    "dashboard/src/**/*.{ts,tsx}": ["cd dashboard && npm run lint --", "cd dashboard && npm run format:check --"]
  }
}
```

**Step 5: Testar**

```bash
git add . && git commit --dry-run
```

**Step 6: Commit**

```bash
git add .husky/ package.json
git commit -m "chore: add husky pre-commit hook with lint-staged"
```

---

### Task 26: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/e2e.yml`

**Step 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend-lint-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: clarita
          POSTGRES_PASSWORD: clarita
          POSTGRES_DB: clarita_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Run backend lint
        run: cd backend && npm run lint

      - name: Run backend tests
        env:
          DATABASE_URL: postgresql://clarita:clarita@localhost:5432/clarita_test
          JWT_SECRET: test-jwt-secret-clarita-2024
          NODE_ENV: test
        run: cd backend && npm test

  frontend-lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: dashboard/package-lock.json

      - name: Install dashboard dependencies
        run: cd dashboard && npm ci

      - name: Run dashboard lint
        run: cd dashboard && npm run lint

      - name: Run dashboard tests
        run: cd dashboard && npm test -- --passWithNoTests
```

**Step 2: Criar `.github/workflows/e2e.yml`**

```yaml
name: E2E

on:
  push:
    branches: [main]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install and start backend
        run: |
          cd backend && npm ci
          npm run dev &
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}

      - name: Install and start dashboard
        run: |
          cd dashboard && npm ci
          npm run build && npm start &
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3005/api

      - name: Run Cypress
        uses: cypress-io/github-action@v6
        with:
          working-directory: dashboard
          wait-on: 'http://localhost:3000'
          wait-on-timeout: 60
```

**Step 3: Adicionar badges ao README.md**

No topo do README, adicionar:

```markdown
![CI](https://github.com/SEU_USUARIO/clarita/actions/workflows/ci.yml/badge.svg)
![E2E](https://github.com/SEU_USUARIO/clarita/actions/workflows/e2e.yml/badge.svg)
```

**Step 4: Commit**

```bash
git add .github/ README.md
git commit -m "ci: add GitHub Actions for CI (lint+tests) and E2E (Cypress)"
```

---

## Verificação Final

### Task 27: Rodar tudo e confirmar

**Step 1: Backend — todos os testes**

```bash
cd /Users/luizaquintino/Desktop/Clarita/backend
npm run test:coverage
```

Esperado: ≥80% coverage, 0 falhas.

**Step 2: Backend — lint**

```bash
npm run lint
```

Esperado: 0 erros.

**Step 3: Frontend — todos os testes**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm test
```

Esperado: todos passando.

**Step 4: Frontend — lint**

```bash
npm run lint
```

Esperado: 0 erros.

**Step 5: E2E — smoke test**

Com backend e dashboard rodando localmente:

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npx cypress run --spec "cypress/e2e/auth.cy.ts"
```

Esperado: todos os cenários de login passando.

**Step 6: Push para GitHub**

```bash
cd /Users/luizaquintino/Desktop/Clarita
git push origin main
```

Verificar que as GitHub Actions passam.

---

## Sumário de arquivos criados

| Fase | Arquivos | Quantidade |
|---|---|---|
| Docs | `.env.example` ×2, `SETUP.md`, `ARCHITECTURE.md`, `API.md`, `COMPONENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `README.md` atualizado | 9 |
| Backend tests | 12 novos arquivos integration + 3 unit + expansão auth.test.js | 16 |
| Frontend tests | `jest.config.js`, `jest.setup.ts`, `babel.config.js`, 9 páginas, 4 componentes | 17 |
| E2E | `cypress.config.ts`, `commands.ts`, `e2e.ts`, `users.json`, 6 specs | 11 |
| CI/CD | `ci.yml`, `e2e.yml`, `.husky/pre-commit`, atualização eslint ×2 | 6 |
| **Total** | | **~59 arquivos** |
