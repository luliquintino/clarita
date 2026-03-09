import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN_KEY = '@clarita_token';
const REFRESH_TOKEN_KEY = '@clarita_refresh_token';
const USER_KEY = '@clarita_user';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'patient';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  onboardingCompleted: boolean;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
  createdAt: string;
}

export interface EmotionalLog {
  id?: string;
  moodScore: number;
  anxietyScore: number;
  energyScore: number;
  sleepQuality: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent';
  sleepHours: number;
  notes?: string;
  logDate: string;
}

export interface LifeEvent {
  id?: string;
  title: string;
  description?: string;
  eventDate: string;
  category: string;
  impactScore: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  active: boolean;
}

export interface MedicationLog {
  id?: string;
  medicationId: string;
  status: 'taken' | 'skipped' | 'pending';
  scheduledTime: string;
  takenAt?: string;
  notes?: string;
}

export interface SymptomReport {
  id?: string;
  symptom: string;
  severity: number;
  duration?: string;
  notes?: string;
  reportDate: string;
}

export interface Assessment {
  id: string;
  type: 'PHQ-9' | 'GAD-7';
  title: string;
  description: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: { value: number; label: string }[];
}

export interface AssessmentResult {
  id: string;
  assessmentType: string;
  totalScore: number;
  severity: string;
  completedAt: string;
  answers: { questionId: string; value: number }[];
}

export interface Insight {
  id: string;
  type: 'pattern' | 'anomaly' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  createdAt: string;
  relatedData?: any;
}

export interface TimelineEntry {
  id: string;
  type: 'emotional_log' | 'life_event' | 'medication' | 'symptom' | 'assessment';
  title: string;
  summary: string;
  date: string;
  data: any;
}

export interface Professional {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  connectedSince: string;
}

// ── Token Management ──────────────────────────────────────────────────────────

export const tokenManager = {
  getToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  setToken: async (token: string): Promise<void> => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  getRefreshToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: async (token: string): Promise<void> => {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearTokens: async (): Promise<void> => {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  },

  getUser: async (): Promise<User | null> => {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: async (user: User): Promise<void> => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

// ── Axios Instance ────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data;
          await tokenManager.setToken(accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        await tokenManager.clearTokens();
      }
    }

    return Promise.reject(error);
  }
);

// ── API Functions ─────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    apiClient.post('/auth/login', data),

  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    apiClient.post('/auth/register', data),

  refreshToken: (refreshToken: string): Promise<AxiosResponse<{ accessToken: string }>> =>
    apiClient.post('/auth/refresh', { refreshToken }),

  // User Profile
  getProfile: (): Promise<AxiosResponse<User>> =>
    apiClient.get('/users/me'),

  updateProfile: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    apiClient.put('/users/me', data),

  completeOnboarding: (data: any): Promise<AxiosResponse<User>> =>
    apiClient.post('/users/me/onboarding', data),

  // Emotional Logs
  createEmotionalLog: (data: EmotionalLog): Promise<AxiosResponse<EmotionalLog>> =>
    apiClient.post('/emotional-logs', data),

  getEmotionalLogs: (params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AxiosResponse<EmotionalLog[]>> =>
    apiClient.get('/emotional-logs', { params }),

  getLatestEmotionalLog: (): Promise<AxiosResponse<EmotionalLog>> =>
    apiClient.get('/emotional-logs/latest'),

  // Life Events
  createLifeEvent: (data: LifeEvent): Promise<AxiosResponse<LifeEvent>> =>
    apiClient.post('/life-events', data),

  getLifeEvents: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AxiosResponse<LifeEvent[]>> =>
    apiClient.get('/life-events', { params }),

  // Medications
  getMedications: (): Promise<AxiosResponse<Medication[]>> =>
    apiClient.get('/medications'),

  createMedication: (data: Partial<Medication>): Promise<AxiosResponse<Medication>> =>
    apiClient.post('/medications', data),

  updateMedication: (id: string, data: Partial<Medication>): Promise<AxiosResponse<Medication>> =>
    apiClient.put(`/medications/${id}`, data),

  // Medication Logs
  getMedicationLogs: (params?: {
    date?: string;
    medicationId?: string;
  }): Promise<AxiosResponse<MedicationLog[]>> =>
    apiClient.get('/medication-logs', { params }),

  logMedication: (data: MedicationLog): Promise<AxiosResponse<MedicationLog>> =>
    apiClient.post('/medication-logs', data),

  // Symptoms
  createSymptomReport: (data: SymptomReport): Promise<AxiosResponse<SymptomReport>> =>
    apiClient.post('/symptoms', data),

  getSymptomReports: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AxiosResponse<SymptomReport[]>> =>
    apiClient.get('/symptoms', { params }),

  // Assessments
  getAvailableAssessments: (): Promise<AxiosResponse<Assessment[]>> =>
    apiClient.get('/assessments'),

  submitAssessment: (
    assessmentId: string,
    answers: { questionId: string; value: number }[]
  ): Promise<AxiosResponse<AssessmentResult>> =>
    apiClient.post(`/assessments/${assessmentId}/submit`, { answers }),

  getAssessmentResults: (params?: {
    type?: string;
  }): Promise<AxiosResponse<AssessmentResult[]>> =>
    apiClient.get('/assessments/results', { params }),

  // Insights
  getInsights: (params?: {
    limit?: number;
  }): Promise<AxiosResponse<Insight[]>> =>
    apiClient.get('/insights', { params }),

  // Timeline
  getTimeline: (params?: {
    startDate?: string;
    endDate?: string;
    types?: string[];
  }): Promise<AxiosResponse<TimelineEntry[]>> =>
    apiClient.get('/timeline', { params }),

  // Professionals
  getConnectedProfessionals: (): Promise<AxiosResponse<Professional[]>> =>
    apiClient.get('/professionals/connected'),

  connectProfessional: (code: string): Promise<AxiosResponse<Professional>> =>
    apiClient.post('/professionals/connect', { code }),

  disconnectProfessional: (id: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/professionals/${id}/disconnect`),

  // Clarity Score
  getClarityScore: (): Promise<AxiosResponse<{
    score: number;
    moodAvg: number;
    anxietyAvg: number;
    energyAvg: number;
    trend: 'improving' | 'stable' | 'declining';
  }>> => apiClient.get('/clarity-score'),

  // Mood Trend
  getMoodTrend: (days?: number): Promise<AxiosResponse<{
    dates: string[];
    moods: number[];
  }>> => apiClient.get('/emotional-logs/trend', { params: { days: days || 7 } }),
};

export default apiClient;
