"""
CLARITA AI Engine - Pattern Detection Module

Detects statistically meaningful patterns in the patient feature matrix:
  - Pairwise correlations between variables
  - Upward / downward trends via linear regression on rolling windows
  - Cyclical (weekly) patterns in mood and anxiety
  - Event-mood correlations (mood changes around life events)
"""

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)

# Minimum data points required for reliable statistics
_MIN_POINTS = 14


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_patterns(
    features: pd.DataFrame,
    life_events: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Run all pattern detectors on the feature matrix and return a flat
    list of pattern dicts.

    Each pattern dict contains:
      - pattern_type  : str  (correlation | trend | cyclical | event_correlation)
      - description   : str  (human-readable explanation)
      - confidence    : float (0.0 - 1.0)
      - details       : dict  (supporting numbers)

    Parameters
    ----------
    features : pd.DataFrame
        Daily-indexed feature matrix from ``feature_engineering``.
    life_events : list[dict]
        Raw life event rows (used for event-mood analysis).

    Returns
    -------
    list[dict]
    """
    if features.empty or len(features) < _MIN_POINTS:
        logger.info("Insufficient data for pattern detection (%d rows).", len(features))
        return []

    patterns: List[Dict[str, Any]] = []
    patterns.extend(_correlation_analysis(features))
    patterns.extend(_trend_detection(features))
    patterns.extend(_cyclical_patterns(features))
    patterns.extend(_event_mood_correlation(features, life_events))

    logger.info("Detected %d patterns.", len(patterns))
    return patterns


# ---------------------------------------------------------------------------
# Correlation analysis
# ---------------------------------------------------------------------------

_INTERESTING_PAIRS = [
    ('sleep_quality', 'mood'),
    ('sleep_hours', 'mood'),
    ('sleep_quality', 'anxiety'),
    ('sleep_hours', 'anxiety'),
    ('energy', 'mood'),
    ('energy', 'anxiety'),
    ('med_adherence', 'mood'),
    ('med_adherence', 'anxiety'),
    ('symptom_count', 'mood'),
    ('symptom_count', 'anxiety'),
    ('event_impact', 'mood'),
    ('event_impact', 'anxiety'),
]

_PAIR_LABELS = {
    ('sleep_quality', 'mood'): ('qualidade do sono', 'humor'),
    ('sleep_hours', 'mood'): ('duração do sono', 'humor'),
    ('sleep_quality', 'anxiety'): ('qualidade do sono', 'ansiedade'),
    ('sleep_hours', 'anxiety'): ('duração do sono', 'ansiedade'),
    ('energy', 'mood'): ('nível de energia', 'humor'),
    ('energy', 'anxiety'): ('nível de energia', 'ansiedade'),
    ('med_adherence', 'mood'): ('adesão à medicação', 'humor'),
    ('med_adherence', 'anxiety'): ('adesão à medicação', 'ansiedade'),
    ('symptom_count', 'mood'): ('frequência de sintomas', 'humor'),
    ('symptom_count', 'anxiety'): ('frequência de sintomas', 'ansiedade'),
    ('event_impact', 'mood'): ('impacto de eventos de vida', 'humor'),
    ('event_impact', 'anxiety'): ('impacto de eventos de vida', 'ansiedade'),
}


def _correlation_analysis(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """Compute Pearson correlations between clinically interesting variable pairs."""
    patterns: List[Dict[str, Any]] = []

    for col_a, col_b in _INTERESTING_PAIRS:
        if col_a not in features.columns or col_b not in features.columns:
            continue

        valid = features[[col_a, col_b]].dropna()
        if len(valid) < _MIN_POINTS:
            continue

        r, p_value = stats.pearsonr(valid[col_a], valid[col_b])

        # Skip NaN or non-meaningful correlations (|r| >= 0.3, p < 0.05)
        if np.isnan(r) or np.isnan(p_value) or abs(r) < 0.3 or p_value >= 0.05:
            continue

        label_a, label_b = _PAIR_LABELS.get((col_a, col_b), (col_a, col_b))
        direction = 'positive' if r > 0 else 'negative'
        strength = _correlation_strength(abs(r))

        strength_pt = {'strong': 'forte', 'moderate': 'moderada', 'mild': 'leve'}.get(strength, strength)
        direction_pt = 'positiva' if direction == 'positive' else 'negativa'
        description = (
            f"Uma correlação {strength_pt} {direction_pt} foi encontrada entre "
            f"{label_a} e {label_b} (r = {r:.2f}, p = {p_value:.4f}). "
        )
        if direction == 'positive':
            description += f"Maior {label_a} tende a coincidir com maior {label_b}."
        else:
            description += f"Maior {label_a} tende a coincidir com menor {label_b}."

        confidence = min(1.0, abs(r))

        patterns.append({
            'pattern_type': 'correlation',
            'description': description,
            'confidence': round(confidence, 3),
            'details': {
                'variable_a': col_a,
                'variable_b': col_b,
                'pearson_r': round(float(r), 4),
                'p_value': round(float(p_value), 6),
                'n_observations': len(valid),
                'direction': direction,
                'strength': strength,
            },
        })

    return patterns


def _correlation_strength(abs_r: float) -> str:
    if abs_r >= 0.7:
        return 'strong'
    if abs_r >= 0.5:
        return 'moderate'
    return 'mild'


# ---------------------------------------------------------------------------
# Trend detection
# ---------------------------------------------------------------------------

_TREND_COLS = ['mood', 'anxiety', 'energy']
_TREND_WINDOWS = [14, 30]


def _trend_detection(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Detect significant upward/downward trends using linear regression
    on rolling windows of 14 and 30 days.
    """
    patterns: List[Dict[str, Any]] = []

    for col in _TREND_COLS:
        if col not in features.columns:
            continue

        series = features[col].dropna()
        if len(series) < _MIN_POINTS:
            continue

        for window in _TREND_WINDOWS:
            if len(series) < window:
                continue

            # Analyse the most recent *window* days
            recent = series.iloc[-window:]
            x = np.arange(len(recent))
            y = recent.values

            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

            # Require meaningful slope and statistical significance
            if abs(slope) < 0.03 or p_value >= 0.05:
                continue

            direction = 'upward' if slope > 0 else 'downward'
            total_change = slope * (window - 1)
            label = col.replace('_', ' ')

            # Interpret direction in clinical context
            if col == 'anxiety':
                quality = 'worsening' if slope > 0 else 'improving'
            else:
                quality = 'improving' if slope > 0 else 'worsening'

            direction_pt = 'ascendente' if direction == 'upward' else 'descendente'
            quality_pt = 'piora' if quality == 'worsening' else 'melhora'

            description = (
                f"{label.capitalize()} apresenta uma tendência {direction_pt} de {quality_pt} nos "
                f"últimos {window} dias (inclinação = {slope:+.3f}/dia, variação total ~{total_change:+.1f} pontos, "
                f"R\u00b2 = {r_value**2:.2f})."
            )

            confidence = min(1.0, abs(r_value))

            patterns.append({
                'pattern_type': 'trend',
                'description': description,
                'confidence': round(confidence, 3),
                'details': {
                    'variable': col,
                    'window_days': window,
                    'slope_per_day': round(float(slope), 4),
                    'total_change': round(float(total_change), 2),
                    'r_squared': round(float(r_value ** 2), 4),
                    'p_value': round(float(p_value), 6),
                    'direction': direction,
                    'clinical_interpretation': quality,
                },
            })

    return patterns


# ---------------------------------------------------------------------------
# Cyclical (weekly) patterns
# ---------------------------------------------------------------------------

def _cyclical_patterns(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Detect weekly patterns by comparing mean values across days of the week
    using one-way ANOVA.
    """
    patterns: List[Dict[str, Any]] = []

    for col in ['mood', 'anxiety', 'energy']:
        if col not in features.columns:
            continue

        series = features[col].dropna()
        if len(series) < 21:  # need at least 3 full weeks
            continue

        # Group by day-of-week (0 = Monday, 6 = Sunday)
        df_temp = pd.DataFrame({'value': series, 'dow': series.index.dayofweek})
        groups = [g['value'].values for _, g in df_temp.groupby('dow') if len(g) >= 2]

        if len(groups) < 4:
            continue

        f_stat, p_value = stats.f_oneway(*groups)

        if p_value >= 0.05:
            continue

        # Find best and worst days
        dow_means = df_temp.groupby('dow')['value'].mean()
        day_names = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
                     'Sexta-feira', 'Sábado', 'Domingo']
        best_day_idx = int(dow_means.idxmax())
        worst_day_idx = int(dow_means.idxmin())
        best_day = day_names[best_day_idx]
        worst_day = day_names[worst_day_idx]
        range_diff = float(dow_means.max() - dow_means.min())

        label = col.replace('_', ' ')
        description = (
            f"Um padrão semanal foi detectado em {label}: {label} tende a ser "
            f"mais alto às {best_day}s ({dow_means.max():.1f}) e mais baixo às "
            f"{worst_day}s ({dow_means.min():.1f}), uma diferença de "
            f"{range_diff:.1f} pontos (ANOVA F = {f_stat:.2f}, p = {p_value:.4f})."
        )

        confidence = min(1.0, 1.0 - p_value)

        patterns.append({
            'pattern_type': 'cyclical',
            'description': description,
            'confidence': round(confidence, 3),
            'details': {
                'variable': col,
                'f_statistic': round(float(f_stat), 4),
                'p_value': round(float(p_value), 6),
                'best_day': best_day,
                'worst_day': worst_day,
                'day_means': {day_names[i]: round(float(v), 2) for i, v in dow_means.items()},
                'range': round(range_diff, 2),
            },
        })

    return patterns


# ---------------------------------------------------------------------------
# Event-mood correlation
# ---------------------------------------------------------------------------

def _event_mood_correlation(
    features: pd.DataFrame,
    life_events: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Analyse mood changes in a +/- 3 day window around each life event.
    """
    patterns: List[Dict[str, Any]] = []

    if 'mood' not in features.columns or not life_events:
        return patterns

    mood = features['mood'].dropna()
    if len(mood) < _MIN_POINTS:
        return patterns

    event_effects: List[Dict[str, Any]] = []

    for event in life_events:
        event_date = event['event_date']
        if isinstance(event_date, str):
            event_date = pd.to_datetime(event_date)
        elif not isinstance(event_date, pd.Timestamp):
            event_date = pd.Timestamp(event_date)

        # Window: 3 days before and after
        before_start = event_date - pd.Timedelta(days=3)
        after_end = event_date + pd.Timedelta(days=3)

        before_mask = (mood.index >= before_start) & (mood.index < event_date)
        after_mask = (mood.index > event_date) & (mood.index <= after_end)

        before_mood = mood[before_mask]
        after_mood = mood[after_mask]

        if len(before_mood) < 1 or len(after_mood) < 1:
            continue

        diff = float(after_mood.mean() - before_mood.mean())
        event_effects.append({
            'title': event.get('title', 'Unknown'),
            'category': event.get('category', 'other'),
            'impact_level': event.get('impact_level', 5),
            'event_date': str(event_date.date()),
            'mood_before': round(float(before_mood.mean()), 2),
            'mood_after': round(float(after_mood.mean()), 2),
            'mood_change': round(diff, 2),
        })

    if not event_effects:
        return patterns

    # Aggregate by category
    cat_effects: Dict[str, List[float]] = {}
    for eff in event_effects:
        cat = eff['category']
        cat_effects.setdefault(cat, []).append(eff['mood_change'])

    for category, changes in cat_effects.items():
        if len(changes) < 2:
            continue
        mean_change = float(np.mean(changes))
        if abs(mean_change) < 0.5:
            continue

        direction = 'melhora' if mean_change > 0 else 'declínio'
        description = (
            f"Eventos de vida na categoria '{category}' estão associados a "
            f"um {direction} médio de humor de {abs(mean_change):.1f} pontos "
            f"(baseado em {len(changes)} eventos)."
        )

        confidence = min(1.0, abs(mean_change) / 3.0)

        patterns.append({
            'pattern_type': 'event_correlation',
            'description': description,
            'confidence': round(confidence, 3),
            'details': {
                'event_category': category,
                'mean_mood_change': round(mean_change, 3),
                'n_events': len(changes),
                'individual_effects': [
                    e for e in event_effects if e['category'] == category
                ],
            },
        })

    return patterns
