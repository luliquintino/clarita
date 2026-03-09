import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { format, subDays, startOfDay } from 'date-fns';
import { api, TimelineEntry } from '../services/api';
import TimelineItem from '../components/TimelineItem';

// ── Filter Types ──────────────────────────────────────────────────────────────

type FilterType = 'all' | 'emotional_log' | 'life_event' | 'medication' | 'symptom' | 'assessment';

const FILTERS: { key: FilterType; label: string; color: string }[] = [
  { key: 'all', label: 'Todos', color: '#6b7280' },
  { key: 'emotional_log', label: 'Emoções', color: '#22c55e' },
  { key: 'life_event', label: 'Eventos', color: '#3b82f6' },
  { key: 'medication', label: 'Meds', color: '#8b5cf6' },
  { key: 'symptom', label: 'Sintomas', color: '#f59e0b' },
  { key: 'assessment', label: 'Avaliações', color: '#14b8a6' },
];

// ── Date Range Presets ────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '3 meses' },
  { key: 'all', label: 'Todo período' },
];

// ── Timeline Screen ───────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimelineEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getStartDate = (range: DateRange): string | undefined => {
    const today = new Date();
    switch (range) {
      case '7d':
        return format(subDays(today, 7), 'yyyy-MM-dd');
      case '30d':
        return format(subDays(today, 30), 'yyyy-MM-dd');
      case '90d':
        return format(subDays(today, 90), 'yyyy-MM-dd');
      default:
        return undefined;
    }
  };

  const loadTimeline = useCallback(async () => {
    try {
      const startDate = getStartDate(dateRange);
      const response = await api.getTimeline({
        startDate,
        types: activeFilter === 'all' ? undefined : [activeFilter],
      });
      setEntries(response.data);
    } catch (error) {
      // Use mock data for demonstration
      setEntries(generateMockTimeline());
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, activeFilter]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredEntries(entries);
    } else {
      setFilteredEntries(entries.filter((e) => e.type === activeFilter));
    }
  }, [entries, activeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimeline();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Linha do Tempo</Text>
        <Text style={styles.subtitle}>Sua jornada de saúde mental</Text>
      </View>

      {/* Date Range */}
      <View style={styles.dateRangeContainer}>
        {DATE_RANGES.map((range) => (
          <TouchableOpacity
            key={range.key}
            style={[
              styles.dateRangeChip,
              dateRange === range.key && styles.dateRangeChipActive,
            ]}
            onPress={() => setDateRange(range.key)}
          >
            <Text
              style={[
                styles.dateRangeText,
                dateRange === range.key && styles.dateRangeTextActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type Filters */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === item.key && {
                backgroundColor: item.color + '18',
                borderColor: item.color,
              },
            ]}
            onPress={() => setActiveFilter(item.key)}
          >
            {item.key !== 'all' && (
              <View
                style={[styles.filterDot, { backgroundColor: item.color }]}
              />
            )}
            <Text
              style={[
                styles.filterText,
                activeFilter === item.key && { color: item.color, fontWeight: '600' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Entry Count */}
      <Text style={styles.entryCount}>
        {filteredEntries.length} {filteredEntries.length === 1 ? 'registro' : 'registros'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Carregando sua linha do tempo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <View style={styles.timelineEntryWrapper}>
            {/* Timeline line */}
            {index < filteredEntries.length - 1 && (
              <View style={styles.timelineLine} />
            )}
            <TimelineItem entry={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\uD83C\uDF31'}</Text>
            <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
            <Text style={styles.emptyText}>
              Comece fazendo seu primeiro check-in diário. Sua linha do tempo crescerá conforme você registrar suas experiências.
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
      />
    </View>
  );
}

// ── Mock Data Generator ───────────────────────────────────────────────────────

function generateMockTimeline(): TimelineEntry[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'emotional_log',
      title: 'Check-in Diário',
      summary: 'Humor: 7/10 | Ansiedade: 3/10 | Energia: 6/10',
      date: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
      data: { moodScore: 7, anxietyScore: 3, energyScore: 6 },
    },
    {
      id: '2',
      type: 'medication',
      title: 'Medicamento Tomado',
      summary: 'Sertralina 50mg -- dose da manhã',
      date: format(now, "yyyy-MM-dd'T'08:00:00"),
      data: { name: 'Sertraline', dosage: '50mg', status: 'taken' },
    },
    {
      id: '3',
      type: 'life_event',
      title: 'Começou Novo Emprego',
      summary: 'Começou a nova posição no trabalho. Sentindo uma mistura de empolgação e nervosismo.',
      date: format(subDays(now, 1), "yyyy-MM-dd'T'10:00:00"),
      data: { category: 'career', impactScore: 7 },
    },
    {
      id: '4',
      type: 'emotional_log',
      title: 'Check-in Diário',
      summary: 'Humor: 5/10 | Ansiedade: 6/10 | Energia: 4/10',
      date: format(subDays(now, 1), "yyyy-MM-dd'T'21:00:00"),
      data: { moodScore: 5, anxietyScore: 6, energyScore: 4 },
    },
    {
      id: '5',
      type: 'symptom',
      title: 'Relato de Sintoma',
      summary: 'Dor de cabeça -- gravidade moderada, durou 3 horas',
      date: format(subDays(now, 2), "yyyy-MM-dd'T'14:00:00"),
      data: { symptom: 'Headache', severity: 5 },
    },
    {
      id: '6',
      type: 'assessment',
      title: 'PHQ-9 Concluído',
      summary: 'Pontuação: 8/27 -- Depressão leve',
      date: format(subDays(now, 3), "yyyy-MM-dd'T'09:00:00"),
      data: { type: 'PHQ-9', score: 8, severity: 'Mild' },
    },
    {
      id: '7',
      type: 'emotional_log',
      title: 'Check-in Diário',
      summary: 'Humor: 8/10 | Ansiedade: 2/10 | Energia: 8/10',
      date: format(subDays(now, 3), "yyyy-MM-dd'T'20:00:00"),
      data: { moodScore: 8, anxietyScore: 2, energyScore: 8 },
    },
    {
      id: '8',
      type: 'medication',
      title: 'Mudança de Medicamento',
      summary: 'Dosagem de Sertralina aumentada para 50mg (de 25mg)',
      date: format(subDays(now, 5), "yyyy-MM-dd'T'11:00:00"),
      data: { name: 'Sertraline', oldDosage: '25mg', newDosage: '50mg' },
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
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dateRangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  dateRangeChipActive: {
    backgroundColor: '#1f2937',
  },
  dateRangeText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  dateRangeTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filtersContainer: {
    paddingBottom: 14,
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
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  entryCount: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  timelineEntryWrapper: {
    position: 'relative',
    paddingLeft: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 44,
    bottom: -8,
    width: 2,
    backgroundColor: '#e5e7eb',
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
