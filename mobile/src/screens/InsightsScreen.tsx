import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { api, Insight } from '../services/api';
import InsightCard from '../components/InsightCard';

// ── Filter Types ──────────────────────────────────────────────────────────────

type InsightFilter = 'all' | 'pattern' | 'anomaly' | 'trend' | 'recommendation';

const INSIGHT_FILTERS: { key: InsightFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: '\u2726' },
  { key: 'pattern', label: 'Padrões', icon: '\u223F' },
  { key: 'anomaly', label: 'Anomalias', icon: '\u26A0' },
  { key: 'trend', label: 'Tendências', icon: '\u2197' },
  { key: 'recommendation', label: 'Dicas', icon: '\u2606' },
];

// ── Insights Screen ───────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeFilter, setActiveFilter] = useState<InsightFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const response = await api.getInsights({ limit: 20 });
      setInsights(response.data);
    } catch (error) {
      // Use mock data for demonstration
      setInsights(generateMockInsights());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const filteredInsights =
    activeFilter === 'all'
      ? insights
      : insights.filter((i) => i.type === activeFilter);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Padrões e observações baseados em IA a partir dos seus dados
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.summaryNumber}>
            {insights.filter((i) => i.type === 'pattern').length}
          </Text>
          <Text style={styles.summaryLabel}>Padrões</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={styles.summaryNumber}>
            {insights.filter((i) => i.type === 'trend').length}
          </Text>
          <Text style={styles.summaryLabel}>Tendências</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.summaryNumber}>
            {insights.filter((i) => i.type === 'anomaly').length}
          </Text>
          <Text style={styles.summaryLabel}>Alertas</Text>
        </View>
      </View>

      {/* Filters */}
      <FlatList
        data={INSIGHT_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === item.key && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(item.key)}
          >
            <Text
              style={[
                styles.filterIcon,
                activeFilter === item.key && styles.filterIconActive,
              ]}
            >
              {item.icon}
            </Text>
            <Text
              style={[
                styles.filterText,
                activeFilter === item.key && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Analisando seus dados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredInsights}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <InsightCard insight={item} expanded />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDD2E'}</Text>
            <Text style={styles.emptyTitle}>Nenhum insight ainda</Text>
            <Text style={styles.emptyText}>
              Conforme você registrar mais check-ins, nossa IA encontrará padrões significativos e oferecerá observações personalizadas.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

function generateMockInsights(): Insight[] {
  return [
    {
      id: '1',
      type: 'pattern',
      title: 'Conexão entre Sono e Humor',
      description:
        'Quando você dorme 7 ou mais horas, suas pontuações de humor são em média 2,3 pontos mais altas no dia seguinte. Priorizar o sono pode ser uma das coisas mais impactantes que você pode fazer pelo seu bem-estar.',
      confidence: 0.89,
      impact: 'high',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'trend',
      title: 'Tendência Positiva de Energia',
      description:
        'Seus níveis médios de energia aumentaram 15% nas últimas duas semanas. Essa tendência de alta coincide com a maior consistência do seu sono.',
      confidence: 0.82,
      impact: 'medium',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      type: 'anomaly',
      title: 'Pico Incomum de Ansiedade',
      description:
        'Sua pontuação de ansiedade ontem (8/10) foi significativamente mais alta que sua média recente (3,2). Pode valer a pena discutir isso com sua equipe de saúde.',
      confidence: 0.94,
      impact: 'high',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: '4',
      type: 'pattern',
      title: 'Padrões Dia de Semana vs Fim de Semana',
      description:
        'Seu humor tende a ser 1,5 pontos mais alto nos fins de semana comparado aos dias de semana. Considere quais atividades de fim de semana te trazem alegria e como incorporar versões menores nos seus dias de semana.',
      confidence: 0.76,
      impact: 'medium',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: '5',
      type: 'recommendation',
      title: 'Horário Consistente de Check-in',
      description:
        'Você tende a fazer check-in em horários variados. Pesquisas mostram que registrar no mesmo horário todos os dias aumenta a autoconsciência e facilita a detecção de padrões.',
      confidence: 0.71,
      impact: 'low',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: '6',
      type: 'trend',
      title: 'Adesão à Medicação Melhorando',
      description:
        'Sua adesão à medicação melhorou de 72% para 91% nas últimas 3 semanas. Ótimo progresso -- consistência com a medicação pode ter efeitos significativos ao longo do tempo.',
      confidence: 0.88,
      impact: 'high',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  listContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  filterIcon: {
    fontSize: 14,
    color: '#9ca3af',
  },
  filterIconActive: {
    color: '#16a34a',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#16a34a',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fefdfb',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
  },
});
