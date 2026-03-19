ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS diagnosis_id UUID;

CREATE TABLE IF NOT EXISTS patient_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id),
  icd_code VARCHAR(20) NOT NULL,
  icd_name TEXT NOT NULL,
  certainty VARCHAR(20) NOT NULL DEFAULT 'suspected'
    CHECK (certainty IN ('suspected', 'confirmed')),
  diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  clinical_note_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient
  ON patient_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_professional
  ON patient_diagnoses(professional_id);
