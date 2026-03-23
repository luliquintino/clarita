-- ============================================================================
-- CLARITA - Emotional Logs Twin Columns Migration
-- Adds numeric mood/anxiety/energy columns and timestamp alias used by the
-- Digital Twin compute service. Also widens sleep_quality to VARCHAR so it
-- can store both enum-style labels (e.g. 'good') and numeric values (e.g. '6').
-- Makes original score columns nullable so twin-oriented inserts (which only
-- populate the new columns) are accepted without violating NOT NULL constraints.
-- ============================================================================

BEGIN;

-- Widen sleep_quality from enum to VARCHAR so both string labels and numeric
-- values are accepted (the Digital Twin compute service uses Number() coercion)
ALTER TABLE emotional_logs
  ALTER COLUMN sleep_quality TYPE VARCHAR(20) USING sleep_quality::VARCHAR;

-- Make the original integer score columns nullable so they don't block inserts
-- that only populate the new twin-oriented numeric columns
ALTER TABLE emotional_logs
  ALTER COLUMN mood_score    DROP NOT NULL,
  ALTER COLUMN anxiety_score DROP NOT NULL,
  ALTER COLUMN energy_score  DROP NOT NULL;

-- Add numeric columns used by digitalTwinCompute service
ALTER TABLE emotional_logs
  ADD COLUMN IF NOT EXISTS timestamp       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mood            DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS anxiety         DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS energy          DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS med_adherence   DECIMAL(5,2);

COMMIT;
