import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { api, Medication, MedicationLog } from '../services/api';

// ── Medication Screen ─────────────────────────────────────────────────────────

export default function MedicationScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const adherencePercentage = calculateAdherence(todayLogs);

  const loadData = useCallback(async () => {
    try {
      const [medsRes, logsRes] = await Promise.all([
        api.getMedications(),
        api.getMedicationLogs({ date: format(new Date(), 'yyyy-MM-dd') }),
      ]);
      setMedications(medsRes.data);
      setTodayLogs(logsRes.data);
    } catch {
      // Use mock data
      setMedications(generateMockMedications());
      setTodayLogs(generateMockLogs());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogMedication = async (
    medicationId: string,
    status: 'taken' | 'skipped'
  ) => {
    try {
      await api.logMedication({
        medicationId,
        status,
        scheduledTime: new Date().toISOString(),
        takenAt: status === 'taken' ? new Date().toISOString() : undefined,
      });
      // Update local state
      setTodayLogs((prev) => {
        const existing = prev.findIndex((l) => l.medicationId === medicationId);
        const newLog: MedicationLog = {
          id: Date.now().toString(),
          medicationId,
          status,
          scheduledTime: new Date().toISOString(),
          takenAt: status === 'taken' ? new Date().toISOString() : undefined,
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newLog;
          return updated;
        }
        return [...prev, newLog];
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar o medicamento. Por favor, tente novamente.');
    }
  };

  const getLogStatus = (medicationId: string): 'taken' | 'skipped' | 'pending' => {
    const log = todayLogs.find((l) => l.medicationId === medicationId);
    return log?.status || 'pending';
  };

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#22c55e"
        />
      }
    >
      {/* Adherence Overview */}
      <View style={styles.adherenceCard}>
        <Text style={styles.adherenceLabel}>Adesão de Hoje</Text>
        <View style={styles.adherenceRow}>
          <View style={styles.adherenceCircle}>
            <Text style={styles.adherencePercent}>{adherencePercentage}%</Text>
          </View>
          <View style={styles.adherenceInfo}>
            <Text style={styles.adherenceDetail}>
              {todayLogs.filter((l) => l.status === 'taken').length} de{' '}
              {medications.filter((m) => m.active).length} tomados
            </Text>
            <Text style={styles.adherenceDate}>
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${adherencePercentage}%` },
            ]}
          />
        </View>
      </View>

      {/* Today's Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicamentos de Hoje</Text>
        {medications
          .filter((m) => m.active)
          .map((med) => {
            const status = getLogStatus(med.id);
            return (
              <View key={med.id} style={styles.medicationCard}>
                <View style={styles.medCardHeader}>
                  <View
                    style={[
                      styles.medStatusDot,
                      status === 'taken' && styles.medStatusTaken,
                      status === 'skipped' && styles.medStatusSkipped,
                      status === 'pending' && styles.medStatusPending,
                    ]}
                  />
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosage}>
                      {med.dosage} -- {med.frequency}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      status === 'taken' && styles.statusBadgeTaken,
                      status === 'skipped' && styles.statusBadgeSkipped,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        status === 'taken' && styles.statusBadgeTextTaken,
                        status === 'skipped' && styles.statusBadgeTextSkipped,
                      ]}
                    >
                      {status === 'taken' ? 'Tomado' : status === 'skipped' ? 'Pulado' : 'Pendente'}
                    </Text>
                  </View>
                </View>

                {status === 'pending' && (
                  <View style={styles.medActions}>
                    <TouchableOpacity
                      style={styles.takenButton}
                      onPress={() => handleLogMedication(med.id, 'taken')}
                    >
                      <Text style={styles.takenButtonText}>
                        {'\u2713'} Tomado
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.skippedButton}
                      onPress={() => handleLogMedication(med.id, 'skipped')}
                    >
                      <Text style={styles.skippedButtonText}>Pular</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
      </View>

      {/* Active Medications List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicamentos Ativos</Text>
        {medications
          .filter((m) => m.active)
          .map((med) => (
            <View key={med.id} style={styles.medListItem}>
              <View style={styles.medPill}>
                <Text style={styles.medPillIcon}>{'\uD83D\uDC8A'}</Text>
              </View>
              <View style={styles.medListInfo}>
                <Text style={styles.medListName}>{med.name}</Text>
                <Text style={styles.medListDetails}>
                  {med.dosage} | {med.frequency}
                </Text>
                <Text style={styles.medListSince}>
                  Desde {format(new Date(med.startDate), 'dd/MM/yyyy')}
                </Text>
              </View>
            </View>
          ))}

        {medications.filter((m) => m.active).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDC8A'}</Text>
            <Text style={styles.emptyText}>Nenhum medicamento ativo</Text>
            <Text style={styles.emptySubtext}>
              Medicamentos adicionados pela sua equipe de saúde aparecerão aqui
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateAdherence(logs: MedicationLog[]): number {
  if (logs.length === 0) return 0;
  const taken = logs.filter((l) => l.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
}

function generateMockMedications(): Medication[] {
  return [
    {
      id: '1',
      name: 'Sertraline',
      dosage: '50mg',
      frequency: 'Uma vez ao dia (manhã)',
      startDate: '2024-01-15',
      active: true,
    },
    {
      id: '2',
      name: 'Melatonin',
      dosage: '3mg',
      frequency: 'Uma vez ao dia (hora de dormir)',
      startDate: '2024-02-01',
      active: true,
    },
    {
      id: '3',
      name: 'Vitamin D',
      dosage: '2000 IU',
      frequency: 'Uma vez ao dia',
      startDate: '2024-01-01',
      active: true,
    },
  ];
}

function generateMockLogs(): MedicationLog[] {
  return [
    {
      id: '1',
      medicationId: '1',
      status: 'taken',
      scheduledTime: new Date().toISOString(),
      takenAt: new Date().toISOString(),
    },
    {
      id: '2',
      medicationId: '2',
      status: 'pending',
      scheduledTime: new Date().toISOString(),
    },
    {
      id: '3',
      medicationId: '3',
      status: 'pending',
      scheduledTime: new Date().toISOString(),
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
  adherenceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  adherenceLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 14,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adherenceCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adherencePercent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#16a34a',
  },
  adherenceInfo: {
    flex: 1,
  },
  adherenceDetail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  adherenceDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 14,
  },
  medicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  medCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  medStatusTaken: {
    backgroundColor: '#22c55e',
  },
  medStatusSkipped: {
    backgroundColor: '#f87171',
  },
  medStatusPending: {
    backgroundColor: '#fbbf24',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  medDosage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
  },
  statusBadgeTaken: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeSkipped: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  statusBadgeTextTaken: {
    color: '#16a34a',
  },
  statusBadgeTextSkipped: {
    color: '#dc2626',
  },
  medActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  takenButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  takenButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  skippedButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skippedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  medListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  medPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  medPillIcon: {
    fontSize: 20,
  },
  medListInfo: {
    flex: 1,
  },
  medListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  medListDetails: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  medListSince: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
