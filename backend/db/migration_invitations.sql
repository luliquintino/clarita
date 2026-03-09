-- ============================================================================
-- Migração: Sistema de Convites e Display ID
-- Adiciona display_id a users
-- Adiciona colunas de convite a care_relationships
-- ============================================================================

BEGIN;

-- ─── Display ID para usuários ─────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_id VARCHAR(12);

-- Backfill: gerar display_id para usuários existentes
-- Usa MD5 do UUID + timestamp para gerar códigos únicos
UPDATE users
SET display_id = 'CLA-' || UPPER(SUBSTR(MD5(id::text || created_at::text), 1, 6))
WHERE display_id IS NULL;

-- Garantir unicidade (resolver colisões se houver)
DO $$
DECLARE
    dup RECORD;
    new_id VARCHAR(12);
    counter INTEGER := 0;
BEGIN
    FOR dup IN
        SELECT id FROM users u1
        WHERE (SELECT COUNT(*) FROM users u2 WHERE u2.display_id = u1.display_id) > 1
    LOOP
        counter := counter + 1;
        new_id := 'CLA-' || UPPER(SUBSTR(MD5(dup.id::text || counter::text || NOW()::text), 1, 6));
        UPDATE users SET display_id = new_id WHERE id = dup.id;
    END LOOP;
END $$;

-- Agora pode aplicar NOT NULL e UNIQUE
ALTER TABLE users ALTER COLUMN display_id SET NOT NULL;

-- Criar índice único (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_id ON users (display_id);

-- ─── Colunas de convite em care_relationships ─────────────────────────────────

-- Quem enviou o convite
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'care_relationships' AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE care_relationships ADD COLUMN invited_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Mensagem opcional do convite
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'care_relationships' AND column_name = 'invitation_message'
    ) THEN
        ALTER TABLE care_relationships ADD COLUMN invitation_message TEXT;
    END IF;
END $$;

-- Quando o convite foi respondido
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'care_relationships' AND column_name = 'responded_at'
    ) THEN
        ALTER TABLE care_relationships ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;
END $$;

-- updated_at para care_relationships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'care_relationships' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE care_relationships ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Trigger updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_care_relationships_updated_at'
    ) THEN
        CREATE TRIGGER trg_care_relationships_updated_at
            BEFORE UPDATE ON care_relationships
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
END $$;

-- ─── Índices ──────────────────────────────────────────────────────────────────

-- Índices parciais para convites pendentes (busca rápida)
CREATE INDEX IF NOT EXISTS idx_care_relationships_pending_patient
    ON care_relationships (patient_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_care_relationships_pending_professional
    ON care_relationships (professional_id, status) WHERE status = 'pending';

-- Garantir apenas 1 relacionamento ativo/pendente por par paciente-profissional
-- (permite múltiplos inativos para histórico)
CREATE UNIQUE INDEX IF NOT EXISTS idx_care_relationships_unique_active
    ON care_relationships (patient_id, professional_id)
    WHERE status IN ('active', 'pending');

-- Backfill invited_by para relacionamentos existentes (usar professional_id como padrão)
UPDATE care_relationships SET invited_by = professional_id WHERE invited_by IS NULL;

COMMIT;
