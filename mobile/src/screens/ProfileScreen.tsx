import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../../App';
import { api, Professional } from '../services/api';

// ── Profile Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Data permission toggles
  const [permissions, setPermissions] = useState({
    shareEmotionalLogs: true,
    shareMedications: true,
    shareAssessments: true,
    shareLifeEvents: false,
    shareInsights: true,
  });

  // Notification toggles
  const [notifications, setNotifications] = useState({
    dailyCheckIn: true,
    medicationReminder: true,
    weeklyReport: true,
    insightAlerts: true,
  });

  const loadProfessionals = useCallback(async () => {
    try {
      const res = await api.getConnectedProfessionals();
      setProfessionals(res.data);
    } catch {
      setProfessionals([
        {
          id: '1',
          firstName: 'Dr. Sarah',
          lastName: 'Martinez',
          specialty: 'Psychiatrist',
          connectedSince: '2024-01-15',
        },
        {
          id: '2',
          firstName: 'Dr. James',
          lastName: 'Chen',
          specialty: 'Clinical Psychologist',
          connectedSince: '2024-02-01',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleDisconnect = (professional: Professional) => {
    Alert.alert(
      'Desconectar Profissional',
      `Tem certeza que deseja desconectar de ${professional.firstName} ${professional.lastName}? Eles não poderão mais visualizar seus dados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.disconnectProfessional(professional.id);
              setProfessionals((prev) =>
                prev.filter((p) => p.id !== professional.id)
              );
            } catch {
              Alert.alert('Erro', 'Não foi possível desconectar. Por favor, tente novamente.');
            }
          },
        },
      ]
    );
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const firstName = user?.firstName || 'Usuário';
  const lastName = user?.lastName || '';
  const email = user?.email || 'user@example.com';
  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMMM yyyy')
    : 'Recentemente';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {firstName.charAt(0)}
            {lastName.charAt(0)}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {firstName} {lastName}
        </Text>
        <Text style={styles.profileEmail}>{email}</Text>
        <Text style={styles.profileMemberSince}>
          Membro desde {memberSince}
        </Text>
      </View>

      {/* Personal Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Nome" value={firstName} />
          <InfoRow label="Sobrenome" value={lastName} />
          <InfoRow label="Email" value={email} />
          <InfoRow
            label="Data de Nascimento"
            value={user?.dateOfBirth || 'Não definido'}
          />
          <InfoRow label="Gênero" value={user?.gender || 'Não definido'} last />
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Connected Professionals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profissionais Conectados</Text>
        {isLoading ? (
          <ActivityIndicator color="#22c55e" style={{ marginVertical: 20 }} />
        ) : professionals.length > 0 ? (
          professionals.map((prof) => (
            <View key={prof.id} style={styles.professionalCard}>
              <View style={styles.profAvatar}>
                <Text style={styles.profAvatarText}>
                  {prof.firstName.charAt(0)}
                </Text>
              </View>
              <View style={styles.profInfo}>
                <Text style={styles.profName}>
                  {prof.firstName} {prof.lastName}
                </Text>
                <Text style={styles.profSpecialty}>{prof.specialty}</Text>
                <Text style={styles.profSince}>
                  Conectado desde {format(new Date(prof.connectedSince), 'MM/yyyy')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => handleDisconnect(prof)}
              >
                <Text style={styles.disconnectText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyProfessionals}>
            <Text style={styles.emptyText}>
              Nenhum profissional conectado ainda
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.connectButton}>
          <Text style={styles.connectButtonText}>+ Conectar um Profissional</Text>
        </TouchableOpacity>
      </View>

      {/* Data Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissões de Dados</Text>
        <Text style={styles.sectionSubtitle}>
          Controle o que seus profissionais conectados podem ver
        </Text>
        <View style={styles.toggleCard}>
          <ToggleRow
            label="Registros Emocionais"
            description="Pontuações de humor, ansiedade e energia"
            value={permissions.shareEmotionalLogs}
            onToggle={() => togglePermission('shareEmotionalLogs')}
          />
          <ToggleRow
            label="Medicamentos"
            description="Lista de medicamentos e adesão"
            value={permissions.shareMedications}
            onToggle={() => togglePermission('shareMedications')}
          />
          <ToggleRow
            label="Avaliações"
            description="Resultados do PHQ-9 e GAD-7"
            value={permissions.shareAssessments}
            onToggle={() => togglePermission('shareAssessments')}
          />
          <ToggleRow
            label="Eventos de Vida"
            description="Eventos pessoais de vida"
            value={permissions.shareLifeEvents}
            onToggle={() => togglePermission('shareLifeEvents')}
          />
          <ToggleRow
            label="Insights de IA"
            description="Análise de padrões e tendências"
            value={permissions.shareInsights}
            onToggle={() => togglePermission('shareInsights')}
            last
          />
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        <View style={styles.toggleCard}>
          <ToggleRow
            label="Lembrete de Check-in Diário"
            description="Lembrete gentil para registrar como você se sente"
            value={notifications.dailyCheckIn}
            onToggle={() => toggleNotification('dailyCheckIn')}
          />
          <ToggleRow
            label="Lembretes de Medicação"
            description="Lembretes para tomar seus medicamentos"
            value={notifications.medicationReminder}
            onToggle={() => toggleNotification('medicationReminder')}
          />
          <ToggleRow
            label="Relatório Semanal"
            description="Resumo do seu progresso semanal"
            value={notifications.weeklyReport}
            onToggle={() => toggleNotification('weeklyReport')}
          />
          <ToggleRow
            label="Alertas de Insights"
            description="Notificação quando novos padrões são encontrados"
            value={notifications.insightAlerts}
            onToggle={() => toggleNotification('insightAlerts')}
            last
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Clarita v1.0.0</Text>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});

function ToggleRow({
  label,
  description,
  value,
  onToggle,
  last = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  return (
    <View style={[toggleStyles.row, !last && toggleStyles.rowBorder]}>
      <View style={toggleStyles.textContainer}>
        <Text style={toggleStyles.label}>{label}</Text>
        <Text style={toggleStyles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
        thumbColor={value ? '#22c55e' : '#9ca3af'}
        ios_backgroundColor="#e5e7eb"
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#22c55e',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  profileMemberSince: {
    fontSize: 13,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 10,
  },
  editButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  professionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  profInfo: {
    flex: 1,
  },
  profName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  profSpecialty: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 1,
  },
  profSince: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  disconnectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyProfessionals: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  connectButton: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderStyle: 'dashed',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  toggleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionText: {
    fontSize: 12,
    color: '#d1d5db',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
