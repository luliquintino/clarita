-- ==========================================================================
-- Seed: ICD-11 to Psychological Test Mappings
-- Links disorders to relevant tests with relevance scores
-- Run AFTER seed_icd11_disorders.sql and seed_psych_tests.sql
-- ==========================================================================

-- Depressive Disorders → Depression tests
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.95, 'Instrumento padrao-ouro para rastreio de depressao'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A70' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Inventario de depressao de Beck - avaliacao de gravidade'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A70' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.70, 'Subescala de depressao relevante'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A70' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Recurrent Depressive Disorder
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.95, 'Monitoramento de episodios recorrentes'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A71' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Avaliacao de gravidade em episodios recorrentes'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A71' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Anxiety Disorders → Anxiety tests
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.95, 'Instrumento padrao para rastreio de TAG'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B00' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliacao de gravidade de ansiedade'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B00' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.70, 'Subescala de ansiedade relevante'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B00' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Panic Disorder
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Avaliacao de sintomas de ansiedade somatica'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B01' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Rastreio de ansiedade generalizada comorbida'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B01' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Social Phobia
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliacao geral de ansiedade'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B03' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.70, 'Subescala de estresse relevante para fobia social'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B03' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- PTSD → General measures for comorbid depression/anxiety
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Rastreio de depressao comorbida no TEPT'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B40' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.70, 'Avaliacao de ansiedade comorbida no TEPT'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B40' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.65, 'Avaliacao multidimensional estresse/ansiedade/depressao'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B40' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- OCD
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.65, 'Avaliacao de ansiedade comorbida'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B20' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.60, 'Subescala de estresse no TOC'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B20' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Dysthymic Disorder
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Monitoramento de sintomas depressivos cronicos'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A72' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliacao de gravidade depressiva em distimia'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A72' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;
