import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoodSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  lowLabel?: string;
  highLabel?: string;
  color?: string;
  min?: number;
  max?: number;
}

// ── Emoji Faces ───────────────────────────────────────────────────────────────

const MOOD_EMOJIS: Record<number, string> = {
  1: '\uD83D\uDE1E', // Very sad
  2: '\uD83D\uDE14', // Sad
  3: '\uD83D\uDE15', // Confused/uneasy
  4: '\uD83D\uDE10', // Neutral low
  5: '\uD83D\uDE42', // Slight smile
  6: '\uD83D\uDE0A', // Happy
  7: '\uD83D\uDE04', // Grinning
  8: '\uD83D\uDE03', // Big smile
  9: '\uD83E\uDD29', // Star eyes
  10: '\uD83E\uDD70', // Love
};

const MOOD_LABELS: Record<number, string> = {
  1: 'Muito Baixo',
  2: 'Baixo',
  3: 'Inquieto',
  4: 'OK',
  5: 'Razoável',
  6: 'Bom',
  7: 'Ótimo',
  8: 'Muito Bom',
  9: 'Maravilhoso',
  10: 'Incrível',
};

// ── Mood Slider Component ─────────────────────────────────────────────────────

export default function MoodSlider({
  value,
  onValueChange,
  label,
  lowLabel = 'Muito baixo',
  highLabel = 'Muito alto',
  color = '#22c55e',
  min = 1,
  max = 10,
}: MoodSliderProps) {
  const currentEmoji = MOOD_EMOJIS[value] || '\uD83D\uDE42';
  const currentLabel = MOOD_LABELS[value] || '';

  const getBackgroundColor = (val: number): string => {
    // Gradient from red-ish to green based on value
    if (color !== '#22c55e') {
      // For anxiety (orange) and energy (blue), use different palettes
      const opacity = 0.08 + (val / max) * 0.12;
      return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
    }
    const hue = ((val - 1) / (max - 1)) * 120; // 0 (red) to 120 (green)
    return `hsla(${hue}, 70%, 50%, 0.08)`;
  };

  return (
    <View style={styles.container}>
      {/* Emoji Display */}
      <View style={[styles.emojiContainer, { backgroundColor: getBackgroundColor(value) }]}>
        <Text style={styles.emoji}>{currentEmoji}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.valueText, { color }]}>{value}</Text>
          <Text style={styles.maxText}>/{max}</Text>
        </View>
        <Text style={styles.moodLabel}>{currentLabel}</Text>
      </View>

      {/* Emoji Strip */}
      <View style={styles.emojiStrip}>
        {[1, 3, 5, 7, 10].map((val) => (
          <Text
            key={val}
            style={[
              styles.stripEmoji,
              val === value && styles.stripEmojiActive,
            ]}
          >
            {MOOD_EMOJIS[val]}
          </Text>
        ))}
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={1}
          value={value}
          onValueChange={(val) => onValueChange(Math.round(val))}
          minimumTrackTintColor={color}
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor={color}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>{lowLabel}</Text>
          <Text style={styles.sliderLabelText}>{highLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  emojiContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 18,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: {
    fontSize: 32,
    fontWeight: '700',
  },
  maxText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  moodLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
  emojiStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  stripEmoji: {
    fontSize: 20,
    opacity: 0.3,
  },
  stripEmojiActive: {
    opacity: 1,
    fontSize: 24,
  },
  sliderContainer: {
    paddingHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
