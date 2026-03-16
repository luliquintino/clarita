-- LGPD: campo de consentimento obrigatório para dados de saúde
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;
