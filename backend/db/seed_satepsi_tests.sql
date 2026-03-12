-- ==========================================================================
-- Seed: SATEPSI-Approved Psychological Tests
-- Based on the CFP (Conselho Federal de Psicologia) approved list
-- Status: active = currently approved, expired = approval lapsed
-- ==========================================================================

INSERT INTO satepsi_tests (test_name, test_author, approval_status, approval_date, expiry_date, test_category, cfp_code)
VALUES
  -- Personality and Psychopathology
  ('BFP - Bateria Fatorial de Personalidade', 'Carlos Henrique Nunes', 'active', '2018-06-15', '2028-06-15', 'Personalidade', 'SAT-001'),
  ('NEO PI-R - Inventario de Personalidade NEO Revisado', 'Paul Costa Jr. / Robert McCrae', 'active', '2019-03-20', '2029-03-20', 'Personalidade', 'SAT-002'),
  ('HTP - House-Tree-Person', 'John Buck', 'active', '2017-09-10', '2027-09-10', 'Personalidade/Projetivo', 'SAT-003'),
  ('Palografico', 'Salvador Escala Millan', 'active', '2020-01-15', '2030-01-15', 'Personalidade/Expressivo', 'SAT-004'),
  ('QUATI - Questionario de Avaliacao Tipologica', 'Jose Jorge de Moraes Zacharias', 'active', '2019-07-22', '2029-07-22', 'Personalidade', 'SAT-005'),

  -- Intelligence and Cognitive
  ('WISC-IV - Escala Wechsler de Inteligencia para Criancas', 'David Wechsler', 'active', '2018-11-01', '2028-11-01', 'Inteligencia', 'SAT-010'),
  ('WAIS-III - Escala Wechsler de Inteligencia para Adultos', 'David Wechsler', 'active', '2018-11-01', '2028-11-01', 'Inteligencia', 'SAT-011'),
  ('Raven - Matrizes Progressivas', 'John C. Raven', 'active', '2019-05-18', '2029-05-18', 'Inteligencia', 'SAT-012'),
  ('G-36 - Teste de Inteligencia Nao-Verbal', 'Efraim Rojas Boccalandro', 'active', '2020-02-28', '2030-02-28', 'Inteligencia', 'SAT-013'),
  ('R-1 - Teste Nao-Verbal de Inteligencia', 'Rynaldo de Oliveira', 'active', '2019-08-14', '2029-08-14', 'Inteligencia', 'SAT-014'),

  -- Attention
  ('AC - Teste de Atencao Concentrada', 'Suzy Cambraia', 'active', '2020-04-10', '2030-04-10', 'Atencao', 'SAT-020'),
  ('TEACO-FF - Teste de Atencao Concentrada', 'Fabiano Ferreira', 'active', '2019-06-05', '2029-06-05', 'Atencao', 'SAT-021'),
  ('AD - Teste de Atencao Dividida', 'Fabiano Ferreira', 'active', '2020-03-15', '2030-03-15', 'Atencao', 'SAT-022'),

  -- Depression and Anxiety (map to our psychological_tests)
  ('BDI-II - Inventario de Depressao de Beck', 'Aaron T. Beck', 'active', '2018-08-20', '2028-08-20', 'Depressao', 'SAT-030'),
  ('BAI - Inventario de Ansiedade de Beck', 'Aaron T. Beck', 'active', '2018-08-20', '2028-08-20', 'Ansiedade', 'SAT-031'),
  ('DASS-21 - Escala de Depressao, Ansiedade e Estresse', 'Lovibond & Lovibond', 'active', '2020-10-12', '2030-10-12', 'Depressao/Ansiedade/Estresse', 'SAT-032'),
  ('PHQ-9 - Patient Health Questionnaire', 'Kroenke, Spitzer & Williams', 'active', '2019-04-25', '2029-04-25', 'Depressao', 'SAT-033'),
  ('GAD-7 - Generalized Anxiety Disorder Scale', 'Spitzer, Kroenke, Williams & Lowe', 'active', '2019-04-25', '2029-04-25', 'Ansiedade', 'SAT-034'),

  -- Neuropsychological
  ('RAVLT - Teste de Aprendizagem Auditivo-Verbal de Rey', 'Andre Rey', 'active', '2019-12-01', '2029-12-01', 'Neuropsicologia', 'SAT-040'),
  ('Figura Complexa de Rey', 'Andre Rey / Paul Osterrieth', 'active', '2019-12-01', '2029-12-01', 'Neuropsicologia', 'SAT-041'),
  ('Trail Making Test', 'Ralph Reitan', 'active', '2020-06-18', '2030-06-18', 'Neuropsicologia', 'SAT-042'),

  -- Child and Adolescent
  ('CBCL - Child Behavior Checklist', 'Thomas Achenbach', 'active', '2019-09-30', '2029-09-30', 'Infantojuvenil', 'SAT-050'),
  ('CDI - Inventario de Depressao Infantil', 'Maria Kovacs', 'active', '2018-05-12', '2028-05-12', 'Infantojuvenil', 'SAT-051'),

  -- Social/Adaptive Skills
  ('IHS - Inventario de Habilidades Sociais', 'Zilda Del Prette / Almir Del Prette', 'active', '2019-02-14', '2029-02-14', 'Habilidades Sociais', 'SAT-060'),

  -- Vocational
  ('AIP - Avaliacao dos Interesses Profissionais', 'Levenfus & Bandeira', 'active', '2020-07-22', '2030-07-22', 'Orientacao Profissional', 'SAT-070'),

  -- Example of expired test
  ('Teste Palomarfico Antigo', 'Autor Historico', 'expired', '2010-01-01', '2020-01-01', 'Personalidade/Expressivo', 'SAT-099')

ON CONFLICT DO NOTHING;
