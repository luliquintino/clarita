-- ============================================================================
-- CLARITA - Mental Health Monitoring Platform
-- PostgreSQL Database Schema
-- Version: 1.0.0
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('patient', 'psychologist', 'psychiatrist');

CREATE TYPE sleep_quality_level AS ENUM ('very_poor', 'poor', 'fair', 'good', 'excellent');

CREATE TYPE care_relationship_type AS ENUM ('psychologist', 'psychiatrist');

CREATE TYPE care_relationship_status AS ENUM ('active', 'inactive', 'pending');

CREATE TYPE data_permission_type AS ENUM (
    'emotional_logs',
    'symptoms',
    'medications',
    'assessments',
    'life_events',
    'clinical_notes',
    'all'
);

CREATE TYPE medication_status AS ENUM ('active', 'discontinued', 'paused');

CREATE TYPE life_event_category AS ENUM (
    'relationship',
    'work',
    'health',
    'family',
    'financial',
    'loss',
    'achievement',
    'other'
);

CREATE TYPE clinical_note_type AS ENUM (
    'session',
    'observation',
    'treatment_plan',
    'progress'
);

CREATE TYPE ai_insight_type AS ENUM (
    'pattern',
    'correlation',
    'anomaly',
    'trend',
    'risk'
);

CREATE TYPE impact_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE alert_type AS ENUM (
    'depressive_episode',
    'high_anxiety',
    'medication_non_adherence',
    'risk_pattern',
    'anomaly'
);

CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================================
-- TABLE: users
-- ============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(30),
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_is_active ON users (is_active);
CREATE INDEX idx_users_created_at ON users (created_at);

-- ============================================================================
-- TABLE: patient_profiles
-- ============================================================================

CREATE TABLE patient_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL,
    date_of_birth           DATE,
    gender                  VARCHAR(30),
    emergency_contact_name  VARCHAR(200),
    emergency_contact_phone VARCHAR(30),
    onboarding_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_data         JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_patient_profiles_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_patient_profiles_user_id UNIQUE (user_id)
);

CREATE INDEX idx_patient_profiles_user_id ON patient_profiles (user_id);

-- ============================================================================
-- TABLE: professional_profiles
-- ============================================================================

CREATE TABLE professional_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    license_number      VARCHAR(100) NOT NULL,
    specialization      VARCHAR(200),
    institution         VARCHAR(300),
    bio                 TEXT,
    years_of_experience INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_professional_profiles_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_professional_profiles_user_id UNIQUE (user_id),
    CONSTRAINT uq_professional_profiles_license UNIQUE (license_number),
    CONSTRAINT chk_years_of_experience
        CHECK (years_of_experience IS NULL OR years_of_experience >= 0)
);

CREATE INDEX idx_professional_profiles_user_id ON professional_profiles (user_id);
CREATE INDEX idx_professional_profiles_license ON professional_profiles (license_number);

-- ============================================================================
-- TABLE: care_relationships
-- ============================================================================

CREATE TABLE care_relationships (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL,
    professional_id     UUID NOT NULL,
    relationship_type   care_relationship_type NOT NULL,
    status              care_relationship_status NOT NULL DEFAULT 'pending',
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_care_relationships_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_care_relationships_professional
        FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_care_relationships_different_users
        CHECK (patient_id <> professional_id),
    CONSTRAINT chk_care_relationships_dates
        CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_care_relationships_patient_id ON care_relationships (patient_id);
CREATE INDEX idx_care_relationships_professional_id ON care_relationships (professional_id);
CREATE INDEX idx_care_relationships_status ON care_relationships (status);
CREATE INDEX idx_care_relationships_patient_status
    ON care_relationships (patient_id, status);
CREATE INDEX idx_care_relationships_professional_status
    ON care_relationships (professional_id, status);

-- ============================================================================
-- TABLE: data_permissions
-- ============================================================================

CREATE TABLE data_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL,
    professional_id UUID NOT NULL,
    permission_type data_permission_type NOT NULL,
    granted         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_data_permissions_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_data_permissions_professional
        FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_data_permissions_patient_professional_type
        UNIQUE (patient_id, professional_id, permission_type),
    CONSTRAINT chk_data_permissions_different_users
        CHECK (patient_id <> professional_id)
);

CREATE INDEX idx_data_permissions_patient_id ON data_permissions (patient_id);
CREATE INDEX idx_data_permissions_professional_id ON data_permissions (professional_id);
CREATE INDEX idx_data_permissions_patient_professional
    ON data_permissions (patient_id, professional_id);

-- ============================================================================
-- TABLE: emotional_logs
-- ============================================================================

CREATE TABLE emotional_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL,
    mood_score      INTEGER NOT NULL,
    anxiety_score   INTEGER NOT NULL,
    energy_score    INTEGER NOT NULL,
    sleep_quality   sleep_quality_level,
    sleep_hours     DECIMAL(4,2),
    notes           TEXT,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_emotional_logs_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_mood_score
        CHECK (mood_score >= 1 AND mood_score <= 10),
    CONSTRAINT chk_anxiety_score
        CHECK (anxiety_score >= 1 AND anxiety_score <= 10),
    CONSTRAINT chk_energy_score
        CHECK (energy_score >= 1 AND energy_score <= 10),
    CONSTRAINT chk_sleep_hours
        CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24))
);

CREATE INDEX idx_emotional_logs_patient_id ON emotional_logs (patient_id);
CREATE INDEX idx_emotional_logs_logged_at ON emotional_logs (logged_at);
CREATE INDEX idx_emotional_logs_patient_logged
    ON emotional_logs (patient_id, logged_at DESC);
CREATE INDEX idx_emotional_logs_created_at ON emotional_logs (created_at);

-- ============================================================================
-- TABLE: symptoms
-- ============================================================================

CREATE TABLE symptoms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    severity_scale  VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_symptoms_name UNIQUE (name)
);

CREATE INDEX idx_symptoms_category ON symptoms (category);
CREATE INDEX idx_symptoms_name ON symptoms (name);

-- ============================================================================
-- TABLE: patient_symptoms
-- ============================================================================

CREATE TABLE patient_symptoms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id  UUID NOT NULL,
    symptom_id  UUID NOT NULL,
    severity    INTEGER NOT NULL,
    notes       TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_patient_symptoms_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_symptoms_symptom
        FOREIGN KEY (symptom_id) REFERENCES symptoms (id) ON DELETE CASCADE,
    CONSTRAINT chk_patient_symptoms_severity
        CHECK (severity >= 1 AND severity <= 10)
);

CREATE INDEX idx_patient_symptoms_patient_id ON patient_symptoms (patient_id);
CREATE INDEX idx_patient_symptoms_symptom_id ON patient_symptoms (symptom_id);
CREATE INDEX idx_patient_symptoms_reported_at ON patient_symptoms (reported_at);
CREATE INDEX idx_patient_symptoms_patient_reported
    ON patient_symptoms (patient_id, reported_at DESC);

-- ============================================================================
-- TABLE: medications
-- ============================================================================

CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    common_dosages  TEXT[],
    side_effects    TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_medications_name UNIQUE (name)
);

CREATE INDEX idx_medications_category ON medications (category);
CREATE INDEX idx_medications_name ON medications (name);

-- ============================================================================
-- TABLE: patient_medications
-- ============================================================================

CREATE TABLE patient_medications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL,
    medication_id   UUID NOT NULL,
    prescribed_by   UUID,
    dosage          VARCHAR(100) NOT NULL,
    frequency       VARCHAR(100) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          medication_status NOT NULL DEFAULT 'active',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_patient_medications_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_medications_medication
        FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE RESTRICT,
    CONSTRAINT fk_patient_medications_prescribed_by
        FOREIGN KEY (prescribed_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_patient_medications_dates
        CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_patient_medications_patient_id ON patient_medications (patient_id);
CREATE INDEX idx_patient_medications_medication_id ON patient_medications (medication_id);
CREATE INDEX idx_patient_medications_prescribed_by ON patient_medications (prescribed_by);
CREATE INDEX idx_patient_medications_status ON patient_medications (status);
CREATE INDEX idx_patient_medications_patient_status
    ON patient_medications (patient_id, status);

-- ============================================================================
-- TABLE: medication_logs
-- ============================================================================

CREATE TABLE medication_logs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_medication_id   UUID NOT NULL,
    taken_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    skipped                 BOOLEAN NOT NULL DEFAULT FALSE,
    skip_reason             TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_medication_logs_patient_medication
        FOREIGN KEY (patient_medication_id)
        REFERENCES patient_medications (id) ON DELETE CASCADE,
    CONSTRAINT chk_medication_logs_skip_reason
        CHECK (skipped = FALSE OR skip_reason IS NOT NULL)
);

CREATE INDEX idx_medication_logs_patient_medication_id
    ON medication_logs (patient_medication_id);
CREATE INDEX idx_medication_logs_taken_at ON medication_logs (taken_at);
CREATE INDEX idx_medication_logs_patient_medication_taken
    ON medication_logs (patient_medication_id, taken_at DESC);

-- ============================================================================
-- TABLE: assessments
-- ============================================================================

CREATE TABLE assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    questions       JSONB NOT NULL,
    scoring_rules   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_assessments_name UNIQUE (name)
);

CREATE INDEX idx_assessments_name ON assessments (name);

-- ============================================================================
-- TABLE: assessment_results
-- ============================================================================

CREATE TABLE assessment_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL,
    assessment_id   UUID NOT NULL,
    answers         JSONB NOT NULL,
    total_score     INTEGER NOT NULL,
    severity_level  VARCHAR(50) NOT NULL,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assessment_results_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_results_assessment
        FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE RESTRICT,
    CONSTRAINT chk_assessment_results_total_score
        CHECK (total_score >= 0)
);

CREATE INDEX idx_assessment_results_patient_id ON assessment_results (patient_id);
CREATE INDEX idx_assessment_results_assessment_id ON assessment_results (assessment_id);
CREATE INDEX idx_assessment_results_completed_at ON assessment_results (completed_at);
CREATE INDEX idx_assessment_results_patient_completed
    ON assessment_results (patient_id, completed_at DESC);
CREATE INDEX idx_assessment_results_patient_assessment
    ON assessment_results (patient_id, assessment_id);

-- ============================================================================
-- TABLE: life_events
-- ============================================================================

CREATE TABLE life_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    category        life_event_category NOT NULL,
    impact_level    INTEGER NOT NULL,
    event_date      DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_life_events_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_life_events_impact_level
        CHECK (impact_level >= 1 AND impact_level <= 10)
);

CREATE INDEX idx_life_events_patient_id ON life_events (patient_id);
CREATE INDEX idx_life_events_event_date ON life_events (event_date);
CREATE INDEX idx_life_events_category ON life_events (category);
CREATE INDEX idx_life_events_patient_date
    ON life_events (patient_id, event_date DESC);

-- ============================================================================
-- TABLE: clinical_notes
-- ============================================================================

CREATE TABLE clinical_notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL,
    patient_id      UUID NOT NULL,
    session_date    DATE NOT NULL,
    note_type       clinical_note_type NOT NULL,
    content         TEXT NOT NULL,
    is_private      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_clinical_notes_professional
        FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_clinical_notes_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_clinical_notes_different_users
        CHECK (professional_id <> patient_id)
);

CREATE INDEX idx_clinical_notes_professional_id ON clinical_notes (professional_id);
CREATE INDEX idx_clinical_notes_patient_id ON clinical_notes (patient_id);
CREATE INDEX idx_clinical_notes_session_date ON clinical_notes (session_date);
CREATE INDEX idx_clinical_notes_note_type ON clinical_notes (note_type);
CREATE INDEX idx_clinical_notes_patient_session
    ON clinical_notes (patient_id, session_date DESC);
CREATE INDEX idx_clinical_notes_professional_patient
    ON clinical_notes (professional_id, patient_id);

-- ============================================================================
-- TABLE: ai_insights
-- ============================================================================

CREATE TABLE ai_insights (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL,
    insight_type        ai_insight_type NOT NULL,
    title               VARCHAR(300) NOT NULL,
    explanation         TEXT NOT NULL,
    confidence_score    DECIMAL(5,4) NOT NULL,
    impact_level        impact_level NOT NULL,
    data_points         JSONB DEFAULT '{}',
    recommendations     TEXT,
    is_reviewed         BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by         UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ai_insights_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_insights_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_ai_insights_confidence_score
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

CREATE INDEX idx_ai_insights_patient_id ON ai_insights (patient_id);
CREATE INDEX idx_ai_insights_insight_type ON ai_insights (insight_type);
CREATE INDEX idx_ai_insights_impact_level ON ai_insights (impact_level);
CREATE INDEX idx_ai_insights_is_reviewed ON ai_insights (is_reviewed);
CREATE INDEX idx_ai_insights_created_at ON ai_insights (created_at);
CREATE INDEX idx_ai_insights_patient_created
    ON ai_insights (patient_id, created_at DESC);

-- ============================================================================
-- TABLE: alerts
-- ============================================================================

CREATE TABLE alerts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL,
    alert_type          alert_type NOT NULL,
    severity            alert_severity NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    trigger_data        JSONB DEFAULT '{}',
    is_acknowledged     BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by     UUID,
    acknowledged_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_alerts_patient
        FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_alerts_acknowledged_by
        FOREIGN KEY (acknowledged_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_alerts_acknowledged_consistency
        CHECK (
            (is_acknowledged = FALSE AND acknowledged_by IS NULL AND acknowledged_at IS NULL)
            OR
            (is_acknowledged = TRUE AND acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
        )
);

CREATE INDEX idx_alerts_patient_id ON alerts (patient_id);
CREATE INDEX idx_alerts_alert_type ON alerts (alert_type);
CREATE INDEX idx_alerts_severity ON alerts (severity);
CREATE INDEX idx_alerts_is_acknowledged ON alerts (is_acknowledged);
CREATE INDEX idx_alerts_created_at ON alerts (created_at);
CREATE INDEX idx_alerts_patient_unacknowledged
    ON alerts (patient_id, created_at DESC) WHERE is_acknowledged = FALSE;
CREATE INDEX idx_alerts_severity_unacknowledged
    ON alerts (severity, created_at DESC) WHERE is_acknowledged = FALSE;

-- ============================================================================
-- TRIGGER FUNCTION: updated_at auto-update
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Apply updated_at to all tables with that column
-- ============================================================================

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_patient_profiles_updated_at
    BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_professional_profiles_updated_at
    BEFORE UPDATE ON professional_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_data_permissions_updated_at
    BEFORE UPDATE ON data_permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_patient_medications_updated_at
    BEFORE UPDATE ON patient_medications
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_clinical_notes_updated_at
    BEFORE UPDATE ON clinical_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;
