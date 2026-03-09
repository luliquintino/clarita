-- ============================================================================
-- Migration: Medical Exam Upload Feature
-- Adds patient_exams and exam_permissions tables
-- ============================================================================

-- Add 'new_exam' to alert_type enum
DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'new_exam';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- patient_exams: stores uploaded exam files metadata
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type       VARCHAR(100) NOT NULL,
    exam_date       DATE NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INTEGER NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_exams_patient ON patient_exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_exams_date ON patient_exams(exam_date DESC);

-- ---------------------------------------------------------------------------
-- exam_permissions: controls which professionals can view each exam
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_permissions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id           UUID NOT NULL REFERENCES patient_exams(id) ON DELETE CASCADE,
    professional_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by        UUID NOT NULL REFERENCES users(id),
    granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_permissions_exam ON exam_permissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_permissions_professional ON exam_permissions(professional_id);
