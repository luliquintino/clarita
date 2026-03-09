-- ============================================================================
-- PHASE 3: Goals & Milestones System
-- Adds goals and milestones tables for tracking patient progress
-- ============================================================================

BEGIN;

-- Create goal_status enum
DO $$
BEGIN
    CREATE TYPE goal_status AS ENUM ('in_progress', 'achieved', 'paused', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    status          goal_status DEFAULT 'in_progress',
    target_date     DATE,
    achieved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_patient_id ON goals (patient_id);
CREATE INDEX IF NOT EXISTS idx_goals_patient_status ON goals (patient_id, status);

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id         UUID REFERENCES goals(id) ON DELETE SET NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    milestone_type  VARCHAR(50) NOT NULL CHECK (milestone_type IN ('positive', 'difficult')),
    event_date      DATE NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_patient_id ON milestones (patient_id);
CREATE INDEX IF NOT EXISTS idx_milestones_patient_date ON milestones (patient_id, event_date DESC);

COMMIT;
