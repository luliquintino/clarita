-- ============================================================================
-- Migration: Add onboarding_completed to professional_profiles
-- ============================================================================

BEGIN;

ALTER TABLE professional_profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMIT;
