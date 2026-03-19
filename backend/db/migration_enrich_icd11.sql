-- ==========================================================================
-- Migration: Enrich ICD-11 descriptions and add test mappings for all disorders
-- ==========================================================================

-- 1. UPDATE DESCRIPTIONS to full clinical criteria
-- ==========================================================================

UPDATE icd11_disorders SET
  description = 'Presença de pelo menos um episódio maníaco completo, com duração mínima de 7 dias (ou qualquer duração se necessitar hospitalização). O episódio maníaco é caracterizado por humor expansivo, eufórico ou irritável, com aumento de energia e atividade. Podem ocorrer episódios depressivos e hipomaníacos. Sintomas maníacos: grandiosidade, diminuição da necessidade de sono, fala acelerada (logorreia), fuga de ideias, distractibilidade, aumento de atividades dirigidas a objetivos, comportamentos de risco (gastos excessivos, hipersexualidade, decisões impulsivas). O episódio pode incluir características psicóticas.',
  symptom_keywords = ARRAY['mania','euforia','grandiosidade','energia aumentada','insonia diminuida','fala acelerada','logorreia','fuga de ideias','impulsividade','irritabilidade','episodio depressivo','comportamento de risco','hipersexualidade','gastos excessivos','agitacao','psicose','grandeza','autoimagem inflada','sono reduzido']
WHERE icd_code = '6A60';

UPDATE icd11_disorders SET
  description = 'Caracterizado por pelo menos um episódio hipomaníaco e pelo menos um episódio depressivo maior, sem a ocorrência de episódios maníacos completos. A hipomania é um estado de humor elevado ou irritável de intensidade menor que a mania, com duração mínima de 4 dias. Não causa prejuízo funcional grave nem requer hospitalização. Os episódios depressivos são idênticos ao TDM: humor deprimido, anedonia, fadiga, distúrbios do sono e apetite, dificuldade de concentração, sentimentos de culpa e ideação suicida.',
  symptom_keywords = ARRAY['hipomania','episodio depressivo','energia aumentada','humor elevado','produtividade aumentada','irritabilidade','ciclicidade','depressao','sono reduzido','autoimagem inflada','fala mais rapida','pensamentos acelerados','anedonia','fadiga','concentracao']
WHERE icd_code = '6A61';

UPDATE icd11_disorders SET
  description = 'Padrão persistente de desatenção e/ou hiperatividade-impulsividade inconsistente com o nível de desenvolvimento, presente em dois ou mais contextos (escola, trabalho, casa), com início antes dos 12 anos. Desatenção: dificuldade de sustentar atenção, erros por descuido, não segue instruções, perde objetos, distrai-se facilmente, esquecimento. Hiperatividade-impulsividade: agitação motora, dificuldade de permanecer sentado, fala excessiva, interrompe outros, dificuldade de aguardar a vez, ações impulsivas sem considerar consequências.',
  symptom_keywords = ARRAY['desatencao','hiperatividade','impulsividade','distratibilidade','desorganizacao','esquecimento','inquietacao','dificuldade de concentracao','interromper','erros por descuido','perder objetos','nao escuta','nao termina tarefas','evita esforco mental','agitacao motora','fala excessiva']
WHERE icd_code = '6A05';

UPDATE icd11_disorders SET
  description = 'Déficits persistentes na comunicação e interação social em múltiplos contextos, manifestados por déficits na reciprocidade socioemocional, comportamentos comunicativos não verbais e no desenvolvimento, manutenção e compreensão de relacionamentos. Padrões restritos e repetitivos de comportamento: movimentos estereotipados, insistência na mesmice, interesses altamente restritos e fixos, hiper ou hiporreatividade sensorial. Presente desde o início do período do desenvolvimento, com variação na expressão e gravidade.',
  symptom_keywords = ARRAY['comunicacao social','interacao social','padroes restritos','comportamento repetitivo','interesses fixos','sensibilidade sensorial','rotinas rigidas','rigidez','estereotipias','contato visual reduzido','dificuldade de relacoes','linguagem atipica','hipersensibilidade','teoria da mente']
WHERE icd_code = '6A02';

UPDATE icd11_disorders SET
  description = 'Instabilidade acentuada nas relações interpessoais, autoimagem e afetos, com impulsividade marcante presente em vários contextos, com início no início da idade adulta. Inclui: esforços frenéticos para evitar abandono real ou imaginário; padrão de relacionamentos interpessoais instáveis e intensos; perturbação de identidade; impulsividade em pelo menos duas áreas potencialmente autodestrutivas; comportamento suicida recorrente ou autolesão; instabilidade afetiva; sensação crônica de vazio; raiva intensa e inadequada; ideação paranoide transitória ou dissociação.',
  symptom_keywords = ARRAY['instabilidade emocional','medo de abandono','relacoes intensas','autoimagem instavel','impulsividade','autolesao','vazio cronico','raiva intensa','dissociacao','identidade difusa','suicidio','relacionamentos tumultuados','sensibilidade a rejeicao','splitting','idealizacao','desvalorizacao']
WHERE icd_code = '6D11';

UPDATE icd11_disorders SET
  description = 'Presença de obsessões (pensamentos, impulsos ou imagens recorrentes e persistentes, vivenciados como intrusivos e indesejados) e/ou compulsões (comportamentos ou atos mentais repetitivos realizados em resposta à obsessão ou segundo regras rígidas). As obsessões causam ansiedade ou sofrimento; as compulsões visam a reduzir esse sofrimento. As obsessões/compulsões consomem tempo (mais de 1 hora/dia) ou causam sofrimento clinicamente significativo.',
  symptom_keywords = ARRAY['obsessao','compulsao','rituais','verificacao','limpeza','contagem','pensamentos intrusivos','ansiedade','repetitivo','tempo excessivo','contaminacao','simetria','pensamentos proibidos','acumulacao','confissao','duvida patologica']
WHERE icd_code = '6B20';

UPDATE icd11_disorders SET
  description = 'Ansiedade e preocupação excessivas sobre uma série de eventos ou atividades (como trabalho, saúde, família, dinheiro), ocorrendo mais dias do que não, por pelo menos vários meses. A pessoa tem dificuldade de controlar a preocupação. Associado a: inquietação, sensação de estar com os nervos à flor da pele; fadiga; dificuldade de concentração; irritabilidade; tensão muscular; perturbação do sono. A ansiedade e preocupação causam sofrimento clinicamente significativo ou prejuízo no funcionamento.',
  symptom_keywords = ARRAY['ansiedade','preocupacao excessiva','inquietacao','tensao muscular','irritabilidade','fadiga','concentracao','insonia','nervosismo','apreensao','catastrofizacao','rumo','saude','familia','trabalho','dinheiro','dificuldade de relaxar']
WHERE icd_code = '6B00';

UPDATE icd11_disorders SET
  description = 'Re-experimentação do evento traumático como se estivesse ocorrendo no presente (flashbacks vívidos, memórias intrusivas, pesadelos), acompanhada de fortes e esmagadoras emoções e sensações físicas. Evitação de pensamentos, memórias, atividades, situações ou pessoas associadas ao evento. Percepção persistente de ameaça atual elevada (hipervigilância, resposta de sobressalto exagerada). Os sintomas persistem por pelo menos várias semanas e causam prejuízo significativo no funcionamento.',
  symptom_keywords = ARRAY['trauma','flashback','pesadelo','evitacao','hipervigilancia','sobressalto','re-experimentacao','medo','ansiedade','dissociacao','estresse pos-traumatico','memorias intrusivas','entorpecimento emocional','alienacao','culpa','vergonha']
WHERE icd_code = '6B40';

UPDATE icd11_disorders SET
  description = 'Restrição persistente da ingestão energética em relação às necessidades, levando a peso corporal significativamente baixo considerando a idade, sexo, trajetória de desenvolvimento e saúde física. Medo intenso de ganhar peso ou de engordar, ou comportamento persistente que interfere no ganho de peso. Perturbação na maneira como o próprio peso ou forma corporal são experienciados, influência indevida do peso ou forma corporal na autoavaliação, ou falta persistente de reconhecimento da gravidade do baixo peso atual.',
  symptom_keywords = ARRAY['restricao alimentar','baixo peso','medo de engordar','imagem corporal distorcida','emagrecimento','inanicao','exercicio excessivo','amenorreia','negacao','autoestima dependente do peso','lanugo','hipotermia','fraqueza','desnutricao']
WHERE icd_code = '6B80';

-- 2. ADD TEST MAPPINGS for all disorders without mappings
-- ==========================================================================

-- Bipolar Tipo I (6A60) → BDI (fase depressiva), DASS, PHQ-9
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Avaliação de gravidade dos episódios depressivos no Transtorno Bipolar Tipo I'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A60' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Rastreio de episódio depressivo na fase depressiva bipolar'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A60' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Monitoramento multidimensional de estresse, ansiedade e humor depressivo'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A60' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Bipolar Tipo II (6A61) → BDI, PHQ-9, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.95, 'Avaliação de episódios depressivos maiores no Bipolar Tipo II'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A61' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Rastreio e monitoramento de episódio depressivo maior'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A61' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação de ansiedade e estresse comórbidos na fase hipomaníaca'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A61' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- TDAH (6A05) → DASS (regulação emocional), BAI, PHQ-9 (comorbidades)
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade comórbida comum no TDAH'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A05' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de depressão comórbida no TDAH'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A05' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação multidimensional de estresse, ansiedade e depressão no TDAH'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A05' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.70, 'Avaliação de ansiedade somática comórbida'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A05' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- TEA (6A02) → DASS, GAD-7, PHQ-9 (comorbidades são muito comuns)
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade — comorbidade altamente prevalente no TEA'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A02' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de depressão comórbida no TEA'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A02' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação multidimensional de estresse e regulação emocional no TEA'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6A02' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Borderline (6D11) → BDI, BAI, DASS, PHQ-9
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Avaliação de depressão e disforia — centrais no Borderline'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6D11' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade intensa associada ao medo de abandono'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6D11' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Monitoramento de estresse, ansiedade e depressão na instabilidade emocional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6D11' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Rastreio de episódios depressivos e ideação suicida'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6D11' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Transtorno de Personalidade geral (6D10)
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de depressão comórbida nos transtornos de personalidade'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6D10' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação multidimensional de estresse e regulação emocional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6D10' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Transtorno Dismórfico Corporal (6B21) → BAI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade associada à preocupação com aparência'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B21' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação de depressão comórbida no TDC'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B21' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.70, 'Avaliação multidimensional de sofrimento emocional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B21' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Transtorno de Acumulação (6B25) → BAI, DASS, PHQ-9
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade antecipatória e sofrimento ao descartar'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B25' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação de depressão comórbida e comprometimento funcional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B25' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- TEPT Complexo (6B41) → PHQ-9, BAI, DASS, BDI
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão — comorbidade central no TEPT Complexo'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B41' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade e hipervigilância no trauma complexo'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B41' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de gravidade depressiva no trauma complexo'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B41' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Monitoramento multidimensional no trauma complexo'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B41' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Transtorno de Ajustamento (6B43) → PHQ-9, GAD-7, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Rastreio de sintomas depressivos na resposta ao estressor'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B43' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade na resposta ao estressor'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B43' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação multidimensional de estresse, ansiedade e depressão'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B43' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Transtorno de Luto Prolongado (6B44) → PHQ-9, BDI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.90, 'Rastreio de depressão — muito prevalente no luto prolongado'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B44' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de gravidade dos sintomas depressivos no luto'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B44' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Monitoramento de estresse emocional no processo de luto'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B44' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Anorexia (6B80) → BDI, PHQ-9, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão comórbida na Anorexia Nervosa'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B80' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Rastreio de depressão e ideação suicida na anorexia'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B80' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação de ansiedade comórbida relacionada à comida/corpo'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B80' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Bulimia (6B81) → BDI, BAI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão e culpa pós-episódio de compulsão'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B81' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade associada à imagem corporal e comida'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B81' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Monitoramento de estresse emocional e humor'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B81' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Compulsão Alimentar (6B82) → BDI, DASS, PHQ-9
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão e vergonha associadas à compulsão alimentar'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B82' AND t.name LIKE '%BDI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Rastreio de depressão e sofrimento emocional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B82' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação multidimensional de estresse e regulação emocional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B82' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Transtorno por Uso de Álcool (6C40) → PHQ-9, BAI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão comórbida no uso de álcool'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6C40' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade — frequentemente associada ao uso de álcool'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6C40' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Monitoramento multidimensional de sofrimento emocional'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6C40' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Poliuso de Substâncias (6C49) → PHQ-9, BAI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão comórbida no uso múltiplo de substâncias'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6C49' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade e agitação associadas ao uso de substâncias'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6C49' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação multidimensional no tratamento de substâncias'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6C49' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Insônia (7A00) → PHQ-9, GAD-7, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de depressão — insônia é sintoma central e/ou comorbidade'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '7A00' AND t.name LIKE '%PHQ-9%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade — causa frequente de insônia'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '7A00' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação multidimensional de estresse como fator da insônia'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '7A00' AND t.name LIKE '%DASS%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Agorafobia (6B02) → GAD-7, BAI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade antecipatória na agorafobia'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B02' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade somática e sintomas físicos na agorafobia'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B02' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Fobia Específica (6B04) → BAI, GAD-7
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade e resposta fóbica'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B04' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.75, 'Avaliação de ansiedade antecipatória'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B04' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

-- Ansiedade de Separação (6B05) → GAD-7, BAI, DASS
INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.85, 'Avaliação de ansiedade na separação de figuras de apego'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B05' AND t.name LIKE '%GAD-7%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;

INSERT INTO icd_test_mapping (disorder_id, test_id, relevance_score, notes)
SELECT d.id, t.id, 0.80, 'Avaliação de ansiedade somática na separação'
FROM icd11_disorders d, psychological_tests t
WHERE d.icd_code = '6B05' AND t.name LIKE '%BAI%'
ON CONFLICT (disorder_id, test_id) DO NOTHING;
