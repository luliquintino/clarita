# CLARITA — System Architecture

> Last updated: 2026-03-20

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                    │
│                                                                     │
│   ┌──────────────────────┐      ┌──────────────────────────────┐   │
│   │  Mobile App          │      │  Dashboard                   │   │
│   │  (React Native)      │      │  (Next.js 14 / App Router)   │   │
│   │  Patient check-ins,  │      │  Professional panel,         │   │
│   │  assessments, diary  │      │  patient records, reports    │   │
│   └──────────┬───────────┘      └───────────────┬──────────────┘   │
└──────────────┼────────────────────────────────────┼────────────────┘
               │  HTTPS + JWT Bearer token          │
               └──────────────┬─────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                     BACKEND API                                     │
│                     Express.js (Node.js)                            │
│                                                                     │
│  Global Middleware: helmet · cors · json body parser                │
│  Auth Middleware:   authenticate → requireRole → requirePatientAccess│
│                                                                     │
│  Background Jobs (node-cron):                                       │
│    • Alert generation      — every 30 min                           │
│    • QR token cleanup      — daily at 03:00                         │
│    • Test session expiry   — daily at 04:00                         │
│    • SATEPSI sync          — weekly on Sundays at 05:00             │
│    • No check-in reminder  — daily at 09:00 BRT (12:00 UTC)         │
│    • Check-in push alerts  — hourly (per-user UTC hour)             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────────────────────┐
         │             │                             │
┌────────▼───────┐  ┌──▼──────────────┐  ┌──────────▼──────────────┐
│  PostgreSQL    │  │  Cloudinary      │  │  External Services      │
│  (Neon)        │  │  (media/uploads) │  │                         │
│                │  └─────────────────┘  │  • Resend (email)        │
│  Connection    │                       │  • Web Push API          │
│  pool: max 20  │                       │    (push notifications)  │
└────────────────┘                       └─────────────────────────-┘
```

### Optional / Separate Service

```
Backend API  ──►  AI Engine (Digital Twin)
                  Analyses longitudinal patient data,
                  detects patterns, trends, and anomalies.
                  Results stored in ai_insights table.
                  Not required to run the core platform.
```

---

## 2. Authentication Flow

Authentication is **stateless JWT**. No server-side session is stored.

### Token format

```
Authorization: Bearer <token>
```

- Tokens are signed with `JWT_SECRET` (env var).
- Expiry: **7 days**.
- Payload includes `userId` and `role`.
- Passwords are hashed with **bcrypt**.

### Middleware chain

Every protected route passes through one or more of these middleware functions, applied in order:

```
Request
  │
  ▼
authenticate          Verifies the Bearer token; loads user from DB;
  │                   checks is_active; attaches req.user.
  │
  ▼
requireRole(...)      Checks req.user.role against the allowed list.
  │                   Roles: patient | psychologist | psychiatrist | admin
  │
  ▼
requirePatientAccess(permissionType?)
  │                   For professionals: verifies an active care_relationship
  │                   exists with the target patient.
  │                   Optionally checks data_permissions for a specific
  │                   permission type (e.g. 'medications', 'assessments').
  │                   Patients accessing their own data pass through.
  │
  ▼
Route handler
```

### Roles

| Role | Description |
|---|---|
| `patient` | End-user of the mobile app; accesses only their own data. |
| `psychologist` | Mental-health professional; accesses linked patients only. |
| `psychiatrist` | Medical professional; same access level as psychologist plus medication management. |
| `admin` | Reserved for platform administration. |

---

## 3. Data Model Overview

### Key tables and relationships

```
users  (central table — every actor is a user)
  │  role: patient | psychologist | psychiatrist
  │
  ├──► patient_profiles          (1:1 — demographics, onboarding data)
  ├──► professional_profiles     (1:1 — license, specialisation, bio)
  │
  ├──► care_relationships        (N:M — links patients ↔ professionals)
  │       status: pending | active | inactive
  │
  ├──► data_permissions          (patient controls per-professional access)
  │       permission_type: emotional_logs | symptoms | medications |
  │                        assessments | life_events | clinical_notes |
  │                        anamnesis | psychological_tests | all
  │
  ├──► emotional_logs            (daily check-ins: mood, anxiety, energy, sleep)
  ├──► patient_symptoms          (reported symptoms linked to symptoms catalogue)
  ├──► life_events               (significant events with impact score)
  ├──► assessment_results        (PHQ-9, GAD-7, DASS-21, BDI-II, BAI…)
  │
  ├──► patient_medications       (prescriptions written by professionals)
  │       └──► medication_logs   (daily adherence check-ins)
  │
  ├──► clinical_notes            (structured notes: session | observation |
  │                               treatment_plan | progress; can be private)
  │
  ├──► patient_diagnoses         (ICD-11 formal diagnoses: suspected | confirmed)
  │       └──► icd11_disorders   (ICD-11 reference catalogue with keywords)
  │
  ├──► psychological_tests       (test definitions: PHQ-9, Enneagram, 16P…)
  │       └──► patient_test_sessions  (assignment → pending | completed | expired)
  │
  ├──► ai_insights               (pattern/correlation/anomaly/trend/risk detected by AI)
  └──► alerts                    (auto-generated alerts: depressive_episode,
                                  high_anxiety, medication_non_adherence…)
```

### Additional tables

| Table | Purpose |
|---|---|
| `anamnesis_templates` | Structured intake forms created by professionals |
| `satepsi_tests` | CFP-approved psychological test catalogue (SATEPSI) |
| `icd_test_mapping` | Links ICD-11 disorders to recommended tests |
| `invitations` | Professional/patient invite flow (resolved via `display_id`) |
| `push_subscriptions` | Web Push API subscriptions per user |
| `record_sharing` | QR-code based temporary record sharing tokens |

---

## 4. RBAC (Role-Based Access Control)

Access control is applied at three levels, implemented in `backend/src/middleware/rbac.js`.

### Level 1 — Role-based (`requireRole`)

Checks `req.user.role` against an allowlist of roles. Returns `403` if the role is not permitted.

```js
// Example: only professionals may create clinical notes
router.post('/', authenticate, requireRole('psychologist', 'psychiatrist'), handler);
```

### Level 2 — Relationship-based (`requirePatientAccess`)

Checks that an active `care_relationship` row exists between the authenticated professional and the target patient (identified by `req.params.patientId` or `req.params.id`).

Optionally accepts a `permissionType` to also verify the `data_permissions` table. Access is **allowed by default** — it is only denied if the patient has explicitly set `granted = false` for that permission type.

Patients accessing their own resources (`req.user.id === patientId`) always pass through.

### Level 3 — Ownership-based (`requireOwnership`)

Checks that a specific DB row is owned by the authenticated user, by querying a configurable `ownerColumn` on a given table.

```js
// Example: only the author may edit their own clinical note
router.put('/:id', authenticate, requireOwnership('clinical_notes', 'id', 'professional_id'), handler);
```

---

## 5. API Route Structure

All routes are mounted under the `/api` prefix in `backend/src/index.js`.

| Module | Base path | Description |
|---|---|---|
| auth | `/api/auth` | Register, login, password reset |
| me | `/api/me` | Authenticated user's own profile |
| users | `/api/users` | User management |
| patients | `/api/patients` | Patient list and profile (professionals) |
| professionals | `/api/professionals` | Professional profiles |
| invitations | `/api/invitations` | Professional ↔ patient invite flow |
| onboarding | `/api/onboarding` | Patient onboarding wizard |
| emotional-logs | `/api/emotional-logs` | Daily check-in logs |
| symptoms | `/api/symptoms` | Symptom catalogue |
| patient-symptoms | `/api/patient-symptoms` | Reported patient symptoms |
| medications | `/api/medications` | Medication catalogue |
| patient-medications | `/api/patient-medications` | Prescriptions per patient |
| medication-logs | `/api/medication-logs` | Adherence check-ins |
| assessments | `/api/assessments` | Assessment definitions |
| assessment-results | `/api/assessment-results` | Completed assessment results |
| psych-tests | `/api/psych-tests` | Psychological test sessions |
| satepsi | `/api/satepsi` | CFP/SATEPSI test catalogue |
| icd11 | `/api/icd11` | ICD-11 disorder browser |
| life-events | `/api/life-events` | Significant life events |
| clinical-notes | `/api/clinical-notes` | Session and clinical notes |
| anamnesis | `/api/anamnesis` | Structured intake forms |
| medical-records | `/api/medical-records` | Private medical records |
| record-sharing | `/api/record-sharing` | QR-code temporary sharing |
| documents | `/api/documents` | Document attachments |
| exams | `/api/exams` | Lab/exam uploads |
| insights | `/api/insights` | AI-generated insights |
| digital-twin | `/api/digital-twin` | Digital twin summaries |
| summaries | `/api/summaries` | AI clinical summaries |
| alerts | `/api/alerts` | Auto-generated clinical alerts |
| goals | `/api/goals` | Therapeutic goals |
| journal | `/api/journal` | Patient personal journal |
| chat | `/api/chat` | In-app messaging |
| push | `/api/push` | Web Push subscriptions |

Health check endpoint: `GET /api/health` (no authentication required).

---

## 6. Frontend Architecture

### Dashboard (Next.js 14)

Located in `dashboard/`. Uses the **App Router** (`src/app/`).

**Page routes (`src/app/`)**

| Path | Description |
|---|---|
| `/` | Root redirect |
| `/login` | Authentication page |
| `/register` | New account registration |
| `/forgot-password` / `/reset-password` | Password recovery |
| `/onboarding` | Patient onboarding wizard |
| `/patients` | Professional patient list |
| `/patients/[id]` | Individual patient record |
| `/patient-home` | Patient home dashboard |
| `/alerts` | Alerts overview |
| `/chat` | Messaging |
| `/profile` | User profile settings |
| `/shared-records` | QR-shared record viewer |
| `/privacy` / `/terms` | Legal pages |

**Component organisation (`src/components/`)**

Components are flat and feature-named. Key panels include:
- `UnifiedAssessmentsPanel` — all assessment instruments in one view
- `DiagnosticBrowserPanel` — ICD-11 browser and diagnosis management
- `ClinicalNotes` — structured note editor
- `MedicationManager` / `PrescriptionPanel` — medication management
- `Timeline` — longitudinal patient timeline
- `DigitalTwinPanel` — AI insights view
- `AnamnesisPanel` — intake form management
- `PsychTestPanel` — psychological test assignment and results

**API client (`src/lib/api.ts`)**

All backend calls go through a single typed `request<T>()` wrapper that:

1. Reads the JWT from `localStorage` under the key `clarita_token`.
2. Adds `Authorization: Bearer <token>` to every request.
3. Throws a typed `ApiError(status, detail)` on non-2xx responses.

```ts
// Token helpers exposed:
getToken()       // read from localStorage
setToken(token)  // write to localStorage (called after login)
removeToken()    // clear on logout
isTokenExpired() // decode JWT exp claim to check expiry client-side
```

The base URL is configured via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`).

---

## 7. Key Design Decisions

### UUID v4 internally, `display_id` externally

All primary keys are UUID v4 (`uuid_generate_v4()`), ensuring global uniqueness and preventing enumeration attacks. Users are assigned a human-readable **`display_id`** in the format `CLA-XXXXXX` (e.g. `CLA-A3F92C`) which is used for the invitation/connection flow. UUIDs are never exposed in UI-facing contexts.

### Soft deletes where applicable

Relationships and prescriptions use status fields (`active` / `inactive` / `discontinued` / `paused`) rather than hard deletes, preserving longitudinal history. Hard cascades (`ON DELETE CASCADE`) are used only for deeply owned data (e.g., logs owned by a patient) where retention makes no clinical sense after account deletion.

### LGPD compliance — patient-controlled data sharing

The `data_permissions` table gives patients granular control over what each linked professional can see. The default is permissive (access allowed), but patients can explicitly revoke access per data category. `requirePatientAccess` enforces this at the middleware layer on every request. Professionals can only access patient data after a formal `care_relationship` is established (requires patient acceptance of an invitation).

### AI engine is optional / separate service

The Digital Twin and AI insight features are decoupled from the core API. The `ai_insights` table stores pre-computed results produced by an external analysis job. The backend exposes read-only endpoints for these results. The core platform is fully functional without the AI engine running.

### Security hardening

- **Helmet** sets secure HTTP headers on every response.
- **Parameterised queries** throughout (`pg` pool with `$1, $2` placeholders) prevent SQL injection.
- **CORS** is configured via `CORS_ORIGIN` env var (defaults to `*` in development).
- **bcrypt** is used for password hashing.
- JWT `ownerColumn` and `table` arguments in `requireOwnership` are always code literals, never derived from user input.
