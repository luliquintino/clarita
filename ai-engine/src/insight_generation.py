"""
CLARITA AI Engine - Insight Generation Orchestrator

This is the main analysis pipeline.  For a given patient it:

1. Fetches raw data from the database.
2. Builds a feature matrix (``feature_engineering``).
3. Runs pattern detection (``pattern_detection``).
4. Runs anomaly detection (``anomaly_detection``).
5. Runs DSM-inspired pattern checks (``dsm_patterns``).
6. Translates all findings into human-readable insights.
7. Persists insights to the ``ai_insights`` table.
8. Evaluates alert rules and stores alerts (``alert_rules``).
"""

import logging
from typing import Any, Dict, List, Optional

from .config import Config
from . import db
from .feature_engineering import build_feature_matrix
from .pattern_detection import detect_patterns
from .anomaly_detection import detect_anomalies
from .dsm_patterns import detect_dsm_patterns
from .alert_rules import evaluate_alerts
from .digital_twin import build_digital_twin

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_patient(patient_id: str) -> Dict[str, Any]:
    """
    Run the full analysis pipeline for a single patient.

    Returns a summary dict with counts of insights and alerts generated.

    Parameters
    ----------
    patient_id : str
        UUID of the patient to analyse.

    Returns
    -------
    dict
        {
            'patient_id': str,
            'insights_generated': int,
            'alerts_generated': int,
            'status': 'success' | 'skipped' | 'error',
            'message': str,
        }
    """
    logger.info("Starting analysis for patient %s", patient_id)
    result: Dict[str, Any] = {
        'patient_id': patient_id,
        'insights_generated': 0,
        'alerts_generated': 0,
        'status': 'success',
        'message': '',
    }

    try:
        # ------------------------------------------------------------------
        # 1. Fetch raw data
        # ------------------------------------------------------------------
        days = Config.DEFAULT_LOOKBACK_DAYS
        emotional_logs = db.get_emotional_logs(patient_id, days=days)

        if len(emotional_logs) < Config.MIN_DATA_POINTS:
            result['status'] = 'skipped'
            result['message'] = (
                f"Dados insuficientes: {len(emotional_logs)} registros emocionais "
                f"(mínimo de {Config.MIN_DATA_POINTS} necessários)."
            )
            logger.info("Skipping patient %s: %s", patient_id, result['message'])
            return result

        medication_logs = db.get_medication_logs(patient_id, days=days)
        symptoms = db.get_patient_symptoms(patient_id, days=days)
        life_events = db.get_life_events(patient_id, days=days)
        assessments = db.get_assessment_results(patient_id, days=days)

        # ------------------------------------------------------------------
        # 2. Feature engineering
        # ------------------------------------------------------------------
        features = build_feature_matrix(
            emotional_logs=emotional_logs,
            medication_logs=medication_logs,
            symptoms=symptoms,
            life_events=life_events,
            assessments=assessments,
        )

        if features.empty:
            result['status'] = 'skipped'
            result['message'] = 'Matriz de features vazia após engenharia de dados.'
            logger.info("Skipping patient %s: empty features.", patient_id)
            return result

        # ------------------------------------------------------------------
        # 3. Pattern detection
        # ------------------------------------------------------------------
        patterns = detect_patterns(features, life_events)

        # ------------------------------------------------------------------
        # 4. Anomaly detection
        # ------------------------------------------------------------------
        anomalies = detect_anomalies(features)

        # ------------------------------------------------------------------
        # 5. DSM-inspired pattern checks
        # ------------------------------------------------------------------
        dsm_flags = detect_dsm_patterns(features, symptoms)

        # ------------------------------------------------------------------
        # 5.5. Digital Twin update
        # ------------------------------------------------------------------
        try:
            twin_result = build_digital_twin(patient_id, features)
            if twin_result:
                result['digital_twin_updated'] = True
                logger.info("Digital twin updated for patient %s", patient_id)
        except Exception as exc:
            logger.warning("Digital twin update failed for patient %s: %s", patient_id, exc)

        # ------------------------------------------------------------------
        # 6. Generate and persist insights
        # ------------------------------------------------------------------
        insights_count = 0
        insights_count += _persist_pattern_insights(patient_id, patterns)
        insights_count += _persist_anomaly_insights(patient_id, anomalies)
        insights_count += _persist_dsm_insights(patient_id, dsm_flags)

        result['insights_generated'] = insights_count

        # ------------------------------------------------------------------
        # 7. Evaluate alert rules
        # ------------------------------------------------------------------
        alerts_count = evaluate_alerts(
            patient_id=patient_id,
            features=features,
            medication_logs=medication_logs,
            dsm_patterns=dsm_flags,
        )
        result['alerts_generated'] = alerts_count

        result['message'] = (
            f"Análise concluída: {insights_count} insights, {alerts_count} alertas."
        )
        logger.info(
            "Patient %s analysis complete: %d insights, %d alerts.",
            patient_id, insights_count, alerts_count,
        )

    except Exception as exc:
        result['status'] = 'error'
        result['message'] = f"Análise falhou: {exc}"
        logger.exception("Analysis failed for patient %s", patient_id)

    return result


def analyze_all_patients() -> List[Dict[str, Any]]:
    """
    Run analysis for every active patient.

    Returns a list of per-patient result summaries.
    """
    patient_ids = db.get_active_patient_ids()
    logger.info("Starting analysis for %d active patients.", len(patient_ids))

    results = []
    for pid in patient_ids:
        results.append(analyze_patient(pid))

    # Summary log
    success = sum(1 for r in results if r['status'] == 'success')
    skipped = sum(1 for r in results if r['status'] == 'skipped')
    errors = sum(1 for r in results if r['status'] == 'error')
    total_insights = sum(r['insights_generated'] for r in results)
    total_alerts = sum(r['alerts_generated'] for r in results)

    logger.info(
        "Batch analysis complete: %d patients (%d success, %d skipped, %d errors). "
        "Total: %d insights, %d alerts.",
        len(results), success, skipped, errors, total_insights, total_alerts,
    )
    return results


# ---------------------------------------------------------------------------
# Internal: persist insights from each detector
# ---------------------------------------------------------------------------

def _persist_pattern_insights(
    patient_id: str, patterns: List[Dict[str, Any]],
) -> int:
    """Convert pattern detections to ai_insights rows and store them."""
    count = 0
    for p in patterns:
        ptype = p['pattern_type']
        insight_type = _map_pattern_to_insight_type(ptype)
        impact = _impact_from_confidence(p['confidence'])

        title = _pattern_title(p)
        recommendations = _pattern_recommendations(p)

        try:
            db.store_insight(
                patient_id=patient_id,
                insight_type=insight_type,
                title=title,
                explanation=p['description'],
                confidence_score=p['confidence'],
                impact_level=impact,
                data_points=p.get('details', {}),
                recommendations=recommendations,
            )
            count += 1
        except Exception:
            logger.exception("Failed to store pattern insight for patient %s", patient_id)
    return count


def _persist_anomaly_insights(
    patient_id: str, anomalies: List[Dict[str, Any]],
) -> int:
    """Convert anomaly detections to ai_insights rows and store them."""
    count = 0
    for a in anomalies:
        impact = a.get('severity', 'low')
        try:
            db.store_insight(
                patient_id=patient_id,
                insight_type='anomaly',
                title=f"Anomalia detectada: {a['details'].get('variable', 'múltiplas métricas')}",
                explanation=a['description'],
                confidence_score=0.7,  # anomalies have implicit confidence
                impact_level=impact,
                data_points=a.get('details', {}),
                recommendations=(
                    "Revise o ponto de dados sinalizado e compare com o contexto "
                    "relatado pelo paciente. Se isso representar uma mudança genuína, "
                    "considere agendar um acompanhamento."
                ),
            )
            count += 1
        except Exception:
            logger.exception("Failed to store anomaly insight for patient %s", patient_id)
    return count


def _persist_dsm_insights(
    patient_id: str, dsm_flags: List[Dict[str, Any]],
) -> int:
    """Convert DSM pattern flags to ai_insights rows and store them."""
    count = 0
    for d in dsm_flags:
        impact = _dsm_impact(d)
        try:
            db.store_insight(
                patient_id=patient_id,
                insight_type='risk',
                title=d['pattern_name'],
                explanation=d['description'],
                confidence_score=d['confidence_score'],
                impact_level=impact,
                data_points=d.get('supporting_data_points', {}),
                recommendations=_dsm_recommendations(d),
            )
            count += 1
        except Exception:
            logger.exception("Failed to store DSM insight for patient %s", patient_id)
    return count


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------

def _map_pattern_to_insight_type(pattern_type: str) -> str:
    mapping = {
        'correlation': 'correlation',
        'trend': 'trend',
        'cyclical': 'pattern',
        'event_correlation': 'correlation',
    }
    return mapping.get(pattern_type, 'pattern')


def _impact_from_confidence(confidence: float) -> str:
    if confidence >= 0.8:
        return 'high'
    if confidence >= 0.5:
        return 'medium'
    return 'low'


def _pattern_title(p: Dict[str, Any]) -> str:
    ptype = p['pattern_type']
    details = p.get('details', {})

    if ptype == 'correlation':
        a = details.get('variable_a', '?')
        b = details.get('variable_b', '?')
        direction = details.get('direction', '')
        dir_pt = 'Positiva' if direction == 'positive' else 'Negativa' if direction == 'negative' else direction.capitalize()
        return f"Correlação {dir_pt}: {a} e {b}"

    if ptype == 'trend':
        var = details.get('variable', '?')
        interp = details.get('clinical_interpretation', '')
        interp_pt = 'Piora' if interp == 'worsening' else 'Melhora' if interp == 'improving' else interp.capitalize()
        return f"Tendência de {interp_pt} em {var}"

    if ptype == 'cyclical':
        var = details.get('variable', '?')
        return f"Ciclo semanal detectado em {var}"

    if ptype == 'event_correlation':
        cat = details.get('event_category', '?')
        return f"Eventos de vida ({cat}) associados a mudanças de humor"

    return "Padrão detectado"


def _pattern_recommendations(p: Dict[str, Any]) -> str:
    ptype = p['pattern_type']
    details = p.get('details', {})

    if ptype == 'correlation':
        direction = details.get('direction', 'positive')
        a = details.get('variable_a', '')
        b = details.get('variable_b', '')
        if 'sleep' in a:
            return (
                "Considere discutir estratégias de higiene do sono com o paciente. "
                f"Melhorar {a.replace('_', ' ')} pode afetar positivamente {b}."
            )
        if 'med_adherence' in a:
            return (
                "A adesão à medicação parece estar associada aos níveis de sintomas. "
                "Reforce a importância do uso consistente da medicação."
            )
        return (
            f"Monitore a relação entre {a.replace('_', ' ')} e "
            f"{b.replace('_', ' ')} nas próximas sessões."
        )

    if ptype == 'trend':
        interp = details.get('clinical_interpretation', '')
        var = details.get('variable', '')
        if interp == 'worsening':
            return (
                f"A tendência de {var} indica deterioração. Considere intervenção "
                f"proativa ou aumento da frequência das sessões."
            )
        return (
            f"A tendência de {var} é positiva. Reforce as estratégias atuais e "
            f"discuta o que pode estar contribuindo para a melhora."
        )

    if ptype == 'cyclical':
        worst_day = details.get('worst_day', '')
        return (
            f"O paciente tende a reportar pontuações mais baixas às {worst_day}s. "
            f"Considere agendar sessões próximas às {worst_day}s ou "
            f"discutir estratégias de enfrentamento para esses dias."
        )

    if ptype == 'event_correlation':
        cat = details.get('event_category', '')
        return (
            f"Eventos de vida na categoria '{cat}' têm um efeito notável no humor. "
            f"Discuta mecanismos de enfrentamento relacionados a eventos de {cat} nas sessões."
        )

    return "Revise o padrão detectado e discuta os achados com o paciente."


def _dsm_impact(d: Dict[str, Any]) -> str:
    name = d.get('pattern_name', '')
    confidence = d.get('confidence_score', 0)

    if 'Misto' in name or 'Mixed' in name or 'Depressivo' in name or 'Depressive' in name:
        return 'high' if confidence >= 0.6 else 'medium'
    if 'Ansiedade' in name or 'Anxiety' in name:
        return 'high' if confidence >= 0.7 else 'medium'
    if 'Ciclagem' in name or 'Cycling' in name:
        return 'medium'
    return 'medium'


def _dsm_recommendations(d: Dict[str, Any]) -> str:
    name = d.get('pattern_name', '')

    if 'Depressivo' in name or 'Depressive' in name:
        return (
            "O padrão de dados é compatível com um episódio depressivo. "
            "Considere uma avaliação clínica estruturada (ex.: PHQ-9) e "
            "avalie a necessidade de ajuste no tratamento."
        )
    if 'Misto' in name or 'Mixed' in name:
        return (
            "O padrão de dados sugere características depressivas e ansiosas "
            "coocorrentes. Uma avaliação clínica abrangente é recomendada "
            "para avaliar a necessidade de tratamento integrado."
        )
    if 'Ansiedade' in name or 'Anxiety' in name:
        return (
            "O padrão de dados é compatível com uma apresentação de ansiedade "
            "generalizada. Considere uma avaliação estruturada (ex.: GAD-7) "
            "e avalie intervenções terapêuticas."
        )
    if 'Ciclagem' in name or 'Cycling' in name:
        return (
            "A ciclagem rápida de humor pode indicar instabilidade de humor. Considere "
            "uma revisão do acompanhamento de humor em sessão e avalie se uma "
            "consulta psiquiátrica é justificada."
        )
    return "Revise este padrão com o paciente durante a próxima sessão."
