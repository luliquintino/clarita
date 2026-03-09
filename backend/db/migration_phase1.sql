-- ============================================================================
-- PHASE 1: Patient Portal Foundation
-- Adds journal_entry to emotional_logs and journal_summaries table
-- ============================================================================

BEGIN;

-- Add journal_entry text field to emotional_logs
ALTER TABLE emotional_logs ADD COLUMN IF NOT EXISTS journal_entry TEXT;

-- Add journal_entries to data_permission_type enum
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction in some PG versions
-- We'll handle this outside the transaction
COMMIT;

-- Add new enum value (must be outside transaction)
DO $$
BEGIN
    ALTER TYPE data_permission_type ADD VALUE IF NOT EXISTS 'journal_entries';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

BEGIN;

-- Create journal_summaries table for AI-generated summaries
CREATE TABLE IF NOT EXISTS journal_summaries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL,
    summary_text    TEXT NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_journal_summaries_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_summaries_patient_id
    ON journal_summaries (patient_id);
CREATE INDEX IF NOT EXISTS idx_journal_summaries_patient_period
    ON journal_summaries (patient_id, period_end DESC);

COMMIT;
