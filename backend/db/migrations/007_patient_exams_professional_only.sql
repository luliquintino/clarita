-- Migration 007: add is_professional_only to patient_exams
ALTER TABLE patient_exams
  ADD COLUMN IF NOT EXISTS is_professional_only BOOLEAN NOT NULL DEFAULT false;
