import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Insight } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: Insight;
  expanded?: boolean;
}

// ── Type Configuration ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string; label: string }
> = {
  pattern: {
    icon: '\u223F',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    label: 'Padrão',
  },
  anomaly: {
    icon: '\u26A0',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    label: 'Alerta',
  },
  trend: {
    icon: '\u2197',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    label: 'Tendência',
  },
  recommendation: {
    icon: '\u2606',
    color: '#22c55e',
    bgColor: '#dcfce7',
    label: 'Dica',
  },
};

const IMPACT_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: '#ef4444', label: 'Alto impacto' },
  medium: { color: '#f59e0b', label: 'Médio impacto' },
  low: { color: '#6b7280', label: 'Baixo impacto' },
};

// ── Insight Card Component ────────────────────────────────────────────────────

export default function InsightCard({ insight, expanded = false }: InsightCardProps) {
  const typeConfig = TYPE_CONFIG[insight.type] || TYPE_CONFIG.pattern;
  const impactConfig = IMPACT_CONFIG[insight.impact] || IMPACT_CONFIG.low;
  const confidencePercent = Math.round(insight.confidence * 100);

  return (
    <View style={[styles.card, { borderLeftColor: typeConfig.color }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeIcon, { backgroundColor: typeConfig.bgColor }]}>
          <Text style={[styles.typeIconText, { color: typeConfig.color }]}>
            {typeConfig.icon}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
            {insight.title}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
              <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Description */}
      <Text
        style={styles.description}
        numberOfLines={expanded ? undefined : 3}
      >
        {insight.description}
      </Text>

      {/* Footer: Confidence & Impact */}
      <View style={styles.footer}>
        {/* Confidence Bar */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confiança</Text>
          <View style={styles.confidenceBarContainer}>
            <View style={styles.confidenceBarBg}>
              <View
                style={[
                  styles.confidenceBarFill,
                  {
                    width: `${confidencePercent}%`,
                    backgroundColor: typeConfig.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.confidencePercent}>{confidencePercent}%</Text>
          </View>
        </View>

        {/* Impact Indicator */}
        <View style={styles.impactContainer}>
          <View
            style={[styles.impactDot, { backgroundColor: impactConfig.color }]}
          />
          <Text style={[styles.impactLabel, { color: impactConfig.color }]}>
            {impactConfig.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  confidenceContainer: {
    flex: 1,
    marginRight: 16,
  },
  confidenceLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 4,
  },
  confidenceBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidencePercent: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  impactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
