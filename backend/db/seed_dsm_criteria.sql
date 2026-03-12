-- ==========================================================================
-- Seed: DSM-5-TR Criteria (5 common diagnoses)
-- ==========================================================================

-- Transtorno Depressivo Maior (F32)
INSERT INTO dsm_criteria (id, code, name, category, criteria, version)
VALUES (
  gen_random_uuid(),
  'F32',
  'Transtorno Depressivo Maior - Episodio Unico',
  'Transtornos Depressivos',
  '{
    "A": "Cinco ou mais dos seguintes sintomas presentes durante o mesmo periodo de 2 semanas, representando mudanca em relacao ao funcionamento anterior; pelo menos um dos sintomas e (1) humor deprimido ou (2) perda de interesse ou prazer.",
    "A_symptoms": [
      "Humor deprimido na maior parte do dia, quase todos os dias",
      "Acentuada diminuicao do interesse ou prazer em todas ou quase todas as atividades",
      "Perda ou ganho significativo de peso sem estar fazendo dieta",
      "Insonia ou hipersonia quase todos os dias",
      "Agitacao ou retardo psicomotor quase todos os dias",
      "Fadiga ou perda de energia quase todos os dias",
      "Sentimentos de inutilidade ou culpa excessiva",
      "Capacidade diminuida para pensar ou concentrar-se",
      "Pensamentos recorrentes de morte, ideacao suicida"
    ],
    "B": "Os sintomas causam sofrimento clinicamente significativo ou prejuizo no funcionamento social, profissional ou em outras areas importantes.",
    "C": "O episodio nao e atribuivel aos efeitos fisiologicos de uma substancia ou a outra condicao medica.",
    "D": "A ocorrencia do episodio depressivo maior nao e mais bem explicada por outro transtorno.",
    "E": "Nunca houve um episodio maniaco ou hipomaniaco.",
    "icd10": "F32"
  }'::jsonb,
  'DSM-5-TR'
)
ON CONFLICT DO NOTHING;

-- Transtorno de Ansiedade Generalizada (F41.1)
INSERT INTO dsm_criteria (id, code, name, category, criteria, version)
VALUES (
  gen_random_uuid(),
  'F41.1',
  'Transtorno de Ansiedade Generalizada',
  'Transtornos de Ansiedade',
  '{
    "A": "Ansiedade e preocupacao excessivas (expectativa apreensiva), ocorrendo na maioria dos dias por pelo menos 6 meses, com diversos eventos ou atividades.",
    "B": "O individuo considera dificil controlar a preocupacao.",
    "C": "A ansiedade e a preocupacao estao associadas com tres (ou mais) dos seguintes sintomas (com pelo menos alguns presentes na maioria dos dias nos ultimos 6 meses).",
    "C_symptoms": [
      "Inquietacao ou sensacao de estar com os nervos a flor da pele",
      "Fatigabilidade",
      "Dificuldade em concentrar-se ou sensacoes de branco na mente",
      "Irritabilidade",
      "Tensao muscular",
      "Perturbacao do sono"
    ],
    "D": "A ansiedade, a preocupacao ou os sintomas fisicos causam sofrimento clinicamente significativo ou prejuizo no funcionamento social, profissional ou em outras areas importantes.",
    "E": "A perturbacao nao se deve aos efeitos fisiologicos de uma substancia ou a outra condicao medica.",
    "F": "A perturbacao nao e mais bem explicada por outro transtorno mental.",
    "icd10": "F41.1"
  }'::jsonb,
  'DSM-5-TR'
)
ON CONFLICT DO NOTHING;

-- Transtorno de Panico (F41.0)
INSERT INTO dsm_criteria (id, code, name, category, criteria, version)
VALUES (
  gen_random_uuid(),
  'F41.0',
  'Transtorno de Panico',
  'Transtornos de Ansiedade',
  '{
    "A": "Ataques de panico recorrentes e inesperados. Um ataque de panico e um surto abrupto de medo intenso ou desconforto intenso que alcanca um pico em minutos, durante o qual quatro (ou mais) dos seguintes sintomas ocorrem.",
    "A_symptoms": [
      "Palpitacoes, coracao acelerado, taquicardia",
      "Sudorese",
      "Tremores ou abalos",
      "Sensacoes de falta de ar ou sufocamento",
      "Sensacoes de asfixia",
      "Dor ou desconforto toracico",
      "Nausea ou desconforto abdominal",
      "Sensacao de tontura, instabilidade, vertigem ou desmaio",
      "Calafrios ou ondas de calor",
      "Parestesias (anestesia ou sensacoes de formigamento)",
      "Desrealizacao ou despersonalizacao",
      "Medo de perder o controle ou enlouquecer",
      "Medo de morrer"
    ],
    "B": "Pelo menos um dos ataques foi seguido de 1 mes (ou mais) de um ou ambos: (1) apreensao ou preocupacao persistente acerca de ataques de panico adicionais; (2) uma mudanca desadaptativa significativa no comportamento relacionada aos ataques.",
    "C": "A perturbacao nao e atribuivel aos efeitos fisiologicos de uma substancia ou a outra condicao medica.",
    "D": "A perturbacao nao e mais bem explicada por outro transtorno mental.",
    "icd10": "F41.0"
  }'::jsonb,
  'DSM-5-TR'
)
ON CONFLICT DO NOTHING;

-- TEPT (F43.10)
INSERT INTO dsm_criteria (id, code, name, category, criteria, version)
VALUES (
  gen_random_uuid(),
  'F43.10',
  'Transtorno de Estresse Pos-Traumatico',
  'Transtornos Relacionados a Trauma e a Estressores',
  '{
    "A": "Exposicao a episodio concreto ou ameaca de morte, lesao grave ou violencia sexual em uma (ou mais) das seguintes formas: vivencia direta, testemunho, conhecimento de evento com familiar/amigo proximo, exposicao repetida a detalhes aversivos.",
    "B": "Presenca de um (ou mais) sintomas intrusivos associados ao evento traumatico, comecando apos a ocorrencia.",
    "B_symptoms": [
      "Lembrancas intrusivas angustiantes recorrentes e involuntarias do evento",
      "Sonhos angustiantes recorrentes relacionados ao evento",
      "Reacoes dissociativas (flashbacks)",
      "Sofrimento psicologico intenso ante exposicao a sinais que lembram o evento",
      "Reacoes fisiologicas intensas a sinais internos ou externos que lembram o evento"
    ],
    "C": "Evitacao persistente de estimulos associados ao evento traumatico.",
    "D": "Alteracoes negativas em cognicoes e no humor associadas ao evento traumatico.",
    "E": "Alteracoes marcantes na excitacao e na reatividade associadas ao evento traumatico.",
    "F": "A duracao da perturbacao (criterios B, C, D e E) e superior a 1 mes.",
    "G": "A perturbacao causa sofrimento clinicamente significativo ou prejuizo no funcionamento.",
    "H": "A perturbacao nao e atribuivel aos efeitos fisiologicos de uma substancia ou a outra condicao medica.",
    "icd10": "F43.10"
  }'::jsonb,
  'DSM-5-TR'
)
ON CONFLICT DO NOTHING;

-- TOC (F42)
INSERT INTO dsm_criteria (id, code, name, category, criteria, version)
VALUES (
  gen_random_uuid(),
  'F42',
  'Transtorno Obsessivo-Compulsivo',
  'Transtorno Obsessivo-Compulsivo e Transtornos Relacionados',
  '{
    "A": "Presenca de obsessoes, compulsoes ou ambas.",
    "A_obsessions": [
      "Pensamentos, impulsos ou imagens recorrentes e persistentes que sao vivenciados como intrusivos e indesejados",
      "O individuo tenta ignorar ou suprimir tais pensamentos, impulsos ou imagens, ou neutraliza-los com algum outro pensamento ou acao"
    ],
    "A_compulsions": [
      "Comportamentos repetitivos (lavar as maos, organizar, verificar) ou atos mentais (orar, contar, repetir palavras) que o individuo se sente compelido a executar em resposta a uma obsessao",
      "Os comportamentos ou os atos mentais visam prevenir ou reduzir a ansiedade ou o sofrimento, ou evitar algum evento ou situacao temida"
    ],
    "B": "As obsessoes ou compulsoes tomam tempo (mais de 1 hora por dia) ou causam sofrimento clinicamente significativo ou prejuizo no funcionamento.",
    "C": "Os sintomas obsessivo-compulsivos nao sao atribuiveis aos efeitos fisiologicos de uma substancia ou a outra condicao medica.",
    "D": "A perturbacao nao e mais bem explicada pelos sintomas de outro transtorno mental.",
    "icd10": "F42"
  }'::jsonb,
  'DSM-5-TR'
)
ON CONFLICT DO NOTHING;
