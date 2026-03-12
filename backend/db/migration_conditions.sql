-- Migration: Add role-based conditions columns to patient_profiles
-- Run once: adds self-reported conditions and professional suspicions

ALTER TABLE patient_profiles
  ADD COLUMN IF NOT EXISTS self_reported_conditions jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS psychiatrist_suspicions jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS psychologist_suspicions jsonb DEFAULT '[]';
