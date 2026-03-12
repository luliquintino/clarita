-- ============================================================================
-- Migration: ICD-11 Diagnostic Database + SATEPSI Test Validation
-- Adds tables: icd11_disorders, satepsi_tests, icd_test_mapping
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ICD-11 Disorders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS icd11_disorders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icd_code          VARCHAR(20) NOT NULL UNIQUE,
    disorder_name     VARCHAR(500) NOT NULL,
    description       TEXT,
    symptom_keywords  TEXT[],
    category          VARCHAR(200),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icd11_disorders_code ON icd11_disorders (icd_code);
CREATE INDEX IF NOT EXISTS idx_icd11_disorders_category ON icd11_disorders (category);

-- ---------------------------------------------------------------------------
-- SATEPSI Tests (CFP-approved psychological tests)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS satepsi_tests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name         VARCHAR(500) NOT NULL,
    test_author       VARCHAR(500),
    approval_status   VARCHAR(20) NOT NULL DEFAULT 'active',
    approval_date     DATE,
    expiry_date       DATE,
    test_category     VARCHAR(200),
    cfp_code          VARCHAR(100),
    last_updated      TIMESTAMPTZ DEFAULT NOW(),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_satepsi_tests_name_author ON satepsi_tests (test_name, test_author);
CREATE INDEX IF NOT EXISTS idx_satepsi_tests_status ON satepsi_tests (approval_status);
CREATE INDEX IF NOT EXISTS idx_satepsi_tests_category ON satepsi_tests (test_category);
CREATE INDEX IF NOT EXISTS idx_satepsi_tests_name ON satepsi_tests (test_name);

-- ---------------------------------------------------------------------------
-- Link psychological_tests to satepsi_tests for validation
-- ---------------------------------------------------------------------------
ALTER TABLE psychological_tests
    ADD COLUMN IF NOT EXISTS satepsi_test_id UUID REFERENCES satepsi_tests(id),
    ADD COLUMN IF NOT EXISTS requires_satepsi_approval BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- ICD-11 to Psychological Test Mapping
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS icd_test_mapping (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disorder_id       UUID NOT NULL REFERENCES icd11_disorders(id) ON DELETE CASCADE,
    test_id           UUID NOT NULL REFERENCES psychological_tests(id) ON DELETE CASCADE,
    relevance_score   NUMERIC(3,2) NOT NULL DEFAULT 0.50,
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(disorder_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_icd_test_mapping_disorder ON icd_test_mapping (disorder_id);
CREATE INDEX IF NOT EXISTS idx_icd_test_mapping_test ON icd_test_mapping (test_id);

-- ---------------------------------------------------------------------------
-- SATEPSI update log (tracks sync history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS satepsi_sync_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synced_at         TIMESTAMPTZ DEFAULT NOW(),
    tests_updated     INTEGER DEFAULT 0,
    tests_deactivated INTEGER DEFAULT 0,
    status            VARCHAR(20) DEFAULT 'success',
    error_message     TEXT
);
