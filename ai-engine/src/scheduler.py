"""
CLARITA AI Engine - Scheduler Module

Configures APScheduler to run periodic analysis jobs:

  - **Full analysis** for all active patients every N hours
    (default 6, configurable via ``ANALYSIS_INTERVAL``).
  - **Alert-only checks** every M hours
    (default 1, configurable via ``ALERT_CHECK_INTERVAL``).

The scheduler uses a ``BackgroundScheduler`` so the Flask process is
not blocked.
"""

from __future__ import annotations

import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .config import Config

logger = logging.getLogger(__name__)

# Module-level scheduler instance
_scheduler: BackgroundScheduler | None = None


# ---------------------------------------------------------------------------
# Job functions
# ---------------------------------------------------------------------------

def _job_full_analysis() -> None:
    """
    Scheduled job: run full analysis for all active patients.

    Imported lazily to avoid circular imports and to keep the scheduler
    module lightweight.
    """
    from .insight_generation import analyze_all_patients

    start = datetime.utcnow()
    logger.info("Scheduled full analysis started at %s", start.isoformat())

    try:
        results = analyze_all_patients()
        elapsed = (datetime.utcnow() - start).total_seconds()
        success = sum(1 for r in results if r['status'] == 'success')
        logger.info(
            "Scheduled full analysis completed in %.1fs: %d/%d patients succeeded.",
            elapsed, success, len(results),
        )
    except Exception:
        logger.exception("Scheduled full analysis failed.")


def _job_alert_check() -> None:
    """
    Scheduled job: run alert-only checks for all active patients.

    This is a lighter-weight pass that re-evaluates alert rules using
    cached / recent data without recomputing the full feature matrix
    from scratch.  For simplicity, it delegates to the full pipeline
    (which short-circuits quickly when data hasn't changed).
    """
    from .insight_generation import analyze_all_patients

    start = datetime.utcnow()
    logger.info("Scheduled alert check started at %s", start.isoformat())

    try:
        results = analyze_all_patients()
        elapsed = (datetime.utcnow() - start).total_seconds()
        total_alerts = sum(r['alerts_generated'] for r in results)
        logger.info(
            "Scheduled alert check completed in %.1fs: %d alerts across %d patients.",
            elapsed, total_alerts, len(results),
        )
    except Exception:
        logger.exception("Scheduled alert check failed.")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def start_scheduler() -> BackgroundScheduler:
    """
    Create and start the APScheduler ``BackgroundScheduler``.

    Call this once at application startup.  The returned scheduler
    instance can be used to shut down gracefully on exit.

    Returns
    -------
    BackgroundScheduler
    """
    global _scheduler  # noqa: PLW0603

    if _scheduler is not None and _scheduler.running:
        logger.warning("Scheduler is already running; skipping start.")
        return _scheduler

    _scheduler = BackgroundScheduler(
        job_defaults={
            'coalesce': True,      # Merge missed runs into one
            'max_instances': 1,    # Only one instance of each job at a time
            'misfire_grace_time': 60 * 30,  # 30 min grace for missed jobs
        },
    )

    # --- Full analysis job ---
    _scheduler.add_job(
        _job_full_analysis,
        trigger=IntervalTrigger(hours=Config.ANALYSIS_INTERVAL_HOURS),
        id='full_analysis',
        name='Full patient analysis',
        replace_existing=True,
    )
    logger.info(
        "Scheduled full analysis every %d hour(s).",
        Config.ANALYSIS_INTERVAL_HOURS,
    )

    # --- Alert check job ---
    _scheduler.add_job(
        _job_alert_check,
        trigger=IntervalTrigger(hours=Config.ALERT_CHECK_INTERVAL_HOURS),
        id='alert_check',
        name='Alert check',
        replace_existing=True,
    )
    logger.info(
        "Scheduled alert checks every %d hour(s).",
        Config.ALERT_CHECK_INTERVAL_HOURS,
    )

    _scheduler.start()
    logger.info("APScheduler started with %d jobs.", len(_scheduler.get_jobs()))
    return _scheduler


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler if it is running."""
    global _scheduler  # noqa: PLW0603

    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
    _scheduler = None
