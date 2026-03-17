-- Allow direct professional-to-professional conversations (without a shared patient)
ALTER TABLE conversations ALTER COLUMN patient_id DROP NOT NULL;
