import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClarityScoreProps {
  score: number; // 0-100
  trend?: 'improving' | 'stable' | 'declining';
  size?: number;
}

// ── Clarity Score Component ───────────────────────────────────────────────────

export default function ClarityScore({
  score,
  trend = 'stable',
  size = 160,
}: ClarityScoreProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const progressOffset = circumference - (clampedScore / 100) * circumference;

  const getScoreColor = (): string => {
    if (clampedScore >= 75) return '#22c55e';
    if (clampedScore >= 50) return '#84cc16';
    if (clampedScore >= 30) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (): string => {
    if (clampedScore >= 80) return 'Excelente';
    if (clampedScore >= 65) return 'Bom';
    if (clampedScore >= 50) return 'Razoável';
    if (clampedScore >= 30) return 'Baixo';
    return 'Muito Baixo';
  };

  const getTrendIcon = (): string => {
    switch (trend) {
      case 'improving': return '\u2197';
      case 'declining': return '\u2198';
      default: return '\u2192';
    }
  };

  const getTrendLabel = (): string => {
    switch (trend) {
      case 'improving': return 'Melhorando';
      case 'declining': return 'Em declínio';
      default: return 'Estável';
    }
  };

  const getTrendColor = (): string => {
    switch (trend) {
      case 'improving': return '#22c55e';
      case 'declining': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const scoreColor = getScoreColor();
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <View style={styles.container}>
      {/* Circular Gauge */}
      <View style={[styles.gaugeContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={scoreColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={scoreColor} stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${centerX} ${centerY})`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>
            {clampedScore}
          </Text>
          <Text style={styles.scoreLabel}>{getScoreLabel()}</Text>
        </View>
      </View>

      {/* Trend Indicator */}
      <View style={styles.trendContainer}>
        <Text style={[styles.trendIcon, { color: getTrendColor() }]}>
          {getTrendIcon()}
        </Text>
        <Text style={[styles.trendLabel, { color: getTrendColor() }]}>
          {getTrendLabel()}
        </Text>
      </View>

      {/* Score Breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.breakdownLabel}>Humor</Text>
        </View>
        <View style={styles.breakdownDivider} />
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.breakdownLabel}>Ansiedade</Text>
        </View>
        <View style={styles.breakdownDivider} />
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.breakdownLabel}>Energia</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gaugeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 50,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  breakdownDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
  },
});
