"""
CLARITA AI Engine - Anomaly Detection Module

Detects anomalies in patient time-series data using three complementary
techniques:

1. **Z-score detection** - flags individual data points more than N
   standard deviations from the patient's historical mean.
2. **Sudden change detection** - flags large day-over-day changes that
   exceed a configurable threshold.
3. **Isolation Forest** - multivariate anomaly detection using
   scikit-learn's IsolationForest to catch unusual combinations of
   features that univariate methods would miss.
"""

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .config import Config

logger = logging.getLogger(__name__)

# Minimum rows required before anomaly detection makes sense
_MIN_POINTS = 14


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_anomalies(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Run all anomaly detectors on the feature matrix.

    Each anomaly dict contains:
      - anomaly_type : str   (zscore | sudden_change | isolation_forest)
      - description  : str   (human-readable explanation)
      - severity     : str   (low | medium | high | critical)
      - date         : str   (ISO date of the anomaly)
      - details      : dict  (supporting numbers)

    Parameters
    ----------
    features : pd.DataFrame
        Daily-indexed feature matrix from ``feature_engineering``.

    Returns
    -------
    list[dict]
    """
    if features.empty or len(features) < _MIN_POINTS:
        logger.info("Insufficient data for anomaly detection (%d rows).", len(features))
        return []

    anomalies: List[Dict[str, Any]] = []
    anomalies.extend(_zscore_detection(features))
    anomalies.extend(_sudden_change_detection(features))
    anomalies.extend(_isolation_forest_detection(features))

    logger.info("Detected %d anomalies.", len(anomalies))
    return anomalies


# ---------------------------------------------------------------------------
# Z-score detection
# ---------------------------------------------------------------------------

_ZSCORE_COLS = ['mood', 'anxiety', 'energy', 'sleep_hours', 'sleep_quality']


def _zscore_detection(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Flag data points more than ``Config.ZSCORE_THRESHOLD`` standard
    deviations from the patient's historical mean.

    Only the most recent 7 days are checked (older anomalies are stale).
    """
    anomalies: List[Dict[str, Any]] = []
    threshold = Config.ZSCORE_THRESHOLD

    for col in _ZSCORE_COLS:
        if col not in features.columns:
            continue

        series = features[col].dropna()
        if len(series) < _MIN_POINTS:
            continue

        mean = series.mean()
        std = series.std()
        if std == 0:
            continue

        # Check only the last 7 days
        recent = series.iloc[-7:]
        for date_idx, value in recent.items():
            z = (value - mean) / std
            if abs(z) < threshold:
                continue

            direction = 'above' if z > 0 else 'below'
            label = col.replace('_', ' ')
            severity = _zscore_severity(abs(z))

            direction_pt = 'acima de' if direction == 'above' else 'abaixo de'
            description = (
                f"Leitura incomum de {label} em {date_idx.date()}: "
                f"{value:.1f} está {abs(z):.1f} desvios padrão {direction_pt} "
                f"a média do paciente de {mean:.1f}."
            )

            anomalies.append({
                'anomaly_type': 'zscore',
                'description': description,
                'severity': severity,
                'date': str(date_idx.date()),
                'details': {
                    'variable': col,
                    'value': round(float(value), 2),
                    'mean': round(float(mean), 2),
                    'std': round(float(std), 2),
                    'z_score': round(float(z), 3),
                    'threshold': threshold,
                    'direction': direction,
                },
            })

    return anomalies


def _zscore_severity(abs_z: float) -> str:
    """Map absolute z-score to severity level."""
    if abs_z >= 3.5:
        return 'critical'
    if abs_z >= 3.0:
        return 'high'
    if abs_z >= 2.5:
        return 'medium'
    return 'low'


# ---------------------------------------------------------------------------
# Sudden change detection
# ---------------------------------------------------------------------------

_CHANGE_COLS = ['mood', 'anxiety', 'energy']


def _sudden_change_detection(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Flag large day-over-day changes that exceed
    ``Config.SUDDEN_CHANGE_THRESHOLD``.

    Only the most recent 7 days are checked.
    """
    anomalies: List[Dict[str, Any]] = []
    threshold = Config.SUDDEN_CHANGE_THRESHOLD

    for col in _CHANGE_COLS:
        if col not in features.columns:
            continue

        series = features[col].dropna()
        if len(series) < 2:
            continue

        diffs = series.diff()
        # Only look at the last 7 days
        recent_diffs = diffs.iloc[-7:]

        for date_idx, change in recent_diffs.items():
            if pd.isna(change) or abs(change) < threshold:
                continue

            direction = 'increase' if change > 0 else 'decrease'
            label = col.replace('_', ' ')
            severity = _sudden_change_severity(abs(change))

            prev_date = series.index[series.index.get_loc(date_idx) - 1]
            prev_value = float(series[prev_date])
            curr_value = float(series[date_idx])

            direction_pt = 'aumento' if direction == 'increase' else 'queda'
            description = (
                f"Mudança repentina de {label} em {date_idx.date()}: "
                f"alterou de {prev_value:.1f} para {curr_value:.1f} "
                f"(uma {direction_pt} de {abs(change):.1f} pontos em um dia)."
            )

            anomalies.append({
                'anomaly_type': 'sudden_change',
                'description': description,
                'severity': severity,
                'date': str(date_idx.date()),
                'details': {
                    'variable': col,
                    'previous_value': round(prev_value, 2),
                    'current_value': round(curr_value, 2),
                    'change': round(float(change), 2),
                    'threshold': threshold,
                    'direction': direction,
                },
            })

    return anomalies


def _sudden_change_severity(abs_change: float) -> str:
    """Map absolute day-over-day change to severity."""
    if abs_change >= 6:
        return 'critical'
    if abs_change >= 5:
        return 'high'
    if abs_change >= 4:
        return 'medium'
    return 'low'


# ---------------------------------------------------------------------------
# Isolation Forest (multivariate)
# ---------------------------------------------------------------------------

_IF_COLS = ['mood', 'anxiety', 'energy', 'sleep_hours', 'sleep_quality',
            'med_adherence', 'symptom_count']


def _isolation_forest_detection(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Use scikit-learn's IsolationForest to detect multivariate anomalies -
    unusual *combinations* of feature values that may not be flagged by
    univariate methods.

    Only the most recent 7 days are reported.
    """
    anomalies: List[Dict[str, Any]] = []

    available_cols = [c for c in _IF_COLS if c in features.columns]
    if len(available_cols) < 3:
        return anomalies

    df = features[available_cols].dropna()
    if len(df) < _MIN_POINTS:
        return anomalies

    try:
        model = IsolationForest(
            contamination=Config.ISOLATION_FOREST_CONTAMINATION,
            random_state=42,
            n_estimators=100,
        )
        labels = model.fit_predict(df.values)
        scores = model.decision_function(df.values)

        # Map labels back to the DataFrame index
        df = df.copy()
        df['anomaly_label'] = labels
        df['anomaly_score'] = scores

        # Only report anomalies from the last 7 days
        recent = df.iloc[-7:]
        anomalous = recent[recent['anomaly_label'] == -1]

        for date_idx, row in anomalous.iterrows():
            score = float(row['anomaly_score'])
            severity = _if_severity(score)

            # Build a summary of which values are unusual
            feature_summary = {
                col: round(float(row[col]), 2) for col in available_cols
            }

            description = (
                f"Combinação incomum de métricas em {date_idx.date()}: "
                f"o padrão geral de humor ({feature_summary.get('mood', '?')}), "
                f"ansiedade ({feature_summary.get('anxiety', '?')}) e "
                f"energia ({feature_summary.get('energy', '?')}) é estatisticamente "
                f"incomum comparado ao histórico deste paciente "
                f"(pontuação de anomalia = {score:.3f})."
            )

            anomalies.append({
                'anomaly_type': 'isolation_forest',
                'description': description,
                'severity': severity,
                'date': str(date_idx.date()),
                'details': {
                    'features_used': available_cols,
                    'feature_values': feature_summary,
                    'anomaly_score': round(score, 4),
                },
            })
    except Exception:
        logger.exception("Isolation Forest detection failed.")

    return anomalies


def _if_severity(score: float) -> str:
    """
    Map IsolationForest decision_function score to severity.

    Lower (more negative) scores indicate stronger anomalies.
    """
    if score <= -0.3:
        return 'high'
    if score <= -0.15:
        return 'medium'
    return 'low'
