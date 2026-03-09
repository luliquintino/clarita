# Design: Preparacao Open Source — Documentacao + Testes + Linting

**Data:** 2026-03-09
**Escopo:** Backend (Express.js) + Dashboard (Next.js)
**Idioma:** Portugues (pt-BR)

---

## Contexto

O Clarita e uma plataforma de saude mental com backend Express.js/PostgreSQL, dashboard Next.js 14/TypeScript, app mobile React Native, e AI engine Python/Flask. O projeto esta sendo preparado para open source e atualmente nao possui:

- Testes (apenas 1 script E2E custom sem framework)
- Documentacao alem de README basico
- Linting no backend
- Prettier em nenhum servico
- Repositorio git
- CI/CD

---

## Decisoes

| Decisao | Escolha |
|---------|---------|
| Escopo | Backend + Dashboard (mobile e AI engine ficam para fase 2) |
| Idioma docs | Portugues (pt-BR) |
| Backend tests | Jest + Supertest |
| Frontend tests | Jest + React Testing Library |
| E2E tests | Playwright |
| Linting | ESLint + Prettier |

---

## 1. Documentacao

### 1.1 README.md (reescrever)
- Descricao do projeto e missao
- Screenshots da interface
- Arquitetura (diagrama texto)
- Requisitos (Node 18+, PostgreSQL 16+, etc.)
- Setup rapido (Docker Compose)
- Setup manual (passo a passo)
- Variaveis de ambiente (tabela)
- Estrutura do projeto
- Comandos uteis (dev, test, lint, build)
- Licenca

### 1.2 docs/ARQUITETURA.md
- Visao geral dos servicos
- Fluxo de dados (paciente → backend → profissional)
- Modelo de autenticacao (JWT)
- RBAC (roles, permissoes, care_relationships)
- Sistema de alertas
- Upload de arquivos
- Digital Twin / AI Engine

### 1.3 docs/API.md
- Todos os 65+ endpoints organizados por modulo
- Para cada endpoint: metodo, path, auth, body, response, codigos de erro
- Exemplos curl

### 1.4 docs/BANCO-DE-DADOS.md
- Todas as 17+ tabelas com colunas e tipos
- Enums
- Relacionamentos
- Indices
- Diagrama ER (texto/mermaid)

### 1.5 docs/CONTRIBUINDO.md
- Como configurar o ambiente
- Convenções de codigo
- Como rodar testes
- Como criar PRs
- Code of conduct

### 1.6 docs/COMPONENTES.md
- Catalogo de todos os 25 componentes
- Props, descricao, uso

---

## 2. Linting & Formatting

### 2.1 Backend — ESLint + Prettier (NOVO)

**Arquivo:** `backend/.eslintrc.json`
```json
{
  "env": { "node": true, "es2021": true, "jest": true },
  "extends": ["eslint:recommended"],
  "parserOptions": { "ecmaVersion": "latest" },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

**Arquivo:** `backend/.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Scripts:** `lint`, `lint:fix`, `format` no package.json

### 2.2 Dashboard — Estender ESLint + Adicionar Prettier

**Arquivo:** `dashboard/.eslintrc.json` — estender config Next.js existente
**Arquivo:** `dashboard/.prettierrc` — mesma config do backend
**Scripts:** `lint`, `lint:fix`, `format`

### 2.3 Root — Prettier compartilhado
**Arquivo:** `.prettierrc` na raiz (compartilhado)
**Arquivo:** `.editorconfig` para consistencia entre editores

---

## 3. Testes Backend (Jest + Supertest)

### 3.1 Setup

**Dependencias:**
```
jest supertest @types/jest
```

**Arquivo:** `backend/jest.config.js`
- testEnvironment: node
- testMatch: `**/__tests__/**/*.test.js`
- setupFilesAfterSetup: `./tests/setup.js`
- coverageThreshold: 80% (lines)

**Arquivo:** `backend/tests/setup.js`
- Carrega .env.test
- Setup/teardown do banco de teste
- Helper para criar tokens JWT de teste
- Helper para criar usuarios de teste (paciente, psicologo, psiquiatra)

### 3.2 Banco de Teste
- Usar banco PostgreSQL separado (`clarita_test`)
- `beforeAll`: rodar schema.sql + seed basico
- `afterAll`: dropar schema ou truncar tabelas
- `beforeEach`: truncar tabelas que mudam entre testes
- Variavel: `DATABASE_URL` apontando para banco de teste

### 3.3 Helpers/Factories

**Arquivo:** `backend/tests/helpers.js`
```javascript
// Criar usuario de teste e retornar token
createTestUser(role) → { user, token }
createTestPatient() → { patient, token }
createTestProfessional(role) → { professional, token }
createCareRelationship(patientId, professionalId) → relationship
createTestExam(patientId) → exam
// ... factories para cada entidade
```

### 3.4 Estrutura de Testes

```
backend/tests/
├── setup.js                    # Setup global
├── helpers.js                  # Factories e utilidades
├── unit/
│   ├── middleware/
│   │   ├── auth.test.js        # JWT verification, token extraction
│   │   ├── rbac.test.js        # requireRole, requirePatientAccess, requireOwnership
│   │   └── upload.test.js      # File filter, size limits
│   ├── services/
│   │   ├── alertService.test.js
│   │   ├── assessmentService.test.js
│   │   ├── emailService.test.js
│   │   └── summaryService.test.js
│   ├── validators/
│   │   └── validators.test.js
│   └── utils/
│       └── generateDisplayId.test.js
├── integration/
│   ├── auth.test.js            # Register, login, me, forgot/reset password
│   ├── patients.test.js        # List, detail, timeline, permissions
│   ├── professionals.test.js   # List, detail
│   ├── emotionalLogs.test.js   # CRUD, trends
│   ├── symptoms.test.js        # Report, history
│   ├── medications.test.js     # Prescribe, adjust, discontinue, logs
│   ├── assessments.test.js     # Submit, history
│   ├── lifeEvents.test.js      # CRUD
│   ├── clinicalNotes.test.js   # CRUD, privacy
│   ├── insights.test.js        # List, review
│   ├── alerts.test.js          # List, acknowledge
│   ├── journal.test.js         # CRUD
│   ├── goals.test.js           # Create, accept/reject, achieve
│   ├── chat.test.js            # Conversations, messages
│   ├── digitalTwin.test.js     # Get, history, predictions
│   ├── documents.test.js       # Upload, download, access control
│   ├── exams.test.js           # Upload, download, permissions
│   ├── summaries.test.js       # Generate, list
│   ├── invitations.test.js     # Send, accept, reject, cancel
│   ├── onboarding.test.js      # Get, submit
│   └── users.test.js           # Search by display_id
```

### 3.5 Cenarios por Endpoint

Cada arquivo de integracao testa:
- **Sucesso**: request valido → response correto
- **Validacao**: campos obrigatorios, formatos invalidos → 400
- **Auth**: sem token → 401, token invalido → 401
- **Autorizacao**: role errado → 403, sem care_relationship → 403
- **Not found**: recurso inexistente → 404
- **Conflito**: duplicatas → 409
- **Edge cases**: limites de paginacao, datas futuras/passadas, strings vazias

### 3.6 Cenarios Especificos de Auth

**auth.test.js deve cobrir:**
- Registro paciente com sucesso
- Registro profissional com licenca
- Registro com email duplicado → 409
- Registro com senha fraca (sem maiuscula, sem numero, <8 chars) → 400
- Registro com role invalido → 400
- Login com sucesso → token valido
- Login com email errado → 401
- Login com senha errada → 401
- Login com conta inativa → 403
- GET /me com token valido → perfil
- GET /me sem token → 401
- GET /me com token expirado → 401
- Forgot password com email valido → 200
- Forgot password com email inexistente → 200 (nao revela se existe)
- Reset password com token valido → 200
- Reset password com token expirado → 400
- Reset password com token invalido → 400

---

## 4. Testes Frontend (Jest + React Testing Library)

### 4.1 Setup

**Dependencias:**
```
@testing-library/react @testing-library/jest-dom @testing-library/user-event
jest jest-environment-jsdom ts-jest
```

**Arquivo:** `dashboard/jest.config.ts`
- testEnvironment: jsdom
- transform: ts-jest
- moduleNameMapper: path aliases (@/*)
- setupFilesAfterSetup: setupTests.ts

**Arquivo:** `dashboard/tests/setupTests.ts`
- import @testing-library/jest-dom
- Mock de next/navigation (useRouter, useParams, useSearchParams)
- Mock de next/image
- Mock global de fetch / api.ts
- Mock de localStorage

### 4.2 Mock da API

**Arquivo:** `dashboard/tests/mocks/api.ts`
- Mock completo do modulo api.ts
- Cada API object retorna dados de teste
- Helpers para simular erros (401, 403, 500)
- Helpers para simular loading

### 4.3 Estrutura de Testes

```
dashboard/tests/
├── setupTests.ts
├── mocks/
│   ├── api.ts                  # Mock completo da API
│   ├── router.ts               # Mock do Next.js router
│   └── data.ts                 # Dados de teste (fixtures)
├── unit/
│   └── lib/
│       └── api.test.ts         # getToken, setToken, request wrapper, ApiError
├── components/
│   ├── AlertsPanel.test.tsx
│   ├── AssessmentHistory.test.tsx
│   ├── ChatPanel.test.tsx
│   ├── ClinicalNotes.test.tsx
│   ├── ConversationList.test.tsx
│   ├── DigitalTwinPanel.test.tsx
│   ├── DisplayIdBadge.test.tsx
│   ├── EmotionalChart.test.tsx
│   ├── ExamUploadPanel.test.tsx
│   ├── GoalsPanel.test.tsx
│   ├── InsightsPanel.test.tsx
│   ├── InvitationDialog.test.tsx
│   ├── JournalEntry.test.tsx
│   ├── JournalHistory.test.tsx
│   ├── MedicationManager.test.tsx
│   ├── PatientCircle.test.tsx
│   ├── PatientExamsPanel.test.tsx
│   ├── PatientGoalsPanel.test.tsx
│   ├── PatientList.test.tsx
│   ├── PendingInvitations.test.tsx
│   ├── ProfessionalTabs.test.tsx
│   ├── SharingControls.test.tsx
│   ├── Sidebar.test.tsx
│   ├── Timeline.test.tsx
│   └── AISummaryCard.test.tsx
├── pages/
│   ├── login.test.tsx
│   ├── register.test.tsx
│   ├── forgot-password.test.tsx
│   ├── reset-password.test.tsx
│   ├── onboarding.test.tsx
│   ├── patients.test.tsx
│   ├── patient-detail.test.tsx
│   ├── patient-home.test.tsx
│   ├── alerts.test.tsx
│   ├── chat.test.tsx
│   └── home.test.tsx
```

### 4.4 O Que Testar em Cada Componente

- **Renderizacao**: componente renderiza sem crash
- **Props**: dados corretos exibidos
- **Interacoes**: clicks, submits, toggles
- **Estados**: loading, empty, error
- **Condicional**: role-based rendering
- **Acessibilidade**: labels, roles, aria

### 4.5 O Que Testar em Cada Pagina

- **Routing**: redirecionamento baseado em auth/role
- **Data fetching**: API chamada corretamente
- **Form submission**: dados enviados corretamente
- **Error handling**: erros de API exibidos
- **Loading states**: spinner durante carregamento

---

## 5. Testes E2E (Playwright)

### 5.1 Setup

**Dependencias:** `@playwright/test`

**Arquivo:** `e2e/playwright.config.ts`
- baseURL: http://localhost:3000
- webServer: inicia backend + dashboard
- projects: chromium (unico browser para comecar)
- timeout: 30s
- retries: 1

### 5.2 Fixtures

**Arquivo:** `e2e/fixtures.ts`
- Login helper (paciente, profissional)
- Dados de teste (usuarios pre-criados no seed)
- Helper para limpar dados entre testes

### 5.3 Estrutura de Testes

```
e2e/
├── playwright.config.ts
├── fixtures.ts
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts           # Login paciente, profissional, erros
│   │   ├── register.spec.ts        # Registro todos os roles
│   │   ├── password-reset.spec.ts  # Fluxo completo forgot → reset
│   │   └── session.spec.ts         # Token expirado, logout
│   ├── patient/
│   │   ├── onboarding.spec.ts      # Wizard 7 passos
│   │   ├── checkin.spec.ts         # Journal + mood sliders
│   │   ├── goals.spec.ts           # Aceitar/rejeitar metas
│   │   ├── exams.spec.ts           # Upload, permissoes, download
│   │   └── professionals.spec.ts   # Ver profissionais, permissoes
│   ├── professional/
│   │   ├── patients.spec.ts        # Lista, busca, filtros
│   │   ├── patient-detail.spec.ts  # Todas as 6 tabs
│   │   ├── clinical-notes.spec.ts  # CRUD notas
│   │   ├── medications.spec.ts     # Prescrever, ajustar
│   │   ├── goals.spec.ts           # Criar metas
│   │   └── alerts.spec.ts          # Ver, reconhecer
│   ├── chat/
│   │   └── chat.spec.ts            # Conversa entre profissionais
│   ├── invitations/
│   │   └── invitations.spec.ts     # Enviar, aceitar, rejeitar
│   └── features/
│       ├── exam-upload-flow.spec.ts # Ponta a ponta: upload → permissao → visualizacao
│       └── patient-journey.spec.ts  # Jornada completa do paciente
```

### 5.4 Cenarios E2E Detalhados

**Login (auth/login.spec.ts):**
- Login paciente com sucesso → redireciona para /patient-home
- Login profissional com sucesso → redireciona para /patients
- Email invalido → mensagem de erro
- Senha errada → mensagem de erro
- Campos vazios → validacao
- Link "Esqueceu senha" → navega para /forgot-password
- Link "Cadastre-se" → navega para /register
- Toggle visibilidade senha

**Jornada Paciente Completa:**
1. Registrar novo paciente
2. Completar onboarding (7 passos)
3. Fazer check-in diario (humor, ansiedade, energia, sono)
4. Aceitar convite de profissional
5. Upload de exame com permissao
6. Verificar historico de journal

---

## 6. CI/CD (GitHub Actions)

### 6.1 Pipeline

**Arquivo:** `.github/workflows/ci.yml`

```yaml
Triggers: push (main), pull_request

Jobs:
  lint:
    - ESLint backend
    - ESLint dashboard
    - Prettier check

  test-backend:
    - PostgreSQL service container
    - npm install
    - Run schema.sql
    - jest --coverage

  test-frontend:
    - npm install
    - jest --coverage

  test-e2e:
    - PostgreSQL + backend + dashboard
    - playwright install
    - playwright test

  build:
    - next build (verifica TypeScript)
```

---

## Prioridade de Implementacao

1. Git init + .gitignore + primeira commit
2. ESLint + Prettier (backend + dashboard)
3. Documentacao (README, API, Arquitetura, BD, Contribuindo)
4. Backend: Jest setup + helpers + testes auth
5. Backend: testes de integracao (todos os endpoints)
6. Backend: testes unitarios (middleware, services)
7. Dashboard: Jest + RTL setup + mocks
8. Dashboard: testes de componentes
9. Dashboard: testes de paginas
10. E2E: Playwright setup + auth tests
11. E2E: jornadas completas
12. CI/CD: GitHub Actions

---

## Metricas de Sucesso

- Cobertura de codigo backend: >= 80%
- Cobertura de codigo frontend: >= 70%
- Todos os endpoints com pelo menos 1 teste de sucesso + 1 de erro
- Todos os componentes com teste de renderizacao
- Jornadas criticas cobertas por E2E (login, registro, check-in, upload)
- Zero erros de lint
- Build passa sem erros TypeScript
- Pipeline CI verde
