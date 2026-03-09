"""
CLARITA AI Engine - Alert Rules Module

Evaluates rule-based alert conditions against the patient feature matrix
and raw data.  Each rule checks a specific clinical concern and, if
triggered, stores an alert via ``db.store_alert()``.

Implemented rules
-----------------
1. Depressive episode risk - mood <=3 for 7+ consecutive days  (HIGH)
2. High anxiety            - anxiety >=7 for 3+ consecutive days (MEDIUM)
3. Medication non-adherence - 4+ missed doses in 7 days          (HIGH)
4. Suicidal risk indicators - mood <=2 + energy <=2 for 5+ days  (CRITICAL)
5. Rapid deterioration      - >3 point mood drop in 3 days       (HIGH)
6. DSM pattern detected     - any DSM pattern flagged            (MEDIUM)

Deduplication
-------------
Before creating an alert the module checks whether an alert of the same
type was already created in the last 24 hours for the same patient.
Duplicate alerts are suppressed.
"""

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from . import db

logger = logging.getLogger(__name__)

# How far back to look to avoid duplicate alerts (hours)
_DEDUP_WINDOW_HOURS = 24


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def evaluate_alerts(
    patient_id: str,
    features: pd.DataFrame,
    medication_logs: List[Dict[str, Any]],
    dsm_patterns: List[Dict[str, Any]],
) -> int:
    """
    Evaluate all alert rules for a patient and persist any triggered alerts.

    Parameters
    ----------
    patient_id : str
        UUID of the patient.
    features : pd.DataFrame
        Daily-indexed feature matrix.
    medication_logs : list[dict]
        Raw medication log rows.
    dsm_patterns : list[dict]
        DSM pattern results from ``dsm_patterns.detect_dsm_patterns``.

    Returns
    -------
    int
        Number of new alerts stored.
    """
    if features.empty:
        return 0

    count = 0
    count += _rule_depressive_episode(patient_id, features)
    count += _rule_high_anxiety(patient_id, features)
    count += _rule_medication_non_adherence(patient_id, medication_logs)
    count += _rule_suicidal_risk(patient_id, features)
    count += _rule_rapid_deterioration(patient_id, features)
    count += _rule_dsm_pattern(patient_id, dsm_patterns)

    logger.info("Alert evaluation for patient %s: %d alerts generated.", patient_id, count)
    return count


# ---------------------------------------------------------------------------
# Rule implementations
# ---------------------------------------------------------------------------

def _rule_depressive_episode(patient_id: str, features: pd.DataFrame) -> int:
    """
    Rule 1: mood <=3 for 7+ consecutive days --> HIGH alert.
    """
    if 'mood' not in features.columns:
        return 0

    mood = features['mood'].dropna()
    streak = _current_streak(mood <= 3)

    if streak < 7:
        return 0

    if _already_alerted(patient_id, 'depressive_episode'):
        return 0

    recent = mood.iloc[-streak:]
    trigger_data = {
        'consecutive_days': streak,
        'avg_mood': round(float(recent.mean()), 2),
        'min_mood': round(float(recent.min()), 2),
        'start_date': str(recent.index[0].date()),
        'end_date': str(recent.index[-1].date()),
    }

    db.store_alert(
        patient_id=patient_id,
        alert_type='depressive_episode',
        severity='high',
        title=f'Risco de episódio depressivo: humor baixo por {streak} dias consecutivos',
        description=(
            f"O paciente reportou uma pontuação de humor de 3 ou menos por {streak} "
            f"dias consecutivos (média {trigger_data['avg_mood']}). Isso pode "
            f"indicar um episódio depressivo e requer avaliação clínica."
        ),
        trigger_data=trigger_data,
    )
    return 1


def _rule_high_anxiety(patient_id: str, features: pd.DataFrame) -> int:
    """
    Rule 2: anxiety >=7 for 3+ consecutive days --> MEDIUM alert.
    """
    if 'anxiety' not in features.columns:
        return 0

    anxiety = features['anxiety'].dropna()
    streak = _current_streak(anxiety >= 7)

    if streak < 3:
        return 0

    if _already_alerted(patient_id, 'high_anxiety'):
        return 0

    recent = anxiety.iloc[-streak:]
    trigger_data = {
        'consecutive_days': streak,
        'avg_anxiety': round(float(recent.mean()), 2),
        'max_anxiety': round(float(recent.max()), 2),
        'start_date': str(recent.index[0].date()),
        'end_date': str(recent.index[-1].date()),
    }

    db.store_alert(
        patient_id=patient_id,
        alert_type='high_anxiety',
        severity='medium',
        title=f'Ansiedade elevada sustentada por {streak} dias consecutivos',
        description=(
            f"O paciente reportou uma pontuação de ansiedade de 7 ou acima por "
            f"{streak} dias consecutivos (média {trigger_data['avg_anxiety']}). "
            f"Considere avaliar estratégias de manejo da ansiedade."
        ),
        trigger_data=trigger_data,
    )
    return 1


def _rule_medication_non_adherence(
    patient_id: str, medication_logs: List[Dict[str, Any]],
) -> int:
    """
    Rule 3: 4+ skipped doses in the last 7 days --> HIGH alert.
    """
    if not medication_logs:
        return 0

    # Count skipped doses in the last 7 days
    cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=7)
    recent_logs = []
    for log in medication_logs:
        taken_at = log['taken_at']
        if isinstance(taken_at, str):
            taken_at = pd.Timestamp(taken_at)
        elif not isinstance(taken_at, pd.Timestamp):
            taken_at = pd.Timestamp(taken_at)
        if taken_at >= cutoff:
            recent_logs.append(log)

    skipped = [l for l in recent_logs if l.get('skipped')]
    if len(skipped) < 4:
        return 0

    if _already_alerted(patient_id, 'medication_non_adherence'):
        return 0

    skip_reasons = [
        l.get('skip_reason', 'Sem motivo informado') for l in skipped
    ]
    medication_names = list(set(
        l.get('medication_name', 'Desconhecido') for l in skipped
    ))

    trigger_data = {
        'skipped_doses': len(skipped),
        'total_doses_7d': len(recent_logs),
        'adherence_rate': round(1.0 - len(skipped) / max(len(recent_logs), 1), 2),
        'medications': medication_names,
        'skip_reasons': skip_reasons[:10],  # cap for payload size
    }

    db.store_alert(
        patient_id=patient_id,
        alert_type='medication_non_adherence',
        severity='high',
        title=f'Não adesão à medicação: {len(skipped)} doses perdidas em 7 dias',
        description=(
            f"O paciente pulou {len(skipped)} de {len(recent_logs)} "
            f"doses de medicação nos últimos 7 dias "
            f"(taxa de adesão: {trigger_data['adherence_rate']:.0%}). "
            f"Medicamentos afetados: {', '.join(medication_names)}."
        ),
        trigger_data=trigger_data,
    )
    return 1


def _rule_suicidal_risk(patient_id: str, features: pd.DataFrame) -> int:
    """
    Rule 4: mood <=2 AND energy <=2 for 5+ consecutive days --> CRITICAL alert.

    This is NOT a suicidality assessment tool.  It only flags a concerning
    pattern of extremely low mood and energy so that a professional can
    urgently follow up.
    """
    if not all(c in features.columns for c in ('mood', 'energy')):
        return 0

    combined = (features['mood'] <= 2) & (features['energy'] <= 2)
    streak = _current_streak(combined)

    if streak < 5:
        return 0

    if _already_alerted(patient_id, 'risk_pattern'):
        return 0

    mood = features['mood'].iloc[-streak:]
    energy = features['energy'].iloc[-streak:]

    trigger_data = {
        'consecutive_days': streak,
        'avg_mood': round(float(mood.mean()), 2),
        'avg_energy': round(float(energy.mean()), 2),
        'start_date': str(mood.index[0].date()),
        'end_date': str(mood.index[-1].date()),
    }

    db.store_alert(
        patient_id=patient_id,
        alert_type='risk_pattern',
        severity='critical',
        title=f'CRÍTICO: Humor e energia extremamente baixos por {streak} dias',
        description=(
            f"O paciente reportou humor <=2 e energia <=2 por {streak} "
            f"dias consecutivos. Este padrão requer avaliação profissional "
            f"urgente e potencial intervenção em crise. Humor médio: "
            f"{trigger_data['avg_mood']}, energia média: "
            f"{trigger_data['avg_energy']}."
        ),
        trigger_data=trigger_data,
    )
    return 1


def _rule_rapid_deterioration(patient_id: str, features: pd.DataFrame) -> int:
    """
    Rule 5: >3 point mood drop in the last 3 days --> HIGH alert.
    """
    if 'mood' not in features.columns:
        return 0

    mood = features['mood'].dropna()
    if len(mood) < 4:
        return 0

    # Compare the most recent value to the value 3 days ago
    recent_val = float(mood.iloc[-1])
    compare_val = float(mood.iloc[-4]) if len(mood) >= 4 else float(mood.iloc[0])
    drop = compare_val - recent_val

    if drop <= 3:
        return 0

    if _already_alerted(patient_id, 'risk_pattern'):
        return 0

    trigger_data = {
        'mood_3_days_ago': round(compare_val, 2),
        'mood_current': round(recent_val, 2),
        'drop': round(drop, 2),
        'date_start': str(mood.index[-4].date()) if len(mood) >= 4 else str(mood.index[0].date()),
        'date_end': str(mood.index[-1].date()),
    }

    db.store_alert(
        patient_id=patient_id,
        alert_type='risk_pattern',
        severity='high',
        title=f'Deterioração rápida do humor: queda de {drop:.1f} pontos em 3 dias',
        description=(
            f"O humor do paciente caiu {drop:.1f} pontos em 3 dias "
            f"(de {compare_val:.1f} para {recent_val:.1f}). Deterioração rápida "
            f"pode indicar uma crise aguda ou estressor significativo."
        ),
        trigger_data=trigger_data,
    )
    return 1


def _rule_dsm_pattern(
    patient_id: str, dsm_patterns: List[Dict[str, Any]],
) -> int:
    """
    Rule 6: Any DSM pattern detected --> MEDIUM alert.
    """
    if not dsm_patterns:
        return 0

    # We create one alert for the most serious DSM pattern found
    # (avoid alert fatigue with multiple DSM alerts).
    priority = {
        'Padrão Misto de Ansiedade e Depressão': 3,
        'Mixed Anxiety-Depression Pattern': 3,
        'Padrão de Episódio Depressivo': 2,
        'Depressive Episode Pattern': 2,
        'Padrão de Transtorno de Ansiedade': 1,
        'Anxiety Disorder Pattern': 1,
        'Ciclagem Rápida de Humor': 0,
        'Rapid Mood Cycling': 0,
    }
    sorted_patterns = sorted(
        dsm_patterns,
        key=lambda d: priority.get(d.get('pattern_name', ''), -1),
        reverse=True,
    )
    top = sorted_patterns[0]

    # Use 'risk_pattern' for DSM-flagged patterns if not already used
    alert_type = 'risk_pattern'
    if _already_alerted(patient_id, alert_type):
        # Fall back to 'anomaly' type to avoid being swallowed by dedup
        alert_type = 'anomaly'
        if _already_alerted(patient_id, alert_type):
            return 0

    trigger_data = {
        'pattern_name': top['pattern_name'],
        'confidence_score': top['confidence_score'],
        'duration_days': top.get('duration_days', 0),
        'all_patterns': [d['pattern_name'] for d in dsm_patterns],
        'supporting_data': top.get('supporting_data_points', {}),
    }

    db.store_alert(
        patient_id=patient_id,
        alert_type=alert_type,
        severity='medium',
        title=f'Padrão clínico detectado: {top["pattern_name"]}',
        description=(
            f"Um padrão de dados compatível com {top['pattern_name']} foi "
            f"detectado (confiança: {top['confidence_score']:.0%}, "
            f"duração: {top.get('duration_days', '?')} dias). "
            f"Isto NÃO é um diagnóstico e requer avaliação profissional."
        ),
        trigger_data=trigger_data,
    )
    return 1


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _current_streak(mask: pd.Series) -> int:
    """
    Return the length of the current (most recent) consecutive True streak.

    If the most recent value is False the streak is 0.
    """
    if mask.empty or not mask.iloc[-1]:
        return 0

    count = 0
    for val in reversed(mask.values):
        if val:
            count += 1
        else:
            break
    return count


def _already_alerted(patient_id: str, alert_type: str) -> bool:
    """Return True if an alert of this type was already created recently."""
    try:
        recent = db.get_recent_alert_count(
            patient_id, alert_type, hours=_DEDUP_WINDOW_HOURS,
        )
        if recent > 0:
            logger.debug(
                "Suppressing duplicate %s alert for patient %s (%d in last %dh).",
                alert_type, patient_id, recent, _DEDUP_WINDOW_HOURS,
            )
            return True
    except Exception:
        logger.exception("Failed to check recent alert count; allowing alert.")
    return False
