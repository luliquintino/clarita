-- ============================================================================
-- CLARITA - Digital Twin Migration
-- Adds digital_twin_states table for storing per-patient mental model snapshots
-- ============================================================================

BEGIN;

-- Add digital_twin to data_permission_type enum
ALTER TYPE data_permission_type ADD VALUE IF NOT EXISTS 'digital_twin';

-- Digital Twin state snapshots
CREATE TABLE IF NOT EXISTS digital_twin_states (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL,

    -- Current variable states (latest values + rolling averages + trends)
    current_state       JSONB NOT NULL DEFAULT '{}',

    -- Learned correlations between variables
    correlations        JSONB NOT NULL DEFAULT '[]',

    -- Emotional baseline (from first 14 days)
    baseline            JSONB NOT NULL DEFAULT '{}',

    -- Behavioral predictions
    predictions         JSONB NOT NULL DEFAULT '[]',

    -- Treatment response tracking
    treatment_responses JSONB NOT NULL DEFAULT '[]',

    -- Model metadata
    data_points_used    INTEGER NOT NULL DEFAULT 0,
    model_version       VARCHAR(20) NOT NULL DEFAULT '1.0',
    confidence_overall  DECIMAL(5,4) NOT NULL DEFAULT 0.0,

    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_digital_twin_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_digital_twin_confidence
        CHECK (confidence_overall >= 0.0 AND confidence_overall <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_digital_twin_patient_id
    ON digital_twin_states (patient_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_patient_latest
    ON digital_twin_states (patient_id, computed_at DESC);

COMMIT;
