import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import { api } from '../services/api';
import MoodSlider from '../components/MoodSlider';

// ── Check-In Screen ───────────────────────────────────────────────────────────

const SLEEP_QUALITY_OPTIONS = [
  { value: 'very_poor', label: 'Muito Ruim', emoji: '\uD83D\uDE35' },
  { value: 'poor', label: 'Ruim', emoji: '\uD83D\uDE34' },
  { value: 'fair', label: 'Razoável', emoji: '\uD83D\uDE10' },
  { value: 'good', label: 'Bom', emoji: '\uD83D\uDE0C' },
  { value: 'excellent', label: 'Excelente', emoji: '\uD83E\uDD29' },
] as const;

export default function CheckInScreen({ navigation }: any) {
  const [moodScore, setMoodScore] = useState(5);
  const [anxietyScore, setAnxietyScore] = useState(3);
  const [energyScore, setEnergyScore] = useState(5);
  const [sleepQuality, setSleepQuality] = useState<string>('fair');
  const [sleepHours, setSleepHours] = useState('7');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.createEmotionalLog({
        moodScore,
        anxietyScore,
        energyScore,
        sleepQuality: sleepQuality as any,
        sleepHours: parseFloat(sleepHours) || 0,
        notes: notes.trim() || undefined,
        logDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setIsCompleted(true);
    } catch (error: any) {
      Alert.alert(
        'Não foi possível salvar',
        'Tivemos um problema ao salvar seu check-in. Por favor, tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.completedContent}>
          <View style={styles.completedIconCircle}>
            <Text style={styles.completedIcon}>{'\u2713'}</Text>
          </View>
          <Text style={styles.completedTitle}>Check-in Concluído</Text>
          <Text style={styles.completedMessage}>
            Obrigado por dedicar um tempo para refletir sobre como você se sente. Estar consciente das suas emoções é um passo poderoso rumo ao bem-estar.
          </Text>

          <View style={styles.completedSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Humor</Text>
              <Text style={styles.summaryValue}>{moodScore}/10</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ansiedade</Text>
              <Text style={styles.summaryValue}>{anxietyScore}/10</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Energia</Text>
              <Text style={styles.summaryValue}>{energyScore}/10</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sono</Text>
              <Text style={styles.summaryValue}>
                {sleepHours}h - {sleepQuality.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Check-in Diário</Text>
          <Text style={styles.subtitle}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
          <Text style={styles.encouragement}>
            Não existem respostas erradas. Apenas seja honesto consigo mesmo.
          </Text>
        </View>

        {/* Mood Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como está seu humor?</Text>
          <MoodSlider
            value={moodScore}
            onValueChange={setMoodScore}
            label="Humor"
          />
        </View>

        {/* Anxiety Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nível de ansiedade</Text>
          <Text style={styles.sectionHint}>1 = muito calmo, 10 = muito ansioso</Text>
          <MoodSlider
            value={anxietyScore}
            onValueChange={setAnxietyScore}
            label="Ansiedade"
            lowLabel="Calmo"
            highLabel="Ansioso"
            color="#f59e0b"
          />
        </View>

        {/* Energy Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nível de energia</Text>
          <Text style={styles.sectionHint}>1 = exausto, 10 = muito energético</Text>
          <MoodSlider
            value={energyScore}
            onValueChange={setEnergyScore}
            label="Energia"
            lowLabel="Cansado"
            highLabel="Energético"
            color="#3b82f6"
          />
        </View>

        {/* Sleep Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qualidade do sono na última noite</Text>
          <View style={styles.sleepOptions}>
            {SLEEP_QUALITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sleepOption,
                  sleepQuality === opt.value && styles.sleepOptionSelected,
                ]}
                onPress={() => setSleepQuality(opt.value)}
              >
                <Text style={styles.sleepEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.sleepLabel,
                    sleepQuality === opt.value && styles.sleepLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sleep Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horas de sono</Text>
          <View style={styles.hoursInputContainer}>
            <TextInput
              style={styles.hoursInput}
              value={sleepHours}
              onChangeText={setSleepHours}
              keyboardType="decimal-pad"
              placeholder="7"
              placeholderTextColor="#b0b8c1"
              maxLength={4}
            />
            <Text style={styles.hoursUnit}>horas</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Algo em sua mente?</Text>
          <Text style={styles.sectionHint}>Opcional -- escreva o quanto quiser</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Como foi seu dia? Algum pensamento ou sentimento para registrar..."
            placeholderTextColor="#b0b8c1"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Salvar Check-in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  encouragement: {
    fontSize: 14,
    color: '#22c55e',
    fontStyle: 'italic',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
  },
  sleepOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 8,
  },
  sleepOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  sleepOptionSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sleepEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  sleepLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  sleepLabelSelected: {
    color: '#16a34a',
    fontWeight: '600',
  },
  hoursInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hoursInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    width: 100,
    textAlign: 'center',
  },
  hoursUnit: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 12,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 120,
    lineHeight: 22,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 24,
  },
  // Completed state styles
  completedContainer: {
    flex: 1,
    backgroundColor: '#fefdfb',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  completedContent: {
    alignItems: 'center',
    width: '100%',
  },
  completedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completedIcon: {
    fontSize: 36,
    color: '#22c55e',
    fontWeight: '700',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  completedMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 300,
  },
  completedSummary: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
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
});
