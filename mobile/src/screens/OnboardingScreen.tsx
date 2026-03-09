import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../App';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingData {
  dateOfBirth: string;
  gender: string;
  emergencyContact: string;
  initialMood: number;
  professionalCode: string;
  reminderTime: string;
}

// ── Step Components ───────────────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeIconContainer}>
        <Text style={styles.welcomeIcon}>{'\u2728'}</Text>
      </View>
      <Text style={styles.stepTitle}>Bem-vindo ao Clarita</Text>
      <Text style={styles.stepDescription}>
        Estamos muito felizes que você está aqui. O Clarita é seu companheiro pessoal para
        entender e cuidar do seu bem-estar mental.
      </Text>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <View style={[styles.featureDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.featureText}>Acompanhe suas emoções e energia diariamente</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureDot, { backgroundColor: '#60a5fa' }]} />
          <Text style={styles.featureText}>Descubra padrões com insights baseados em IA</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureDot, { backgroundColor: '#a78bfa' }]} />
          <Text style={styles.featureText}>Compartilhe seu progresso com sua equipe de saúde</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.featureText}>Construa hábitos saudáveis com lembretes gentis</Text>
        </View>
      </View>
      <Text style={styles.encouragement}>
        Tudo o que você compartilha é privado e seguro. Vamos configurar seu espaço juntos.
      </Text>
    </View>
  );
}

function BasicInfoStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (field: keyof OnboardingData, value: any) => void;
}) {
  const genderOptions = ['Feminino', 'Masculino', 'Não-binário', 'Prefiro não dizer'];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Um Pouco Sobre Você</Text>
      <Text style={styles.stepDescription}>
        Isso nos ajuda a personalizar sua experiência. Todos os campos são opcionais.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Data de Nascimento</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#b0b8c1"
          value={data.dateOfBirth}
          onChangeText={(v) => onChange('dateOfBirth', v)}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gênero</Text>
        <View style={styles.optionGrid}>
          {genderOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                data.gender === option && styles.optionChipSelected,
              ]}
              onPress={() => onChange('gender', option)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  data.gender === option && styles.optionChipTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contato de Emergência</Text>
        <TextInput
          style={styles.input}
          placeholder="Número de telefone ou email"
          placeholderTextColor="#b0b8c1"
          value={data.emergencyContact}
          onChangeText={(v) => onChange('emergencyContact', v)}
        />
        <Text style={styles.fieldHint}>
          Alguém que podemos contatar se você indicar que está em crise
        </Text>
      </View>
    </View>
  );
}

function MoodAssessmentStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (field: keyof OnboardingData, value: any) => void;
}) {
  const moods = [
    { value: 1, emoji: '\uD83D\uDE1E', label: 'Muito Baixo' },
    { value: 2, emoji: '\uD83D\uDE14', label: 'Baixo' },
    { value: 3, emoji: '\uD83D\uDE15', label: 'Inquieto' },
    { value: 4, emoji: '\uD83D\uDE10', label: 'OK' },
    { value: 5, emoji: '\uD83D\uDE42', label: 'Razoável' },
    { value: 6, emoji: '\uD83D\uDE0A', label: 'Bom' },
    { value: 7, emoji: '\uD83D\uDE04', label: 'Ótimo' },
    { value: 8, emoji: '\uD83D\uDE03', label: 'Muito Bom' },
    { value: 9, emoji: '\uD83E\uDD29', label: 'Maravilhoso' },
    { value: 10, emoji: '\uD83E\uDD70', label: 'Incrível' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Como Você Está se Sentindo?</Text>
      <Text style={styles.stepDescription}>
        Nos diga como você está agora. Não existem respostas erradas -- isso é apenas um ponto de partida.
      </Text>

      <View style={styles.moodGrid}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.moodItem,
              data.initialMood === mood.value && styles.moodItemSelected,
            ]}
            onPress={() => onChange('initialMood', mood.value)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.moodLabel,
                data.initialMood === mood.value && styles.moodLabelSelected,
              ]}
            >
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ProfessionalStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (field: keyof OnboardingData, value: any) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Conecte-se com um Profissional</Text>
      <Text style={styles.stepDescription}>
        Se você está trabalhando com um terapeuta ou psiquiatra, você pode conectar suas
        contas para que eles possam acompanhar seu progresso. Isso é completamente opcional.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Código de Convite do Profissional</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o código (ex: DR-XXXX-XXXX)"
          placeholderTextColor="#b0b8c1"
          value={data.professionalCode}
          onChangeText={(v) => onChange('professionalCode', v)}
          autoCapitalize="characters"
        />
        <Text style={styles.fieldHint}>
          Peça ao seu profissional de saúde o código de convite do Clarita
        </Text>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyCardTitle}>Seus dados, seu controle</Text>
        <Text style={styles.privacyCardText}>
          Você escolhe exatamente o que seus profissionais podem ver. Você pode desconectar a qualquer momento, e todo compartilhamento para imediatamente.
        </Text>
      </View>

      <TouchableOpacity style={styles.skipNote}>
        <Text style={styles.skipNoteText}>
          Você pode conectar com um profissional mais tarde pelo seu Perfil
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function RemindersStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (field: keyof OnboardingData, value: any) => void;
}) {
  const times = [
    { value: 'morning', label: 'Manhã', time: '8:00', icon: '\u2600' },
    { value: 'afternoon', label: 'Tarde', time: '13:00', icon: '\u26C5' },
    { value: 'evening', label: 'Fim da Tarde', time: '19:00', icon: '\uD83C\uDF05' },
    { value: 'night', label: 'Noite', time: '21:00', icon: '\uD83C\uDF19' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Seus Lembretes</Text>
      <Text style={styles.stepDescription}>
        Um lembrete gentil para fazer seu check-in. Escolha o horário que melhor funciona para sua reflexão diária.
      </Text>

      <View style={styles.timeGrid}>
        {times.map((time) => (
          <TouchableOpacity
            key={time.value}
            style={[
              styles.timeCard,
              data.reminderTime === time.value && styles.timeCardSelected,
            ]}
            onPress={() => onChange('reminderTime', time.value)}
          >
            <Text style={styles.timeIcon}>{time.icon}</Text>
            <Text
              style={[
                styles.timeLabel,
                data.reminderTime === time.value && styles.timeLabelSelected,
              ]}
            >
              {time.label}
            </Text>
            <Text style={styles.timeValue}>{time.time}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.readyCard}>
        <Text style={styles.readyTitle}>Tudo pronto!</Text>
        <Text style={styles.readyText}>
          Seu espaço pessoal de bem-estar está pronto. Lembre-se, consistência importa mais que perfeição. Até um check-in rápido faz diferença.
        </Text>
      </View>
    </View>
  );
}

// ── Main Onboarding Screen ────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }: any) {
  const { completeOnboarding } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    dateOfBirth: '',
    gender: '',
    emergencyContact: '',
    initialMood: 5,
    professionalCode: '',
    reminderTime: 'evening',
  });

  const totalSteps = 5;

  const handleChange = (field: keyof OnboardingData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    flatListRef.current?.scrollToOffset({ offset: step * SCREEN_WIDTH, animated: true });
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await api.completeOnboarding(data);
    } catch (error) {
      // Continue even if API call fails -- onboarding data is optional
      console.log('Onboarding data save failed:', error);
    } finally {
      setIsSubmitting(false);
      completeOnboarding();
    }
  };

  const steps = [
    <WelcomeStep key="welcome" />,
    <BasicInfoStep key="info" data={data} onChange={handleChange} />,
    <MoodAssessmentStep key="mood" data={data} onChange={handleChange} />,
    <ProfessionalStep key="professional" data={data} onChange={handleChange} />,
    <RemindersStep key="reminders" data={data} onChange={handleChange} />,
  ];

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>
          {currentStep + 1} de {totalSteps}
        </Text>
      </View>

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={steps}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>{item}</View>
        )}
      />

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps - 1 ? 'Começar' : 'Continuar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginBottom: 8,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    backgroundColor: '#22c55e',
  },
  progressText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 23,
    marginBottom: 28,
  },
  welcomeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeIcon: {
    fontSize: 32,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 21,
  },
  encouragement: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 21,
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  fieldHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  optionChipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  optionChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: '#16a34a',
    fontWeight: '600',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  moodItem: {
    width: (SCREEN_WIDTH - 56 - 48) / 5,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f3f4f6',
  },
  moodItemSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: '#16a34a',
    fontWeight: '600',
  },
  privacyCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  privacyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  privacyCardText: {
    fontSize: 14,
    color: '#3b82f6',
    lineHeight: 21,
  },
  skipNote: {
    marginTop: 16,
    padding: 4,
  },
  skipNoteText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  timeCard: {
    width: (SCREEN_WIDTH - 56 - 12) / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  timeCardSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  timeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  timeLabelSelected: {
    color: '#16a34a',
  },
  timeValue: {
    fontSize: 13,
    color: '#9ca3af',
  },
  readyCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 8,
  },
  readyText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#fefdfb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  spacer: {
    width: 80,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  nextButton: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
