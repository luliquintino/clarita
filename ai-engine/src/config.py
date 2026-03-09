"""
CLARITA AI Engine - Configuration Module

Loads configuration from environment variables with sensible defaults.
All sensitive values (DATABASE_URL, etc.) must be set via environment
or a .env file at the project root.
"""

import os
import logging
from dotenv import load_dotenv

# Load .env from ai-engine root (one level up from src/)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))


class Config:
    """Application configuration loaded from environment variables."""

    # --- Database ---
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL',
        'postgresql://clarita:clarita@localhost:5432/clarita'
    )

    # --- Analysis scheduling ---
    # Full analysis interval in hours
    ANALYSIS_INTERVAL_HOURS: int = int(os.getenv('ANALYSIS_INTERVAL', '6'))

    # Alert check interval in hours
    ALERT_CHECK_INTERVAL_HOURS: int = int(os.getenv('ALERT_CHECK_INTERVAL', '1'))

    # --- Analysis parameters ---
    # Default look-back window in days for feature engineering
    DEFAULT_LOOKBACK_DAYS: int = int(os.getenv('DEFAULT_LOOKBACK_DAYS', '90'))

    # Minimum number of data points required before running analysis
    MIN_DATA_POINTS: int = int(os.getenv('MIN_DATA_POINTS', '7'))

    # Z-score threshold for anomaly detection
    ZSCORE_THRESHOLD: float = float(os.getenv('ZSCORE_THRESHOLD', '2.0'))

    # Sudden change threshold (absolute point change day-over-day)
    SUDDEN_CHANGE_THRESHOLD: float = float(os.getenv('SUDDEN_CHANGE_THRESHOLD', '3.0'))

    # Isolation Forest contamination parameter
    ISOLATION_FOREST_CONTAMINATION: float = float(
        os.getenv('ISOLATION_FOREST_CONTAMINATION', '0.05')
    )

    # --- Logging ---
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO').upper()

    # --- Flask ---
    FLASK_HOST: str = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT: int = int(os.getenv('FLASK_PORT', '5001'))
    FLASK_DEBUG: bool = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'


def setup_logging() -> None:
    """Configure application-wide logging."""
    log_level = getattr(logging, Config.LOG_LEVEL, logging.INFO)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    # Suppress noisy third-party loggers
    logging.getLogger('apscheduler').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
