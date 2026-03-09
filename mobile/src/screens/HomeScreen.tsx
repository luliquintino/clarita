import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { format } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../App';
import { api, EmotionalLog, Insight } from '../services/api';
import ClarityScore from '../components/ClarityScore';
import InsightCard from '../components/InsightCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [clarityScore, setClarityScore] = useState(72);
  const [scoreTrend, setScoreTrend] = useState<'improving' | 'stable' | 'declining'>('stable');
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [moodTrend, setMoodTrend] = useState<number[]>([6, 5, 7, 6, 8, 7, 7]);
  const [moodDates, setMoodDates] = useState<string[]>([]);

  const today = new Date();
  const greeting = getGreeting();
  const firstName = user?.firstName || 'Amigo';

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 17) return 'Boa tarde';
    return 'Boa noite';
  }

  const loadDashboardData = useCallback(async () => {
    try {
      // Load clarity score
      const scoreRes = await api.getClarityScore();
      setClarityScore(scoreRes.data.score);
      setScoreTrend(scoreRes.data.trend);
    } catch {
      // Use defaults
    }

    try {
      // Check if user has done daily check-in
      const logsRes = await api.getEmotionalLogs({
        startDate: format(today, 'yyyy-MM-dd'),
        limit: 1,
      });
      setHasCheckedInToday(logsRes.data.length > 0);
    } catch {
      // Use default
    }

    try {
      // Load insights
      const insightsRes = await api.getInsights({ limit: 2 });
      setInsights(insightsRes.data);
    } catch {
      // Use mock insights
      setInsights([
        {
          id: '1',
          type: 'pattern',
          title: 'Conexão entre Sono e Humor',
          description: 'Suas pontuações de humor tendem a ser mais altas nos dias em que você dorme 7+ horas.',
          confidence: 0.85,
          impact: 'high',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'trend',
          title: 'Tendência Positiva de Energia',
          description: 'Seus níveis médios de energia aumentaram 15% esta semana.',
          confidence: 0.78,
          impact: 'medium',
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    try {
      // Load mood trend
      const trendRes = await api.getMoodTrend(7);
      setMoodTrend(trendRes.data.moods);
      setMoodDates(trendRes.data.dates);
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const trendLabels = moodDates.length
    ? moodDates.map((d) => {
        try {
          return format(new Date(d), 'EEE');
        } catch {
          return '';
        }
      })
    : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting}, {firstName}
          </Text>
          <Text style={styles.dateText}>{format(today, 'EEEE, MMMM d')}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Clarity Score */}
      <View style={styles.clarityScoreCard}>
        <Text style={styles.sectionLabel}>Índice de Clareza Mental</Text>
        <ClarityScore score={clarityScore} trend={scoreTrend} />
      </View>

      {/* Daily Check-in Card */}
      <TouchableOpacity
        style={[
          styles.checkInCard,
          hasCheckedInToday ? styles.checkInCompleted : styles.checkInPending,
        ]}
        onPress={() => {
          if (!hasCheckedInToday) {
            navigation.navigate('Check-in');
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.checkInContent}>
          <View
            style={[
              styles.checkInIcon,
              { backgroundColor: hasCheckedInToday ? '#dcfce7' : '#fef3c7' },
            ]}
          >
            <Text style={styles.checkInIconText}>
              {hasCheckedInToday ? '\u2713' : '\u2661'}
            </Text>
          </View>
          <View style={styles.checkInTextContainer}>
            <Text style={styles.checkInTitle}>
              {hasCheckedInToday ? 'Check-in Concluído' : 'Check-in Diário'}
            </Text>
            <Text style={styles.checkInSubtitle}>
              {hasCheckedInToday
                ? 'Ótimo trabalho cuidando de si mesmo hoje'
                : 'Reserve um momento para refletir sobre como você se sente'}
            </Text>
          </View>
        </View>
        {!hasCheckedInToday && (
          <Text style={styles.checkInArrow}>{'\u203A'}</Text>
        )}
      </TouchableOpacity>

      {/* Recent Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Insights Recentes</Text>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>
      )}

      {/* 7-Day Mood Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tendência Emocional</Text>
        <View style={styles.trendCard}>
          <Text style={styles.trendSubtitle}>Pontuações de humor dos últimos 7 dias</Text>
          <LineChart
            data={{
              labels: trendLabels,
              datasets: [
                {
                  data: moodTrend.length ? moodTrend : [5, 5, 5, 5, 5, 5, 5],
                  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                  strokeWidth: 2.5,
                },
              ],
            }}
            width={SCREEN_WIDTH - 80}
            height={140}
            withDots={true}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={false}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              labelColor: () => '#9ca3af',
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#22c55e',
                fill: '#ffffff',
              },
              propsForLabels: {
                fontSize: 11,
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Ações Rápidas</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Check-in')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCDD'}</Text>
            </View>
            <Text style={styles.quickActionLabel}>Registrar Sintoma</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {}}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.quickActionEmoji}>{'\u2605'}</Text>
            </View>
            <Text style={styles.quickActionLabel}>Evento de Vida</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Medications')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#ede9fe' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDC8A'}</Text>
            </View>
            <Text style={styles.quickActionLabel}>Medicamento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Assessments')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#fdf8f0' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCCB'}</Text>
            </View>
            <Text style={styles.quickActionLabel}>Avaliação</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  clarityScoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 14,
  },
  checkInCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkInCompleted: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  checkInPending: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkInIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkInIconText: {
    fontSize: 20,
    color: '#16a34a',
  },
  checkInTextContainer: {
    flex: 1,
  },
  checkInTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 3,
  },
  checkInSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  checkInArrow: {
    fontSize: 28,
    color: '#d97706',
    fontWeight: '300',
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  trendCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  trendSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
