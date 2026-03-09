"""
CLARITA AI Engine - Feature Engineering Module

Transforms raw patient data (emotional logs, medication logs, symptoms,
life events, assessments) into a time-indexed pandas DataFrame suitable
for statistical analysis and machine-learning models.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sleep quality encoding
# ---------------------------------------------------------------------------

SLEEP_QUALITY_MAP: Dict[str, float] = {
    'very_poor': 1.0,
    'poor': 2.0,
    'fair': 3.0,
    'good': 4.0,
    'excellent': 5.0,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_feature_matrix(
    emotional_logs: List[Dict[str, Any]],
    medication_logs: List[Dict[str, Any]],
    symptoms: List[Dict[str, Any]],
    life_events: List[Dict[str, Any]],
    assessments: List[Dict[str, Any]],
) -> pd.DataFrame:
    """
    Build a daily-indexed feature DataFrame from raw patient data.

    The resulting DataFrame is indexed by date and contains:
      - Daily averages for mood, anxiety, energy, sleep hours
      - Encoded sleep quality
      - Rolling averages (7-day, 14-day, 30-day) for core metrics
      - Rate-of-change (slope) for core metrics
      - Medication adherence rate (7-day rolling window)
      - Symptom frequency counts per day
      - Life event impact scores per day

    Parameters
    ----------
    emotional_logs : list[dict]
        Rows from ``emotional_logs`` table.
    medication_logs : list[dict]
        Rows from ``medication_logs`` join.
    symptoms : list[dict]
        Rows from ``patient_symptoms`` join.
    life_events : list[dict]
        Rows from ``life_events`` table.
    assessments : list[dict]
        Rows from ``assessment_results`` join.

    Returns
    -------
    pd.DataFrame
        Time-indexed feature matrix (index = ``pd.DatetimeIndex``).
        Empty DataFrame if there is insufficient data.
    """
    if not emotional_logs:
        logger.warning("No emotional logs provided; returning empty DataFrame.")
        return pd.DataFrame()

    # ------------------------------------------------------------------
    # 1.  Core emotional metrics (daily aggregates)
    # ------------------------------------------------------------------
    df_emotions = _build_emotional_features(emotional_logs)

    # ------------------------------------------------------------------
    # 2.  Rolling averages and rate-of-change
    # ------------------------------------------------------------------
    df_emotions = _add_rolling_features(df_emotions)
    df_emotions = _add_slope_features(df_emotions)

    # ------------------------------------------------------------------
    # 3.  Medication adherence
    # ------------------------------------------------------------------
    df_med = _build_medication_features(medication_logs, df_emotions.index)
    df_emotions = df_emotions.join(df_med, how='left')

    # ------------------------------------------------------------------
    # 4.  Symptom frequency
    # ------------------------------------------------------------------
    df_sym = _build_symptom_features(symptoms, df_emotions.index)
    df_emotions = df_emotions.join(df_sym, how='left')

    # ------------------------------------------------------------------
    # 5.  Life event impact
    # ------------------------------------------------------------------
    df_events = _build_life_event_features(life_events, df_emotions.index)
    df_emotions = df_emotions.join(df_events, how='left')

    # ------------------------------------------------------------------
    # 6.  Assessment scores
    # ------------------------------------------------------------------
    df_assess = _build_assessment_features(assessments, df_emotions.index)
    df_emotions = df_emotions.join(df_assess, how='left')

    # Fill remaining NaNs with 0 for count-based columns
    fill_zero_cols = [
        c for c in df_emotions.columns
        if c.startswith('symptom_') or c.startswith('event_') or c == 'med_adherence_7d'
    ]
    df_emotions[fill_zero_cols] = df_emotions[fill_zero_cols].fillna(0)

    logger.info(
        "Feature matrix built: %d days x %d features",
        len(df_emotions), len(df_emotions.columns),
    )
    return df_emotions


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_emotional_features(logs: List[Dict[str, Any]]) -> pd.DataFrame:
    """Aggregate emotional logs to daily averages."""
    records = []
    for log in logs:
        logged_at = log['logged_at']
        if isinstance(logged_at, str):
            logged_at = pd.to_datetime(logged_at)
        records.append({
            'date': logged_at.date() if hasattr(logged_at, 'date') else pd.Timestamp(logged_at).date(),
            'mood': float(log['mood_score']),
            'anxiety': float(log['anxiety_score']),
            'energy': float(log['energy_score']),
            'sleep_quality': SLEEP_QUALITY_MAP.get(log.get('sleep_quality'), np.nan),
            'sleep_hours': float(log['sleep_hours']) if log.get('sleep_hours') is not None else np.nan,
        })

    df = pd.DataFrame(records)
    df['date'] = pd.to_datetime(df['date'])
    daily = df.groupby('date').mean(numeric_only=True)
    daily.index = pd.DatetimeIndex(daily.index)
    daily.sort_index(inplace=True)
    return daily


def _add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add 7-day, 14-day, and 30-day rolling averages for core metrics."""
    core_cols = ['mood', 'anxiety', 'energy', 'sleep_quality', 'sleep_hours']
    for col in core_cols:
        if col not in df.columns:
            continue
        for window in (7, 14, 30):
            df[f'{col}_avg_{window}d'] = (
                df[col].rolling(window=window, min_periods=max(1, window // 2)).mean()
            )
    return df


def _add_slope_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add rate-of-change features using a 7-day linear regression slope.

    A positive slope for mood/energy indicates improvement; a negative slope
    indicates deterioration.  For anxiety the interpretation is reversed.
    """
    core_cols = ['mood', 'anxiety', 'energy']
    window = 7
    for col in core_cols:
        if col not in df.columns:
            continue
        slopes = []
        values = df[col].values
        for i in range(len(values)):
            if i < window - 1:
                slopes.append(np.nan)
                continue
            segment = values[i - window + 1: i + 1]
            valid = ~np.isnan(segment)
            if valid.sum() < 3:
                slopes.append(np.nan)
                continue
            x = np.arange(len(segment))[valid]
            y = segment[valid]
            slope = np.polyfit(x, y, 1)[0]
            slopes.append(round(float(slope), 4))
        df[f'{col}_slope_7d'] = slopes
    return df


def _build_medication_features(
    logs: List[Dict[str, Any]], date_index: pd.DatetimeIndex,
) -> pd.DataFrame:
    """
    Compute daily medication adherence and a 7-day rolling adherence rate.

    Adherence = (taken doses) / (total logged doses) per day.
    """
    if not logs:
        return pd.DataFrame(
            {'med_adherence': np.nan, 'med_adherence_7d': np.nan},
            index=date_index,
        )

    records = []
    for log in logs:
        taken_at = log['taken_at']
        if isinstance(taken_at, str):
            taken_at = pd.to_datetime(taken_at)
        records.append({
            'date': taken_at.date() if hasattr(taken_at, 'date') else pd.Timestamp(taken_at).date(),
            'taken': 0 if log.get('skipped') else 1,
        })

    df = pd.DataFrame(records)
    df['date'] = pd.to_datetime(df['date'])
    daily = df.groupby('date').agg(
        med_taken=('taken', 'sum'),
        med_total=('taken', 'count'),
    )
    daily['med_adherence'] = daily['med_taken'] / daily['med_total']
    daily['med_adherence_7d'] = daily['med_adherence'].rolling(
        window=7, min_periods=1,
    ).mean()

    result = daily[['med_adherence', 'med_adherence_7d']].reindex(date_index)
    return result


def _build_symptom_features(
    symptoms: List[Dict[str, Any]], date_index: pd.DatetimeIndex,
) -> pd.DataFrame:
    """
    Count daily symptom reports and compute average severity,
    plus per-category frequency columns.
    """
    if not symptoms:
        return pd.DataFrame(
            {'symptom_count': 0, 'symptom_avg_severity': np.nan},
            index=date_index,
        )

    records = []
    for s in symptoms:
        reported_at = s['reported_at']
        if isinstance(reported_at, str):
            reported_at = pd.to_datetime(reported_at)
        records.append({
            'date': reported_at.date() if hasattr(reported_at, 'date') else pd.Timestamp(reported_at).date(),
            'severity': float(s['severity']),
            'category': s.get('symptom_category', 'unknown'),
        })

    df = pd.DataFrame(records)
    df['date'] = pd.to_datetime(df['date'])

    # Overall counts
    daily_overall = df.groupby('date').agg(
        symptom_count=('severity', 'count'),
        symptom_avg_severity=('severity', 'mean'),
    )

    # Per-category counts
    if 'category' in df.columns:
        cat_counts = df.groupby(['date', 'category']).size().unstack(fill_value=0)
        cat_counts.columns = [f'symptom_{c}_count' for c in cat_counts.columns]
        daily_overall = daily_overall.join(cat_counts, how='left')

    return daily_overall.reindex(date_index).fillna(0)


def _build_life_event_features(
    events: List[Dict[str, Any]], date_index: pd.DatetimeIndex,
) -> pd.DataFrame:
    """
    For each date produce:
    - event_count  : number of life events that day
    - event_impact : sum of impact_level for events that day
    """
    if not events:
        return pd.DataFrame(
            {'event_count': 0, 'event_impact': 0},
            index=date_index,
        )

    records = []
    for e in events:
        event_date = e['event_date']
        if isinstance(event_date, str):
            event_date = pd.to_datetime(event_date).date()
        elif hasattr(event_date, 'date'):
            event_date = event_date.date() if callable(getattr(event_date, 'date', None)) else event_date
        records.append({
            'date': event_date,
            'impact': float(e['impact_level']),
        })

    df = pd.DataFrame(records)
    df['date'] = pd.to_datetime(df['date'])
    daily = df.groupby('date').agg(
        event_count=('impact', 'count'),
        event_impact=('impact', 'sum'),
    )
    return daily.reindex(date_index).fillna(0)


def _build_assessment_features(
    assessments: List[Dict[str, Any]], date_index: pd.DatetimeIndex,
) -> pd.DataFrame:
    """
    Map assessment results to the daily index.

    Creates one column per assessment name (e.g. ``assessment_PHQ9``) with
    the total score, forward-filled so that the most recent score is always
    available for downstream analysis.
    """
    if not assessments:
        return pd.DataFrame(index=date_index)

    records = []
    for a in assessments:
        completed_at = a['completed_at']
        if isinstance(completed_at, str):
            completed_at = pd.to_datetime(completed_at)
        name = a.get('assessment_name', 'unknown').replace(' ', '_')
        records.append({
            'date': completed_at.date() if hasattr(completed_at, 'date') else pd.Timestamp(completed_at).date(),
            'assessment_name': f'assessment_{name}',
            'score': float(a['total_score']),
        })

    df = pd.DataFrame(records)
    df['date'] = pd.to_datetime(df['date'])

    # Pivot so each assessment becomes its own column
    pivot = df.pivot_table(
        index='date', columns='assessment_name', values='score', aggfunc='last',
    )
    pivot = pivot.reindex(date_index)
    # Forward-fill assessment scores (they remain valid until next assessment)
    pivot = pivot.ffill()
    return pivot
