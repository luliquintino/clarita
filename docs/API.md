# API Reference

**Base URL:** `http://localhost:3001/api` (development)

**Authentication:** Include `Authorization: Bearer <token>` header on all protected endpoints.

**Content-Type:** `application/json`

---

## Table of Contents

- [Health Check](#health-check)
- [Auth](#auth)
- [Me (Account)](#me-account)
- [Users](#users)
- [Patients](#patients)
- [Professionals](#professionals)
- [Invitations](#invitations)
- [Onboarding](#onboarding)
- [Emotional Logs](#emotional-logs)
- [Journal](#journal)
- [Symptoms](#symptoms)
- [Life Events](#life-events)
- [Medications](#medications)
- [Assessments](#assessments)
- [Psychological Tests (Psych Tests)](#psychological-tests-psych-tests)
- [ICD-11](#icd-11)
- [SATEPSI](#satepsi)
- [Clinical Notes](#clinical-notes)
- [Medical Records](#medical-records)
- [Goals & Milestones](#goals--milestones)
- [Insights](#insights)
- [Alerts](#alerts)
- [Summaries](#summaries)
- [Digital Twin](#digital-twin)
- [Anamnesis](#anamnesis)
- [Documents](#documents)
- [Exams](#exams)
- [Record Sharing](#record-sharing)
- [Chat](#chat)
- [Push Notifications](#push-notifications)

---

## Health Check

### GET /health

Check API and database connectivity.

**Auth:** None

**Responses:**
- `200` — `{ status: "ok", timestamp: "<ISO8601>" }`
- `503` — `{ status: "error", message: "Banco de dados indisponível" }`

---

## Auth

### POST /auth/register

Register a new user (patient or professional).

**Auth:** None

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| email | string | ✅ | User email |
| password | string | ✅ | Password (validated by registrationValidator) |
| first_name | string | ✅ | First name |
| last_name | string | ✅ | Last name |
| role | string | ✅ | `patient`, `psychologist`, or `psychiatrist` |
| consent | boolean | ✅ | Must be `true` (LGPD requirement) |
| phone | string | | Phone number |
| license_number | string | professionals only | CRP/CRM number |
| specialization | string | | Professional specialization |
| institution | string | | Institution name |
| bio | string | | Professional bio |
| years_of_experience | integer | | Years of experience |
| date_of_birth | string | patients only | ISO date (YYYY-MM-DD) |
| gender | string | patients only | Patient gender |

**Responses:**
- `201` — `{ user: { id, email, role, first_name, last_name, phone, display_id, created_at }, token }`
- `400` — Validation error or consent not accepted
- `409` — Email already exists

---

### POST /auth/login

Authenticate and receive a JWT.

**Auth:** None

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| email | string | ✅ | User email |
| password | string | ✅ | User password |

**Responses:**
- `200` — `{ user: { id, email, role, first_name, last_name, display_id }, token }`
- `401` — Invalid email or password
- `403` — Account deactivated

---

### GET /auth/me

Get the authenticated user's profile (user + role-specific profile).

**Auth:** Required (any role)

**Responses:**
- `200` — `{ user: { id, email, role, ... }, profile: { ... } }` — Profile shape depends on role (patient_profiles or professional_profiles)

---

### PUT /auth/me

Update the authenticated user's profile.

**Auth:** Required (any role)

**Body (all fields optional):**
| Field | Type | Description |
|---|---|---|
| first_name | string | |
| last_name | string | |
| phone | string | |
| avatar_url | string | |
| **Patient only:** | | |
| date_of_birth | string | ISO date |
| gender | string | |
| emergency_contact_name | string | |
| emergency_contact_phone | string | |
| **Professional only:** | | |
| specialization | string | |
| institution | string | |
| bio | string | |
| years_of_experience | integer | |
| license_number | string | |

**Responses:**
- `200` — `{ user: { id, email, role, first_name, last_name, phone, avatar_url, updated_at } }`
- `400` — No fields to update

---

### POST /auth/onboarding/complete

Mark onboarding as completed for the authenticated user.

**Auth:** Required (any role)

**Responses:**
- `200` — `{ success: true }`

---

### POST /auth/forgot-password

Request a password reset email.

**Auth:** None

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| email | string | ✅ | Registered email address |

**Responses:**
- `200` — `{ message: "Se este email estiver cadastrado, você receberá um link..." }` (always returns success to avoid email enumeration)

---

### POST /auth/reset-password

Reset password using the token received by email.

**Auth:** None

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| token | string | ✅ | Reset token from email |
| password | string | ✅ | New password |

**Responses:**
- `200` — `{ message: "Senha redefinida com sucesso" }`
- `400` — Invalid or expired token

---

## Me (Account)

### GET /me/export

Export all personal data as a JSON file (LGPD data portability).

**Auth:** Required (any role)

**Responses:**
- `200` — JSON file download (`Content-Disposition: attachment; filename="clarita-meus-dados-{userId}.json"`) containing `{ exported_at, user, emotional_logs, medications, goals, assessment_results }`

---

### DELETE /me

Anonymize and deactivate the account (LGPD right to erasure).

**Auth:** Required (any role)

**Responses:**
- `200` — `{ message: "Conta removida com sucesso. Seus dados pessoais foram anonimizados." }`
- `404` — Account not found or already removed

---

## Users

### GET /users/search

Search for a user by their display ID (e.g. `CLA-BA5A3`).

**Auth:** Required (any role)

**Query params:**
| Param | Required | Description |
|---|---|---|
| display_id | ✅ | Display ID with or without hyphen |

**Responses:**
- `200` — `{ user: { id, display_id, first_name, last_name, role, avatar_url, specialization, institution } }`
- `400` — display_id is required
- `404` — User not found

---

### GET /users/search-professionals

Search professionals by name or display ID (never returns patients).

**Auth:** Required (any role)

**Query params:**
| Param | Required | Description |
|---|---|---|
| q | ✅ | Search term (min 2 chars) |

**Responses:**
- `200` — `{ professionals: [{ id, display_id, first_name, last_name, role, avatar_url, specialization, institution }] }` (max 10 results)
- `400` — Query must be at least 2 characters

---

## Patients

### GET /patients

List active patients linked to the authenticated professional.

**Auth:** Required — `psychologist` or `psychiatrist`

**Query params:**
| Param | Description |
|---|---|
| search | Filter by name or email (ILIKE) |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ patients: [...], pagination: { page, limit, total } }` — Each patient includes last check-in, mood/anxiety scores, mood trend, and active alert count.

---

### GET /patients/my-professionals

Get the linked professionals for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ professionals: [{ id, first_name, last_name, email, role, avatar_url, display_id, specialization, institution, license_number, relationship_type, started_at, permissions: [...] }] }`

---

### PUT /patients/revoke-access

Patient revokes a professional's active access (soft revoke — data is not deleted).

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| professional_id | UUID | ✅ | Professional to revoke |

**Responses:**
- `200` — `{ relationship: { ... }, message: "Acesso revogado com sucesso" }`
- `400` — professional_id is required
- `404` — Active relationship not found

---

### GET /patients/:id

Get patient profile detail.

**Auth:** Required — professional with active care relationship, or the patient themselves

**Path params:** `id` — Patient UUID

**Responses:**
- `200` — `{ patient: { id, email, role, first_name, last_name, phone, avatar_url, date_of_birth, gender, emergency_contact_name, emergency_contact_phone, onboarding_completed, self_reported_conditions, suspicions: [...] } }` — Suspicion visibility filtered by caller role.
- `404` — Patient not found

---

### GET /patients/:id/timeline

Unified timeline: emotional logs, life events, medication changes, symptoms, and assessments.

**Auth:** Required — professional with active care relationship, or the patient themselves

**Path params:** `id` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| start_date | ISO datetime filter (inclusive) |
| end_date | ISO datetime filter (inclusive) |
| limit | Max events (default: 50, max: 200) |

**Responses:**
- `200` — `{ timeline: [{ event_type, id, event_date, data: { ... } }] }` — `event_type` is one of `emotional_log`, `life_event`, `medication_change`, `symptom_report`, `assessment`.

---

### PUT /patients/:id/permissions

Patient updates data permissions for a linked professional.

**Auth:** Required — `patient` (can only update own permissions)

**Path params:** `id` — Patient UUID (must match authenticated user)

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| professional_id | UUID | ✅ | Professional whose permissions to update |
| permissions | array | ✅ | Array of `{ permission_type: string, granted: boolean }` |

**Responses:**
- `200` — `{ permissions: [{ ... }] }`
- `400` — Missing fields
- `403` — Only the patient can update own permissions
- `404` — No care relationship found

---

### PATCH /patients/:id/conditions

Add or remove a condition/suspicion label for a patient.

**Auth:** Required — any role with patient access

**Path params:** `id` — Patient UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| action | string | ✅ | `add` or `remove` |
| value | string | ✅ | Condition/suspicion label text |

**Behavior by role:**
- `patient` — modifies `self_reported_conditions`
- `psychiatrist` — modifies `psychiatrist_suspicions`
- `psychologist` — modifies `psychologist_suspicions`

**Responses:**
- `200` — `{ [column_name]: [...] }` — Updated array for the modified column
- `400` — Invalid action or missing value
- `404` — Patient profile not found

---

### POST /patients/:id/diagnoses

Register a formal ICD-11 diagnosis for a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Path params:** `id` — Patient UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| icd_code | string | ✅ | ICD-11 code (e.g. `6A00`) |
| icd_name | string | ✅ | Disorder name |
| certainty | string | | `suspected` (default) or `confirmed` |
| diagnosis_date | string | | ISO date; defaults to today |
| notes | string | | Clinical notes |

**Responses:**
- `201` — `{ diagnosis: { id, patient_id, professional_id, icd_code, icd_name, certainty, diagnosis_date, notes, ... } }`
- `400` — Missing required fields or invalid certainty

---

### GET /patients/:id/diagnoses

List all diagnoses for a patient.

**Auth:** Required — professional with care relationship, or the patient themselves

**Path params:** `id` — Patient UUID

**Notes:** Patients only see `confirmed` diagnoses; professionals see all active diagnoses.

**Responses:**
- `200` — `{ diagnoses: [{ ...diagnosis, professional_first_name, professional_last_name, professional_role, clinical_note_title }] }`

---

### PATCH /patients/:id/diagnoses/:diagId

Update a diagnosis (only the professional who created it).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the creator)

**Path params:** `id` — Patient UUID, `diagId` — Diagnosis UUID

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| certainty | string | `suspected` or `confirmed` |
| notes | string | Clinical notes |
| clinical_note_id | UUID | Link to a clinical note |
| is_active | boolean | Soft-delete by setting `false` |

**Responses:**
- `200` — `{ diagnosis: { ... } }`
- `400` — Invalid certainty value or no fields to update
- `403` — Only creator can edit
- `404` — Diagnosis not found

---

## Professionals

### GET /professionals

List all active professionals (psychologists and psychiatrists).

**Auth:** Required (any role)

**Query params:**
| Param | Description |
|---|---|
| search | Filter by name or specialization (ILIKE) |
| role | Filter by `psychologist` or `psychiatrist` |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ professionals: [...], pagination: { page, limit, total } }`

---

### GET /professionals/my-patients

Get the active patients linked to the authenticated professional.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ patients: [{ id, email, first_name, last_name, phone, avatar_url, date_of_birth, gender, onboarding_completed, relationship_status, relationship_type, started_at }] }`

---

### GET /professionals/:id

Get a professional's public profile.

**Auth:** Required (any role)

**Path params:** `id` — Professional UUID

**Responses:**
- `200` — `{ professional: { id, email, role, first_name, last_name, avatar_url, license_number, specialization, institution, bio, years_of_experience } }`
- `404` — Professional not found

---

## Invitations

### POST /invitations

Send an invitation to connect a patient and a professional. Either side can initiate. If a previous inactive relationship exists, it is reactivated.

**Auth:** Required (any role)

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| display_id | string | ✅ | Display ID of the target user (e.g. `CLA-BA5A3`) |
| message | string | | Optional invitation message |

**Responses:**
- `201` — `{ invitation: { ...relationship, other_first_name, other_last_name, other_role, other_display_id }, reactivation: boolean }`
- `400` — Cannot invite yourself, or both parties are same role
- `404` — Target user not found
- `409` — Active or pending relationship already exists

---

### GET /invitations/pending

List pending invitations received by the authenticated user.

**Auth:** Required (any role)

**Responses:**
- `200` — `{ invitations: [{ id, relationship_type, status, invitation_message, other_first_name, other_last_name, other_role, other_display_id, other_avatar_url, specialization, institution, ... }] }`

---

### GET /invitations/sent

List pending invitations sent by the authenticated user.

**Auth:** Required (any role)

**Responses:**
- `200` — `{ invitations: [...] }` (same shape as `/invitations/pending`)

---

### PUT /invitations/:id/respond

Accept or reject a received invitation.

**Auth:** Required — must be the recipient (not the sender)

**Path params:** `id` — Care relationship UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| action | string | ✅ | `accept` or `reject` |

**Responses:**
- `200` — `{ relationship: { id, status, started_at, responded_at, ... } }`
- `400` — Invalid action
- `403` — Sender cannot respond to own invitation, or user not in relationship
- `404` — Invitation not found or already responded

---

### DELETE /invitations/:id

Cancel a pending invitation (sender only).

**Auth:** Required — must be the invitation sender

**Path params:** `id` — Care relationship UUID

**Responses:**
- `204` — Cancelled successfully
- `403` — Only sender can cancel
- `404` — Invitation not found or already responded

---

## Onboarding

### GET /onboarding

Get the current onboarding data for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ profile: { onboarding_completed, onboarding_data, date_of_birth, gender, emergency_contact_name, emergency_contact_phone, phone } }`

---

### PUT /onboarding

Save onboarding form data and mark onboarding as completed.

**Auth:** Required — `patient`

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| personal | object | Personal section data |
| physical | object | Physical health section data |
| gynecological | object | Gynecological section data |
| medical | object | Medical history section data |
| family_history | string | Family history text |
| current_treatments | string | Current treatments text |
| date_of_birth | string | ISO date |
| gender | string | |
| full_name | string | Updates first_name and last_name |
| email | string | Updates user email |
| phone | string | |
| emergency_contact_name | string | |
| emergency_contact_phone | string | |

**Responses:**
- `200` — `{ profile: { onboarding_completed: true, onboarding_data, ... } }`

---

## Emotional Logs

### POST /emotional-logs

Create an emotional check-in log (patient only).

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| mood_score | integer | ✅ | 1–10 |
| anxiety_score | integer | ✅ | 1–10 |
| energy_score | integer | ✅ | 1–10 |
| sleep_quality | integer | | 1–10 |
| sleep_hours | number | | 0–24 |
| notes | string | | Short notes |
| journal_entry | string | | Long-form journal text |
| logged_at | ISO8601 | | Timestamp; defaults to now |

**Responses:**
- `201` — `{ emotional_log: { id, patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, notes, journal_entry, logged_at, created_at } }`

---

### GET /emotional-logs

Get the authenticated patient's emotional logs.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| start_date | ISO datetime filter (inclusive) |
| end_date | ISO datetime filter (inclusive) |
| page | Page number (default: 1) |
| limit | Page size (default: 30, max: 100) |

**Responses:**
- `200` — `{ emotional_logs: [...], pagination: { page, limit, total } }`

---

### GET /emotional-logs/trends

Get aggregated trend data for the authenticated patient.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| period | `daily`, `weekly` (default), or `monthly` |
| start_date | ISO datetime filter |
| end_date | ISO datetime filter |

**Responses:**
- `200` — `{ trends: [{ period_start, avg_mood, avg_anxiety, avg_energy, avg_sleep_hours, log_count }], period }`

---

### GET /emotional-logs/:patientId

Get emotional logs for a specific patient (professional view).

**Auth:** Required — `psychologist` or `psychiatrist` with `emotional_logs` permission

**Path params:** `patientId` — Patient UUID

**Query params:** Same as `GET /emotional-logs`

**Responses:**
- `200` — `{ emotional_logs: [...], pagination: { page, limit, total } }`

---

## Journal

### POST /journal

Create a daily journal check-in for the authenticated patient.

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| mood_score | integer | ✅ | 1–10 |
| anxiety_score | integer | ✅ | 1–10 |
| energy_score | integer | ✅ | 1–10 |
| sleep_quality | integer | | 1–10 |
| sleep_hours | number | | 0–24 |
| journal_entry | string | | Max 10,000 chars |
| notes | string | | Short notes |
| logged_at | ISO8601 | | Defaults to now |

**Responses:**
- `201` — `{ journal: { id, patient_id, mood_score, anxiety_score, energy_score, sleep_quality, sleep_hours, notes, journal_entry, logged_at, created_at } }`

---

### GET /journal

Get the authenticated patient's journal entries.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| start_date | ISO datetime filter |
| end_date | ISO datetime filter |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ journals: [...], pagination: { page, limit, total } }`

---

### GET /journal/:patientId

Get a patient's journal entries (professional view, requires `journal_entries` permission).

**Auth:** Required — `psychologist` or `psychiatrist` with `journal_entries` permission

**Path params:** `patientId` — Patient UUID

**Query params:** Same as `GET /journal`

**Notes:** Only returns entries that have a `journal_entry` value.

**Responses:**
- `200` — `{ journals: [...], pagination: { page, limit, total } }`

---

## Symptoms

### GET /symptoms

List the symptom reference catalog.

**Auth:** Required (any role)

**Query params:**
| Param | Description |
|---|---|
| category | Filter by symptom category |

**Responses:**
- `200` — `{ symptoms: [{ id, name, category, ... }] }`

---

### POST /patient-symptoms

Report a symptom (patient only).

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| symptom_id | UUID | ✅ | Reference to a symptom in catalog |
| severity | integer | ✅ | Severity score |
| notes | string | | Optional notes |
| reported_at | ISO8601 | | Defaults to now |

**Responses:**
- `201` — `{ patient_symptom: { id, patient_id, symptom_id, severity, notes, reported_at } }`
- `404` — Symptom not found

---

### GET /patient-symptoms

Get the authenticated patient's symptom history.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| start_date | ISO datetime filter |
| end_date | ISO datetime filter |
| page | Page number (default: 1) |
| limit | Page size (default: 30, max: 100) |

**Responses:**
- `200` — `{ patient_symptoms: [{ ...symptom, symptom_name, symptom_category }], pagination: { page, limit, total } }`

---

### GET /patient-symptoms/:patientId

Get a patient's symptom history (professional view, requires `symptoms` permission).

**Auth:** Required — `psychologist` or `psychiatrist` with `symptoms` permission

**Path params:** `patientId` — Patient UUID

**Query params:** Same as `GET /patient-symptoms`

**Responses:**
- `200` — `{ patient_symptoms: [...], pagination: { page, limit, total } }`

---

## Life Events

### POST /life-events

Create a life event for the authenticated patient.

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| title | string | ✅ | Event title |
| category | string | ✅ | Event category |
| impact_level | integer | ✅ | Impact level score |
| event_date | string | ✅ | ISO date |
| description | string | | Longer description |

**Responses:**
- `201` — `{ life_event: { id, patient_id, title, description, category, impact_level, event_date, ... } }`

---

### GET /life-events

Get the authenticated patient's life events.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| category | Filter by category |
| start_date | ISO date filter |
| end_date | ISO date filter |
| page | Page number (default: 1) |
| limit | Page size (default: 30, max: 100) |

**Responses:**
- `200` — `{ life_events: [...], pagination: { page, limit, total } }`

---

### GET /life-events/:patientId

Get a patient's life events (professional view, requires `life_events` permission).

**Auth:** Required — `psychologist` or `psychiatrist` with `life_events` permission

**Path params:** `patientId` — Patient UUID

**Query params:** Same as `GET /life-events`

**Responses:**
- `200` — `{ life_events: [...], pagination: { page, limit, total } }`

---

## Medications

### GET /medications

List the medication reference catalog.

**Auth:** Required (any role)

**Query params:**
| Param | Description |
|---|---|
| category | Filter by medication category |
| search | Filter by name (ILIKE) |

**Responses:**
- `200` — `{ medications: [{ id, name, category, ... }] }`

---

### POST /patient-medications

Prescribe a medication to a patient (psychiatrist only).

**Auth:** Required — `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_id | UUID | ✅ | Patient to prescribe to |
| medication_id | UUID | ✅ | Medication from catalog |
| dosage | string | ✅ | Dosage instructions |
| frequency | string | ✅ | Frequency instructions |
| start_date | string | ✅ | ISO date |
| end_date | string | | ISO date |
| notes | string | | Additional notes |

**Responses:**
- `201` — `{ patient_medication: { id, patient_id, medication_id, prescribed_by, dosage, frequency, start_date, end_date, notes, status, ... } }`
- `403` — No active care relationship
- `404` — Medication not found

---

### PUT /patient-medications/:id

Update a prescription (psychiatrist only).

**Auth:** Required — `psychiatrist` with active care relationship to patient

**Path params:** `id` — Patient medication UUID

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| dosage | string | |
| frequency | string | |
| end_date | string | ISO date |
| status | string | |
| notes | string | |

**Responses:**
- `200` — `{ patient_medication: { ... } }`
- `404` — Prescription not found or no access

---

### GET /patient-medications

Get patient medications.

**Auth:** Required (any role)

- **Patient:** Returns own medications automatically.
- **Professional:** Must supply `?patient_id=` query param and have an active care relationship.

**Query params:**
| Param | Description |
|---|---|
| patient_id | UUID (required for professionals) |
| status | Filter by medication status |

**Responses:**
- `200` — `{ patient_medications: [{ ...prescription, medication_name, medication_category, prescriber_first_name, prescriber_last_name }] }`

---

### POST /medication-logs

Log a medication as taken or skipped (patient only).

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_medication_id | UUID | ✅ | The prescription being logged |
| taken_at | ISO8601 | | Defaults to now |
| skipped | boolean | | `true` if medication was skipped |
| skip_reason | string | if skipped=true | Reason for skipping |
| notes | string | | Optional notes |

**Responses:**
- `201` — `{ medication_log: { id, patient_medication_id, taken_at, skipped, skip_reason, notes } }`
- `400` — skip_reason required when skipped=true
- `404` — Prescription not found

---

### GET /medication-logs

Get medication adherence logs.

**Auth:** Required (any role)

- **Patient:** Returns own logs.
- **Professional:** Must supply `?patient_id=` and have an active care relationship.

**Query params:**
| Param | Description |
|---|---|
| patient_id | UUID (required for professionals) |
| patient_medication_id | Filter by prescription |
| start_date | ISO datetime filter |
| end_date | ISO datetime filter |

**Responses:**
- `200` — `{ medication_logs: [{ ...log, dosage, frequency, medication_name }], summary: { total, taken, skipped, adherence_rate } }`

---

## Assessments

### GET /assessments

List all assessment templates (e.g. PHQ-9, GAD-7).

**Auth:** Required (any role)

**Responses:**
- `200` — `{ assessments: [{ id, name, ... }] }`

---

### POST /assessment-results

Submit an assessment result (auto-scored by the server).

**Auth:** Required — `patient`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| assessment_id | UUID | ✅ | Assessment template ID |
| answers | object | ✅ | Answer map (validated by assessmentResultValidator) |

**Responses:**
- `201` — `{ assessment_result: { id, patient_id, assessment_id, answers, total_score, severity_level, completed_at, ... }, scoring: { total_score, severity_level, assessment_name } }`
- `400` — Invalid answer structure
- `404` — Assessment not found

---

### GET /assessment-results

Get the authenticated patient's own assessment history.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| assessment_id | Filter by assessment type |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ assessment_results: [{ ...result, assessment_name }], pagination: { page, limit, total } }`

---

### GET /assessment-results/:patientId

Get a patient's assessment history (professional view, requires `assessments` permission).

**Auth:** Required — `psychologist` or `psychiatrist` with `assessments` permission

**Path params:** `patientId` — Patient UUID

**Query params:** Same as `GET /assessment-results`

**Responses:**
- `200` — `{ assessment_results: [...], pagination: { page, limit, total } }`

---

## Psychological Tests (Psych Tests)

### GET /psych-tests

List available psychological tests catalog (SATEPSI-validated only).

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ tests: [...], disclaimer: "..." }`

---

### GET /psych-tests/dsm-criteria

List all DSM criteria entries.

**Auth:** Required (any role)

**Responses:**
- `200` — `{ criteria: [{ id, code, name, category, version, created_at }] }`

---

### GET /psych-tests/dsm-criteria/:code

Get DSM criteria detail by code.

**Auth:** Required (any role)

**Path params:** `code` — DSM criteria code

**Responses:**
- `200` — `{ criteria: { ... } }`
- `404` — Criteria not found

---

### GET /psych-tests/sessions/pending

List pending/in-progress test sessions for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ sessions: [{ ...session, test_name, test_description, test_category, assigned_by_first_name, assigned_by_last_name }] }`

---

### GET /psych-tests/sessions/history

List completed test sessions for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ sessions: [...] }` (same shape as `/sessions/pending`)

---

### GET /psych-tests/sessions/patient/:patientId

List all test sessions for a patient (professional view).

**Auth:** Required — `psychologist` or `psychiatrist` with `psychological_tests` permission

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ sessions: [...], pagination: { page, limit, total } }`

---

### GET /psych-tests/:id

Get test detail.

**Auth:** Required (any role)

**Path params:** `id` — Psychological test UUID

**Responses:**
- `200` — `{ test: { id, name, description, category, questions, scoring_rules, interpretation_guide, ... } }`
- `404` — Test not found

---

### POST /psych-tests/assign

Assign a psychological test to a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| test_id | UUID | ✅ | Psychological test ID |
| patient_id | UUID | ✅ | Patient to assign to |
| deadline | ISO8601 | | Defaults to 7 days from now |

**Responses:**
- `201` — `{ session: { id, test_id, patient_id, assigned_by, deadline, status, ... } }`
- `403` — No active care relationship or test requires SATEPSI approval
- `404` — Test not found

---

### GET /psych-tests/sessions/:id

Get a test session detail (including questions for the patient).

**Auth:** Required — patient who owns the session, or a professional with patient access

**Path params:** `id` — Session UUID

**Notes:** Professionals cannot see `answers` until the session is completed.

**Responses:**
- `200` — `{ session: { ...session, test_name, test_description, test_category, test_questions, scoring_rules, interpretation_guide, dsm_references, assigned_by_first_name, assigned_by_last_name } }`
- `403` — Access denied
- `404` — Session not found

---

### PUT /psych-tests/sessions/:id

Patient submits answers for a test session. The server auto-scores and generates an AI analysis.

**Auth:** Required — `patient` (must own the session)

**Path params:** `id` — Session UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| answers | object | ✅ | Map of question index to answer value |

**Responses:**
- `200` — `{ session: { ...updated }, score: { total_score, subscores, interpretation }, ai_analysis: { ... } }`
- `400` — Session already completed or expired
- `404` — Session not found

---

### POST /psych-tests/admin

Create a custom psychological test.

**Auth:** Required — `psychologist` or `psychiatrist`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| name | string | ✅ | Test name (max 300 chars) |
| category | string | ✅ | Test category |
| questions | array | ✅ | Array of question objects |
| scoring_rules | object | ✅ | Scoring configuration |
| description | string | | Optional description |
| dsm_references | any | | DSM references |
| interpretation_guide | any | | Interpretation guide |

**Responses:**
- `201` — `{ test: { ... } }`

---

## ICD-11

### GET /icd11

List ICD-11 disorders.

**Auth:** Required — `psychologist` or `psychiatrist`

**Query params:**
| Param | Description |
|---|---|
| category | Filter by category |
| search | Search disorder name, code, or description (ILIKE) |

**Responses:**
- `200` — `{ disorders: [{ id, icd_code, disorder_name, description, symptom_keywords, category, created_at }] }`

---

### GET /icd11/categories

List distinct ICD-11 categories.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ categories: ["string", ...] }`

---

### GET /icd11/recent

Get up to 8 most recently used ICD codes by the authenticated professional.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ recent: [{ icd_code, icd_name, usage_count, last_used_at }] }`

---

### GET /icd11/:code

Get ICD-11 disorder detail by code.

**Auth:** Required — `psychologist` or `psychiatrist`

**Path params:** `code` — ICD-11 code (e.g. `6A00`)

**Responses:**
- `200` — `{ disorder: { ... } }`
- `404` — Disorder not found

---

### GET /icd11/:code/tests

Get suggested psychological tests for a given ICD-11 disorder (SATEPSI-active only).

**Auth:** Required — `psychologist` or `psychiatrist`

**Path params:** `code` — ICD-11 code

**Responses:**
- `200` — `{ disorder: { icd_code, disorder_name }, suggested_tests: [{ id, name, description, category, relevance_score, satepsi_status, ... }], disclaimer: "..." }`
- `404` — Disorder not found

---

### POST /icd11/suggest-by-symptoms

Suggest ICD-11 disorders based on symptom keywords.

**Auth:** Required — `psychologist` or `psychiatrist`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| symptoms | array | ✅ | Array of symptom keyword strings |

**Responses:**
- `200` — `{ suggestions: [{ icd_code, disorder_name, match_count, ... }], disclaimer: "..." }` (max 10 results)
- `400` — symptoms array is required

---

## SATEPSI

### GET /satepsi

List SATEPSI-approved psychological tests.

**Auth:** Required — `psychologist` or `psychiatrist`

**Query params:**
| Param | Description |
|---|---|
| status | `all` to include expired/revoked; default shows only active |
| category | Filter by test category |
| search | Filter by test name or author (ILIKE) |

**Responses:**
- `200` — `{ tests: [{ id, test_name, test_author, approval_status, approval_date, expiry_date, test_category, cfp_code, last_updated }] }`

---

### GET /satepsi/categories

List distinct SATEPSI test categories.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ categories: ["string", ...] }`

---

### GET /satepsi/sync-status

Get the last SATEPSI data sync status.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ last_sync: { ... } | null }`

---

### GET /satepsi/:id

Get SATEPSI test detail including linked psychological tests.

**Auth:** Required — `psychologist` or `psychiatrist`

**Path params:** `id` — SATEPSI test UUID

**Responses:**
- `200` — `{ satepsi_test: { ... }, linked_tests: [{ id, name, category, is_active }] }`
- `404` — SATEPSI test not found

---

### GET /satepsi/validate/:testId

Check if a psychological test has valid SATEPSI approval.

**Auth:** Required — `psychologist` or `psychiatrist`

**Path params:** `testId` — Psychological test UUID

**Responses:**
- `200` — `{ test_id, test_name, requires_satepsi, satepsi_approved, satepsi_status, satepsi_expiry }`
- `404` — Test not found

---

## Clinical Notes

### POST /clinical-notes

Create a clinical session note (professional only).

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_id | UUID | ✅ | Patient UUID |
| session_date | string | ✅ | ISO date of the session |
| note_type | string | ✅ | Note type (e.g. `session`, `evaluation`) |
| content | string | ✅ | Note content |
| is_private | boolean | | If `true`, hidden from other professionals (default: `false`) |

**Responses:**
- `201` — `{ clinical_note: { id, professional_id, patient_id, session_date, note_type, content, is_private, ... } }`
- `403` — No active care relationship

---

### GET /clinical-notes/:patientId

Get clinical notes for a patient.

**Auth:** Required — professional with `clinical_notes` permission, or patient (for non-private notes)

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| note_type | Filter by note type |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Notes:**
- Professionals see their own notes plus other professionals' non-private notes.
- Patients never see private notes.

**Responses:**
- `200` — `{ clinical_notes: [{ ...note, professional_first_name, professional_last_name, professional_role }], pagination: { page, limit, total } }`

---

### PUT /clinical-notes/:id

Update a clinical note (author only).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the note author)

**Path params:** `id` — Clinical note UUID

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| session_date | string | ISO date |
| note_type | string | |
| content | string | |
| is_private | boolean | |

**Responses:**
- `200` — `{ clinical_note: { ... } }`
- `400` — No fields to update

---

## Medical Records

### POST /medical-records

Create a private medical record for a patient (professional only, visible only to the creator).

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_id | UUID | ✅ | Patient UUID |
| title | string | ✅ | Record title |
| content | string | ✅ | Record content |
| record_date | string | | ISO date; defaults to today |
| category | string | | Record category |
| tags | any | | Tags (JSONB) |

**Responses:**
- `201` — `{ record: { id, professional_id, patient_id, title, content, record_date, category, tags, ... } }`
- `403` — No active care relationship

---

### GET /medical-records/:patientId

List the authenticated professional's private records for a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with `private_records` permission

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| category | Filter by category |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ records: [...], pagination: { page, limit, total } }`

---

### GET /medical-records/detail/:id

Get a private record detail (owner only).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the creator)

**Path params:** `id` — Record UUID

**Responses:**
- `200` — `{ record: { ... } }`

---

### PUT /medical-records/:id

Update a private medical record (creator only).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the creator)

**Path params:** `id` — Record UUID

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| title | string | |
| content | string | |
| record_date | string | ISO date |
| category | string | |
| tags | any | |

**Responses:**
- `200` — `{ record: { ... } }`
- `400` — No fields to update

---

### DELETE /medical-records/:id

Delete a private medical record (creator only).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the creator)

**Path params:** `id` — Record UUID

**Responses:**
- `200` — `{ message: "Registro deletado com sucesso" }`

---

## Goals & Milestones

### POST /goals

Create a therapeutic goal for a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_id | UUID | ✅ | Patient UUID |
| title | string | ✅ | Goal title (max 300 chars) |
| description | string | | Goal description (max 5000 chars) |
| target_date | ISO8601 | | Target completion date |

**Responses:**
- `201` — `{ goal: { id, patient_id, created_by, title, description, status, patient_status, target_date, ... } }`
- `403` — No active care relationship

---

### GET /goals/:patientId

List goals for a patient.

**Auth:** Required — professional with active care relationship, or the patient themselves

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ goals: [{ ...goal, created_by_first_name, created_by_last_name }] }` — Sorted by patient_status then status.

---

### PUT /goals/:id

Update a goal (professional only, cannot change status while goal is pending patient acceptance).

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Path params:** `id` — Goal UUID

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| title | string | Max 300 chars |
| description | string | Max 5000 chars |
| status | string | `in_progress`, `paused`, or `cancelled` |
| target_date | ISO8601 | |

**Responses:**
- `200` — `{ goal: { ... } }`
- `400` — Cannot change status of a pending goal
- `404` — Goal not found or access denied

---

### PUT /goals/:id/achieve

Mark a goal as achieved (professional only). Goal must be accepted by the patient first.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Path params:** `id` — Goal UUID

**Responses:**
- `200` — `{ goal: { ...goal, status: "achieved", achieved_at } }`
- `400` — Goal must be accepted by patient first
- `404` — Goal not found or access denied

---

### PUT /goals/:id/respond

Patient accepts or rejects a goal.

**Auth:** Required — `patient` (must own the goal)

**Path params:** `id` — Goal UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| action | string | ✅ | `accept` or `reject` |
| rejection_reason | string | | Max 2000 chars; encouraged when action is `reject` |

**Responses:**
- `200` — `{ goal: { ...goal, patient_status: "accepted"/"rejected" } }`
- `400` — Goal already responded to
- `404` — Goal not found

---

### POST /goals/milestones

Create a milestone for a patient (professional only).

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_id | UUID | ✅ | Patient UUID |
| title | string | ✅ | Milestone title (max 300 chars) |
| milestone_type | string | ✅ | `positive` or `difficult` |
| event_date | ISO8601 | ✅ | Date of the milestone |
| description | string | | Max 5000 chars |
| goal_id | UUID | | Link to a specific goal |

**Responses:**
- `201` — `{ milestone: { id, patient_id, goal_id, title, description, milestone_type, event_date, created_by, ... } }`
- `403` — No active care relationship

---

### GET /goals/milestones/:patientId

List milestones for a patient.

**Auth:** Required — professional with active care relationship, or the patient themselves

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ milestones: [{ ...milestone, created_by_first_name, created_by_last_name, goal_title }] }`

---

## Insights

### GET /insights

Get AI-generated insights for the authenticated patient.

**Auth:** Required — `patient`

**Query params:**
| Param | Description |
|---|---|
| insight_type | Filter by type |
| impact_level | Filter by impact level |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ insights: [{ ...insight, reviewer_first_name, reviewer_last_name }], pagination: { page, limit, total } }`

---

### GET /insights/:patientId

Get AI insights for a patient (professional view).

**Auth:** Required — `psychologist` or `psychiatrist` with patient access

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| insight_type | Filter by type |
| impact_level | Filter by impact level |
| is_reviewed | `true` or `false` |
| page | Page number (default: 1) |
| limit | Page size (default: 20, max: 100) |

**Responses:**
- `200` — `{ insights: [...], pagination: { page, limit, total } }`

---

### PUT /insights/:id/review

Mark an AI insight as reviewed by the professional.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Path params:** `id` — Insight UUID

**Responses:**
- `200` — `{ insight: { ...insight, is_reviewed: true, reviewed_by } }`
- `403` — No active care relationship
- `404` — Insight not found

---

## Alerts

### GET /alerts

Get all alerts for the professional's active patients.

**Auth:** Required — `psychologist` or `psychiatrist`

**Query params:**
| Param | Description |
|---|---|
| severity | Filter by severity |
| is_acknowledged | `true` or `false` |
| page | Page number (default: 1) |
| limit | Page size (default: 30, max: 100) |

**Responses:**
- `200` — `{ alerts: [{ ...alert, patient_first_name, patient_last_name, acknowledged_by_first_name, acknowledged_by_last_name }], pagination: { page, limit, total } }`

---

### GET /alerts/:patientId

Get alerts for a specific patient.

**Auth:** Required — `psychologist` or `psychiatrist` with patient access

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| severity | Filter by severity |
| is_acknowledged | `true` or `false` |

**Responses:**
- `200` — `{ alerts: [...] }`

---

### PUT /alerts/:id/acknowledge

Acknowledge an alert (professional only).

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Path params:** `id` — Alert UUID

**Responses:**
- `200` — `{ alert: { ...alert, is_acknowledged: true, acknowledged_by, acknowledged_at } }`
- `400` — Alert already acknowledged
- `403` — No active care relationship
- `404` — Alert not found

---

## Summaries

### POST /summaries/:patientId/generate

Generate a new AI-powered patient summary.

**Auth:** Required — `psychologist` or `psychiatrist` with `emotional_logs` permission

**Path params:** `patientId` — Patient UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| period_days | integer | | Days of data to summarize (default: 7) |

**Responses:**
- `201` — `{ summary: { ... } }`

---

### GET /summaries/:patientId

List generated summaries for a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with `emotional_logs` permission

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| limit | Max results (default: 10, max: 50) |

**Responses:**
- `200` — `{ summaries: [{ ... }] }`

---

### GET /summaries/:patientId/brief

Get a compiled professional brief for a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with `emotional_logs` permission

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ brief: { ... } }`

---

## Digital Twin

### GET /digital-twin/:patientId

Get the latest digital twin state for a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with `digital_twin` permission

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ id, patient_id, current_state, correlations, baseline, predictions, treatment_responses, data_points_used, model_version, confidence_overall, computed_at, created_at }`
- `404` — Digital twin not yet available

---

### GET /digital-twin/:patientId/history

Get digital twin evolution over time.

**Auth:** Required — `psychologist` or `psychiatrist` with `digital_twin` permission

**Path params:** `patientId` — Patient UUID

**Query params:**
| Param | Description |
|---|---|
| days | Number of days of history (default: 90) |

**Responses:**
- `200` — `{ history: [{ ...state }] }`

---

### GET /digital-twin/:patientId/predictions

Get current predictions only (lightweight endpoint).

**Auth:** Required — `psychologist` or `psychiatrist` with `digital_twin` permission

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ predictions: [...], confidence_overall, computed_at }`

---

### POST /digital-twin/:patientId/refresh

Trigger a fresh digital twin computation via the AI engine.

**Auth:** Required — `psychologist` or `psychiatrist` with `digital_twin` permission

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ status: "success", message: "...", analysis: { ... } }`
- `503` — AI engine unavailable

---

## Anamnesis

### POST /anamnesis/templates

Create an anamnesis template.

**Auth:** Required — `psychologist` or `psychiatrist`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| title | string | ✅ | Template title |
| questions | array | ✅ | Array of question objects (min 1) |
| description | string | | Optional description |

Each question object:
| Field | Type | Required | Description |
|---|---|---|---|
| question_text | string | ✅ | |
| question_type | string | ✅ | `text`, `scale`, `multiple_choice`, `yes_no`, or `date` |
| options | array | | For `multiple_choice` type |
| is_required | boolean | | Defaults to `true` |

**Responses:**
- `201` — `{ template: { ...template, questions: [...] } }`

---

### GET /anamnesis/templates

List the authenticated professional's anamnesis templates.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ templates: [{ ...template, question_count, response_count }] }`

---

### GET /anamnesis/templates/:id

Get template detail with questions.

**Auth:** Required — `psychologist` or `psychiatrist` (must be the template owner)

**Path params:** `id` — Template UUID

**Responses:**
- `200` — `{ template: { ...template, questions: [...] } }`
- `404` — Template not found

---

### PUT /anamnesis/templates/:id

Update a template (owner only). If `questions` is provided, all existing questions are replaced.

**Auth:** Required — `psychologist` or `psychiatrist` (must be the template owner)

**Path params:** `id` — Template UUID

**Body (all optional):**
| Field | Type | Description |
|---|---|---|
| title | string | |
| description | string | |
| questions | array | Replaces all existing questions |

**Responses:**
- `200` — `{ template: { ...template, questions: [...] } }`

---

### DELETE /anamnesis/templates/:id

Soft-delete a template (owner only).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the template owner)

**Path params:** `id` — Template UUID

**Responses:**
- `200` — `{ message: "Template desativado com sucesso" }`

---

### POST /anamnesis/send

Send an anamnesis to a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| template_id | UUID | ✅ | Anamnesis template ID |
| patient_id | UUID | ✅ | Patient UUID |
| deadline | ISO8601 | | Optional completion deadline |

**Responses:**
- `201` — `{ response: { id, template_id, patient_id, professional_id, status, deadline, ... } }`
- `403` — No active care relationship
- `404` — Template not found

---

### GET /anamnesis/pending

List pending anamneses for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ pending: [{ ...response, template_title, template_description, professional_first_name, professional_last_name, question_count }] }`

---

### GET /anamnesis/responses/:id

Get anamnesis response detail (patient owner or sending professional).

**Auth:** Required — patient who owns it or the professional who sent it

**Path params:** `id` — Response UUID

**Responses:**
- `200` — `{ response: { ...response, template_title, template_description, professional_first_name, professional_last_name, questions: [...] } }`
- `403` — No permission
- `404` — Response not found

---

### PUT /anamnesis/responses/:id

Patient saves or submits anamnesis answers.

**Auth:** Required — `patient` (must own the response)

**Path params:** `id` — Response UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| answers | object | | Answer map |
| status | string | | `in_progress` (default) or `completed` |

**Responses:**
- `200` — `{ response: { ...updated } }`
- `400` — Anamnesis already completed
- `404` — Response not found

---

### GET /anamnesis/patient/:patientId

Professional views anamnesis responses sent by them to a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with `anamnesis` permission

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ responses: [{ ...response, template_title, template_description, question_count }] }`

---

## Documents

### POST /documents

Upload a document (multipart/form-data, patient only). Max file size: 10MB. Accepted types: PDF, JPEG, PNG.

**Auth:** Required — `patient`

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| file | file | ✅ | Document file |
| document_type | string | | Document type label |
| document_date | string | | ISO date of document |
| notes | string | | Notes |

**Responses:**
- `201` — `{ document: { id, patient_id, file_name, original_name, file_type, file_size, document_type, document_date, notes, ... } }`
- `400` — No file sent or file too large

---

### GET /documents

List all documents for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ documents: [...] }`

---

### GET /documents/:id/file

Serve a document file (authenticated, access-controlled).

**Auth:** Required — patient who owns it, or professional with `documents` permission and specific document access

**Path params:** `id` — Document UUID

**Responses:**
- `200` — File stream (Content-Type: pdf / image)
- `403` — Access denied
- `404` — Document not found

---

### DELETE /documents/:id

Delete a document and its file (patient only, must own).

**Auth:** Required — `patient`

**Path params:** `id` — Document UUID

**Responses:**
- `204` — Deleted
- `404` — Document not found

---

### GET /documents/:id/access

List which professionals have access to a specific document (patient only).

**Auth:** Required — `patient` (must own the document)

**Path params:** `id` — Document UUID

**Responses:**
- `200` — `{ access: [{ id, document_id, professional_id, granted_at, first_name, last_name, role }] }`

---

### PUT /documents/:id/access

Grant or revoke a professional's access to a specific document (patient only).

**Auth:** Required — `patient` (must own the document)

**Path params:** `id` — Document UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| professional_id | UUID | ✅ | Professional to grant/revoke |
| granted | boolean | ✅ | `true` to grant, `false` to revoke |

**Responses:**
- `200` — `{ access: [...] }` — Updated access list

---

### GET /documents/patient/:patientId

List documents shared with the authenticated professional by a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with `documents` permission

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ documents: [...] }` — Only documents where specific access was granted

---

## Exams

### POST /exams

Upload a lab exam or imaging file (multipart/form-data, patient only). Max file size: 10MB.

**Auth:** Required — `patient`

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| file | file | ✅ | Exam file |
| exam_type | string | ✅ | Exam type label |
| exam_date | string | ✅ | ISO date |
| notes | string | | Notes |
| professional_ids | JSON string | | Array of professional UUIDs to share with immediately |

**Responses:**
- `201` — `{ exam: { id, patient_id, exam_type, exam_date, file_name, original_name, mime_type, file_size, notes, permissions: [...] } }`
- `400` — exam_type and exam_date required, or file issues

---

### GET /exams/my-exams

List all exams for the authenticated patient.

**Auth:** Required — `patient`

**Responses:**
- `200` — `{ exams: [{ ...exam, permissions: [{ professional_id, first_name, last_name, role }] }] }`

---

### GET /exams/patient/:patientId

List exams shared with the authenticated professional by a patient.

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Path params:** `patientId` — Patient UUID

**Responses:**
- `200` — `{ exams: [...] }` — Only exams where specific permission was granted

---

### GET /exams/download/:examId

Download an exam file (authenticated, access-controlled).

**Auth:** Required — patient who owns it or professional with exam permission

**Path params:** `examId` — Exam UUID

**Responses:**
- `200` — File stream
- `403` — Access denied
- `404` — Exam not found

---

### DELETE /exams/:examId

Delete an exam and its file (patient only, must own).

**Auth:** Required — `patient`

**Path params:** `examId` — Exam UUID

**Responses:**
- `204` — Deleted
- `404` — Exam not found

---

### PUT /exams/:examId/permissions

Update which professionals can access an exam (replaces all existing permissions).

**Auth:** Required — `patient` (must own the exam)

**Path params:** `examId` — Exam UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| professional_ids | array | ✅ | Array of professional UUIDs to grant access |

**Responses:**
- `200` — `{ permissions: [{ professional_id, first_name, last_name, role }] }`
- `400` — professional_ids must be an array
- `404` — Exam not found

---

## Record Sharing

### POST /record-sharing/generate-token

Generate a QR-sharable access token for a patient's records (20-day expiry).

**Auth:** Required — `psychologist` or `psychiatrist` with active care relationship

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| patient_id | UUID | ✅ | Patient UUID |

**Responses:**
- `201` — `{ access_token: { id, token, patient_id, expires_at, ... } }`
- `403` — No active care relationship

---

### GET /record-sharing/verify/:token

Verify a sharing token's validity without accessing records.

**Auth:** Required (any role)

**Path params:** `token` — Sharing token string

**Responses:**
- `200` — `{ valid: boolean, expires_at, granting_professional: "Full Name", patient: "Full Name", already_accessed: boolean }`
- `404` — Token not found

---

### POST /record-sharing/access/:token

Access patient records via a sharing token (single-use).

**Auth:** Required — `psychologist` or `psychiatrist`

**Path params:** `token` — Sharing token string

**Responses:**
- `200` — `{ records: { ... }, token_info: { id, expires_at, patient_id } }`
- `400` — Token invalid, expired, or revoked

---

### GET /record-sharing/my-shares

List record shares made or received by the authenticated professional.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ granted: [{ ...token, patient_first_name, patient_last_name, accessed_by_first_name, accessed_by_last_name }], received: [{ ...share, granting_first_name, granting_last_name, patient_first_name, patient_last_name }] }`

---

### POST /record-sharing/save-summary

Save a text summary of shared records before the token expires.

**Auth:** Required — `psychologist` or `psychiatrist`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| access_token_id | UUID | ✅ | ID of the access token used |
| summary | string | ✅ | Summary text to save |

**Responses:**
- `200` — `{ shared_record: { ...updated } }`
- `404` — Share not found

---

### DELETE /record-sharing/revoke/:tokenId

Revoke a sharing token (creator only).

**Auth:** Required — `psychologist` or `psychiatrist` (must be the token creator)

**Path params:** `tokenId` — Token UUID

**Responses:**
- `200` — `{ message: "Token revogado com sucesso" }`

---

## Chat

All chat routes require the `psychologist` or `psychiatrist` role.

### GET /chat/conversations

List conversations for the authenticated professional.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ conversations: [{ id, patient_id, patient_first_name, patient_last_name, other_user_id, other_first_name, other_last_name, other_role, last_message, last_message_at, last_message_sender_id, unread_count, created_at }] }`

---

### POST /chat/conversations

Create or retrieve an existing conversation between two professionals (optionally in context of a patient).

**Auth:** Required — `psychologist` or `psychiatrist`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| other_user_id | UUID | ✅ | The other professional's user ID |
| patient_id | UUID | | Patient context (both professionals must have access) |

**Responses:**
- `200` — `{ conversation: { id, existing: true } }` — if already exists
- `201` — `{ conversation: { id, existing: false } }` — if newly created
- `403` — Cannot create conversation with patient, or professionals lack shared patient access
- `404` — Other user not found

---

### GET /chat/conversations/:id/messages

Get messages in a conversation.

**Auth:** Required — `psychologist` or `psychiatrist` (must be a conversation participant)

**Path params:** `id` — Conversation UUID

**Query params:**
| Param | Description |
|---|---|
| page | Page number (default: 1) |
| limit | Page size (default: 50, max: 100) |

**Responses:**
- `200` — `{ messages: [{ id, conversation_id, sender_id, content, created_at, read_at, sender_first_name, sender_last_name, attachment_id, attachment_name, attachment_mime_type, attachment_file_size }], pagination: { page, limit, total } }`
- `403` — Not a participant

---

### POST /chat/conversations/:id/messages

Send a text message in a conversation.

**Auth:** Required — `psychologist` or `psychiatrist` (must be a participant)

**Path params:** `id` — Conversation UUID

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| content | string | ✅ | Message text (1–10000 chars) |

**Responses:**
- `201` — `{ message: { id, conversation_id, sender_id, content, created_at } }`
- `403` — Not a participant

---

### PUT /chat/conversations/:id/read

Mark all unread messages in a conversation as read.

**Auth:** Required — `psychologist` or `psychiatrist`

**Path params:** `id` — Conversation UUID

**Responses:**
- `200` — `{ success: true }`

---

### GET /chat/unread-count

Get total unread message count for the authenticated professional.

**Auth:** Required — `psychologist` or `psychiatrist`

**Responses:**
- `200` — `{ unread_count: integer }`

---

### POST /chat/conversations/:conversationId/messages/file

Send a message with a file attachment (multipart/form-data). Max file size: 10MB.

**Auth:** Required — `psychologist` or `psychiatrist` (must be a participant)

**Path params:** `conversationId` — Conversation UUID

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| file | file | ✅ | File to attach |

**Responses:**
- `201` — `{ message: { ... }, attachment: { id, file_name, original_name, mime_type, file_size, ... } }`
- `400` — No file sent or file too large

---

### GET /chat/attachments/:id/file

Download a chat attachment.

**Auth:** Required — `psychologist` or `psychiatrist` (must be a conversation participant)

**Path params:** `id` — Attachment UUID

**Responses:**
- `200` — File download stream
- `403` — Not a participant
- `404` — Attachment not found

---

## Push Notifications

### GET /push/vapid-public-key

Get the VAPID public key for Web Push subscription setup.

**Auth:** None

**Responses:**
- `200` — `{ publicKey: "string" | null }`

---

### POST /push/subscribe

Register or update a push notification subscription.

**Auth:** Required (any role)

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| subscription | object | ✅ | Web Push subscription object (must include `endpoint`) |

**Responses:**
- `200` — `{ success: true }`
- `400` — Invalid subscription

---

### DELETE /push/unsubscribe

Remove the push notification subscription for the authenticated user.

**Auth:** Required (any role)

**Responses:**
- `200` — `{ success: true }`

---

## Error Responses

All endpoints return JSON error objects in the following format:

```json
{ "error": "Human-readable error message" }
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Authentication required or invalid credentials |
| `403` | Forbidden — insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict — resource already exists |
| `410` | Gone — deprecated endpoint |
| `500` | Internal server error |
| `503` | Service unavailable (e.g. database or AI engine down) |

---

## Permission Types

The `data_permissions` table controls what data a professional can see for a patient. Valid `permission_type` values used across the codebase:

| Permission | Data Covered |
|---|---|
| `emotional_logs` | Emotional check-ins and trends |
| `journal_entries` | Journal text entries |
| `symptoms` | Reported symptoms |
| `life_events` | Life events |
| `assessments` | Assessment results |
| `clinical_notes` | Clinical session notes |
| `medications` | Medication data |
| `documents` | Uploaded documents |
| `private_records` | Private medical records |
| `anamnesis` | Anamnesis responses |
| `psychological_tests` | Psych test sessions |
| `digital_twin` | Digital twin state |

Permissions are set by the patient via `PUT /patients/:id/permissions`.
