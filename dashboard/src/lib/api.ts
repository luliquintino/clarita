// ============================================================================
// CLARITA API Client
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clarita_token');
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('clarita_token', token);
  }
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clarita_token');
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUserRoleFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; add 10s buffer
    return payload.exp ? payload.exp * 1000 < Date.now() - 10000 : false;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Typed fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = 'An error occurred';
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || errorBody.message || errorBody.error || detail;
    } catch {
      detail = response.statusText;
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Professional {
  id: string;
  email: string;
  full_name: string;
  role: 'psychiatrist' | 'psychologist' | 'therapist';
  license_number: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'psychologist' | 'psychiatrist';
  first_name: string;
  last_name: string;
  phone?: string;
  display_id: string;
  created_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

/** @deprecated Use AuthResponse instead */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  professional: Professional;
}

export interface PatientSuspicion {
  label: string;
  added_by: 'psychiatrist' | 'psychologist';
}

export interface Patient {
  id: string;
  full_name: string;
  age: number;
  date_of_birth: string;
  gender: string;
  email: string;
  phone: string;
  emergency_contact: string;
  diagnosis: string[];
  status: 'active' | 'inactive' | 'discharged';
  last_check_in: string | null;
  mood_trend: number[];
  active_alerts: number;
  mental_clarity_score: number | null;
  assigned_professional_id: string;
  created_at: string;
  // Role-based conditions
  self_reported_conditions?: string[];
  suspicions?: PatientSuspicion[];
}

export interface EmotionalLog {
  id: string;
  patient_id: string;
  timestamp: string;
  mood: number;
  anxiety: number;
  energy: number;
  sleep_quality: number;
  notes: string;
}

export interface TimelineEntry {
  id: string;
  patient_id: string;
  type:
    | 'emotional_log'
    | 'life_event'
    | 'medication_change'
    | 'symptom'
    | 'symptom_report'
    | 'assessment';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface Assessment {
  id: string;
  patient_id: string;
  type: 'PHQ-9' | 'GAD-7';
  score: number;
  severity: string;
  answers: Record<string, number>;
  administered_by: string;
  timestamp: string;
}

export interface ClinicalNote {
  id: string;
  patient_id: string;
  professional_id: string;
  professional_name: string;
  type: 'session' | 'observation' | 'treatment_plan' | 'progress';
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribed_by: string;
  prescribed_date: string;
  status: 'active' | 'discontinued' | 'adjusted';
  adherence_rate: number;
  side_effects: string[];
  notes: string;
}

export interface PatientMedication {
  id: string;
  patient_id: string;
  medication_id: string;
  prescribed_by: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: 'active' | 'discontinued' | 'adjusted';
  medication_name: string;
  medication_category: string | null;
  prescriber_first_name: string | null;
  prescriber_last_name: string | null;
}

export interface MedicationLog {
  id: string;
  patient_medication_id: string;
  taken_at: string;
  skipped: boolean;
  skip_reason: string | null;
  notes: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  patient_name: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

export interface Insight {
  id: string;
  patient_id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
  generated_at: string;
}

export interface DigitalTwinVariableState {
  current: number;
  avg_7d: number;
  avg_30d: number;
  trend: 'improving' | 'worsening' | 'stable';
  slope_7d: number;
}

export interface DigitalTwinCorrelation {
  variable_a: string;
  variable_b: string;
  pearson_r: number;
  p_value: number;
  direction: 'positive' | 'negative';
  strength: 'strong' | 'moderate' | 'mild';
  label_pt: string;
}

export interface DigitalTwinPrediction {
  variable: string;
  prediction: 'increase' | 'decrease' | 'stable';
  risk_level: 'low' | 'moderate' | 'high';
  horizon_days: number;
  confidence: number;
  reasoning: string;
  based_on: string[];
}

export interface TreatmentResponse {
  intervention_type: 'medication_change' | 'therapy_sessions';
  intervention_name: string;
  intervention_date: string;
  metrics_before: Record<string, number>;
  metrics_after: Record<string, number>;
  change_pct: Record<string, number>;
  evaluation_window_days: number;
  status: 'positive_response' | 'negative_response' | 'neutral' | 'pending';
}

export interface DigitalTwin {
  id: string;
  patient_id: string;
  current_state: Record<string, DigitalTwinVariableState>;
  correlations: DigitalTwinCorrelation[];
  baseline: Record<
    string,
    { mean: number; std: number; established_at: string; data_points: number }
  >;
  predictions: DigitalTwinPrediction[];
  treatment_responses: TreatmentResponse[];
  data_points_used: number;
  model_version: string;
  confidence_overall: number;
  computed_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface PatientsListResponse {
  patients: PatientListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface PatientListItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  display_id: string;
  created_at: string;
  date_of_birth: string | null;
  gender: string | null;
  onboarding_completed: boolean;
  relationship_status: string;
  relationship_type: string;
  started_at: string;
  last_check_in: string | null;
  last_mood_score: number | null;
  last_anxiety_score: number | null;
  mood_trend: number[] | null;
  active_alerts: number;
}

// ---------------------------------------------------------------------------
// Onboarding Types
// ---------------------------------------------------------------------------

export interface OnboardingAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

export interface OnboardingPersonal {
  cpf: string;
  rg: string;
  address: OnboardingAddress;
}

export interface OnboardingPhysical {
  weight_kg: string;
  height_cm: string;
}

export interface OnboardingGynecological {
  last_menstruation_date: string;
  pregnancy_history: string;
  abortion_history: string;
}

export interface OnboardingMedical {
  current_symptoms: string;
  allergies: string;
  chronic_conditions: string;
  blood_type?: string;
}

export interface OnboardingData {
  personal: OnboardingPersonal;
  physical: OnboardingPhysical;
  gynecological: OnboardingGynecological;
  medical: OnboardingMedical;
  family_history: string;
  current_treatments: string;
}

export interface OnboardingProfile {
  onboarding_completed: boolean;
  onboarding_data: Partial<OnboardingData>;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  phone: string | null;
}

// ---------------------------------------------------------------------------
// Document Types
// ---------------------------------------------------------------------------

export interface PatientDocument {
  id: string;
  patient_id: string;
  file_name: string;
  original_name: string;
  file_type: 'pdf' | 'jpeg' | 'png';
  file_size: number;
  document_type: string | null;
  document_date: string | null;
  notes: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface DocumentAccess {
  id: string;
  document_id: string;
  professional_id: string;
  granted_at: string;
  first_name: string;
  last_name: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Exam Types
// ---------------------------------------------------------------------------

export interface Exam {
  id: string;
  patient_id: string;
  exam_type: string;
  exam_date: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  permissions?: ExamPermission[];
}

export interface ExamPermission {
  professional_id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

interface BaseRegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  consent: boolean;
}

export interface ProfessionalRegisterData extends BaseRegisterData {
  role: 'psychologist' | 'psychiatrist';
  license_number: string;
  specialization?: string;
  institution?: string;
}

export interface PatientRegisterData extends BaseRegisterData {
  role: 'patient';
  date_of_birth?: string;
  gender?: string;
}

export type RegisterData = ProfessionalRegisterData | PatientRegisterData;

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: RegisterData) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: AuthUser; profile?: { onboarding_completed?: boolean; [key: string]: unknown } | null }>('/auth/me'),

  updateMe: (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    specialization?: string;
    institution?: string;
    license_number?: string;
    bio?: string;
    years_of_experience?: number;
  }) =>
    request<{ user: AuthUser }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  logout: () => {
    removeToken();
  },

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// ---------------------------------------------------------------------------
// Patients API
// ---------------------------------------------------------------------------

export const patientsApi = {
  list: (params?: { search?: string; status?: string; page?: number; per_page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<PatientsListResponse>(`/patients${query ? `?${query}` : ''}`);
  },

  get: (id: string) => request<Patient>(`/patients/${id}`),

  updateCondition: (patientId: string, action: 'add' | 'remove', value: string) =>
    request<{ self_reported_conditions?: string[]; psychiatrist_suspicions?: string[]; psychologist_suspicions?: string[] }>(
      `/patients/${patientId}/conditions`,
      { method: 'PATCH', body: JSON.stringify({ action, value }) }
    ),

  getEmotionalLogs: (id: string, days?: number) => {
    const query = days ? `?days=${days}` : '';
    return request<EmotionalLog[]>(`/emotional-logs/${id}${query}`);
  },

  getTimeline: (id: string, params?: { type?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', String(params.page));
    const query = searchParams.toString();
    return request<PaginatedResponse<TimelineEntry>>(
      `/patients/${id}/timeline${query ? `?${query}` : ''}`
    );
  },

  getAssessments: (id: string, type?: 'PHQ-9' | 'GAD-7') => {
    const query = type ? `?type=${type}` : '';
    return request<Assessment[]>(`/assessment-results/${id}${query}`);
  },

  getInsights: (id: string) => request<Insight[]>(`/insights/${id}`),
};

// ---------------------------------------------------------------------------
// Clinical Notes API
// ---------------------------------------------------------------------------

export const notesApi = {
  list: (patientId: string) => request<ClinicalNote[]>(`/clinical-notes/${patientId}`),

  create: (patientId: string, data: { type: string; title: string; content: string }) =>
    request<ClinicalNote>(`/clinical-notes`, {
      method: 'POST',
      body: JSON.stringify({ ...data, patient_id: patientId }),
    }),

  update: (
    patientId: string,
    noteId: string,
    data: { title?: string; content?: string; type?: string }
  ) =>
    request<ClinicalNote>(`/clinical-notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (patientId: string, noteId: string) =>
    request<void>(`/clinical-notes/${noteId}`, {
      method: 'DELETE',
    }),
};

// ---------------------------------------------------------------------------
// Medications API
// ---------------------------------------------------------------------------

export const medicationsApi = {
  list: (patientId: string) =>
    request<Medication[]>(`/patient-medications?patient_id=${patientId}`),

  prescribe: (
    patientId: string,
    data: {
      name: string;
      dosage: string;
      frequency: string;
      notes?: string;
    }
  ) =>
    request<Medication>(`/patients/${patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adjust: (
    patientId: string,
    medicationId: string,
    data: {
      dosage?: string;
      frequency?: string;
      notes?: string;
    }
  ) =>
    request<Medication>(`/patients/${patientId}/medications/${medicationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  discontinue: (patientId: string, medicationId: string) =>
    request<Medication>(`/patients/${patientId}/medications/${medicationId}/discontinue`, {
      method: 'POST',
    }),
};

// ---------------------------------------------------------------------------
// Patient Medications API (for the patient themselves)
// ---------------------------------------------------------------------------

export const patientMedicationsApi = {
  /** List the current patient's own medications. Role=patient reads from JWT. */
  listMine: (status?: 'active' | 'discontinued' | 'adjusted') => {
    const params = status ? `?status=${status}` : '';
    return request<{ patient_medications: PatientMedication[] }>(`/patient-medications${params}`);
  },
};

// ---------------------------------------------------------------------------
// Medication Logs API
// ---------------------------------------------------------------------------

export const medicationLogsApi = {
  /** Log a medication as taken or skipped for the current patient. */
  log: (patientMedicationId: string, skipped: boolean, skipReason?: string) =>
    request<{ medication_log: MedicationLog }>('/medication-logs', {
      method: 'POST',
      body: JSON.stringify({
        patient_medication_id: patientMedicationId,
        skipped,
        skip_reason: skipReason,
      }),
    }),

  /** Get today's medication logs for the current patient. */
  getToday: () => {
    const today = new Date().toISOString().split('T')[0]; // e.g., "YYYY-MM-DD"
    return request<{ medication_logs: MedicationLog[]; summary: { total: number; taken: number; skipped: number; adherence_rate: number | null } }>(
      `/medication-logs?start_date=${today}T00:00:00&end_date=${today}T23:59:59`
    );
  },
};

// ---------------------------------------------------------------------------
// Alerts API
// ---------------------------------------------------------------------------

export const alertsApi = {
  list: (params?: { status?: string; severity?: string; patient_id?: string }) => {
    // If patient_id provided, use the patient-specific endpoint
    if (params?.patient_id) {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.severity) searchParams.set('severity', params.severity);
      const query = searchParams.toString();
      return request<Alert[]>(`/alerts/${params.patient_id}${query ? `?${query}` : ''}`);
    }
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.severity) searchParams.set('severity', params.severity);
    const query = searchParams.toString();
    return request<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
  },

  acknowledge: (alertId: string) =>
    request<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
    }),

  resolve: (alertId: string) =>
    request<Alert>(`/alerts/${alertId}/resolve`, {
      method: 'PUT',
    }),
};

// ---------------------------------------------------------------------------
// Digital Twin API
// ---------------------------------------------------------------------------

export const digitalTwinApi = {
  get: (patientId: string) => request<DigitalTwin>(`/digital-twin/${patientId}`),

  getHistory: (patientId: string, days?: number) => {
    const query = days ? `?days=${days}` : '';
    return request<{ history: DigitalTwin[] }>(`/digital-twin/${patientId}/history${query}`);
  },

  getPredictions: (patientId: string) =>
    request<{ predictions: DigitalTwinPrediction[]; computed_at: string }>(
      `/digital-twin/${patientId}/predictions`
    ),

  refresh: (patientId: string) =>
    request<{ status: string; message: string }>(`/digital-twin/${patientId}/refresh`, {
      method: 'POST',
    }),
};

// ---------------------------------------------------------------------------
// Journal API (Patient Portal)
// ---------------------------------------------------------------------------

export interface JournalEntryData {
  id: string;
  patient_id: string;
  mood_score: number;
  anxiety_score: number;
  energy_score: number;
  sleep_quality: string | null;
  sleep_hours: number | null;
  notes: string | null;
  journal_entry: string | null;
  logged_at: string;
  created_at: string;
}

export interface ProfessionalInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  display_id: string;
  specialization: string | null;
  institution: string | null;
  license_number: string | null;
  relationship_type: string;
  started_at: string;
  permissions: Array<{
    id: string;
    permission_type: string;
    granted: boolean;
  }>;
}

export const journalApi = {
  create: (data: {
    mood_score: number;
    anxiety_score: number;
    energy_score: number;
    sleep_hours?: number;
    journal_entry?: string;
  }) =>
    request<{ journal: JournalEntryData }>('/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{
      journals: JournalEntryData[];
      pagination: { page: number; limit: number; total: number };
    }>(`/journal${query ? `?${query}` : ''}`);
  },

  getForPatient: (patientId: string) =>
    request<{ journals: JournalEntryData[] }>(`/journal/${patientId}`),
};

export const patientProfileApi = {
  getMyProfessionals: () =>
    request<{ professionals: ProfessionalInfo[] }>('/patients/my-professionals'),

  updatePermissions: (
    patientId: string,
    professionalId: string,
    permissions: Array<{ permission_type: string; granted: boolean }>
  ) =>
    request<{ permissions: Array<{ id: string; permission_type: string; granted: boolean }> }>(
      `/patients/${patientId}/permissions`,
      {
        method: 'PUT',
        body: JSON.stringify({ professional_id: professionalId, permissions }),
      }
    ),

  revokeAccess: (professionalId: string) =>
    request<{ relationship: unknown; message: string }>('/patients/revoke-access', {
      method: 'PUT',
      body: JSON.stringify({ professional_id: professionalId }),
    }),
};

// ---------------------------------------------------------------------------
// Goals & Milestones
// ---------------------------------------------------------------------------

export interface Goal {
  id: string;
  patient_id: string;
  created_by: string;
  created_by_first_name: string;
  created_by_last_name: string;
  title: string;
  description: string | null;
  status: 'in_progress' | 'achieved' | 'paused' | 'cancelled';
  patient_status: 'pending' | 'accepted' | 'rejected';
  rejection_reason: string | null;
  responded_at: string | null;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  patient_id: string;
  goal_id: string | null;
  goal_title: string | null;
  title: string;
  description: string | null;
  milestone_type: 'positive' | 'difficult';
  event_date: string;
  created_by: string;
  created_by_first_name: string;
  created_by_last_name: string;
  created_at: string;
}

export const goalsApi = {
  create: (data: {
    patient_id: string;
    title: string;
    description?: string;
    target_date?: string;
  }) =>
    request<{ goal: Goal }>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (patientId: string) => request<{ goals: Goal[] }>(`/goals/${patientId}`),

  update: (
    goalId: string,
    data: Partial<Pick<Goal, 'title' | 'description' | 'status' | 'target_date'>>
  ) =>
    request<{ goal: Goal }>(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  achieve: (goalId: string) =>
    request<{ goal: Goal }>(`/goals/${goalId}/achieve`, {
      method: 'PUT',
    }),

  respond: (goalId: string, action: 'accept' | 'reject', rejectionReason?: string) =>
    request<{ goal: Goal }>(`/goals/${goalId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({
        action,
        rejection_reason: rejectionReason,
      }),
    }),
};

export const milestonesApi = {
  create: (data: {
    patient_id: string;
    title: string;
    description?: string;
    milestone_type: 'positive' | 'difficult';
    event_date: string;
    goal_id?: string;
  }) =>
    request<{ milestone: Milestone }>('/goals/milestones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (patientId: string) =>
    request<{ milestones: Milestone[] }>(`/goals/milestones/${patientId}`),
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  patient_id: string | null;
  patient_first_name: string | null;
  patient_last_name: string | null;
  other_user_id: string;
  other_first_name: string;
  other_last_name: string;
  other_role: string;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_first_name: string;
  sender_last_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
  attachment_id?: string | null;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_file_size?: number | null;
}

export const chatApi = {
  listConversations: () => request<{ conversations: Conversation[] }>('/chat/conversations'),

  createConversation: (otherUserId: string, patientId?: string) =>
    request<{ conversation: { id: string; existing: boolean } }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ other_user_id: otherUserId, ...(patientId ? { patient_id: patientId } : {}) }),
    }),

  searchProfessionals: (q: string) =>
    request<{ professionals: Array<{ id: string; display_id: string; first_name: string; last_name: string; role: string; avatar_url: string | null; specialization: string | null; institution: string | null }> }>(`/users/search-professionals?q=${encodeURIComponent(q)}`),

  getMessages: (conversationId: string, page?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    const query = params.toString();
    return request<{
      messages: ChatMessage[];
      pagination: { page: number; limit: number; total: number };
    }>(`/chat/conversations/${conversationId}/messages${query ? `?${query}` : ''}`);
  },

  sendMessage: (conversationId: string, content: string) =>
    request<{ message: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  markAsRead: (conversationId: string) =>
    request<{ success: boolean }>(`/chat/conversations/${conversationId}/read`, {
      method: 'PUT',
    }),

  getUnreadCount: () => request<{ unread_count: number }>('/chat/unread-count'),

  sendFile: (conversationId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestFormData<{ message: ChatMessage; attachment: ChatAttachment }>(
      `/chat/conversations/${conversationId}/messages/file`,
      formData
    );
  },

  getAttachmentUrl: (attachmentId: string) => {
    const token = getToken();
    return `${BASE_URL}/chat/attachments/${attachmentId}/file?token=${token}`;
  },
};

// ---------------------------------------------------------------------------
// AI Summaries
// ---------------------------------------------------------------------------

export interface PatientSummary {
  id: string;
  patient_id: string;
  summary_text: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  data?: {
    log_count: number;
    avg_mood: number;
    avg_anxiety: number;
    avg_energy: number;
    avg_sleep: number | null;
    mood_trend: string;
    journal_count: number;
  };
}

export interface ProfessionalBrief {
  emotional: {
    avg_mood: number;
    avg_anxiety: number;
    avg_energy: number;
    avg_sleep: number;
    log_count: number;
    min_mood: number;
    max_mood: number;
  };
  medications: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    status: string;
  }>;
  alerts: Array<{
    id: string;
    alert_type: string;
    title: string;
    severity: string;
    created_at: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    target_date: string | null;
  }>;
  generated_at: string;
}

export const summariesApi = {
  generate: (patientId: string, periodDays?: number) =>
    request<{ summary: PatientSummary }>(`/summaries/${patientId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ period_days: periodDays || 7 }),
    }),

  list: (patientId: string) => request<{ summaries: PatientSummary[] }>(`/summaries/${patientId}`),

  getBrief: (patientId: string) =>
    request<{ brief: ProfessionalBrief }>(`/summaries/${patientId}/brief`),
};

// ---------------------------------------------------------------------------
// FormData fetch wrapper (for file uploads — no Content-Type header)
// ---------------------------------------------------------------------------

async function requestFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let detail = 'An error occurred';
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || errorBody.message || errorBody.error || detail;
    } catch {
      detail = response.statusText;
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Onboarding API
// ---------------------------------------------------------------------------

export const onboardingApi = {
  get: () => request<{ profile: OnboardingProfile }>('/onboarding'),

  submit: (data: {
    personal?: OnboardingPersonal;
    physical?: OnboardingPhysical;
    gynecological?: OnboardingGynecological;
    medical?: OnboardingMedical;
    family_history?: string;
    current_treatments?: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    full_name?: string;
    email?: string;
  }) =>
    request<{ profile: OnboardingProfile }>('/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ---------------------------------------------------------------------------
// Documents API
// ---------------------------------------------------------------------------

export const documentsApi = {
  upload: (
    file: File,
    metadata?: {
      document_type?: string;
      document_date?: string;
      notes?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.document_type) formData.append('document_type', metadata.document_type);
    if (metadata?.document_date) formData.append('document_date', metadata.document_date);
    if (metadata?.notes) formData.append('notes', metadata.notes);
    return requestFormData<{ document: PatientDocument }>('/documents', formData);
  },

  list: () => request<{ documents: PatientDocument[] }>('/documents'),

  delete: (documentId: string) =>
    request<void>(`/documents/${documentId}`, {
      method: 'DELETE',
    }),

  getFileUrl: (documentId: string) => {
    const token = getToken();
    return `${BASE_URL}/documents/${documentId}/file?token=${token}`;
  },

  getAccess: (documentId: string) =>
    request<{ access: DocumentAccess[] }>(`/documents/${documentId}/access`),

  updateAccess: (documentId: string, professionalId: string, granted: boolean) =>
    request<{ access: DocumentAccess[] }>(`/documents/${documentId}/access`, {
      method: 'PUT',
      body: JSON.stringify({ professional_id: professionalId, granted }),
    }),

  listForProfessional: (patientId: string) =>
    request<{ documents: PatientDocument[] }>(`/documents/patient/${patientId}`),
};

// ---------------------------------------------------------------------------
// Exams API
// ---------------------------------------------------------------------------

export const examsApi = {
  upload: (formData: FormData) => requestFormData<{ exam: Exam }>('/exams', formData),

  getMyExams: () => request<{ exams: Exam[] }>('/exams/my-exams'),

  getPatientExams: (patientId: string) => request<{ exams: Exam[] }>(`/exams/patient/${patientId}`),

  download: async (examId: string) => {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/exams/download/${examId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new ApiError(response.status, 'Erro ao baixar exame.');
    }
    return response.blob();
  },

  delete: (examId: string) => request<void>(`/exams/${examId}`, { method: 'DELETE' }),

  updatePermissions: (examId: string, professionalIds: string[]) =>
    request<{ permissions: ExamPermission[] }>(`/exams/${examId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ professional_ids: professionalIds }),
    }),
};

// ---------------------------------------------------------------------------
// Invitation Types
// ---------------------------------------------------------------------------

export interface Invitation {
  id: string;
  patient_id: string;
  professional_id: string;
  relationship_type: string;
  status: 'pending' | 'active' | 'inactive';
  invited_by: string;
  invitation_message: string | null;
  created_at: string;
  responded_at: string | null;
  other_first_name: string;
  other_last_name: string;
  other_role: string;
  other_display_id: string;
  other_avatar_url: string | null;
  specialization?: string | null;
  institution?: string | null;
}

export interface UserSearchResult {
  id: string;
  display_id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
  specialization?: string | null;
  institution?: string | null;
}

// ---------------------------------------------------------------------------
// Invitations API
// ---------------------------------------------------------------------------

export const invitationsApi = {
  send: (display_id: string, message?: string) =>
    request<{ invitation: Invitation; reactivation: boolean }>('/invitations', {
      method: 'POST',
      body: JSON.stringify({ display_id, message }),
    }),

  listPending: () => request<{ invitations: Invitation[] }>('/invitations/pending'),

  listSent: () => request<{ invitations: Invitation[] }>('/invitations/sent'),

  respond: (id: string, action: 'accept' | 'reject') =>
    request<{ relationship: Invitation }>(`/invitations/${id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    }),

  cancel: (id: string) =>
    request<void>(`/invitations/${id}`, {
      method: 'DELETE',
    }),
};

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------

export const usersApi = {
  search: (display_id: string) =>
    request<{ user: UserSearchResult }>(
      `/users/search?display_id=${encodeURIComponent(display_id)}`
    ),
};

// ---------------------------------------------------------------------------
// Chat Attachment Types
// ---------------------------------------------------------------------------

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Anamnesis API
// ---------------------------------------------------------------------------

export interface AnamnesisTemplate {
  id: string;
  professional_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  questions?: AnamnesisQuestion[];
}

export interface AnamnesisQuestion {
  id: string;
  template_id: string;
  question_text: string;
  question_type: 'text' | 'scale' | 'multiple_choice' | 'yes_no' | 'date';
  options: unknown;
  display_order: number;
  is_required: boolean;
}

export interface AnamnesisResponse {
  id: string;
  template_id: string;
  patient_id: string;
  professional_id: string;
  answers: Record<string, unknown> | null;
  status: 'pending' | 'in_progress' | 'completed';
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
  template_title?: string;
  professional_first_name?: string;
  professional_last_name?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

export const anamnesisApi = {
  getTemplates: () =>
    request<{ templates: AnamnesisTemplate[] }>('/anamnesis/templates'),

  getTemplate: (id: string) =>
    request<{ template: AnamnesisTemplate }>(`/anamnesis/templates/${id}`),

  createTemplate: (data: { title: string; description?: string; questions: Array<{ question_text: string; question_type: string; options?: unknown; display_order: number; is_required?: boolean }> }) =>
    request<{ template: AnamnesisTemplate }>('/anamnesis/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTemplate: (id: string, data: Partial<{ title: string; description: string; is_active: boolean }>) =>
    request<{ template: AnamnesisTemplate }>(`/anamnesis/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  sendToPatient: (data: { template_id: string; patient_id: string; deadline?: string }) =>
    request<{ response: AnamnesisResponse }>('/anamnesis/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPending: () =>
    request<{ responses: AnamnesisResponse[] }>('/anamnesis/pending'),

  getResponse: (id: string) =>
    request<{ response: AnamnesisResponse }>(`/anamnesis/responses/${id}`),

  submitResponse: (id: string, answers: Record<string, unknown>) =>
    request<{ response: AnamnesisResponse }>(`/anamnesis/responses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ answers, status: 'completed' }),
    }),

  getPatientResponses: (patientId: string) =>
    request<{ responses: AnamnesisResponse[] }>(`/anamnesis/patient/${patientId}`),
};

// ---------------------------------------------------------------------------
// Medical Records API
// ---------------------------------------------------------------------------

export interface MedicalRecord {
  id: string;
  professional_id: string;
  patient_id: string;
  title: string;
  content: string;
  record_date: string;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export const medicalRecordsApi = {
  create: (data: { patient_id: string; title: string; content: string; record_date: string; category?: string; tags?: string[] }) =>
    request<{ record: MedicalRecord }>('/medical-records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (patientId: string) =>
    request<{ records: MedicalRecord[] }>(`/medical-records/${patientId}`),

  get: (id: string) =>
    request<{ record: MedicalRecord }>(`/medical-records/detail/${id}`),

  update: (id: string, data: Partial<{ title: string; content: string; record_date: string; category: string; tags: string[] }>) =>
    request<{ record: MedicalRecord }>(`/medical-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/medical-records/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Record Sharing API
// ---------------------------------------------------------------------------

export interface RecordAccessToken {
  id: string;
  granting_professional_id: string;
  patient_id: string;
  token: string;
  expires_at: string;
  is_revoked: boolean;
  accessed_by_professional_id: string | null;
  accessed_at: string | null;
  created_at: string;
}

export interface SharedMedicalRecord {
  id: string;
  access_token_id: string;
  receiving_professional_id: string;
  summary_content: string | null;
  original_records_count: number;
  shared_at: string;
  saved_at: string | null;
}

export const recordSharingApi = {
  generateToken: (patientId: string) =>
    request<{ token: RecordAccessToken }>('/record-sharing/generate-token', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId }),
    }),

  verifyToken: (token: string) =>
    request<{ valid: boolean; token_info: RecordAccessToken }>(`/record-sharing/verify/${token}`),

  accessRecords: (token: string) =>
    request<{ records: MedicalRecord[]; shared_record: SharedMedicalRecord }>(`/record-sharing/access/${token}`, {
      method: 'POST',
    }),

  getMyShares: () =>
    request<{ shares: Array<RecordAccessToken & { records_count?: number }> }>('/record-sharing/my-shares'),

  saveSummary: (data: { access_token_id: string; summary: string }) =>
    request<{ shared_record: SharedMedicalRecord }>('/record-sharing/save-summary', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  revokeToken: (tokenId: string) =>
    request<void>(`/record-sharing/revoke/${tokenId}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Prescriptions API
// ---------------------------------------------------------------------------

export interface Prescription {
  id: string;
  professional_id: string;
  patient_id: string;
  memed_prescription_id: string | null;
  pdf_url: string | null;
  medications_data: Array<{ name: string; dosage: string; frequency: string; duration?: string; instructions?: string }>;
  status: string;
  created_at: string;
  professional_first_name?: string;
  professional_last_name?: string;
}

export const prescriptionsApi = {
  create: (data: { patient_id: string; medications: Array<{ name: string; dosage: string; frequency: string; duration?: string; instructions?: string }> }) =>
    request<{ prescription: Prescription }>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (patientId: string) =>
    request<{ prescriptions: Prescription[]; pagination: { page: number; limit: number; total: number } }>(`/prescriptions/${patientId}`),

  get: (id: string) =>
    request<{ prescription: Prescription }>(`/prescriptions/detail/${id}`),

  getMy: (page = 1, limit = 20) =>
    request<{ prescriptions: Prescription[]; pagination: { page: number; limit: number; total: number } }>(
      `/prescriptions/my?page=${page}&limit=${limit}`
    ),
};

// ---------------------------------------------------------------------------
// Psychological Tests API
// ---------------------------------------------------------------------------

export interface PsychTest {
  id: string;
  name: string;
  description: string | null;
  category: string;
  dsm_references: string[] | null;
  questions: Array<{ text: string; options?: Array<{ label: string; value: number }>; max_value?: number; domain?: string }>;
  scoring_rules: Record<string, unknown>;
  interpretation_guide: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface TestSession {
  id: string;
  test_id: string;
  patient_id: string;
  assigned_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  deadline: string | null;
  answers: Record<string, unknown> | null;
  total_score: number | null;
  ai_analysis: Record<string, unknown> | null;
  dsm_mapping: Array<{ code: string; name: string; relevance: string }> | null;
  completed_at: string | null;
  created_at: string;
  test_name?: string;
  test_description?: string;
  test_category?: string;
  test_questions?: PsychTest['questions'];
  scoring_rules?: Record<string, unknown>;
  assigned_by_first_name?: string;
  assigned_by_last_name?: string;
}

export interface DSMCriteria {
  id: string;
  code: string;
  name: string;
  category: string;
  criteria: Record<string, unknown>;
  version: string;
  created_at: string;
}

export const psychTestsApi = {
  getCatalog: () =>
    request<{ tests: PsychTest[]; disclaimer?: string }>('/psych-tests'),

  getTest: (id: string) =>
    request<{ test: PsychTest }>(`/psych-tests/${id}`),

  assign: (data: { test_id: string; patient_id: string; deadline?: string }) =>
    request<{ session: TestSession }>('/psych-tests/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPending: () =>
    request<{ sessions: TestSession[] }>('/psych-tests/sessions/pending'),

  getMyHistory: () =>
    request<{ sessions: TestSession[] }>('/psych-tests/sessions/history'),

  getSession: (id: string) =>
    request<{ session: TestSession }>(`/psych-tests/sessions/${id}`),

  submitAnswers: (id: string, answers: Record<string, unknown>) =>
    request<{ session: TestSession; score: { total_score: number; subscores: unknown; interpretation: unknown }; ai_analysis: unknown }>(`/psych-tests/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ answers }),
    }),

  getPatientHistory: (patientId: string) =>
    request<{ sessions: TestSession[]; pagination: { page: number; limit: number; total: number } }>(`/psych-tests/sessions/patient/${patientId}`),

  getDSMCriteria: () =>
    request<{ criteria: DSMCriteria[] }>('/psych-tests/dsm-criteria'),
};

// ---------------------------------------------------------------------------
// ICD-11 Types & API
// ---------------------------------------------------------------------------

export interface ICD11Disorder {
  id: string;
  icd_code: string;
  disorder_name: string;
  description: string | null;
  symptom_keywords: string[];
  category: string | null;
  created_at: string;
}

export interface ICDTestSuggestion {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  dsm_references: string[] | null;
  relevance_score: number;
  notes: string | null;
  satepsi_name: string | null;
  satepsi_status: string | null;
  satepsi_expiry: string | null;
}

export interface PatientDiagnosis {
  id: string;
  patient_id: string;
  professional_id: string;
  icd_code: string;
  icd_name: string;
  certainty: 'suspected' | 'confirmed';
  diagnosis_date: string;
  notes: string | null;
  clinical_note_id: string | null;
  is_active: boolean;
  created_at: string;
  professional_first_name?: string;
  professional_last_name?: string;
  professional_role?: string;
  clinical_note_title?: string | null;
}

export interface RecentIcd {
  icd_code: string;
  icd_name: string;
  usage_count: number;
  last_used_at: string;
}

export const diagnosesApi = {
  list: (patientId: string) =>
    request<{ diagnoses: PatientDiagnosis[] }>(`/patients/${patientId}/diagnoses`),

  create: (patientId: string, data: {
    icd_code: string;
    icd_name: string;
    certainty: 'suspected' | 'confirmed';
    diagnosis_date?: string;
    notes?: string;
  }) =>
    request<{ diagnosis: PatientDiagnosis }>(`/patients/${patientId}/diagnoses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (patientId: string, diagId: string, data: {
    certainty?: 'suspected' | 'confirmed';
    notes?: string;
    clinical_note_id?: string;
    is_active?: boolean;
  }) =>
    request<{ diagnosis: PatientDiagnosis }>(`/patients/${patientId}/diagnoses/${diagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const icd11Api = {
  list: (params?: { category?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return request<{ disorders: ICD11Disorder[] }>(`/icd11${qs ? `?${qs}` : ''}`);
  },

  categories: () =>
    request<{ categories: string[] }>('/icd11/categories'),

  getCategories: () =>
    request<{ categories: string[] }>('/icd11/categories'),

  detail: (code: string) =>
    request<{ disorder: ICD11Disorder }>(`/icd11/${code}`),

  get: (code: string) =>
    request<{ disorder: ICD11Disorder }>(`/icd11/${code}`),

  tests: (code: string) =>
    request<{ disorder: { id: string; icd_code: string; disorder_name: string }; suggested_tests: ICDTestSuggestion[]; disclaimer: string }>(`/icd11/${code}/tests`),

  getSuggestedTests: (code: string) =>
    request<{ disorder: { id: string; icd_code: string; disorder_name: string }; suggested_tests: ICDTestSuggestion[]; disclaimer: string }>(`/icd11/${code}/tests`),

  suggestBySymptoms: (symptoms: string[]) =>
    request<{ suggestions: (ICD11Disorder & { match_count: number })[]; disclaimer: string }>('/icd11/suggest-by-symptoms', {
      method: 'POST',
      body: JSON.stringify({ symptoms }),
    }),

  recent: () =>
    request<{ recent: RecentIcd[] }>('/icd11/recent'),
};

// ---------------------------------------------------------------------------
// SATEPSI Types & API
// ---------------------------------------------------------------------------

export interface SatepsiTest {
  id: string;
  test_name: string;
  test_author: string | null;
  approval_status: string;
  approval_date: string | null;
  expiry_date: string | null;
  test_category: string | null;
  cfp_code: string | null;
  last_updated: string;
}

export interface SatepsiSyncStatus {
  id: string;
  synced_at: string;
  tests_updated: number;
  tests_deactivated: number;
  status: string;
  error_message: string | null;
}

export const satepsiApi = {
  list: (params?: { status?: string; category?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return request<{ tests: SatepsiTest[] }>(`/satepsi${qs ? `?${qs}` : ''}`);
  },

  getCategories: () =>
    request<{ categories: string[] }>('/satepsi/categories'),

  get: (id: string) =>
    request<{ satepsi_test: SatepsiTest; linked_tests: { id: string; name: string; category: string; is_active: boolean }[] }>(`/satepsi/${id}`),

  getSyncStatus: () =>
    request<{ last_sync: SatepsiSyncStatus | null }>('/satepsi/sync-status'),

  validate: (testId: string) =>
    request<{ test_id: string; test_name: string; requires_satepsi: boolean; satepsi_approved: boolean; satepsi_status: string | null; satepsi_expiry: string | null }>(`/satepsi/validate/${testId}`),
};
