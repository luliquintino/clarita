"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User,
  Activity,
  Clock,
  ClipboardCheck,
  FileText,
  Pill,
  Brain,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Sidebar from "@/components/Sidebar";
import EmotionalChart from "@/components/EmotionalChart";
import Timeline from "@/components/Timeline";
import AssessmentHistory from "@/components/AssessmentHistory";
import ClinicalNotes from "@/components/ClinicalNotes";
import MedicationManager from "@/components/MedicationManager";
import InsightsPanel from "@/components/InsightsPanel";
import AlertsPanel from "@/components/AlertsPanel";
import DigitalTwinPanel from "@/components/DigitalTwinPanel";
import GoalsPanel from "@/components/GoalsPanel";
import AISummaryCard from "@/components/AISummaryCard";
import PatientExamsPanel from "@/components/PatientExamsPanel";
import {
  patientsApi,
  notesApi,
  medicationsApi,
  alertsApi,
  digitalTwinApi,
  goalsApi,
  milestonesApi,
  summariesApi,
} from "@/lib/api";
import type {
  Patient,
  EmotionalLog,
  TimelineEntry,
  Assessment,
  ClinicalNote,
  Medication,
  Alert,
  Insight,
  DigitalTwin,
  Goal,
  PatientSummary,
} from "@/lib/api";

type Tab = "overview" | "timeline" | "assessments" | "notes" | "exams" | "digital-twin";

// ============================================================================
// Mock data for development
// ============================================================================

const mockPatient: Patient = {
  id: "1",
  full_name: "Ana Silva",
  age: 32,
  date_of_birth: "1993-06-15",
  gender: "female",
  email: "ana.silva@email.com",
  phone: "+55 11 99999-0001",
  emergency_contact: "+55 11 98888-0001",
  diagnosis: ["Major Depressive Disorder", "Generalized Anxiety"],
  status: "active",
  last_check_in: "2026-03-03T14:30:00Z",
  mood_trend: [4, 5, 3, 4, 6, 5, 7, 6, 7, 8],
  active_alerts: 2,
  mental_clarity_score: 62,
  assigned_professional_id: "prof-1",
  created_at: "2025-08-01T10:00:00Z",
};

const mockEmotionalLogs: EmotionalLog[] = Array.from({ length: 30 }, (_, i) => ({
  id: `log-${i}`,
  patient_id: "1",
  timestamp: new Date(
    Date.now() - (29 - i) * 24 * 60 * 60 * 1000
  ).toISOString(),
  mood: Math.min(10, Math.max(1, 5 + Math.round(Math.sin(i / 3) * 3 + (i / 30) * 2))),
  anxiety: Math.min(10, Math.max(1, 6 - Math.round(Math.sin(i / 4) * 2 + (i / 30) * 1.5))),
  energy: Math.min(10, Math.max(1, 4 + Math.round(Math.cos(i / 5) * 2 + (i / 30) * 2))),
  sleep_quality: Math.min(10, Math.max(1, 5 + Math.round(Math.sin(i / 6) * 2))),
  notes: "",
}));

const mockTimeline: TimelineEntry[] = [
  {
    id: "tl-1",
    patient_id: "1",
    type: "emotional_log",
    title: "Check-in diário concluído",
    description: "Humor: 7/10, Ansiedade: 4/10, Energia: 6/10. Relatou sentir-se mais esperançosa hoje.",
    timestamp: "2026-03-03T14:30:00Z",
  },
  {
    id: "tl-2",
    patient_id: "1",
    type: "life_event",
    title: "Começou novo emprego",
    description: "Paciente relatou início em nova posição. Sentindo uma mistura de empolgação e ansiedade com a mudança.",
    timestamp: "2026-03-01T09:00:00Z",
    severity: "medium",
  },
  {
    id: "tl-3",
    patient_id: "1",
    type: "medication_change",
    title: "Dosagem de Sertralina ajustada",
    description: "Aumentada de 50mg para 75mg diários. Paciente tolerando bem sem efeitos colaterais significativos.",
    timestamp: "2026-02-25T11:00:00Z",
  },
  {
    id: "tl-4",
    patient_id: "1",
    type: "symptom",
    title: "Episódio de insônia relatado",
    description: "Paciente relatou dificuldade para adormecer por 3 noites consecutivas. Início do sono atrasado em mais de 2 horas.",
    timestamp: "2026-02-22T08:00:00Z",
    severity: "high",
  },
  {
    id: "tl-5",
    patient_id: "1",
    type: "assessment",
    title: "PHQ-9 concluído - Pontuação: 12",
    description: "Depressão moderada. Melhora notável em relação à pontuação anterior de 16. Paciente mostrando resposta positiva ao tratamento.",
    timestamp: "2026-02-20T10:00:00Z",
  },
  {
    id: "tl-6",
    patient_id: "1",
    type: "emotional_log",
    title: "Check-in diário concluído",
    description: "Humor: 5/10, Ansiedade: 6/10, Energia: 4/10. Relatou sentir-se sobrecarregada com a transição de trabalho.",
    timestamp: "2026-02-18T15:00:00Z",
  },
  {
    id: "tl-7",
    patient_id: "1",
    type: "life_event",
    title: "Conflito com membro da família",
    description: "Paciente relatou discussão com irmão que desencadeou sintomas de ansiedade. Utilizou estratégias de enfrentamento discutidas em terapia.",
    timestamp: "2026-02-15T20:00:00Z",
    severity: "medium",
  },
  {
    id: "tl-8",
    patient_id: "1",
    type: "assessment",
    title: "GAD-7 concluído - Pontuação: 10",
    description: "Ansiedade moderada. Pontuação estável no último mês. Considerar manter abordagem de tratamento atual.",
    timestamp: "2026-02-10T10:00:00Z",
  },
];

const mockAssessments: Assessment[] = [
  { id: "a-1", patient_id: "1", type: "PHQ-9", score: 18, severity: "moderately severe", answers: {}, administered_by: "Dr. Lopes", timestamp: "2025-10-15T10:00:00Z" },
  { id: "a-2", patient_id: "1", type: "PHQ-9", score: 16, severity: "moderately severe", answers: {}, administered_by: "Dr. Lopes", timestamp: "2025-11-15T10:00:00Z" },
  { id: "a-3", patient_id: "1", type: "PHQ-9", score: 14, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2025-12-15T10:00:00Z" },
  { id: "a-4", patient_id: "1", type: "PHQ-9", score: 12, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2026-01-15T10:00:00Z" },
  { id: "a-5", patient_id: "1", type: "PHQ-9", score: 12, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2026-02-20T10:00:00Z" },
  { id: "a-6", patient_id: "1", type: "GAD-7", score: 14, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2025-10-15T10:00:00Z" },
  { id: "a-7", patient_id: "1", type: "GAD-7", score: 12, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2025-11-15T10:00:00Z" },
  { id: "a-8", patient_id: "1", type: "GAD-7", score: 11, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2025-12-15T10:00:00Z" },
  { id: "a-9", patient_id: "1", type: "GAD-7", score: 10, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2026-01-15T10:00:00Z" },
  { id: "a-10", patient_id: "1", type: "GAD-7", score: 10, severity: "moderate", answers: {}, administered_by: "Dr. Lopes", timestamp: "2026-02-10T10:00:00Z" },
];

const mockNotes: ClinicalNote[] = [
  {
    id: "n-1",
    patient_id: "1",
    professional_id: "prof-1",
    professional_name: "Dr. Maria Lopes",
    type: "session",
    title: "Sessão #24 - Revisão de Progresso",
    content:
      "Paciente continua demonstrando melhora na regulação do humor. Técnicas de TCC para reestruturação cognitiva estão sendo aplicadas consistentemente. Discutida a transição de emprego e preparadas estratégias de enfrentamento para estressores antecipados. Paciente expressou sentir-se mais equipada para lidar com gatilhos de ansiedade. Continuaremos monitorando padrões de sono e ajustando medicação conforme necessário.",
    created_at: "2026-03-01T16:00:00Z",
    updated_at: "2026-03-01T16:00:00Z",
  },
  {
    id: "n-2",
    patient_id: "1",
    professional_id: "prof-1",
    professional_name: "Dr. Maria Lopes",
    type: "treatment_plan",
    title: "Plano de Tratamento Atualizado - T1 2026",
    content:
      "Objetivos:\n1. Reduzir pontuação PHQ-9 para abaixo de 10 (faixa leve)\n2. Melhorar qualidade do sono para 6+ horas consistentes\n3. Desenvolver 3 novas estratégias de enfrentamento para ansiedade relacionada ao trabalho\n\nAbordagem:\n- Continuar sessões semanais de TCC\n- Manter Sertralina 75mg diários\n- Introduzir exercícios de redução de estresse baseados em mindfulness\n- Check-ins semanais de higiene do sono",
    created_at: "2026-02-15T11:00:00Z",
    updated_at: "2026-02-15T11:00:00Z",
  },
  {
    id: "n-3",
    patient_id: "1",
    professional_id: "prof-1",
    professional_name: "Dr. Maria Lopes",
    type: "observation",
    title: "Observação de Resposta ao Medicamento",
    content:
      "Após 4 semanas com dosagem aumentada de Sertralina (75mg), paciente relata melhora na estabilidade do humor. Sem efeitos colaterais significativos observados. Apetite normalizado. Continuaremos monitorando pelas próximas 4 semanas antes de considerar ajustes adicionais.",
    created_at: "2026-02-28T14:00:00Z",
    updated_at: "2026-02-28T14:00:00Z",
  },
];

const mockMedications: Medication[] = [
  {
    id: "med-1",
    patient_id: "1",
    name: "Sertraline",
    dosage: "75mg",
    frequency: "Uma vez ao dia (manhã)",
    prescribed_by: "Dr. Maria Lopes",
    prescribed_date: "2025-08-15T10:00:00Z",
    status: "active",
    adherence_rate: 87,
    side_effects: ["Náusea leve (resolvida)", "Sonolência"],
    notes: "Aumentado de 50mg em 25 de fev de 2026",
  },
  {
    id: "med-2",
    patient_id: "1",
    name: "Melatonin",
    dosage: "3mg",
    frequency: "Noturno (30min antes de dormir)",
    prescribed_by: "Dr. Maria Lopes",
    prescribed_date: "2026-01-10T10:00:00Z",
    status: "active",
    adherence_rate: 72,
    side_effects: [],
    notes: "Para suporte ao início do sono",
  },
  {
    id: "med-3",
    patient_id: "1",
    name: "Sertraline",
    dosage: "50mg",
    frequency: "Uma vez ao dia (manhã)",
    prescribed_by: "Dr. Maria Lopes",
    prescribed_date: "2025-08-15T10:00:00Z",
    status: "adjusted",
    adherence_rate: 91,
    side_effects: ["Náusea leve"],
    notes: "Ajustado para 75mg em 25 de fev de 2026",
  },
];

const mockAlerts: Alert[] = [
  {
    id: "pa-1",
    patient_id: "1",
    patient_name: "Ana Silva",
    type: "sleep_pattern",
    title: "Padrões de sono alterados",
    description: "Pontuações de qualidade do sono abaixo de 3/10 na última semana.",
    severity: "medium",
    status: "active",
    created_at: "2026-03-03T09:00:00Z",
    acknowledged_at: null,
    acknowledged_by: null,
  },
  {
    id: "pa-2",
    patient_id: "1",
    patient_name: "Ana Silva",
    type: "mood_drop",
    title: "Declínio significativo de humor detectado",
    description: "Pontuação de humor caiu 40% nos últimos 3 dias.",
    severity: "critical",
    status: "active",
    created_at: "2026-03-04T08:00:00Z",
    acknowledged_at: null,
    acknowledged_by: null,
  },
];

const mockInsights: Insight[] = [
  {
    id: "ins-1",
    patient_id: "1",
    type: "pattern_detection",
    title: "Correlação Sono-Humor Detectada",
    description:
      "Análise indica forte correlação entre a qualidade do sono de Ana e as pontuações de humor do dia seguinte. Noites com qualidade do sono abaixo de 4/10 são seguidas por quedas de humor com média de 2,3 pontos no dia seguinte.",
    confidence: 0.87,
    impact: "high",
    recommendations: [
      "Priorizar intervenções de higiene do sono nas próximas sessões",
      "Considerar ajuste de horário ou dosagem de Melatonina",
      "Recomendar terapia de restrição de sono se insônia persistir",
    ],
    generated_at: "2026-03-03T06:00:00Z",
  },
  {
    id: "ins-2",
    patient_id: "1",
    type: "treatment_response",
    title: "Resposta Positiva ao Aumento de Sertralina",
    description:
      "Desde o aumento da dosagem de Sertralina de 50mg para 75mg, as pontuações médias de humor de Ana melhoraram 18% e as pontuações de ansiedade diminuíram 12%. A trajetória de resposta sugere melhora contínua nas próximas 2-4 semanas.",
    confidence: 0.82,
    impact: "high",
    recommendations: [
      "Manter dosagem atual de Sertralina por pelo menos mais 6 semanas",
      "Agendar avaliação de acompanhamento em 2 semanas para confirmar tendência",
      "Documentar quaisquer efeitos colaterais emergentes",
    ],
    generated_at: "2026-03-02T06:00:00Z",
  },
  {
    id: "ins-3",
    patient_id: "1",
    type: "risk_assessment",
    title: "Transição de Trabalho - Fator de Risco de Ansiedade",
    description:
      "A recente mudança de emprego de Ana corresponde a níveis elevados de ansiedade. Dados históricos mostram que transições de vida anteriormente desencadearam períodos de 2-3 semanas de sintomas aumentados.",
    confidence: 0.74,
    impact: "medium",
    recommendations: [
      "Aumentar frequência de check-ins durante o período de transição",
      "Revisar e reforçar estratégias de enfrentamento de ansiedade no trabalho",
      "Monitorar sinais de transtorno de adaptação",
    ],
    generated_at: "2026-03-01T06:00:00Z",
  },
];

// ============================================================================
// Page component
// ============================================================================

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [patient, setPatient] = useState<Patient | null>(null);
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [summaries, setSummaries] = useState<PatientSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);

    try {
      const [
        patientRes,
        logsRes,
        timelineRes,
        assessmentsRes,
        notesRes,
        medsRes,
        alertsRes,
        insightsRes,
        twinRes,
      ] = await Promise.allSettled([
        patientsApi.get(patientId),
        patientsApi.getEmotionalLogs(patientId, 90),
        patientsApi.getTimeline(patientId),
        patientsApi.getAssessments(patientId),
        notesApi.list(patientId),
        medicationsApi.list(patientId),
        alertsApi.list({ patient_id: patientId }),
        patientsApi.getInsights(patientId),
        digitalTwinApi.get(patientId),
      ]);

      // Backend wraps responses in named objects - extract the arrays
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unwrap = (res: PromiseSettledResult<unknown>, key: string) => {
        if (res.status !== "fulfilled") return undefined;
        const val = res.value as Record<string, unknown>;
        return val[key] ?? val;
      };

      if (patientRes.status === "fulfilled") {
        const raw = unwrap(patientRes, "patient") as Record<string, unknown> | undefined;
        if (raw && raw.first_name) {
          // Map backend shape to Patient interface
          const dob = raw.date_of_birth ? new Date(raw.date_of_birth as string) : null;
          const age = dob ? Math.floor((Date.now() - dob.getTime()) / 31557600000) : 0;
          setPatient({
            id: raw.id as string,
            full_name: `${raw.first_name} ${raw.last_name}`,
            age,
            date_of_birth: raw.date_of_birth as string || "",
            gender: (raw.gender as string) || "",
            email: raw.email as string,
            phone: (raw.phone as string) || "",
            emergency_contact: (raw.emergency_contact_phone as string) || "",
            diagnosis: [],
            status: "active",
            last_check_in: null,
            mood_trend: [],
            active_alerts: 0,
            mental_clarity_score: null,
            assigned_professional_id: "",
            created_at: raw.created_at as string,
          });
        } else {
          setPatient(mockPatient);
        }
      } else {
        setPatient(mockPatient);
      }
      // Map emotional logs: backend uses mood_score/anxiety_score/energy_score
      const rawLogs = unwrap(logsRes, "emotional_logs") as Record<string, unknown>[] | undefined;
      if (rawLogs && Array.isArray(rawLogs)) {
        setEmotionalLogs(rawLogs.map((l) => ({
          id: l.id as string,
          patient_id: l.patient_id as string,
          timestamp: (l.logged_at || l.created_at) as string,
          mood: (l.mood_score || l.mood) as number,
          anxiety: (l.anxiety_score || l.anxiety) as number,
          energy: (l.energy_score || l.energy) as number,
          sleep_quality: (l.sleep_hours || l.sleep_quality) as number,
          notes: (l.notes || "") as string,
        })));
      } else {
        setEmotionalLogs(mockEmotionalLogs);
      }

      const rawTimeline = unwrap(timelineRes, "timeline") as Record<string, unknown>[] | undefined;
      if (rawTimeline && Array.isArray(rawTimeline)) {
        setTimeline(rawTimeline.map((t) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (t.data || {}) as any;
          return {
            id: t.id as string,
            patient_id: t.patient_id as string || patientId,
            type: (t.event_type || t.type || "emotional_log") as TimelineEntry["type"],
            title: (data.title || data.medication_name || data.symptom_name || data.assessment_name || t.event_type || "") as string,
            description: (data.description || data.notes || data.severity_level || "") as string,
            timestamp: (t.event_date || t.timestamp || t.created_at || "") as string,
            severity: (data.severity || data.impact_level) as TimelineEntry["severity"],
            metadata: data as Record<string, unknown>,
          };
        }));
      } else {
        setTimeline(mockTimeline);
      }

      // Map assessments: backend uses total_score/severity_level/completed_at
      const rawAssess = unwrap(assessmentsRes, "assessment_results") as Record<string, unknown>[] | undefined;
      if (rawAssess && Array.isArray(rawAssess)) {
        setAssessments(rawAssess.map((a) => ({
          id: a.id as string,
          patient_id: a.patient_id as string,
          type: (a.assessment_name || "PHQ-9") as "PHQ-9" | "GAD-7",
          score: (a.total_score ?? a.score) as number,
          severity: (a.severity_level || a.severity) as string,
          answers: (a.answers || {}) as Record<string, number>,
          administered_by: "",
          timestamp: (a.completed_at || a.created_at) as string,
        })));
      } else {
        setAssessments(mockAssessments);
      }

      // Map clinical notes
      const rawNotes = unwrap(notesRes, "clinical_notes") as Record<string, unknown>[] | undefined;
      if (rawNotes && Array.isArray(rawNotes)) {
        setNotes(rawNotes.map((n) => ({
          id: n.id as string,
          patient_id: n.patient_id as string,
          professional_id: (n.professional_id || "") as string,
          professional_name: n.professional_name ? n.professional_name as string : `${n.professional_first_name || ""} ${n.professional_last_name || ""}`.trim(),
          type: (n.note_type || n.type || "session") as ClinicalNote["type"],
          title: (n.content ? (n.content as string).slice(0, 60) + "..." : "") as string,
          content: (n.content || "") as string,
          created_at: (n.created_at || "") as string,
          updated_at: (n.updated_at || n.created_at || "") as string,
        })));
      } else {
        setNotes(mockNotes);
      }

      // Map medications
      const rawMeds = unwrap(medsRes, "patient_medications") as Record<string, unknown>[] | undefined;
      if (rawMeds && Array.isArray(rawMeds)) {
        setMedications(rawMeds.map((m) => ({
          id: m.id as string,
          patient_id: m.patient_id as string,
          name: (m.medication_name || m.name || "") as string,
          dosage: (m.dosage || "") as string,
          frequency: (m.frequency || "") as string,
          prescribed_by: m.prescriber_first_name ? `${m.prescriber_first_name} ${m.prescriber_last_name}` : (m.prescribed_by || "") as string,
          prescribed_date: (m.start_date || m.created_at || "") as string,
          status: (m.status || "active") as Medication["status"],
          adherence_rate: 0,
          side_effects: [],
          notes: (m.notes || "") as string,
        })));
      } else {
        setMedications(mockMedications);
      }

      // Map alerts
      const rawAlerts = unwrap(alertsRes, "alerts") as Record<string, unknown>[] | undefined;
      if (rawAlerts && Array.isArray(rawAlerts)) {
        setAlerts(rawAlerts.map((a) => ({
          id: a.id as string,
          patient_id: a.patient_id as string,
          patient_name: "",
          type: (a.alert_type || a.type || "") as string,
          title: (a.title || "") as string,
          description: (a.description || "") as string,
          severity: (a.severity || "medium") as Alert["severity"],
          status: a.is_acknowledged ? "acknowledged" as const : "active" as const,
          created_at: (a.created_at || "") as string,
          acknowledged_at: (a.acknowledged_at || null) as string | null,
          acknowledged_by: a.acknowledged_by_first_name
            ? `${a.acknowledged_by_first_name} ${a.acknowledged_by_last_name}`
            : (a.acknowledged_by || null) as string | null,
        })));
      } else {
        setAlerts(mockAlerts);
      }

      // Map insights
      const rawInsights = unwrap(insightsRes, "insights") as Record<string, unknown>[] | undefined;
      if (rawInsights && Array.isArray(rawInsights)) {
        setInsights(rawInsights.map((i) => ({
          id: i.id as string,
          patient_id: i.patient_id as string,
          type: (i.insight_type || i.type || "") as string,
          title: (i.title || "") as string,
          description: (i.explanation || i.description || "") as string,
          confidence: (i.confidence_score || i.confidence || 0) as number,
          impact: (i.impact_level || i.impact || "medium") as Insight["impact"],
          recommendations: i.recommendations ? (typeof i.recommendations === "string" ? [i.recommendations as string] : i.recommendations as string[]) : [],
          generated_at: (i.created_at || "") as string,
        })));
      } else {
        setInsights(mockInsights);
      }
      setDigitalTwin(
        twinRes.status === "fulfilled" ? twinRes.value : null
      );

      // Load goals and summaries separately
      loadGoals();
      loadSummaries();
    } catch {
      // Fallback to mock data
      setPatient(mockPatient);
      setEmotionalLogs(mockEmotionalLogs);
      setTimeline(mockTimeline);
      setAssessments(mockAssessments);
      setNotes(mockNotes);
      setMedications(mockMedications);
      setAlerts(mockAlerts);
      setInsights(mockInsights);
    } finally {
      setLoading(false);
    }
  };

  // Note handlers
  const handleSaveNote = async (data: {
    type: string;
    title: string;
    content: string;
  }) => {
    try {
      const note = await notesApi.create(patientId, data);
      setNotes((prev) => [note, ...prev]);
    } catch {
      // Mock save for development
      const mockNote: ClinicalNote = {
        id: `n-${Date.now()}`,
        patient_id: patientId,
        professional_id: "prof-1",
        professional_name: "Dr. Maria Lopes",
        type: data.type as ClinicalNote["type"],
        title: data.title,
        content: data.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes((prev) => [mockNote, ...prev]);
    }
  };

  const handleUpdateNote = async (
    noteId: string,
    data: { type?: string; title?: string; content?: string }
  ) => {
    try {
      const updated = await notesApi.update(patientId, noteId, data);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    } catch {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, ...data, updated_at: new Date().toISOString() } as ClinicalNote
            : n
        )
      );
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesApi.delete(patientId, noteId);
    } catch {
      // Continue with optimistic removal
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // Medication handlers
  const handlePrescribe = async (data: {
    name: string;
    dosage: string;
    frequency: string;
    notes?: string;
  }) => {
    try {
      const med = await medicationsApi.prescribe(patientId, data);
      setMedications((prev) => [med, ...prev]);
    } catch {
      const mockMed: Medication = {
        id: `med-${Date.now()}`,
        patient_id: patientId,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        prescribed_by: "Dr. Maria Lopes",
        prescribed_date: new Date().toISOString(),
        status: "active",
        adherence_rate: 100,
        side_effects: [],
        notes: data.notes || "",
      };
      setMedications((prev) => [mockMed, ...prev]);
    }
  };

  const handleAdjustMedication = async (
    medicationId: string,
    data: { dosage?: string; frequency?: string; notes?: string }
  ) => {
    try {
      const updated = await medicationsApi.adjust(patientId, medicationId, data);
      setMedications((prev) =>
        prev.map((m) => (m.id === medicationId ? updated : m))
      );
    } catch {
      setMedications((prev) =>
        prev.map((m) =>
          m.id === medicationId ? { ...m, ...data, status: "adjusted" as const } : m
        )
      );
    }
  };

  const handleDiscontinueMedication = async (medicationId: string) => {
    try {
      await medicationsApi.discontinue(patientId, medicationId);
    } catch {
      // Continue with optimistic update
    }
    setMedications((prev) =>
      prev.map((m) =>
        m.id === medicationId ? { ...m, status: "discontinued" as const } : m
      )
    );
  };

  // Summaries handlers
  const loadSummaries = async () => {
    setSummariesLoading(true);
    try {
      const data = await summariesApi.list(patientId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const list = Array.isArray(raw) ? raw : raw?.summaries ?? [];
      setSummaries(list);
    } catch {
      setSummaries([]);
    } finally {
      setSummariesLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      await summariesApi.generate(patientId, 7);
      await loadSummaries();
    } finally {
      setGenerating(false);
    }
  };

  // Goals handlers
  const loadGoals = async () => {
    setGoalsLoading(true);
    try {
      const data = await goalsApi.list(patientId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const goalsList = Array.isArray(raw) ? raw : raw?.goals ?? [];
      setGoals(goalsList);
    } catch {
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  };

  const handleCreateGoal = async (data: {
    patient_id: string;
    title: string;
    description?: string;
    target_date?: string;
  }) => {
    await goalsApi.create(data);
    await loadGoals();
  };

  const handleAchieveGoal = async (goalId: string) => {
    await goalsApi.achieve(goalId);
    await loadGoals();
  };

  const handleUpdateGoal = async (
    goalId: string,
    data: Partial<Pick<Goal, "title" | "description" | "status" | "target_date">>
  ) => {
    await goalsApi.update(goalId, data);
    await loadGoals();
  };

  // Alert handler
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await alertsApi.acknowledge(alertId);
    } catch {
      // Continue with optimistic update
    }
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: "acknowledged" as const, acknowledged_at: new Date().toISOString() }
          : a
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-[240px] p-8">
          <div className="flex items-center justify-center py-24">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 p-8 flex flex-col items-center gap-3">
              <Loader2
                size={32}
                className="animate-spin text-clarita-green-400"
              />
              <p className="text-sm text-gray-400">Carregando paciente...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-[240px] p-8">
          <div className="text-center py-24">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 p-8 inline-block">
              <p className="text-gray-500 mb-4">Paciente não encontrado</p>
              <Link href="/patients" className="btn-primary inline-flex">
                Voltar para pacientes
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Visão Geral", icon: <Activity size={16} /> },
    { key: "timeline", label: "Linha do Tempo", icon: <Clock size={16} /> },
    {
      key: "assessments",
      label: "Avaliações",
      icon: <ClipboardCheck size={16} />,
    },
    { key: "notes", label: "Notas", icon: <FileText size={16} /> },
    { key: "exams", label: "Exames", icon: <ClipboardCheck size={16} /> },
    { key: "digital-twin", label: "Gêmeo Digital", icon: <Brain size={16} /> },
  ];

  const activeAlertCount = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="min-h-screen">
      <Sidebar alertCount={activeAlertCount} />

      <main className="ml-[240px] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back nav */}
          <Link
            href="/patients"
            className="btn-ghost gap-1.5 text-sm mb-6"
          >
            <ArrowLeft size={16} />
            Voltar para pacientes
          </Link>

          {/* Patient header */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6 mb-6 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-5">
                {/* Avatar with mood-based gradient ring */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ring-2 ring-offset-2 ${
                    patient.mental_clarity_score !== null && patient.mental_clarity_score >= 70
                      ? "bg-clarita-green-100 ring-clarita-green-400"
                      : patient.mental_clarity_score !== null && patient.mental_clarity_score >= 40
                      ? "bg-yellow-100 ring-yellow-400"
                      : "bg-red-100 ring-red-400"
                  }`}
                >
                  <User size={28} className="text-gray-600" />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-gray-800">
                      {patient.full_name}
                    </h1>
                    <span
                      className={`text-xs ${
                        patient.status === "active"
                          ? "badge-green"
                          : patient.status === "inactive"
                          ? "badge bg-gray-100 text-gray-500"
                          : "badge-blue"
                      }`}
                    >
                      {patient.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                    <span>
                      {patient.age} anos &middot;{" "}
                      {patient.gender.charAt(0).toUpperCase() +
                        patient.gender.slice(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {patient.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {patient.phone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {(patient.diagnosis || []).map((d, i) => (
                      <span
                        key={d}
                        className={`text-xs ${i % 2 === 0 ? "badge-purple" : "badge-blue"}`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                {patient.mental_clarity_score !== null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Clareza Mental</p>
                    <div className="flex items-center gap-2.5 justify-end">
                      {/* Colored circle gauge */}
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-gray-200"
                          />
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${patient.mental_clarity_score * 0.942} 100`}
                            className={
                              patient.mental_clarity_score >= 70
                                ? "text-clarita-green-400"
                                : patient.mental_clarity_score >= 40
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                            stroke="currentColor"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                          {patient.mental_clarity_score}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-gray-800">
                        {patient.mental_clarity_score}%
                      </span>
                    </div>
                  </div>
                )}
                {patient.last_check_in && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                    <Calendar size={12} />
                    Último check-in:{" "}
                    {formatDistanceToNow(new Date(patient.last_check_in), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm rounded-2xl p-1.5 border border-white/30 mb-6">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              let activeClass = "tab-button-inactive";

              if (isActive) {
                switch (tab.key) {
                  case "overview":
                    activeClass = "tab-green-active";
                    break;
                  case "timeline":
                    activeClass = "tab-blue-active";
                    break;
                  case "assessments":
                    activeClass = "tab-purple-active";
                    break;
                  case "notes":
                    activeClass = "tab-orange-active";
                    break;
                  case "exams":
                    activeClass = "tab-green-active";
                    break;
                  case "digital-twin":
                    activeClass = "tab-button bg-purple-900/80 text-purple-100 shadow-sm border border-purple-700/50";
                    break;
                }
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 ${activeClass}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div key={activeTab} className="animate-fade-in">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Alerts */}
                {activeAlertCount > 0 && (
                  <div>
                    <h3 className="section-title flex items-center gap-2">
                      <AlertCircle size={18} className="text-red-500" />
                      Alertas Ativos ({activeAlertCount})
                    </h3>
                    <AlertsPanel
                      alerts={alerts}
                      onAcknowledge={handleAcknowledgeAlert}
                      showPatientName={false}
                    />
                  </div>
                )}

                {/* AI Summary */}
                <AISummaryCard
                  summaries={summaries}
                  loading={summariesLoading}
                  generating={generating}
                  onGenerate={handleGenerateSummary}
                />

                {/* Goals */}
                <GoalsPanel
                  goals={goals}
                  loading={goalsLoading}
                  patientId={patientId}
                  onCreateGoal={handleCreateGoal}
                  onAchieveGoal={handleAchieveGoal}
                  onUpdateGoal={handleUpdateGoal}
                />

                {/* Emotional chart */}
                <EmotionalChart data={emotionalLogs} />

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Medications */}
                  <MedicationManager
                    medications={medications}
                    patientId={patientId}
                    role="psychiatrist"
                    onPrescribe={handlePrescribe}
                    onAdjust={handleAdjustMedication}
                    onDiscontinue={handleDiscontinueMedication}
                  />

                  {/* Insights */}
                  <InsightsPanel insights={insights} />
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <Timeline entries={timeline} />
            )}

            {activeTab === "assessments" && (
              <AssessmentHistory assessments={assessments} />
            )}

            {activeTab === "notes" && (
              <ClinicalNotes
                notes={notes}
                patientId={patientId}
                onSave={handleSaveNote}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
              />
            )}

            {activeTab === "exams" && (
              <PatientExamsPanel patientId={patientId} />
            )}

            {activeTab === "digital-twin" && (
              <DigitalTwinPanel
                twin={digitalTwin}
                patientId={patientId}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
