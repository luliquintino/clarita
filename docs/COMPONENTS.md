# Component Catalog

This document describes all 39 React components in `dashboard/src/components/`.

---

## AISummaryCard

**Description:** Displays AI-generated patient summaries with mood, anxiety, energy, and sleep metrics. Supports collapsing, pagination through multiple summaries, and a button to trigger generation of a new summary.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| summaries | `PatientSummary[]` | ✅ | Array of AI-generated summary objects to display |
| loading | `boolean` | ❌ | Shows a spinner skeleton while data loads (default: `false`) |
| generating | `boolean` | ❌ | Disables the generate button and shows a spinner while a new summary is being created (default: `false`) |
| onGenerate | `() => void` | ❌ | Callback to request a new AI summary |

**Used in:** `patients/[id]/page.tsx`

---

## AlertsPanel

**Description:** Displays clinical alerts for patients grouped by severity (critical, high, medium, low). Supports filtering by severity and acknowledging or resolving individual alerts.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| alerts | `Alert[]` | ✅ | Array of alert objects to display |
| onAcknowledge | `(alertId: string) => Promise<void>` | ✅ | Callback invoked when the professional acknowledges an alert |
| onResolve | `(alertId: string) => Promise<void>` | ❌ | Callback to resolve an alert |
| showPatientName | `boolean` | ❌ | Whether to show the patient name on each alert card (default: `true`) |

**Used in:** `patients/[id]/page.tsx`, `alerts/page.tsx`

---

## AnamnesisPanel

**Description:** Full anamnesis (medical history questionnaire) workflow component. For professionals: create templates with multiple question types and send them to the patient. For patients: list pending questionnaires and submit answers.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ❌ | UUID of the patient; required in professional view to send templates |
| role | `string` | ✅ | User role — `'patient'` renders the patient response UI, any other value renders the professional UI |

**Used in:** `patients/[id]/page.tsx`, `patient-home/page.tsx`

---

## AssessmentHistory

**Description:** Charts historical PHQ-9 (depression) and GAD-7 (anxiety) standardised assessment scores over time. Displays severity zones as reference bands on the chart and shows a latest score with trend indicator.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| assessments | `Assessment[]` | ✅ | Array of assessment records to chart |
| loading | `boolean` | ❌ | Shows a skeleton placeholder while data is loading (default: `false`) |

**Used in:** `UnifiedAssessmentsPanel.tsx` (rendered as a sub-component)

---

## BottomNav

**Description:** Mobile-only bottom navigation bar for the patient portal. Renders navigation buttons for all patient sections and shows badge counts on items.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| active | `PatientSection` | ✅ | Key of the currently active section |
| onChange | `(section: PatientSection) => void` | ✅ | Callback invoked when a nav item is tapped |
| badges | `Partial<Record<PatientSection, number>>` | ❌ | Map of section keys to unread/pending counts displayed as badges (default: `{}`) |

**Used in:** `patient-home/page.tsx`

---

## ChatPanel

**Description:** Full messaging interface for a single conversation. Polls for new messages every 5 seconds, supports file attachments (PDF, JPEG, PNG up to 10 MB), and auto-scrolls to the latest message.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| conversation | `Conversation` | ✅ | The conversation object to render (includes participant metadata) |
| currentUserId | `string` | ✅ | UUID of the authenticated user, used to align sent vs received messages |
| onMessageSent | `() => void` | ❌ | Callback fired after a message or file is successfully sent |

**Used in:** `chat/page.tsx`

---

## ClinicalNotes

**Description:** Allows professionals to create, view, edit, and delete clinical notes for a patient. Notes are typed (session, observation, treatment plan, progress) and support expandable long-form content.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| notes | `ClinicalNote[]` | ✅ | Array of existing clinical notes to display |
| patientId | `string` | ✅ | UUID of the patient (used contextually) |
| onSave | `(data: { type: string; title: string; content: string }) => Promise<void>` | ✅ | Callback to persist a new note |
| onUpdate | `(noteId: string, data: { type?: string; title?: string; content?: string }) => Promise<void>` | ✅ | Callback to update an existing note |
| onDelete | `(noteId: string) => Promise<void>` | ✅ | Callback to delete a note |

**Used in:** `patients/[id]/page.tsx`

---

## ConversationList

**Description:** Sidebar list of messaging conversations showing participant avatars, last message preview, unread counts, and role-coloured rings. Highlights the active conversation.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| conversations | `Conversation[]` | ✅ | List of conversations to render |
| activeId | `string \| null` | ✅ | ID of the currently selected conversation |
| currentUserId | `string` | ✅ | UUID of the authenticated user, used to prefix sent messages with "Você:" |
| onSelect | `(conv: Conversation) => void` | ✅ | Callback invoked when a conversation item is clicked |

**Used in:** `chat/page.tsx`

---

## DiagnosticBrowserPanel

**Description:** ICD-11 diagnostic browser for professionals. Supports text search, symptom-based smart search, recently used ICD codes carousel, SATEPSI-approved psychological test listing, guided diagnosis registration form, and patient diagnosis history.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ❌ | UUID of the patient; enables diagnosis registration and test assignment |
| onAssignTest | `(testId: string) => void` | ❌ | Callback fired when a test is assigned to the patient |
| onDiagnosisCreated | `(diagnosis: PatientDiagnosis) => void` | ❌ | Callback fired after a diagnosis is successfully registered |
| diagnosesForPatient | `PatientDiagnosis[]` | ❌ | Existing patient diagnoses used to highlight already-diagnosed disorders in the browse list |
| currentProfessionalId | `string` | ❌ | UUID of the logged-in professional, used to show the "Confirm" button only on that professional's suspected diagnoses |

**Used in:** `patients/[id]/page.tsx`

---

## DigitalTwinPanel

**Description:** Renders the patient's Digital Mental Twin: real-time variable state cards (mood, anxiety, energy, sleep, medication adherence), a learned correlation network (SVG), behavioural predictions, and treatment response charts. Also shows teaser cards for the upcoming Mental Genome and ecosystem features.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| twin | `DigitalTwin \| null` | ✅ | Digital twin model data; `null` renders an empty-state with a refresh button |
| patientId | `string` | ✅ | UUID of the patient, used to call the refresh API |

**Used in:** `patients/[id]/page.tsx`

---

## DisplayIdBadge

**Description:** Renders a patient or professional's Clarita display ID (e.g., `CLA-XXXXXX`) in a clickable pill that copies the value to the clipboard and shows a "Copiado!" confirmation.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| displayId | `string` | ✅ | The display ID string to show and copy |
| label | `string` | ❌ | Optional text label rendered before the pill |
| size | `'sm' \| 'md'` | ❌ | Controls font and icon size (default: `'md'`) |

**Used in:** `patient-home/page.tsx`, `patients/page.tsx`

---

## EmotionalChart

**Description:** Multi-line chart of a patient's emotional log history (mood, anxiety, energy, sleep quality). Allows toggling individual metric lines and switching between 7, 30, and 90-day time windows.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| data | `EmotionalLog[]` | ✅ | Array of emotional log records to plot |
| loading | `boolean` | ❌ | Shows a skeleton while data loads (default: `false`) |

**Used in:** `patients/[id]/page.tsx`

---

## ExamUploadPanel

**Description:** Patient-facing panel for uploading medical exams (PDF, JPEG, PNG, max 10 MB). Includes drag-and-drop, exam type classification, date input, professional sharing permissions, and a list of previously uploaded exams with download and delete actions.

**Props:** None — fetches its own data via `examsApi` and `patientProfileApi`.

**Used in:** `patient-home/page.tsx`

---

## GoalsPanel

**Description:** Professional-facing therapeutic goals manager. Allows creating goals for a patient (with optional target date), marking goals as achieved, pausing or cancelling them, and viewing goals awaiting patient acceptance or rejected by the patient.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| goals | `Goal[]` | ✅ | Array of goal records to display |
| patientId | `string` | ✅ | UUID of the patient; included in the create-goal payload |
| loading | `boolean` | ❌ | Shows a spinner skeleton (default: `false`) |
| readOnly | `boolean` | ❌ | Hides create/achieve/pause/cancel actions (default: `false`) |
| onCreateGoal | `(data) => Promise<void>` | ❌ | Callback to persist a new goal |
| onAchieveGoal | `(goalId: string) => Promise<void>` | ❌ | Callback to mark a goal as achieved |
| onUpdateGoal | `(goalId: string, data: Partial<Goal>) => Promise<void>` | ❌ | Callback to update goal status or fields |

**Used in:** `patients/[id]/page.tsx`

---

## HistoryChart

**Description:** Area chart showing the patient's own mood, anxiety, and energy averages over 7, 30, or 90-day periods, with period-over-period trend comparisons. Renders `null` when there are no entries.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| entries | `JournalEntryData[]` | ✅ | Array of journal/check-in entries to chart |

**Used in:** `patient-home/page.tsx`

---

## InsightsPanel

**Description:** Displays AI-generated clinical insights for a patient. Each insight card shows a title, confidence badge, impact level, and a list of recommendations.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| insights | `Insight[]` | ✅ | Array of AI insight objects to display |
| loading | `boolean` | ❌ | Shows pulsing skeleton cards while loading (default: `false`) |

**Used in:** `patients/[id]/page.tsx`

---

## InvitationDialog

**Description:** Modal dialog for searching a user by their Clarita display ID and sending them a connection invitation with an optional personal message. Validates that a professional invites a patient (and vice versa).

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| isOpen | `boolean` | ✅ | Controls modal visibility |
| onClose | `() => void` | ✅ | Callback to close the dialog |
| onInvitationSent | `() => void` | ✅ | Callback fired after a successful invitation |
| senderRole | `string` | ✅ | Role of the current user; determines label text and pairing validation |

**Used in:** `patients/page.tsx`

---

## JournalEntry

**Description:** Patient daily check-in form with sliders for mood, anxiety, energy, and sleep hours, an optional free-text journal field, and per-medication adherence checkboxes. Calls `onSubmit` with the complete log payload.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| onSubmit | `(data: { mood_score: number; anxiety_score: number; energy_score: number; sleep_hours?: number; journal_entry?: string; medication_logs?: Array<...> }) => Promise<void>` | ✅ | Async callback to persist the check-in |
| saving | `boolean` | ❌ | Disables submit button while saving (default: `false`) |
| medications | `PatientMedication[]` | ❌ | Active medications shown as adherence checkboxes below the sliders |

**Used in:** `patient-home/page.tsx`

---

## JournalHistory

**Description:** List of past patient check-in entries. Each entry shows a mood emoji, date, score badges, and expands to reveal the free-text journal entry. Shows a skeleton while loading.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| entries | `JournalEntryData[]` | ✅ | Chronological array of journal entries |
| loading | `boolean` | ❌ | Renders a skeleton list (default: `false`) |

**Used in:** `patient-home/page.tsx`

---

## MedicalRecordsPanel

**Description:** Private clinical records manager for professionals. Supports creating, editing, deleting, and searching structured records with categories and tags. Marked as private — only the authoring professional can view these records.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ✅ | UUID of the patient whose records are managed |

**Used in:** `patients/[id]/page.tsx`

---

## MedicationCheckCard

**Description:** Standalone card for patients to log daily medication adherence. Fetches active medications and today's logs automatically. Renders `null` if the patient has no active medications.

**Props:** None — fetches its own data via `patientMedicationsApi` and `medicationLogsApi`.

**Used in:** Referenced internally; can be embedded in any patient-facing page. Currently used inside `patient-home/page.tsx` context.

---

## MedicationManager

**Description:** Professional medication management panel. Lists active and discontinued medications with adherence bars, allows prescribing new medications, adjusting dosage/frequency, discontinuing medications, and logging side effects. Psychiatrist-only prescribing is enforced via the `role` prop.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| medications | `Medication[]` | ✅ | Array of current medication records |
| patientId | `string` | ✅ | UUID of the patient |
| role | `'psychiatrist' \| 'psychologist' \| 'therapist'` | ✅ | User role; only `'psychiatrist'` can prescribe new medications |
| readOnly | `boolean` | ❌ | Hides all action buttons (default: `false`) |
| onPrescribe | `(data) => Promise<void>` | ❌ | Callback to create a new prescription |
| onAdjust | `(medicationId, data) => Promise<void>` | ❌ | Callback to update dosage/frequency/notes |
| onDiscontinue | `(medicationId) => Promise<void>` | ❌ | Callback to discontinue a medication |
| onUpdateSideEffects | `(medicationId, sideEffects) => Promise<void>` | ❌ | Callback to persist reported side effects |

**Used in:** `patients/[id]/page.tsx`

---

## MyPrescriptionsPanel

**Description:** Patient-facing read-only panel that lists the patient's active prescriptions, showing medication names, dosages, and prescribing professional. Fetches its own data.

**Props:** None — fetches prescriptions via `prescriptionsApi.getMy()`.

**Used in:** Intended for patient-facing views; currently referenced in the patient portal context.

---

## OnboardingWizard

**Description:** Three-step modal onboarding wizard shown to new users. Guides the user through a welcome screen, an optional invitation step (enter a professional or patient display ID), and a completion step. Calls the onboarding-complete API when finished.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| userName | `string` | ✅ | First name of the user, shown in the welcome message |
| onComplete | `() => void` | ✅ | Callback fired after the user completes or dismisses the wizard |
| token | `string` | ✅ | Bearer token used to make API calls from within the wizard |
| apiUrl | `string` | ✅ | Base API URL used for invitation and completion API calls |

**Used in:** `patients/page.tsx`

---

## PatientCircle

**Description:** Compact patient avatar button for the Sidebar patient list. Shows initials in a circle with a mood-coloured ring (green/yellow/red based on latest mood score). Adapts to collapsed sidebar mode.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patient | `{ id: string; first_name: string; last_name: string; avatar_url?: string \| null; mood_score?: number \| null }` | ✅ | Patient data to render |
| isActive | `boolean` | ✅ | Highlights the circle when this patient's page is open |
| collapsed | `boolean` | ✅ | Sidebar collapsed state; removes the name label and enlarges the avatar |
| onClick | `() => void` | ✅ | Callback invoked when the circle is clicked |

**Used in:** `Sidebar.tsx`

---

## PatientExamsPanel

**Description:** Professional-facing panel that lists a patient's uploaded exams with download links. Shows file type, exam type badge, date, and file size. The `readOnly` prop can disable future actions.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ✅ | UUID of the patient whose exams are fetched |
| readOnly | `boolean` | ❌ | Reserved for future action controls (default: `false`) |

**Used in:** `patients/[id]/page.tsx`

---

## PatientGoalsPanel

**Description:** Patient-facing goals panel with tab views for pending, active, and rejected goals. Patients can accept or reject pending goals (with an optional rejection reason) and view goal details.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| goals | `Goal[]` | ✅ | Array of goals assigned to the patient |
| loading | `boolean` | ✅ | Shows a spinner while goals are loading |
| onRespond | `(goalId: string, action: 'accept' \| 'reject', reason?: string) => Promise<void>` | ✅ | Callback to accept or reject a pending goal |

**Used in:** `patient-home/page.tsx`

---

## PatientList

**Description:** Sortable, searchable list of a professional's active patients. Each card shows the patient's latest mood score, mood trend sparkline, last check-in time, and active alert count. Links to the patient detail page.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patients | `Patient[]` | ✅ | Array of patient summary objects to display |

**Used in:** `patients/page.tsx`

---

## PendingInvitations

**Description:** Displays received and sent connection invitations. Received invitations can be accepted or rejected inline. Sent invitations are shown in a collapsible section with cancel support.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| received | `Invitation[]` | ✅ | Invitations received by the current user |
| sent | `Invitation[]` | ✅ | Invitations sent by the current user |
| onUpdate | `() => void` | ✅ | Callback to refresh invitation data after an action |
| currentUserId | `string` | ✅ | UUID of the current user (used contextually) |

**Used in:** `patients/page.tsx`

---

## PrescriptionPanel

**Description:** Prescription management panel for psychiatrists. Lists existing prescriptions for a patient and provides a form to create new prescriptions with multiple medication entries (name, dosage, frequency, duration, instructions). Non-psychiatrists see a read-only view.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ✅ | UUID of the patient whose prescriptions are managed |
| role | `string` | ✅ | User role; only `'psychiatrist'` sees the create form |

**Used in:** `patients/[id]/page.tsx` (used internally inside other professional panels)

---

## ProfessionalTabs

**Description:** Patient-facing panel showing all linked professionals with per-professional data sharing permission controls. Also hosts the `InvitationDialog`, `PendingInvitations`, and the patient's own display ID badge.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| professionals | `ProfessionalInfo[]` | ✅ | List of linked professional objects |
| patientId | `string` | ✅ | UUID of the current patient |
| onPermissionChange | `(professionalId: string, permissions: Array<{ permission_type: string; granted: boolean }>) => Promise<void>` | ✅ | Callback to update data sharing permissions |
| pendingInvitations | `Invitation[]` | ❌ | Invitations received by the patient |
| sentInvitations | `Invitation[]` | ❌ | Invitations sent by the patient |
| onInvitationsUpdate | `() => void` | ❌ | Callback to refresh invitation lists |
| currentUserId | `string` | ❌ | UUID of the current user, passed to `PendingInvitations` |

**Used in:** `patient-home/page.tsx`

---

## PsychTestPanel

**Description:** Psychological test workflow component. For professionals: browse the test catalog, filter by assessment category (clinical/psychological), and assign tests to a patient. For patients: list pending test sessions, take tests question by question, and view completed results.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ❌ | UUID of the patient; required for assigning tests in professional view |
| role | `string` | ✅ | User role — `'patient'` renders the take-test UI, any other value renders professional UI |
| assessmentFilter | `'clinical' \| 'psychological'` | ❌ | Restricts the visible test catalog to categories relevant to the professional's role |

**Used in:** `patient-home/page.tsx`, `patients/[id]/page.tsx`

---

## RecordSharingPanel

**Description:** Allows a patient to generate time-limited shareable access tokens for their clinical records (e.g., to show to a new provider). Lists active tokens, lets the patient copy the token URL, and can also accept a token from another patient to view their shared records.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ✅ | UUID of the current patient (used when generating tokens) |

**Used in:** `patients/[id]/page.tsx`

---

## ServiceWorkerRegistration

**Description:** Invisible utility component that registers the PWA service worker (`/sw.js`) once on mount using the browser's Service Worker API. Renders nothing.

**Props:** None.

**Used in:** `layout.tsx`

---

## SharingControls

**Description:** Per-professional data sharing permission editor. Displays grouped permission toggles (daily wellness, clinical data, goals, notes, prescriptions, exams, assessments) and saves changes via the provided callback.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| professional | `ProfessionalInfo` | ✅ | The professional whose access permissions are being configured |
| patientId | `string` | ✅ | UUID of the patient |
| onPermissionChange | `(professionalId: string, permissions: Array<{ permission_type: string; granted: boolean }>) => Promise<void>` | ✅ | Callback invoked when the patient toggles a permission |

**Used in:** `ProfessionalTabs.tsx`

---

## SideNav

**Description:** Desktop-only left-side navigation for the patient portal. Shows the Clarita logo, user name, all patient section nav items with optional badge counts, and a logout button.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| user | `AuthUser \| null` | ✅ | Authenticated user object; `first_name` is shown in the header |
| active | `PatientSection` | ✅ | Key of the currently active section |
| onChange | `(section: PatientSection) => void` | ✅ | Callback invoked when a nav item is clicked |
| badges | `Partial<Record<PatientSection, number>>` | ❌ | Badge counts per section (default: `{}`) |
| onLogout | `() => void` | ✅ | Callback invoked when the logout button is clicked |

**Used in:** `patient-home/page.tsx`

---

## Sidebar

**Description:** Professional-facing collapsible sidebar. Shows the Clarita logo, active patient list as avatar circles (fetched from the API), navigation links (Patients, Alerts, Chat, Profile), and a logout button. Automatically fetches unread message count.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| alertCount | `number` | ❌ | Badge count shown on the Alerts nav item (default: `0`) |

**Used in:** `patients/page.tsx`, `patients/[id]/page.tsx`, `alerts/page.tsx`, `chat/page.tsx`, `profile/page.tsx`

---

## Timeline

**Description:** Scatter-chart timeline of a patient's clinical events (check-ins, medication starts, assessments, goal achievements, alerts) plotted across configurable 7/30/90-day windows. Clicking a point opens a detail popover.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| entries | `TimelineEntry[]` | ✅ | Array of timeline event objects to plot |
| loading | `boolean` | ❌ | Shows a skeleton while loading (default: `false`) |

**Used in:** `patients/[id]/page.tsx`

---

## UnifiedAssessmentsPanel

**Description:** Unified assessments tab for the professional patient view. Combines the legacy PHQ-9/GAD-7 assessment history chart with the modern `PsychTestPanel` (assign/view test sessions). Groups all assessment activity — including personality tests (Enneagram, 16 Personalities) — in one panel.

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| patientId | `string` | ✅ | UUID of the patient |
| assessments | `Assessment[]` | ✅ | Legacy PHQ-9/GAD-7 assessment records passed to `AssessmentHistory` |

**Used in:** `patients/[id]/page.tsx`

---

## nav-items.ts

**Description:** Not a component — this is a TypeScript module that exports the `PatientSection` union type and the `NAV_ITEMS` array used by both `BottomNav` and `SideNav` to render the patient portal navigation.

**Exports:**
| Export | Type | Description |
|---|---|---|
| `PatientSection` | `type` | Union of section keys: `'home' \| 'exams' \| 'tests' \| 'anamnesis' \| 'goals' \| 'history'` |
| `NAV_ITEMS` | `Array<{ key, label, icon, color, activeColor, activeBg }>` | Navigation item definitions consumed by `BottomNav` and `SideNav` |

**Used in:** `BottomNav.tsx`, `SideNav.tsx`, `patient-home/page.tsx`
