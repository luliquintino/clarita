"""
CLARITA AI Engine - Digital Twin Mental Module

Builds a living model of the patient's mind by packaging existing analysis
outputs (feature engineering, pattern detection) into a structured digital
twin snapshot with:
  - Current variable states and trends
  - Learned correlations between variables
  - Emotional baseline from first 14 days
  - Behavioral predictions based on trend extrapolation
  - Treatment response tracking (medication + therapy)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy import stats

from . import db
from .feature_engineering import build_feature_matrix, SLEEP_QUALITY_MAP
from .pattern_detection import _correlation_analysis, _MIN_POINTS

logger = logging.getLogger(__name__)

# Variable labels in Portuguese
_VARIABLE_LABELS = {
    'mood': 'Humor',
    'anxiety': 'Ansiedade',
    'energy': 'Energia',
    'sleep_quality': 'Qualidade do Sono',
    'sleep_hours': 'Horas de Sono',
    'med_adherence': 'Adesão à Medicação',
}

# Variables where higher = worse (inverted interpretation)
_INVERTED_VARS = {'anxiety'}

_CORE_VARS = ['mood', 'anxiety', 'energy', 'sleep_quality']
_BASELINE_DAYS = 14


def _sanitize_nan(obj: Any) -> Any:
    """Recursively replace NaN/Inf floats with None for JSON compatibility."""
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_nan(v) for v in obj]
    return obj


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_digital_twin(patient_id: str, features: pd.DataFrame) -> Optional[Dict[str, Any]]:
    """
    Build a digital twin snapshot for a patient from an existing feature matrix.

    Parameters
    ----------
    patient_id : str
        UUID of the patient.
    features : pd.DataFrame
        Daily-indexed feature matrix from feature_engineering.build_feature_matrix.

    Returns
    -------
    dict or None
        The twin snapshot dict, or None if insufficient data.
    """
    if features.empty or len(features) < _MIN_POINTS:
        logger.info(
            "Insufficient data for digital twin (%d rows, need %d).",
            len(features), _MIN_POINTS,
        )
        return None

    current_state = _compute_current_state(features)
    baseline = _compute_baseline(features)
    correlations = _extract_correlations(features)
    predictions = _generate_predictions(features, correlations, current_state)
    treatment_responses = _compute_treatment_responses(features, patient_id)

    # Overall confidence based on data quantity
    data_points = len(features)
    confidence = min(1.0, data_points / 90.0)  # Maxes at 90 days of data

    twin_data = _sanitize_nan({
        'current_state': current_state,
        'correlations': correlations,
        'baseline': baseline,
        'predictions': predictions,
        'treatment_responses': treatment_responses,
        'data_points_used': data_points,
        'model_version': '1.0',
        'confidence_overall': round(confidence, 4),
    })

    # Persist
    twin_id = db.store_digital_twin(patient_id, twin_data)
    logger.info("Digital twin stored (id=%s) for patient %s.", twin_id, patient_id)

    twin_data['id'] = twin_id
    twin_data['patient_id'] = patient_id
    twin_data['computed_at'] = datetime.utcnow().isoformat() + 'Z'

    return twin_data


# ---------------------------------------------------------------------------
# Current State
# ---------------------------------------------------------------------------

def _compute_current_state(features: pd.DataFrame) -> Dict[str, Any]:
    """Extract the current state of each core variable."""
    state = {}

    for var in _CORE_VARS + ['sleep_hours', 'med_adherence']:
        if var not in features.columns:
            continue

        series = features[var].dropna()
        if series.empty:
            continue

        current = round(float(series.iloc[-1]), 2)

        # Rolling averages
        avg_7d_col = f'{var}_avg_7d'
        avg_30d_col = f'{var}_avg_30d'
        avg_7d = round(float(features[avg_7d_col].dropna().iloc[-1]), 2) if avg_7d_col in features.columns and not features[avg_7d_col].dropna().empty else current
        avg_30d = round(float(features[avg_30d_col].dropna().iloc[-1]), 2) if avg_30d_col in features.columns and not features[avg_30d_col].dropna().empty else current

        # Slope
        slope_col = f'{var}_slope_7d'
        slope_7d = 0.0
        if slope_col in features.columns and not features[slope_col].dropna().empty:
            slope_7d = round(float(features[slope_col].dropna().iloc[-1]), 4)

        # Determine trend
        trend = _slope_to_trend(slope_7d, var)

        state[var] = {
            'current': current,
            'avg_7d': avg_7d,
            'avg_30d': avg_30d,
            'trend': trend,
            'slope_7d': slope_7d,
        }

    return state


def _slope_to_trend(slope: float, variable: str) -> str:
    """Convert a slope value to a trend label, considering variable direction."""
    threshold = 0.05
    if abs(slope) < threshold:
        return 'stable'

    if variable in _INVERTED_VARS:
        return 'improving' if slope < 0 else 'worsening'
    else:
        return 'improving' if slope > 0 else 'worsening'


# ---------------------------------------------------------------------------
# Baseline
# ---------------------------------------------------------------------------

def _compute_baseline(features: pd.DataFrame) -> Dict[str, Any]:
    """Compute the emotional baseline from the patient's first 14 days."""
    baseline = {}
    n_baseline = min(_BASELINE_DAYS, len(features))
    first_days = features.iloc[:n_baseline]

    for var in _CORE_VARS:
        if var not in first_days.columns:
            continue
        series = first_days[var].dropna()
        if len(series) < 3:
            continue

        baseline[var] = {
            'mean': round(float(series.mean()), 2),
            'std': round(float(series.std()), 2),
            'established_at': str(first_days.index[0].date()),
            'data_points': len(series),
        }

    return baseline


# ---------------------------------------------------------------------------
# Correlations
# ---------------------------------------------------------------------------

def _extract_correlations(features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Reuse pattern_detection._correlation_analysis and reshape output
    for the twin's correlation network format.
    """
    raw_patterns = _correlation_analysis(features)
    correlations = []

    for p in raw_patterns:
        d = p['details']
        label_pt = _build_correlation_label(
            d['variable_a'], d['variable_b'], d['direction']
        )
        correlations.append({
            'variable_a': d['variable_a'],
            'variable_b': d['variable_b'],
            'pearson_r': d['pearson_r'],
            'p_value': d['p_value'],
            'direction': d['direction'],
            'strength': d['strength'],
            'label_pt': label_pt,
        })

    return correlations


def _build_correlation_label(var_a: str, var_b: str, direction: str) -> str:
    """Build a Portuguese label for a correlation."""
    label_a = _VARIABLE_LABELS.get(var_a, var_a.replace('_', ' '))
    label_b = _VARIABLE_LABELS.get(var_b, var_b.replace('_', ' '))
    if direction == 'positive':
        return f'Maior {label_a.lower()} tende a coincidir com maior {label_b.lower()}'
    else:
        return f'Maior {label_a.lower()} tende a coincidir com menor {label_b.lower()}'


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------

def _generate_predictions(
    features: pd.DataFrame,
    correlations: List[Dict[str, Any]],
    current_state: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Generate short-term behavioral predictions (7-day horizon).

    Uses linear extrapolation from existing slopes, amplified by
    correlation strength when correlated variables are also trending.
    """
    predictions = []

    for var in _CORE_VARS:
        if var not in current_state:
            continue

        state = current_state[var]
        slope = state.get('slope_7d', 0.0)

        if abs(slope) < 0.03:
            continue  # No meaningful trend to extrapolate

        # Base prediction from slope
        is_inverted = var in _INVERTED_VARS
        if is_inverted:
            worsening = slope > 0
        else:
            worsening = slope < 0

        prediction_dir = 'increase' if slope > 0 else 'decrease'

        # Check if correlated variables amplify the prediction
        amplification = 0.0
        based_on = [f'{var}_slope_7d']

        for corr in correlations:
            related_var = None
            if corr['variable_a'] == var:
                related_var = corr['variable_b']
            elif corr['variable_b'] == var:
                related_var = corr['variable_a']
            else:
                continue

            if related_var in current_state:
                related_trend = current_state[related_var].get('trend', 'stable')
                if related_trend != 'stable':
                    amplification += abs(corr['pearson_r']) * 0.2
                    based_on.append(f'{related_var}_trend')

        # Compute confidence and risk
        base_confidence = min(1.0, abs(slope) * 5)
        confidence = min(1.0, base_confidence + amplification)

        if worsening:
            if confidence >= 0.7:
                risk = 'high'
            elif confidence >= 0.4:
                risk = 'moderate'
            else:
                risk = 'low'
        else:
            risk = 'low'

        label_var = _VARIABLE_LABELS.get(var, var)
        if worsening:
            reasoning = (
                f'Se o padrão atual continuar, há risco {risk} de '
                f'{"aumento" if is_inverted else "diminuição"} de '
                f'{label_var.lower()} nos próximos dias.'
            )
        else:
            reasoning = (
                f'A tendência atual indica melhora de '
                f'{label_var.lower()} nos próximos dias.'
            )

        predictions.append({
            'variable': var,
            'prediction': prediction_dir,
            'risk_level': risk,
            'horizon_days': 7,
            'confidence': round(confidence, 2),
            'reasoning': reasoning,
            'based_on': based_on,
        })

    return predictions


# ---------------------------------------------------------------------------
# Treatment Response
# ---------------------------------------------------------------------------

def _compute_treatment_responses(
    features: pd.DataFrame,
    patient_id: str,
) -> List[Dict[str, Any]]:
    """
    Detect medication changes and therapy sessions, compute before/after metrics.
    """
    responses = []

    # Medication changes
    try:
        med_changes = db.get_patient_medication_changes(patient_id, days=180)
    except Exception:
        med_changes = []

    for change in med_changes:
        response = _evaluate_intervention(
            features=features,
            intervention_type='medication_change',
            intervention_name=change.get('description', change.get('medication_name', 'Medicação')),
            intervention_date=change.get('change_date') or change.get('created_at'),
        )
        if response:
            responses.append(response)

    # Therapy sessions
    try:
        sessions = db.get_therapy_sessions(patient_id, days=180)
    except Exception:
        sessions = []

    # Group therapy sessions by month for aggregate analysis
    if sessions:
        session_dates = []
        for s in sessions:
            d = s.get('created_at')
            if isinstance(d, str):
                d = pd.to_datetime(d)
            elif not isinstance(d, (pd.Timestamp, datetime)):
                d = pd.Timestamp(d)
            session_dates.append(d)

        if len(session_dates) >= 2:
            response = _evaluate_therapy_trend(features, session_dates)
            if response:
                responses.append(response)

    return responses


def _evaluate_intervention(
    features: pd.DataFrame,
    intervention_type: str,
    intervention_name: str,
    intervention_date: Any,
    window_days: int = 14,
) -> Optional[Dict[str, Any]]:
    """Compare average metrics before/after an intervention date."""
    if intervention_date is None:
        return None

    if isinstance(intervention_date, str):
        intervention_date = pd.to_datetime(intervention_date)
    elif not isinstance(intervention_date, (pd.Timestamp, datetime)):
        intervention_date = pd.Timestamp(intervention_date)

    before_start = intervention_date - pd.Timedelta(days=window_days)
    after_end = intervention_date + pd.Timedelta(days=window_days)

    before = features[(features.index >= before_start) & (features.index < intervention_date)]
    after = features[(features.index > intervention_date) & (features.index <= after_end)]

    if len(before) < 3 or len(after) < 3:
        return None

    metrics_before = {}
    metrics_after = {}
    change_pct = {}

    for var in ['mood', 'anxiety', 'energy', 'sleep_quality']:
        if var not in features.columns:
            continue
        b_val = before[var].dropna().mean()
        a_val = after[var].dropna().mean()
        if np.isnan(b_val) or np.isnan(a_val) or b_val == 0:
            continue
        metrics_before[var] = round(float(b_val), 2)
        metrics_after[var] = round(float(a_val), 2)
        change_pct[var] = round(float((a_val - b_val) / b_val * 100), 1)

    if not metrics_before:
        return None

    # Determine overall status
    improvements = sum(
        1 for var, pct in change_pct.items()
        if (var in _INVERTED_VARS and pct < -5) or (var not in _INVERTED_VARS and pct > 5)
    )
    worsening = sum(
        1 for var, pct in change_pct.items()
        if (var in _INVERTED_VARS and pct > 5) or (var not in _INVERTED_VARS and pct < -5)
    )

    if improvements > worsening:
        status = 'positive_response'
    elif worsening > improvements:
        status = 'negative_response'
    else:
        status = 'neutral'

    # Check if we have enough post-data
    days_since = (features.index[-1] - intervention_date).days if len(features) > 0 else 0
    if days_since < window_days:
        status = 'pending'

    return {
        'intervention_type': intervention_type,
        'intervention_name': intervention_name,
        'intervention_date': str(intervention_date.date()) if hasattr(intervention_date, 'date') else str(intervention_date),
        'metrics_before': metrics_before,
        'metrics_after': metrics_after,
        'change_pct': change_pct,
        'evaluation_window_days': window_days,
        'status': status,
    }


def _evaluate_therapy_trend(
    features: pd.DataFrame,
    session_dates: List[Any],
) -> Optional[Dict[str, Any]]:
    """Evaluate overall therapy trend across sessions."""
    if len(session_dates) < 2:
        return None

    first_date = min(session_dates)
    last_date = max(session_dates)

    if isinstance(first_date, str):
        first_date = pd.to_datetime(first_date)
    if isinstance(last_date, str):
        last_date = pd.to_datetime(last_date)

    before = features[features.index <= first_date].tail(7)
    after = features[features.index >= last_date].head(7)

    if len(before) < 3 or len(after) < 3:
        return None

    metrics_before = {}
    metrics_after = {}
    change_pct = {}

    for var in ['mood', 'anxiety', 'energy']:
        if var not in features.columns:
            continue
        b_val = before[var].dropna().mean()
        a_val = after[var].dropna().mean()
        if np.isnan(b_val) or np.isnan(a_val) or b_val == 0:
            continue
        metrics_before[var] = round(float(b_val), 2)
        metrics_after[var] = round(float(a_val), 2)
        change_pct[var] = round(float((a_val - b_val) / b_val * 100), 1)

    if not metrics_before:
        return None

    improvements = sum(
        1 for var, pct in change_pct.items()
        if (var in _INVERTED_VARS and pct < -5) or (var not in _INVERTED_VARS and pct > 5)
    )
    worsening = sum(
        1 for var, pct in change_pct.items()
        if (var in _INVERTED_VARS and pct > 5) or (var not in _INVERTED_VARS and pct < -5)
    )
    status = 'positive_response' if improvements > worsening else 'negative_response' if worsening > improvements else 'neutral'

    return {
        'intervention_type': 'therapy_sessions',
        'intervention_name': f'{len(session_dates)} sessões de terapia',
        'intervention_date': str(last_date.date()) if hasattr(last_date, 'date') else str(last_date),
        'metrics_before': metrics_before,
        'metrics_after': metrics_after,
        'change_pct': change_pct,
        'evaluation_window_days': (last_date - first_date).days,
        'status': status,
    }
