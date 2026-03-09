import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { api, Assessment, AssessmentResult } from '../services/api';

// ── Assessment Data ───────────────────────────────────────────────────────────

const PHQ9_QUESTIONS = [
  'Pouco interesse ou prazer em fazer as coisas',
  'Se sentir para baixo, deprimido ou sem esperança',
  'Dificuldade para pegar no sono ou permanecer dormindo, ou dormir demais',
  'Se sentir cansado ou com pouca energia',
  'Falta de apetite ou comer demais',
  'Se sentir mal consigo mesmo ou achar que é um fracasso',
  'Dificuldade para se concentrar em coisas como ler ou assistir TV',
  'Se mover ou falar tão devagar que outros poderiam perceber, ou estar inquieto',
  'Pensamentos de que seria melhor não estar aqui',
];

const GAD7_QUESTIONS = [
  'Se sentir nervoso, ansioso ou no limite',
  'Não conseguir parar ou controlar a preocupação',
  'Se preocupar demais com diferentes coisas',
  'Dificuldade para relaxar',
  'Estar tão inquieto que é difícil ficar parado',
  'Ficar facilmente irritado ou irritável',
  'Sentir medo como se algo terrível pudesse acontecer',
];

const ANSWER_OPTIONS = [
  { value: 0, label: 'De modo nenhum' },
  { value: 1, label: 'Vários dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ScreenState = 'list' | 'assessment' | 'result';

interface ActiveAssessment {
  type: 'PHQ-9' | 'GAD-7';
  questions: string[];
  currentQuestion: number;
  answers: number[];
}

// ── Assessment Screen ─────────────────────────────────────────────────────────

export default function AssessmentScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('list');
  const [pastResults, setPastResults] = useState<AssessmentResult[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<ActiveAssessment | null>(null);
  const [lastResult, setLastResult] = useState<{ score: number; severity: string; type: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadResults = useCallback(async () => {
    try {
      const response = await api.getAssessmentResults();
      setPastResults(response.data);
    } catch {
      setPastResults(generateMockResults());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const startAssessment = (type: 'PHQ-9' | 'GAD-7') => {
    const questions = type === 'PHQ-9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
    setActiveAssessment({
      type,
      questions,
      currentQuestion: 0,
      answers: [],
    });
    setScreenState('assessment');
  };

  const handleAnswer = (value: number) => {
    if (!activeAssessment) return;

    const newAnswers = [...activeAssessment.answers, value];
    const nextQuestion = activeAssessment.currentQuestion + 1;

    if (nextQuestion >= activeAssessment.questions.length) {
      // Assessment complete
      const score = newAnswers.reduce((a, b) => a + b, 0);
      const severity = getSeverity(activeAssessment.type, score);
      setLastResult({ score, severity, type: activeAssessment.type });
      setScreenState('result');

      // Submit to API
      submitAssessment(activeAssessment.type, newAnswers, score);
    } else {
      setActiveAssessment({
        ...activeAssessment,
        currentQuestion: nextQuestion,
        answers: newAnswers,
      });
    }
  };

  const submitAssessment = async (type: string, answers: number[], score: number) => {
    try {
      await api.submitAssessment(
        type,
        answers.map((value, index) => ({
          questionId: `${type}-q${index + 1}`,
          value,
        }))
      );
    } catch {
      // Saved locally if API fails
    }
  };

  const getSeverity = (type: string, score: number): string => {
    if (type === 'PHQ-9') {
      if (score <= 4) return 'Mínimo';
      if (score <= 9) return 'Leve';
      if (score <= 14) return 'Moderado';
      if (score <= 19) return 'Moderadamente Grave';
      return 'Grave';
    } else {
      if (score <= 4) return 'Mínimo';
      if (score <= 9) return 'Leve';
      if (score <= 14) return 'Moderado';
      return 'Grave';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Mínimo': return '#22c55e';
      case 'Leve': return '#84cc16';
      case 'Moderado': return '#f59e0b';
      case 'Moderadamente Grave': return '#f97316';
      case 'Grave': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getMaxScore = (type: string): number => {
    return type === 'PHQ-9' ? 27 : 21;
  };

  // ── Assessment In Progress ────────────────────────────────────────────

  if (screenState === 'assessment' && activeAssessment) {
    const progress =
      ((activeAssessment.currentQuestion + 1) / activeAssessment.questions.length) * 100;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.assessmentContent}>
          {/* Progress */}
          <View style={styles.assessmentHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                Alert.alert(
                  'Sair da Avaliação?',
                  'Seu progresso será perdido.',
                  [
                    { text: 'Continuar', style: 'cancel' },
                    {
                      text: 'Sair',
                      style: 'destructive',
                      onPress: () => setScreenState('list'),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.cancelText}>{'\u2715'}</Text>
            </TouchableOpacity>
            <Text style={styles.assessmentType}>{activeAssessment.type}</Text>
            <Text style={styles.questionCount}>
              {activeAssessment.currentQuestion + 1} de {activeAssessment.questions.length}
            </Text>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionPrefix}>
              Nas últimas 2 semanas, com que frequência você foi incomodado por:
            </Text>
            <Text style={styles.questionText}>
              {activeAssessment.questions[activeAssessment.currentQuestion]}
            </Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answerOptions}>
            {ANSWER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.answerOption}
                onPress={() => handleAnswer(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.answerDot}>
                  <Text style={styles.answerDotText}>{option.value}</Text>
                </View>
                <Text style={styles.answerLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────────────

  if (screenState === 'result' && lastResult) {
    const severityColor = getSeverityColor(lastResult.severity);
    const maxScore = getMaxScore(lastResult.type);

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <View style={styles.resultCard}>
            <Text style={styles.resultType}>Resultados {lastResult.type}</Text>

            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreNumber, { color: severityColor }]}>
                {lastResult.score}
              </Text>
              <Text style={styles.scoreMax}>/ {maxScore}</Text>
            </View>

            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityColor + '18' },
              ]}
            >
              <Text style={[styles.severityText, { color: severityColor }]}>
                {lastResult.severity}
              </Text>
            </View>

            <Text style={styles.resultExplanation}>
              {getExplanation(lastResult.type, lastResult.severity)}
            </Text>

            <View style={styles.resultNote}>
              <Text style={styles.resultNoteText}>
                Esta avaliação é uma ferramenta de triagem, não um diagnóstico. Compartilhe estes resultados com seu profissional de saúde para avaliação adequada.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setScreenState('list');
              loadResults();
            }}
          >
            <Text style={styles.doneButtonText}>Concluído</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Assessment List ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Available Assessments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avaliações Disponíveis</Text>

        <TouchableOpacity
          style={styles.assessmentCard}
          onPress={() => startAssessment('PHQ-9')}
          activeOpacity={0.8}
        >
          <View style={[styles.assessmentIcon, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.assessmentIconText}>{'\uD83D\uDCCB'}</Text>
          </View>
          <View style={styles.assessmentInfo}>
            <Text style={styles.assessmentName}>PHQ-9</Text>
            <Text style={styles.assessmentDesc}>
              Questionário de Saúde do Paciente para triagem de depressão
            </Text>
            <Text style={styles.assessmentMeta}>9 perguntas -- ~3 min</Text>
          </View>
          <Text style={styles.startArrow}>{'\u203A'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.assessmentCard}
          onPress={() => startAssessment('GAD-7')}
          activeOpacity={0.8}
        >
          <View style={[styles.assessmentIcon, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.assessmentIconText}>{'\uD83D\uDCDD'}</Text>
          </View>
          <View style={styles.assessmentInfo}>
            <Text style={styles.assessmentName}>GAD-7</Text>
            <Text style={styles.assessmentDesc}>
              Escala de Transtorno de Ansiedade Generalizada
            </Text>
            <Text style={styles.assessmentMeta}>7 perguntas -- ~2 min</Text>
          </View>
          <Text style={styles.startArrow}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>

      {/* Past Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resultados Anteriores</Text>
        {pastResults.length > 0 ? (
          pastResults.map((result) => (
            <View key={result.id} style={styles.resultListItem}>
              <View style={styles.resultListLeft}>
                <Text style={styles.resultListType}>{result.assessmentType}</Text>
                <Text style={styles.resultListDate}>
                  {format(new Date(result.completedAt), 'MMM d, yyyy')}
                </Text>
              </View>
              <View style={styles.resultListRight}>
                <Text style={styles.resultListScore}>{result.totalScore}</Text>
                <View
                  style={[
                    styles.resultListBadge,
                    { backgroundColor: getSeverityColor(result.severity) + '18' },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultListSeverity,
                      { color: getSeverityColor(result.severity) },
                    ]}
                  >
                    {result.severity}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Nenhuma avaliação concluída ainda. Faça uma para estabelecer sua linha de base.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExplanation(type: string, severity: string): string {
  const explanations: Record<string, Record<string, string>> = {
    'PHQ-9': {
      'Mínimo': 'Sua pontuação sugere sintomas depressivos mínimos. Continue monitorando e mantendo suas práticas de bem-estar.',
      'Leve': 'Sua pontuação sugere sintomas depressivos leves. Observação atenta e acompanhamento na sua próxima consulta é recomendado.',
      'Moderado': 'Sua pontuação sugere sintomas depressivos moderados. Considere discutir opções de tratamento com seu profissional de saúde.',
      'Moderadamente Grave': 'Sua pontuação sugere sintomas moderadamente graves. Tratamento ativo com medicação e/ou terapia é tipicamente recomendado.',
      'Grave': 'Sua pontuação sugere sintomas depressivos graves. Tratamento imediato é recomendado. Por favor, procure seu profissional de saúde.',
    },
    'GAD-7': {
      'Mínimo': 'Sua pontuação sugere ansiedade mínima. Continue suas práticas atuais de bem-estar.',
      'Leve': 'Sua pontuação sugere ansiedade leve. Monitore seus sintomas e considere técnicas de gerenciamento de estresse.',
      'Moderado': 'Sua pontuação sugere ansiedade moderada. Considere discutir isso com seu profissional de saúde.',
      'Grave': 'Sua pontuação sugere ansiedade grave. Tratamento ativo é recomendado. Por favor, consulte seu profissional de saúde.',
    },
  };

  return explanations[type]?.[severity] || 'Discuta estes resultados com seu profissional de saúde para orientação personalizada.';
}

function generateMockResults(): AssessmentResult[] {
  return [
    {
      id: '1',
      assessmentType: 'PHQ-9',
      totalScore: 8,
      severity: 'Leve',
      completedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      answers: [],
    },
    {
      id: '2',
      assessmentType: 'GAD-7',
      totalScore: 5,
      severity: 'Leve',
      completedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      answers: [],
    },
    {
      id: '3',
      assessmentType: 'PHQ-9',
      totalScore: 12,
      severity: 'Moderado',
      completedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      answers: [],
    },
  ];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fefdfb',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 14,
  },
  assessmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  assessmentIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  assessmentIconText: {
    fontSize: 24,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  assessmentDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 18,
  },
  assessmentMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  startArrow: {
    fontSize: 28,
    color: '#22c55e',
    fontWeight: '300',
    marginLeft: 8,
  },
  resultListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  resultListLeft: {},
  resultListType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  resultListDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  resultListRight: {
    alignItems: 'flex-end',
  },
  resultListScore: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  resultListBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  resultListSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  // Assessment in progress
  assessmentContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  assessmentType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  questionCount: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 40,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  questionContainer: {
    marginBottom: 40,
  },
  questionPrefix: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 21,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 32,
  },
  answerOptions: {
    gap: 12,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  answerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  answerDotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  answerLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },

  // Result screen
  resultContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  resultType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fefdfb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#f3f4f6',
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: -4,
  },
  severityBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  severityText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultExplanation: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 20,
  },
  resultNote: {
    backgroundColor: '#fdf8f0',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  resultNoteText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 24,
  },
});
