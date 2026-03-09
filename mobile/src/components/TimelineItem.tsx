import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { TimelineEntry } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineItemProps {
  entry: TimelineEntry;
}

// ── Type Configuration ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  {
    icon: string;
    iconShape: 'circle' | 'square' | 'triangle' | 'pill';
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  emotional_log: {
    icon: '\u25CF',
    iconShape: 'circle',
    color: '#22c55e',
    bgColor: '#dcfce7',
    label: 'Check-in',
  },
  life_event: {
    icon: '\u2605',
    iconShape: 'square',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    label: 'Evento de Vida',
  },
  medication: {
    icon: '\uD83D\uDC8A',
    iconShape: 'pill',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    label: 'Medicamento',
  },
  symptom: {
    icon: '\u25B2',
    iconShape: 'triangle',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    label: 'Sintoma',
  },
  assessment: {
    icon: '\u25A0',
    iconShape: 'square',
    color: '#14b8a6',
    bgColor: '#ccfbf1',
    label: 'Avaliação',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimelineDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    }
    if (isYesterday(date)) {
      return `Ontem às ${format(date, 'HH:mm')}`;
    }
    return format(date, "dd/MM 'às' HH:mm");
  } catch {
    return dateStr;
  }
}

// ── Timeline Item Component ───────────────────────────────────────────────────

export default function TimelineItem({ entry }: TimelineItemProps) {
  const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.emotional_log;

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.icon, { color: config.color }]}>
          {config.icon}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
            <Text style={[styles.typeBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {formatTimelineDate(entry.date)}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{entry.title}</Text>

        {/* Summary */}
        <Text style={styles.summary} numberOfLines={2}>
          {entry.summary}
        </Text>

        {/* Type-specific details */}
        {entry.type === 'emotional_log' && entry.data && (
          <View style={styles.moodIndicators}>
            <MiniIndicator
              label="Humor"
              value={entry.data.moodScore}
              color="#22c55e"
            />
            <MiniIndicator
              label="Ansiedade"
              value={entry.data.anxietyScore}
              color="#f59e0b"
            />
            <MiniIndicator
              label="Energia"
              value={entry.data.energyScore}
              color="#3b82f6"
            />
          </View>
        )}

        {entry.type === 'assessment' && entry.data && (
          <View style={styles.assessmentMeta}>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityBg(entry.data.severity) }]}>
              <Text style={[styles.severityText, { color: getSeverityColor(entry.data.severity) }]}>
                {entry.data.severity}
              </Text>
            </View>
          </View>
        )}

        {entry.type === 'life_event' && entry.data?.impactScore && (
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Impacto:</Text>
            <View style={styles.impactDots}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.impactDot,
                    {
                      backgroundColor:
                        i <= entry.data.impactScore
                          ? '#3b82f6'
                          : '#e5e7eb',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Mini Indicator Sub-component ──────────────────────────────────────────────

function MiniIndicator({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.miniIndicator}>
      <View style={[styles.miniDot, { backgroundColor: color }]} />
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'minimal': case 'mínimo': return '#22c55e';
    case 'mild': case 'leve': return '#84cc16';
    case 'moderate': case 'moderado': return '#f59e0b';
    case 'moderately severe': case 'moderadamente grave': return '#f97316';
    case 'severe': case 'grave': return '#ef4444';
    default: return '#6b7280';
  }
}

function getSeverityBg(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'minimal': case 'mínimo': return '#dcfce7';
    case 'mild': case 'leve': return '#ecfccb';
    case 'moderate': case 'moderado': return '#fef3c7';
    case 'moderately severe': case 'moderadamente grave': return '#ffedd5';
    case 'severe': case 'grave': return '#fee2e2';
    default: return '#f3f4f6';
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
  moodIndicators: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  miniIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  miniValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  assessmentMeta: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  impactLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  impactDots: {
    flexDirection: 'row',
    gap: 3,
  },
  impactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
