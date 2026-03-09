"""
CLARITA AI Engine - DSM-Inspired Pattern Detection

Rule-based pattern detection inspired by DSM criteria.  These checks are
**NOT diagnostic** -- they only flag combinations of data that are
*compatible with* clinical patterns so that a licensed professional can
investigate further.

Implemented patterns
--------------------
1. Depressive Episode Pattern
2. Anxiety Disorder Pattern
3. Mixed Anxiety-Depression Pattern
4. Rapid Mood Cycling Pattern

Every returned pattern uses "compatible with" language and explicitly
states it is not a diagnosis.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_DISCLAIMER = (
    "Isto NÃO é um diagnóstico. É uma observação baseada em dados que deve "
    "ser revisada por um profissional de saúde mental qualificado."
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_dsm_patterns(
    features: pd.DataFrame,
    symptoms: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Run all DSM-inspired pattern checks against the feature matrix and
    symptom data.

    Parameters
    ----------
    features : pd.DataFrame
        Daily-indexed feature matrix from ``feature_engineering``.
    symptoms : list[dict]
        Raw symptom rows (with ``symptom_name``, ``symptom_category``).

    Returns
    -------
    list[dict]
        Each dict contains:
          - pattern_name : str
          - description  : str  (always uses "compatible with" language)
          - confidence_score : float (0.0 - 1.0)
          - supporting_data_points : dict
          - duration_days : int
    """
    if features.empty or len(features) < 7:
        logger.info("Insufficient data for DSM pattern detection (%d rows).", len(features))
        return []

    patterns: List[Dict[str, Any]] = []

    dep = _check_depressive_episode(features)
    if dep:
        patterns.append(dep)

    anx = _check_anxiety_disorder(features, symptoms)
    if anx:
        patterns.append(anx)

    mixed = _check_mixed_anxiety_depression(features, symptoms)
    if mixed:
        patterns.append(mixed)

    cycling = _check_rapid_mood_cycling(features)
    if cycling:
        patterns.append(cycling)

    logger.info("DSM pattern check found %d patterns.", len(patterns))
    return patterns


# ---------------------------------------------------------------------------
# 1. Depressive Episode Pattern
# ---------------------------------------------------------------------------

def _check_depressive_episode(features: pd.DataFrame) -> dict | None:
    """
    Low mood (<=3) + low energy (<=3) + sleep disturbance for >= 14
    consecutive days.

    Sleep disturbance is defined as sleep_quality <= 2 OR sleep_hours < 5
    OR sleep_hours > 10.
    """
    if 'mood' not in features.columns or 'energy' not in features.columns:
        return None

    mood = features['mood']
    energy = features['energy']

    # Build boolean series for each criterion
    low_mood = mood <= 3
    low_energy = energy <= 3

    # Sleep disturbance (if available)
    sleep_disturbed = pd.Series(False, index=features.index)
    if 'sleep_quality' in features.columns:
        sleep_disturbed = sleep_disturbed | (features['sleep_quality'] <= 2)
    if 'sleep_hours' in features.columns:
        sleep_disturbed = sleep_disturbed | (features['sleep_hours'] < 5) | (features['sleep_hours'] > 10)

    # All three must be present on the same day
    combined = low_mood & low_energy & sleep_disturbed

    streak = _longest_streak(combined)
    if streak < 14:
        return None

    # Gather supporting data for the most recent qualifying window
    recent_window = _recent_streak_window(combined, min_length=14)
    if recent_window is None:
        return None

    start, end = recent_window
    window_data = features.loc[start:end]

    confidence = min(1.0, 0.5 + (streak - 14) * 0.03)

    return {
        'pattern_name': 'Padrão de Episódio Depressivo',
        'description': (
            f"Dados dos últimos {streak} dias são compatíveis com um padrão de "
            f"episódio depressivo: humor persistentemente baixo (média {window_data['mood'].mean():.1f}), "
            f"baixa energia (média {window_data['energy'].mean():.1f}) e distúrbio "
            f"do sono. {_DISCLAIMER}"
        ),
        'confidence_score': round(confidence, 3),
        'supporting_data_points': {
            'avg_mood': round(float(window_data['mood'].mean()), 2),
            'avg_energy': round(float(window_data['energy'].mean()), 2),
            'avg_sleep_quality': round(float(window_data.get('sleep_quality', pd.Series([np.nan])).mean()), 2),
            'consecutive_days': streak,
            'start_date': str(start.date()),
            'end_date': str(end.date()),
        },
        'duration_days': streak,
    }


# ---------------------------------------------------------------------------
# 2. Anxiety Disorder Pattern
# ---------------------------------------------------------------------------

_ANXIETY_SYMPTOM_NAMES = {
    'restlessness', 'muscle tension', 'difficulty concentrating',
    'irritability', 'fatigue', 'worry', 'panic',
    'racing thoughts', 'trembling', 'shortness of breath',
    'chest tightness', 'dizziness', 'nausea',
}


def _check_anxiety_disorder(
    features: pd.DataFrame, symptoms: List[Dict[str, Any]],
) -> dict | None:
    """
    High anxiety (>=7) + sleep disturbance + at least 2 anxiety-related
    symptoms for >= 14 days.
    """
    if 'anxiety' not in features.columns:
        return None

    high_anxiety = features['anxiety'] >= 7

    sleep_disturbed = pd.Series(False, index=features.index)
    if 'sleep_quality' in features.columns:
        sleep_disturbed = sleep_disturbed | (features['sleep_quality'] <= 2)
    if 'sleep_hours' in features.columns:
        sleep_disturbed = sleep_disturbed | (features['sleep_hours'] < 5)

    combined = high_anxiety & sleep_disturbed
    streak = _longest_streak(combined)

    if streak < 14:
        return None

    # Count distinct anxiety-related symptoms in the period
    anxiety_symptoms = set()
    for s in symptoms:
        name = s.get('symptom_name', '').lower()
        if name in _ANXIETY_SYMPTOM_NAMES:
            anxiety_symptoms.add(name)

    if len(anxiety_symptoms) < 2:
        return None

    recent_window = _recent_streak_window(combined, min_length=14)
    if recent_window is None:
        return None

    start, end = recent_window
    window_data = features.loc[start:end]

    confidence = min(1.0, 0.5 + len(anxiety_symptoms) * 0.1 + (streak - 14) * 0.02)

    return {
        'pattern_name': 'Padrão de Transtorno de Ansiedade',
        'description': (
            f"Dados dos últimos {streak} dias são compatíveis com um padrão de "
            f"ansiedade generalizada: ansiedade elevada persistente (média {window_data['anxiety'].mean():.1f}), "
            f"distúrbio do sono e {len(anxiety_symptoms)} sintomas relacionados à ansiedade "
            f"({', '.join(sorted(anxiety_symptoms))}). {_DISCLAIMER}"
        ),
        'confidence_score': round(confidence, 3),
        'supporting_data_points': {
            'avg_anxiety': round(float(window_data['anxiety'].mean()), 2),
            'anxiety_symptoms': sorted(anxiety_symptoms),
            'symptom_count': len(anxiety_symptoms),
            'consecutive_days': streak,
            'start_date': str(start.date()),
            'end_date': str(end.date()),
        },
        'duration_days': streak,
    }


# ---------------------------------------------------------------------------
# 3. Mixed Anxiety-Depression Pattern
# ---------------------------------------------------------------------------

def _check_mixed_anxiety_depression(
    features: pd.DataFrame, symptoms: List[Dict[str, Any]],
) -> dict | None:
    """
    Both depression indicators (mood <=3, energy <=3) and anxiety
    indicators (anxiety >=7) present simultaneously for >= 14 days.
    """
    if not all(c in features.columns for c in ('mood', 'energy', 'anxiety')):
        return None

    depression_indicators = (features['mood'] <= 3) & (features['energy'] <= 3)
    anxiety_indicators = features['anxiety'] >= 7

    combined = depression_indicators & anxiety_indicators
    streak = _longest_streak(combined)

    if streak < 14:
        return None

    recent_window = _recent_streak_window(combined, min_length=14)
    if recent_window is None:
        return None

    start, end = recent_window
    window_data = features.loc[start:end]

    confidence = min(1.0, 0.6 + (streak - 14) * 0.025)

    return {
        'pattern_name': 'Padrão Misto de Ansiedade e Depressão',
        'description': (
            f"Dados dos últimos {streak} dias são compatíveis com um padrão misto "
            f"de ansiedade e depressão: humor simultaneamente baixo "
            f"(média {window_data['mood'].mean():.1f}), baixa energia "
            f"(média {window_data['energy'].mean():.1f}) e alta ansiedade "
            f"(média {window_data['anxiety'].mean():.1f}). {_DISCLAIMER}"
        ),
        'confidence_score': round(confidence, 3),
        'supporting_data_points': {
            'avg_mood': round(float(window_data['mood'].mean()), 2),
            'avg_energy': round(float(window_data['energy'].mean()), 2),
            'avg_anxiety': round(float(window_data['anxiety'].mean()), 2),
            'consecutive_days': streak,
            'start_date': str(start.date()),
            'end_date': str(end.date()),
        },
        'duration_days': streak,
    }


# ---------------------------------------------------------------------------
# 4. Rapid Mood Cycling
# ---------------------------------------------------------------------------

def _check_rapid_mood_cycling(features: pd.DataFrame) -> dict | None:
    """
    Mood swings > 4 points within 48 hours, occurring 3+ times in the
    analysis window.
    """
    if 'mood' not in features.columns:
        return None

    mood = features['mood'].dropna()
    if len(mood) < 7:
        return None

    swing_threshold = 4.0
    swing_events: List[Dict[str, Any]] = []

    values = mood.values
    dates = mood.index
    for i in range(2, len(values)):
        # Check 48-hour window (current day vs 1 day ago AND vs 2 days ago)
        diff_1d = abs(values[i] - values[i - 1])
        diff_2d = abs(values[i] - values[i - 2])

        if diff_1d >= swing_threshold:
            swing_events.append({
                'date': str(dates[i].date()),
                'from_value': round(float(values[i - 1]), 1),
                'to_value': round(float(values[i]), 1),
                'change': round(float(values[i] - values[i - 1]), 1),
                'window': '24h',
            })
        elif diff_2d >= swing_threshold:
            swing_events.append({
                'date': str(dates[i].date()),
                'from_value': round(float(values[i - 2]), 1),
                'to_value': round(float(values[i]), 1),
                'change': round(float(values[i] - values[i - 2]), 1),
                'window': '48h',
            })

    if len(swing_events) < 3:
        return None

    # Duration spans first to last swing
    first_date = pd.Timestamp(swing_events[0]['date'])
    last_date = pd.Timestamp(swing_events[-1]['date'])
    duration = max(1, (last_date - first_date).days)

    confidence = min(1.0, 0.4 + len(swing_events) * 0.1)

    return {
        'pattern_name': 'Ciclagem Rápida de Humor',
        'description': (
            f"Ciclagem rápida de humor detectada: {len(swing_events)} oscilações de humor de "
            f"4+ pontos em janelas de 48 horas nos últimos {duration} dias. "
            f"Este padrão é compatível com instabilidade de humor e requer "
            f"avaliação profissional. {_DISCLAIMER}"
        ),
        'confidence_score': round(confidence, 3),
        'supporting_data_points': {
            'swing_count': len(swing_events),
            'swing_events': swing_events[:10],  # cap for readability
            'period_days': duration,
        },
        'duration_days': duration,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _longest_streak(mask: pd.Series) -> int:
    """Return the length of the longest consecutive True streak."""
    if mask.empty:
        return 0
    groups = (mask != mask.shift()).cumsum()
    streaks = mask.groupby(groups).sum()
    return int(streaks.max()) if not streaks.empty else 0


def _recent_streak_window(
    mask: pd.Series, min_length: int,
) -> tuple | None:
    """
    Return (start, end) timestamps of the most recent consecutive True
    streak that is at least *min_length* days long.  Returns None if no
    qualifying streak exists.
    """
    if mask.empty:
        return None

    groups = (mask != mask.shift()).cumsum()
    for group_id in reversed(groups.unique()):
        group_mask = groups == group_id
        if mask[group_mask].all() and group_mask.sum() >= min_length:
            indices = mask.index[group_mask]
            return (indices[0], indices[-1])
    return None
