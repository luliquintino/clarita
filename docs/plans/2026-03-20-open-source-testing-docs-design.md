# Design: Open Source Readiness — Documentação + Cobertura Completa de Testes

**Data:** 2026-03-20
**Status:** Aprovado
**Abordagem escolhida:** Camadas progressivas (Docs → Backend Tests → Frontend Tests → E2E)

---

## Contexto

O Clarita está sendo preparado para open source. O projeto consiste em:
- **Backend** Express.js + PostgreSQL (Neon) — 30+ rotas, 8 serviços
- **Dashboard** Next.js 14 App Router + TypeScript — 16 páginas, 39 componentes
- **Mobile** React Native (fora do escopo desta fase)

**Estado atual dos testes:**
- Backend: 6 unit + 14 integration (cobrindo ~50% das rotas)
- Frontend: zero framework de testes instalado
- E2E: um script manual sem framework

---

## Fase 1 — Documentação

### Arquivos a criar/atualizar

| Arquivo | Descrição |
|---|---|
| `README.md` | Atualizado com badges CI, stack, screenshots, links para docs |
| `CONTRIBUTING.md` | Fork, branch naming, PR checklist, padrões de código |
| `SECURITY.md` | LGPD compliance, reporte de vulnerabilidades |
| `.env.example` | backend + dashboard — todas as variáveis comentadas |
| `docs/ARCHITECTURE.md` | Diagrama de camadas, fluxo de dados, decisões de design |
| `docs/API.md` | Todos os 30+ endpoints: método, rota, auth, body, responses, exemplos |
| `docs/SETUP.md` | Passo a passo local: env vars, DB, seed, ports |
| `docs/COMPONENTS.md` | Catálogo dos 39 componentes React com props e responsabilidade |
| `docs/PRODUTO.md` | Já existe — linkar no README e API.md |

---

## Fase 2 — Backend Tests

### Framework
Jest + Supertest (já configurados). Coverage threshold: 80% linhas (já em `jest.config.js`).

### Novos testes de integração

| Arquivo | Rotas cobertas |
|---|---|
| `tests/integration/psychTests.test.js` | GET tests, POST session, GET results, scoring automático |
| `tests/integration/icd11.test.js` | GET browse, GET search, GET recent |
| `tests/integration/invitations.test.js` | POST invite, GET pending, PATCH accept/reject |
| `tests/integration/summaries.test.js` | POST generate, GET by patient |
| `tests/integration/recordSharing.test.js` | POST share, GET permissions, DELETE revoke |
| `tests/integration/me.test.js` | GET profile, PATCH update, DELETE account |
| `tests/integration/users.test.js` | Admin: list, get, deactivate |
| `tests/integration/onboarding.test.js` | POST complete, GET status |
| `tests/integration/documents.test.js` | POST upload, GET list, DELETE |
| `tests/integration/exams.test.js` | POST upload, GET list |
| `tests/integration/anamnesis.test.js` | GET, POST, PATCH |
| `tests/integration/digitalTwin.test.js` | GET insights, GET timeline |

### Novos testes unitários

| Arquivo | Serviço |
|---|---|
| `tests/unit/services/psychTestService.test.js` | Scoring: threshold, max_subscale, dimension_majority |
| `tests/unit/services/summaryService.test.js` | Geração de resumo clínico |
| `tests/unit/services/recordSharingService.test.js` | Permissões e revogação |
| `tests/unit/services/alertService.test.js` | Criação e deduplicação de alertas |
| `tests/unit/services/pushService.test.js` | Envio e falha de notificações push |

### Expansão de auth.test.js — cenários de login

- Credenciais corretas (profissional)
- Credenciais corretas (paciente)
- Senha incorreta
- Email não cadastrado
- Campo email vazio
- Campo senha vazio
- Email com formato inválido
- Senha abaixo do mínimo de caracteres
- Token JWT expirado (request autenticada)
- Token JWT inválido/adulterado
- Conta inativa/desativada
- Tentativa de SQL injection no campo email

---

## Fase 3 — Frontend Tests (Jest + React Testing Library)

### Setup a instalar no dashboard

```
jest
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
jest-environment-jsdom
babel-jest
@babel/preset-env
@babel/preset-react
@babel/preset-typescript
```

Configurar `jest.config.js`, `jest.setup.ts`, `babel.config.js` no dashboard.

### Testes de páginas

| Página | Cenários |
|---|---|
| `login/page.tsx` | Renderiza landing, form, submit válido/inválido, loading state, redirect, link p/ register |
| `register/page.tsx` | Campos obrigatórios, validação email, senha fraca, submit sucesso/erro |
| `forgot-password/page.tsx` | Envio de email, feedback de sucesso/erro |
| `reset-password/page.tsx` | Token válido/inválido, nova senha, confirm senha |
| `patients/page.tsx` | Lista vazia, com pacientes, busca, loading, erro de rede |
| `patients/[id]/page.tsx` | Carrega dados, tabs, erro 404, loading state |
| `patient-home/page.tsx` | Dashboard do paciente, seções principais |
| `onboarding/page.tsx` | Steps do wizard, validação por step, conclusão |
| `profile/page.tsx` | Exibe dados do usuário, edição, save, erro |

### Testes de componentes críticos

- `UnifiedAssessmentsPanel` — lista testes, seleção, resposta, resultado
- `MedicationManager` — CRUD de medicamentos, check-in
- `DiagnosticBrowserPanel` — busca CID-11, adicionar diagnóstico
- `ClinicalNotes` — criar, editar, listar notas
- `Timeline` — renderiza eventos, filtragem
- `PatientList` — lista, busca, item vazio
- `SideNav` / `BottomNav` — links ativos, navegação
- `OnboardingWizard` — step progression, validação
- `InvitationDialog` — envio, loading, erro
- `GoalsPanel` — criar, marcar completo

### Estratégia de mocks

- `global.fetch` mockado via `jest.fn()`
- `next/navigation` mockado (`useRouter`, `useParams`, `usePathname`)
- `localStorage` mockado para auth token

---

## Fase 4 — E2E com Cypress

### Setup
- Instalar Cypress no dashboard
- `cypress.config.ts` apontando para `http://localhost:3000`
- `cypress/support/commands.ts` com comandos customizados:
  - `cy.loginAsProfessional()`
  - `cy.loginAsPatient()`
  - `cy.createPatient(name, email)`

### Specs e jornadas

| Spec | Jornadas cobertas |
|---|---|
| `auth.cy.ts` | Login válido profissional, login válido paciente, login inválido (6 cenários), logout, sessão expirada, redirect não autenticado |
| `registration.cy.ts` | Cadastro profissional completo, email duplicado, validações de campo |
| `onboarding.cy.ts` | Primeiro acesso paciente → wizard → home |
| `patient-management.cy.ts` | Profissional cria paciente, envia convite, paciente aceita |
| `assessments.cy.ts` | Paciente responde PHQ-9 completo, profissional vê resultado com score |
| `medications.cy.ts` | Profissional adiciona medicamento, paciente registra check-in |
| `clinical-notes.cy.ts` | Profissional cria nota, edita, nota aparece no timeline |
| `icd11.cy.ts` | Busca diagnóstico, adiciona ao paciente, aparece no prontuário |
| `record-sharing.cy.ts` | Paciente compartilha prontuário, profissional acessa, paciente revoga |
| `forgot-password.cy.ts` | Solicitação de reset, email enviado, redirect para reset |

### Fixtures
Arquivos JSON em `cypress/fixtures/`:
- `users.json` — profissional e paciente de teste
- `patients.json` — pacientes mock
- `assessments.json` — respostas de teste para PHQ-9

---

## Fase 5 — Lint & CI/CD

### Backend (reforço)
- `eslint-plugin-security` — detecta injection, path traversal
- Regras adicionadas: `no-console: warn`, `eqeqeq: error`, `no-var: error`
- `husky` + `lint-staged` — lint automático em todo commit

### Dashboard (complemento)
- `eslint-plugin-testing-library` + `eslint-plugin-jest`
- Regras TypeScript: `no-explicit-any: warn`, `no-unused-vars: error`
- Mesmo `husky` + `lint-staged`

### GitHub Actions
- `.github/workflows/ci.yml` — lint + unit + integration em todo PR
- `.github/workflows/e2e.yml` — Cypress em push para `main`
- Badges de CI no README

---

## Ordem de execução

1. Documentação (Fase 1)
2. Backend tests — novos arquivos (Fase 2)
3. Frontend setup + testes de páginas/componentes (Fase 3)
4. Cypress setup + specs E2E (Fase 4)
5. Lint reforçado + husky + GitHub Actions (Fase 5)
