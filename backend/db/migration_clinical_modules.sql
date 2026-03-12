-- ============================================================================
-- Migration: 8 Clinical Modules
-- Adds tables for: Anamnesis, Private Medical Records, QR Record Sharing,
-- Chat Attachments, MEMED Prescriptions, Psychological Tests, DSM Criteria
-- ============================================================================

-- ============================================================================
-- ENUM EXTENSIONS (must be outside transaction)
-- ============================================================================

DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'test_assigned';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'anamnesis_assigned';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'test_completed';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'anamnesis_completed';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'record_access_requested';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE data_permission_type ADD VALUE IF NOT EXISTS 'anamnesis';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE data_permission_type ADD VALUE IF NOT EXISTS 'psychological_tests';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE data_permission_type ADD VALUE IF NOT EXISTS 'private_records';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- MODULE 1: Custom Anamnesis System
-- ---------------------------------------------------------------------------

-- Templates created by professionals
CREATE TABLE IF NOT EXISTS anamnesis_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anamnesis_templates_professional
    ON anamnesis_templates (professional_id);
CREATE INDEX IF NOT EXISTS idx_anamnesis_templates_active
    ON anamnesis_templates (professional_id, is_active) WHERE is_active = TRUE;

-- Questions within a template
CREATE TABLE IF NOT EXISTS anamnesis_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id     UUID NOT NULL REFERENCES anamnesis_templates(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    question_type   VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'scale', 'multiple_choice', 'yes_no', 'date')),
    options         JSONB,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anamnesis_questions_template
    ON anamnesis_questions (template_id, display_order);

-- Responses: sent by professional, filled by patient
CREATE TABLE IF NOT EXISTS anamnesis_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id     UUID NOT NULL REFERENCES anamnesis_templates(id) ON DELETE RESTRICT,
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers         JSONB DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    deadline        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anamnesis_responses_patient_status
    ON anamnesis_responses (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_anamnesis_responses_professional_patient
    ON anamnesis_responses (professional_id, patient_id);

-- ---------------------------------------------------------------------------
-- MODULE 2: Private Digital Medical Record (Prontuario)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private_medical_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL,
    record_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    category        VARCHAR(100),
    tags            TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_medical_records_prof_patient
    ON private_medical_records (professional_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_private_medical_records_patient
    ON private_medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_private_medical_records_date
    ON private_medical_records (professional_id, patient_id, record_date DESC);

-- ---------------------------------------------------------------------------
-- MODULE 3: Temporary Record Sharing via QR Code
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS record_access_tokens (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    granting_professional_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token                       VARCHAR(64) NOT NULL UNIQUE,
    expires_at                  TIMESTAMPTZ NOT NULL,
    is_revoked                  BOOLEAN NOT NULL DEFAULT FALSE,
    accessed_by_professional_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accessed_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_access_tokens_token
    ON record_access_tokens (token);
CREATE INDEX IF NOT EXISTS idx_record_access_tokens_granting
    ON record_access_tokens (granting_professional_id);
CREATE INDEX IF NOT EXISTS idx_record_access_tokens_expires
    ON record_access_tokens (expires_at) WHERE is_revoked = FALSE;

CREATE TABLE IF NOT EXISTS shared_medical_records (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_token_id             UUID NOT NULL REFERENCES record_access_tokens(id) ON DELETE CASCADE,
    receiving_professional_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_content             TEXT,
    original_records_count      INTEGER NOT NULL DEFAULT 0,
    shared_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    saved_at                    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shared_medical_records_token
    ON shared_medical_records (access_token_id);
CREATE INDEX IF NOT EXISTS idx_shared_medical_records_receiving
    ON shared_medical_records (receiving_professional_id);

-- ---------------------------------------------------------------------------
-- MODULE 4: Chat Attachments (extends existing chat)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INTEGER NOT NULL,
    storage_path    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message
    ON chat_attachments (message_id);

-- ---------------------------------------------------------------------------
-- MODULE 5: MEMED Prescriptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memed_prescriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memed_prescription_id   VARCHAR(100),
    pdf_url                 TEXT,
    medications_data        JSONB NOT NULL DEFAULT '[]',
    status                  VARCHAR(30) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'sent', 'viewed', 'local')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memed_prescriptions_professional
    ON memed_prescriptions (professional_id);
CREATE INDEX IF NOT EXISTS idx_memed_prescriptions_patient
    ON memed_prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_memed_prescriptions_prof_patient
    ON memed_prescriptions (professional_id, patient_id);

-- ---------------------------------------------------------------------------
-- MODULE 6: Psychological Tests + AI Analysis + DSM
-- ---------------------------------------------------------------------------

-- Test catalog (like assessments but with DSM references and AI analysis)
CREATE TABLE IF NOT EXISTS psychological_tests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(300) NOT NULL,
    description         TEXT,
    category            VARCHAR(100),
    dsm_references      TEXT[],
    questions           JSONB NOT NULL DEFAULT '[]',
    scoring_rules       JSONB NOT NULL DEFAULT '{}',
    interpretation_guide JSONB DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psychological_tests_active
    ON psychological_tests (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_psychological_tests_category
    ON psychological_tests (category);

-- Test sessions: assigned by professional, taken by patient
CREATE TABLE IF NOT EXISTS patient_test_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id         UUID NOT NULL REFERENCES psychological_tests(id) ON DELETE RESTRICT,
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
    deadline        TIMESTAMPTZ,
    answers         JSONB DEFAULT '{}',
    total_score     NUMERIC,
    ai_analysis     JSONB,
    dsm_mapping     JSONB,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_test_sessions_patient_status
    ON patient_test_sessions (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_test_sessions_assigned
    ON patient_test_sessions (assigned_by, patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_test_sessions_deadline
    ON patient_test_sessions (deadline) WHERE status = 'pending';

-- Individual test responses (optional granular tracking)
CREATE TABLE IF NOT EXISTS test_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES patient_test_sessions(id) ON DELETE CASCADE,
    question_index  INTEGER NOT NULL,
    answer          JSONB NOT NULL,
    answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_responses_session
    ON test_responses (session_id, question_index);

-- DSM criteria library
CREATE TABLE IF NOT EXISTS dsm_criteria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20) NOT NULL,
    name            VARCHAR(300) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    criteria        JSONB NOT NULL DEFAULT '{}',
    version         VARCHAR(20) NOT NULL DEFAULT 'DSM-5-TR',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsm_criteria_code
    ON dsm_criteria (code);
CREATE INDEX IF NOT EXISTS idx_dsm_criteria_category
    ON dsm_criteria (category);

-- ============================================================================
-- TRIGGERS: updated_at for tables that need it
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_anamnesis_templates_updated_at'
    ) THEN
        CREATE TRIGGER trg_anamnesis_templates_updated_at
            BEFORE UPDATE ON anamnesis_templates
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_private_medical_records_updated_at'
    ) THEN
        CREATE TRIGGER trg_private_medical_records_updated_at
            BEFORE UPDATE ON private_medical_records
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
END $$;

COMMIT;
