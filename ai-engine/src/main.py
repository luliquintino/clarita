"""
CLARITA AI Engine - Flask Application Entry Point

Provides the HTTP API for the AI insight engine and starts the
APScheduler background jobs.

Endpoints
---------
POST /analyze/<patient_id>   Trigger analysis for a single patient.
POST /analyze-all            Trigger analysis for all active patients.
GET  /health                 Health check / readiness probe.
"""

import atexit
import logging
from datetime import datetime

from flask import Flask, jsonify, request

from .config import Config, setup_logging
from .insight_generation import analyze_patient, analyze_all_patients
from . import db as ai_db
from .scheduler import start_scheduler, stop_scheduler

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> Flask:
    """
    Flask application factory.

    Sets up logging, registers routes, and starts the background
    scheduler.  Returns the configured Flask app.
    """
    setup_logging()
    logger = logging.getLogger(__name__)

    app = Flask(__name__)

    # ------------------------------------------------------------------
    # Start scheduler (only once, guarded inside start_scheduler)
    # ------------------------------------------------------------------
    scheduler = start_scheduler()
    atexit.register(stop_scheduler)
    logger.info("CLARITA AI Engine starting up.")

    # ------------------------------------------------------------------
    # Routes
    # ------------------------------------------------------------------

    @app.route('/health', methods=['GET'])
    def health():
        """
        Health-check endpoint.

        Returns 200 with a JSON payload indicating the service is
        operational.  Used by container orchestrators and load balancers.
        """
        return jsonify({
            'status': 'healthy',
            'service': 'clarita-ai-engine',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'scheduler_running': scheduler.running if scheduler else False,
            'scheduler_jobs': len(scheduler.get_jobs()) if scheduler else 0,
        }), 200

    @app.route('/analyze/<patient_id>', methods=['POST'])
    def analyze_single(patient_id: str):
        """
        Trigger analysis for a single patient.

        Path Parameters
        ---------------
        patient_id : str
            UUID of the patient to analyse.

        Returns
        -------
        JSON
            Analysis result summary with HTTP 200 (success/skipped) or
            HTTP 500 (error).
        """
        logger.info("API: POST /analyze/%s", patient_id)

        result = analyze_patient(patient_id)

        if result['status'] == 'error':
            return jsonify(result), 500

        return jsonify(result), 200

    @app.route('/analyze-all', methods=['POST'])
    def analyze_all():
        """
        Trigger analysis for all active patients.

        Returns
        -------
        JSON
            Summary of all patient analyses.
        """
        logger.info("API: POST /analyze-all")

        results = analyze_all_patients()

        summary = {
            'total_patients': len(results),
            'success': sum(1 for r in results if r['status'] == 'success'),
            'skipped': sum(1 for r in results if r['status'] == 'skipped'),
            'errors': sum(1 for r in results if r['status'] == 'error'),
            'total_insights': sum(r['insights_generated'] for r in results),
            'total_alerts': sum(r['alerts_generated'] for r in results),
            'details': results,
        }

        status_code = 200 if summary['errors'] == 0 else 207  # Multi-Status
        return jsonify(summary), status_code

    @app.route('/twin/<patient_id>', methods=['GET'])
    def get_twin(patient_id: str):
        """Fetch the latest digital twin state for a patient."""
        twin = ai_db.get_latest_digital_twin(patient_id)
        if not twin:
            return jsonify({
                'status': 'not_available',
                'message': 'Gêmeo digital ainda não disponível',
            }), 404
        return jsonify(twin), 200

    @app.route('/twin/<patient_id>/history', methods=['GET'])
    def get_twin_history(patient_id: str):
        """Fetch digital twin evolution over time."""
        days = request.args.get('days', 90, type=int)
        history = ai_db.get_digital_twin_history(patient_id, days=days)
        return jsonify({'history': history}), 200

    return app


# ---------------------------------------------------------------------------
# Direct execution (development)
# ---------------------------------------------------------------------------

app = create_app()

if __name__ == '__main__':
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG,
    )
