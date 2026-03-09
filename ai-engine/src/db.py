"""
CLARITA AI Engine - Database Access Layer

Manages PostgreSQL connections and provides data-access functions that
read patient data and write insights / alerts.  All queries use
parameterised statements to prevent SQL injection.
"""

import json
import logging
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

import psycopg2
import psycopg2.extras

from .config import Config

logger = logging.getLogger(__name__)

# Register the UUID adapter so psycopg2 can handle Python UUID objects.
psycopg2.extras.register_uuid()


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

@contextmanager
def get_connection():
    """
    Yield a psycopg2 connection from the configured DATABASE_URL.

    The connection is committed on successful exit and rolled back on
    exception.  Always closed on exit.
    """
    conn = psycopg2.connect(Config.DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _fetch_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute *query* with *params* and return all rows as dicts."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def _fetch_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute *query* with *params* and return a single row as a dict (or None)."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


# ---------------------------------------------------------------------------
# Patient data retrieval
# ---------------------------------------------------------------------------

def get_active_patient_ids() -> List[str]:
    """Return a list of user IDs for all active patients."""
    rows = _fetch_all(
        """
        SELECT u.id
        FROM users u
        JOIN patient_profiles pp ON pp.user_id = u.id
        WHERE u.is_active = TRUE
          AND u.role = 'patient'
        """
    )
    return [str(row['id']) for row in rows]


def get_emotional_logs(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """
    Retrieve emotional log entries for *patient_id* from the last *days* days,
    ordered chronologically.
    """
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT id, mood_score, anxiety_score, energy_score,
               sleep_quality, sleep_hours, notes, logged_at
        FROM emotional_logs
        WHERE patient_id = %s AND logged_at >= %s
        ORDER BY logged_at ASC
        """,
        (patient_id, since),
    )


def get_medication_logs(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """
    Retrieve medication log entries (including medication name) for
    *patient_id* from the last *days* days.
    """
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT ml.id, ml.taken_at, ml.skipped, ml.skip_reason, ml.notes,
               pm.dosage, pm.frequency, m.name AS medication_name
        FROM medication_logs ml
        JOIN patient_medications pm ON pm.id = ml.patient_medication_id
        JOIN medications m ON m.id = pm.medication_id
        WHERE pm.patient_id = %s AND ml.taken_at >= %s
        ORDER BY ml.taken_at ASC
        """,
        (patient_id, since),
    )


def get_patient_symptoms(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """
    Retrieve reported symptoms for *patient_id* from the last *days* days.
    """
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT ps.id, ps.severity, ps.notes, ps.reported_at,
               s.name AS symptom_name, s.category AS symptom_category
        FROM patient_symptoms ps
        JOIN symptoms s ON s.id = ps.symptom_id
        WHERE ps.patient_id = %s AND ps.reported_at >= %s
        ORDER BY ps.reported_at ASC
        """,
        (patient_id, since),
    )


def get_life_events(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """
    Retrieve life events for *patient_id* from the last *days* days.
    """
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT id, title, description, category, impact_level, event_date
        FROM life_events
        WHERE patient_id = %s AND event_date >= %s
        ORDER BY event_date ASC
        """,
        (patient_id, since),
    )


def get_assessment_results(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """
    Retrieve assessment results for *patient_id* from the last *days* days.
    """
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT ar.id, ar.total_score, ar.severity_level, ar.completed_at,
               a.name AS assessment_name
        FROM assessment_results ar
        JOIN assessments a ON a.id = ar.assessment_id
        WHERE ar.patient_id = %s AND ar.completed_at >= %s
        ORDER BY ar.completed_at ASC
        """,
        (patient_id, since),
    )


# ---------------------------------------------------------------------------
# Insight and alert persistence
# ---------------------------------------------------------------------------

def store_insight(
    patient_id: str,
    insight_type: str,
    title: str,
    explanation: str,
    confidence_score: float,
    impact_level: str,
    data_points: Dict[str, Any],
    recommendations: Optional[str] = None,
) -> str:
    """
    Persist an AI-generated insight and return its UUID.

    Parameters
    ----------
    patient_id : str
        UUID of the patient.
    insight_type : str
        One of: pattern, correlation, anomaly, trend, risk.
    title : str
        Short summary.
    explanation : str
        Human-readable detailed explanation.
    confidence_score : float
        0.0 - 1.0.
    impact_level : str
        One of: low, medium, high, critical.
    data_points : dict
        JSONB payload with supporting data.
    recommendations : str, optional
        Suggested actions for professionals.

    Returns
    -------
    str
        The UUID of the newly created insight row.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_insights
                    (patient_id, insight_type, title, explanation,
                     confidence_score, impact_level, data_points, recommendations)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    patient_id,
                    insight_type,
                    title,
                    explanation,
                    confidence_score,
                    impact_level,
                    json.dumps(data_points),
                    recommendations,
                ),
            )
            insight_id = cur.fetchone()[0]
            logger.info(
                "Stored insight %s (type=%s, impact=%s) for patient %s",
                insight_id, insight_type, impact_level, patient_id,
            )
            return str(insight_id)


def store_alert(
    patient_id: str,
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    trigger_data: Dict[str, Any],
) -> str:
    """
    Persist an alert and return its UUID.

    Parameters
    ----------
    patient_id : str
        UUID of the patient.
    alert_type : str
        One of: depressive_episode, high_anxiety, medication_non_adherence,
        risk_pattern, anomaly.
    severity : str
        One of: low, medium, high, critical.
    title : str
        Short alert title.
    description : str
        Detailed description.
    trigger_data : dict
        JSONB payload with the specific data points that triggered this alert.

    Returns
    -------
    str
        The UUID of the newly created alert row.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO alerts
                    (patient_id, alert_type, severity, title, description, trigger_data)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    patient_id,
                    alert_type,
                    severity,
                    title,
                    description,
                    json.dumps(trigger_data),
                ),
            )
            alert_id = cur.fetchone()[0]
            logger.info(
                "Stored alert %s (type=%s, severity=%s) for patient %s",
                alert_id, alert_type, severity, patient_id,
            )
            return str(alert_id)


# ---------------------------------------------------------------------------
# Digital Twin persistence
# ---------------------------------------------------------------------------

def store_digital_twin(patient_id: str, twin_data: Dict[str, Any]) -> str:
    """Persist a digital twin snapshot and return its UUID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO digital_twin_states
                    (patient_id, current_state, correlations, baseline,
                     predictions, treatment_responses,
                     data_points_used, model_version, confidence_overall)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    patient_id,
                    json.dumps(twin_data.get('current_state', {})),
                    json.dumps(twin_data.get('correlations', [])),
                    json.dumps(twin_data.get('baseline', {})),
                    json.dumps(twin_data.get('predictions', [])),
                    json.dumps(twin_data.get('treatment_responses', [])),
                    twin_data.get('data_points_used', 0),
                    twin_data.get('model_version', '1.0'),
                    twin_data.get('confidence_overall', 0.0),
                ),
            )
            twin_id = cur.fetchone()[0]
            logger.info("Stored digital twin %s for patient %s", twin_id, patient_id)
            return str(twin_id)


def get_latest_digital_twin(patient_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the most recent digital twin state for a patient."""
    return _fetch_one(
        """
        SELECT id, patient_id, current_state, correlations, baseline,
               predictions, treatment_responses,
               data_points_used, model_version, confidence_overall,
               computed_at, created_at
        FROM digital_twin_states
        WHERE patient_id = %s
        ORDER BY computed_at DESC
        LIMIT 1
        """,
        (patient_id,),
    )


def get_digital_twin_history(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """Fetch historical twin snapshots for evolution tracking."""
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT id, patient_id, current_state, correlations, baseline,
               predictions, treatment_responses,
               data_points_used, model_version, confidence_overall,
               computed_at, created_at
        FROM digital_twin_states
        WHERE patient_id = %s AND computed_at >= %s
        ORDER BY computed_at ASC
        """,
        (patient_id, since),
    )


def get_patient_medication_changes(patient_id: str, days: int = 180) -> List[Dict[str, Any]]:
    """Fetch medication start/stop/adjust events for treatment response tracking."""
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT pm.id, m.name AS medication_name, pm.dosage, pm.frequency,
               pm.status, pm.start_date, pm.end_date, pm.created_at,
               CASE
                 WHEN pm.end_date IS NOT NULL THEN pm.end_date
                 ELSE pm.start_date
               END AS change_date,
               CONCAT(m.name, ' ', pm.dosage) AS description
        FROM patient_medications pm
        JOIN medications m ON m.id = pm.medication_id
        WHERE pm.patient_id = %s AND pm.created_at >= %s
        ORDER BY pm.created_at ASC
        """,
        (patient_id, since),
    )


def get_therapy_sessions(patient_id: str, days: int = 180) -> List[Dict[str, Any]]:
    """Fetch clinical notes of type 'session' as therapy session markers."""
    since = datetime.utcnow() - timedelta(days=days)
    return _fetch_all(
        """
        SELECT id, title, note_type, created_at
        FROM clinical_notes
        WHERE patient_id = %s AND note_type = 'session' AND created_at >= %s
        ORDER BY created_at ASC
        """,
        (patient_id, since),
    )


def get_recent_alert_count(
    patient_id: str, alert_type: str, hours: int = 24,
) -> int:
    """
    Return the number of alerts of *alert_type* created for *patient_id*
    in the last *hours* hours.  Used to avoid duplicate alerting.
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    row = _fetch_one(
        """
        SELECT COUNT(*) AS cnt
        FROM alerts
        WHERE patient_id = %s AND alert_type = %s AND created_at >= %s
        """,
        (patient_id, alert_type, since),
    )
    return row['cnt'] if row else 0
