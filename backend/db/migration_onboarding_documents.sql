-- ============================================================================
-- Migração: Onboarding + Upload de Documentos
-- Adiciona 'documents' ao enum data_permission_type
-- Cria tabelas patient_documents e document_access
-- ============================================================================

-- Adicionar novo valor ao enum data_permission_type (fora de transação)
DO $$
BEGIN
    ALTER TYPE data_permission_type ADD VALUE IF NOT EXISTS 'documents';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

BEGIN;

-- ─── Tabela de documentos do paciente ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    file_type       VARCHAR(50) NOT NULL CHECK (file_type IN ('pdf', 'jpeg', 'png')),
    file_size       INTEGER NOT NULL,
    storage_path    TEXT NOT NULL,
    document_type   VARCHAR(200),
    document_date   DATE,
    notes           TEXT,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id
    ON patient_documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_date
    ON patient_documents (patient_id, document_date DESC);

-- Trigger updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_patient_documents_updated_at'
    ) THEN
        CREATE TRIGGER trg_patient_documents_updated_at
            BEFORE UPDATE ON patient_documents
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
END $$;

-- ─── Tabela de controle de acesso por documento ─────────────────────────────
CREATE TABLE IF NOT EXISTS document_access (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES patient_documents(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by      UUID NOT NULL REFERENCES users(id),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_document_access_doc_prof
        UNIQUE (document_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_document_access_document_id
    ON document_access (document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_professional_id
    ON document_access (professional_id);

COMMIT;
