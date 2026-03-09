-- ============================================================================
-- Migração: Fluxo de Aceitação/Recusa de Metas pelo Paciente
-- Adiciona patient_status, rejection_reason, responded_at à tabela goals
-- Adiciona 'goal_rejected' ao enum alert_type
-- ============================================================================

-- Adicionar novo valor ao enum alert_type (fora de transação)
DO $$
BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'goal_rejected';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

BEGIN;

-- Adicionar coluna patient_status (pending/accepted/rejected)
ALTER TABLE goals
    ADD COLUMN IF NOT EXISTS patient_status VARCHAR(20)
    DEFAULT 'pending'
    CHECK (patient_status IN ('pending', 'accepted', 'rejected'));

-- Adicionar coluna para motivo da recusa
ALTER TABLE goals
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adicionar timestamp de quando o paciente respondeu
ALTER TABLE goals
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Migrar metas existentes: todas ficam como 'accepted'
-- (foram criadas antes do fluxo de aceitação)
UPDATE goals
SET patient_status = 'accepted',
    responded_at = created_at
WHERE patient_status = 'pending'
  AND status IN ('in_progress', 'achieved', 'paused', 'cancelled');

-- Índice para consultas de metas pendentes do paciente
CREATE INDEX IF NOT EXISTS idx_goals_patient_pending
    ON goals (patient_id, patient_status)
    WHERE patient_status = 'pending';

COMMIT;
