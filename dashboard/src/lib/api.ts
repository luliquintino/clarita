// ============================================================================
// CLARITA API Client
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
    if (response.status === 401) {
      // Only redirect if we had a token (expired session), not on login failure
      const hadToken = !!getToken();
      removeToken();
      if (hadToken && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

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

  me: () => request<{ user: AuthUser }>('/auth/me'),

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
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
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
}

export const chatApi = {
  listConversations: () => request<{ conversations: Conversation[] }>('/chat/conversations'),

  createConversation: (otherUserId: string, patientId: string) =>
    request<{ conversation: { id: string; existing: boolean } }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ other_user_id: otherUserId, patient_id: patientId }),
    }),

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
    if (response.status === 401) {
      const hadToken = !!getToken();
      removeToken();
      if (hadToken && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

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
