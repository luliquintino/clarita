-- ==========================================================================
-- Seed: ICD-11 Mental, Behavioural or Neurodevelopmental Disorders
-- Chapter 06 — Common disorders seen in clinical psychology/psychiatry
-- ==========================================================================

-- Depressive Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6A70', 'Transtorno Depressivo de Episodio Unico',
   'Episodio depressivo unico caracterizado por humor deprimido ou perda de interesse, com duracao minima de 2 semanas.',
   ARRAY['humor deprimido','tristeza','perda de interesse','anedonia','insonia','hipersonia','fadiga','perda de energia','culpa','inutilidade','concentracao','ideacao suicida','alteracao de peso','retardo psicomotor','agitacao'],
   'Transtornos Depressivos'),

  ('6A71', 'Transtorno Depressivo Recorrente',
   'Dois ou mais episodios depressivos com intervalo de pelo menos 2 meses sem sintomas significativos.',
   ARRAY['humor deprimido','tristeza','recorrente','perda de interesse','anedonia','insonia','fadiga','culpa','concentracao','ideacao suicida','alteracao de peso','episodios multiplos'],
   'Transtornos Depressivos'),

  ('6A72', 'Transtorno Distimico',
   'Humor deprimido persistente na maioria dos dias por pelo menos 2 anos (ou 1 ano em criancas/adolescentes).',
   ARRAY['humor deprimido persistente','cronico','baixa autoestima','desesperanca','fadiga','insonia','apetite alterado','concentracao'],
   'Transtornos Depressivos')
ON CONFLICT (icd_code) DO NOTHING;

-- Anxiety Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6B00', 'Transtorno de Ansiedade Generalizada',
   'Ansiedade e preocupacao excessivas sobre diversos eventos, com dificuldade de controle, por pelo menos varios meses.',
   ARRAY['ansiedade','preocupacao excessiva','inquietacao','tensao muscular','irritabilidade','fadiga','concentracao','insonia','nervosismo','apreensao'],
   'Transtornos de Ansiedade'),

  ('6B01', 'Transtorno de Panico',
   'Ataques de panico recorrentes e inesperados com preocupacao persistente sobre novos ataques.',
   ARRAY['panico','ataque de panico','palpitacoes','taquicardia','sudorese','tremores','falta de ar','sufocamento','dor toracica','nausea','tontura','despersonalizacao','medo de morrer','medo de perder controle'],
   'Transtornos de Ansiedade'),

  ('6B02', 'Agorafobia',
   'Medo ou ansiedade marcantes em situacoes como transporte publico, espacos abertos, locais fechados, filas ou multidoes.',
   ARRAY['medo','espacos abertos','locais fechados','multidoes','transporte publico','evitacao','panico','ansiedade situacional'],
   'Transtornos de Ansiedade'),

  ('6B03', 'Fobia Social',
   'Medo ou ansiedade marcantes em situacoes sociais onde a pessoa pode ser avaliada por outros.',
   ARRAY['ansiedade social','medo de avaliacao','vergonha','constrangimento','evitacao social','rubor','tremor','nausea','interacao social'],
   'Transtornos de Ansiedade'),

  ('6B04', 'Fobia Especifica',
   'Medo ou ansiedade acentuados e circunscritos a um objeto ou situacao especifica.',
   ARRAY['fobia','medo especifico','evitacao','ansiedade situacional','animal','altura','sangue','injecao','aviao','claustrofobia'],
   'Transtornos de Ansiedade'),

  ('6B05', 'Transtorno de Ansiedade de Separacao',
   'Medo ou ansiedade excessivos quanto a separacao de figuras de vinculacao.',
   ARRAY['ansiedade de separacao','medo de separacao','apego','vinculacao','abandono','crianca','adulto'],
   'Transtornos de Ansiedade')
ON CONFLICT (icd_code) DO NOTHING;

-- Obsessive-Compulsive Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6B20', 'Transtorno Obsessivo-Compulsivo',
   'Presenca de obsessoes e/ou compulsoes persistentes que consomem tempo ou causam sofrimento significativo.',
   ARRAY['obsessao','compulsao','rituais','verificacao','limpeza','contagem','pensamentos intrusivos','ansiedade','repetitivo','tempo excessivo'],
   'Transtornos Obsessivo-Compulsivos'),

  ('6B21', 'Transtorno Dismorfico Corporal',
   'Preocupacao excessiva com defeitos percebidos na aparencia fisica que nao sao observaveis por outros.',
   ARRAY['imagem corporal','aparencia','defeito percebido','verificacao no espelho','comparacao','evitacao social','cirurgia estetica'],
   'Transtornos Obsessivo-Compulsivos'),

  ('6B25', 'Transtorno de Acumulacao',
   'Dificuldade persistente de descartar ou se separar de pertences, independentemente de seu valor real.',
   ARRAY['acumulacao','colecionar','dificuldade de descartar','desordem','espaco vital comprometido','sofrimento','apego a objetos'],
   'Transtornos Obsessivo-Compulsivos')
ON CONFLICT (icd_code) DO NOTHING;

-- Trauma and Stress-Related Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6B40', 'Transtorno de Estresse Pos-Traumatico',
   'Re-experimentacao do evento traumatico, evitacao de lembrancas e percepcao persistente de ameaca atual.',
   ARRAY['trauma','flashback','pesadelo','evitacao','hipervigilancia','sobressalto','re-experimentacao','medo','ansiedade','dissociacao','estresse pos-traumatico'],
   'Transtornos Relacionados ao Estresse'),

  ('6B41', 'TEPT Complexo',
   'TEPT com dificuldades adicionais de regulacao afetiva, autoconceito negativo e dificuldades de relacionamento.',
   ARRAY['trauma complexo','regulacao emocional','autoconceito negativo','dissociacao','vergonha','culpa','relacionamentos dificeis','re-experimentacao','evitacao','hipervigilancia'],
   'Transtornos Relacionados ao Estresse'),

  ('6B43', 'Transtorno de Ajustamento',
   'Resposta desadaptativa a um estressor identificavel que se desenvolve dentro de um mes apos o estressor.',
   ARRAY['ajustamento','estressor','adaptacao','ansiedade','depressao','mudanca de vida','luto','separacao','perda de emprego'],
   'Transtornos Relacionados ao Estresse'),

  ('6B44', 'Transtorno de Luto Prolongado',
   'Resposta de luto persistente e pervasiva apos a morte de um parceiro, familiar ou amigo proximo.',
   ARRAY['luto','perda','morte','saudade intensa','preocupacao com o falecido','dificuldade de aceitacao','isolamento','vazio'],
   'Transtornos Relacionados ao Estresse')
ON CONFLICT (icd_code) DO NOTHING;

-- Eating Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6B80', 'Anorexia Nervosa',
   'Restricao da ingestao energetica com baixo peso corporal significativo para idade, sexo e saude fisica.',
   ARRAY['restricao alimentar','baixo peso','medo de engordar','imagem corporal distorcida','emagrecimento','inanicao','exercicio excessivo'],
   'Transtornos Alimentares'),

  ('6B81', 'Bulimia Nervosa',
   'Episodios recorrentes de compulsao alimentar seguidos de comportamentos compensatorios inapropriados.',
   ARRAY['compulsao alimentar','vomito autoinduzido','purgacao','laxantes','exercicio excessivo','imagem corporal','culpa'],
   'Transtornos Alimentares'),

  ('6B82', 'Transtorno de Compulsao Alimentar',
   'Episodios recorrentes de compulsao alimentar sem comportamentos compensatorios regulares.',
   ARRAY['compulsao alimentar','comer excessivo','perda de controle','rapido','desconforto','sozinho','vergonha','culpa'],
   'Transtornos Alimentares')
ON CONFLICT (icd_code) DO NOTHING;

-- Bipolar Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6A60', 'Transtorno Bipolar Tipo I',
   'Um ou mais episodios maniacos, podendo incluir episodios depressivos e hipomaniacos.',
   ARRAY['mania','euforia','grandiosidade','energia aumentada','insonia diminuida','fala acelerada','fuga de ideias','impulsividade','irritabilidade','episodio depressivo'],
   'Transtornos Bipolares'),

  ('6A61', 'Transtorno Bipolar Tipo II',
   'Um ou mais episodios hipomaniacos e pelo menos um episodio depressivo maior, sem episodios maniacos completos.',
   ARRAY['hipomania','episodio depressivo','energia aumentada','humor elevado','produtividade','irritabilidade','ciclicidade','depressao'],
   'Transtornos Bipolares')
ON CONFLICT (icd_code) DO NOTHING;

-- ADHD & Neurodevelopmental
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6A05', 'Transtorno de Deficit de Atencao e Hiperatividade',
   'Padrao persistente de desatencao e/ou hiperatividade-impulsividade que interfere no funcionamento.',
   ARRAY['desatencao','hiperatividade','impulsividade','distratibilidade','desorganizacao','esquecimento','inquietacao','dificuldade de concentracao','interromper'],
   'Transtornos do Neurodesenvolvimento'),

  ('6A02', 'Transtorno do Espectro Autista',
   'Deficits persistentes na comunicacao social reciproca e padroes restritos e repetitivos de comportamento.',
   ARRAY['comunicacao social','interacao social','padroes restritos','comportamento repetitivo','interesses fixos','sensibilidade sensorial','rotinas','rigidez'],
   'Transtornos do Neurodesenvolvimento')
ON CONFLICT (icd_code) DO NOTHING;

-- Personality Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6D10', 'Transtorno de Personalidade',
   'Padrao persistente e pervasivo de perturbacao no funcionamento da personalidade (self e interpessoal).',
   ARRAY['personalidade','funcionamento interpessoal','autoidentidade','regulacao emocional','empatia','intimidade','rigidez','instabilidade','impulsividade'],
   'Transtornos de Personalidade'),

  ('6D11', 'Padrao de Personalidade Borderline',
   'Instabilidade nas relacoes interpessoais, autoimagem e afetos, com impulsividade acentuada.',
   ARRAY['instabilidade emocional','medo de abandono','relacoes intensas','autoimagem instavel','impulsividade','autolesao','vazio cronico','raiva intensa','dissociacao'],
   'Transtornos de Personalidade')
ON CONFLICT (icd_code) DO NOTHING;

-- Substance Use Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('6C40', 'Transtorno por Uso de Alcool',
   'Padrao de uso de alcool com prejuizo no controle, prioridade aumentada ao uso e persistencia apesar de consequencias.',
   ARRAY['alcool','dependencia','abstinencia','tolerancia','compulsao','perda de controle','beber excessivo','consequencias negativas'],
   'Transtornos por Uso de Substancias'),

  ('6C49', 'Transtorno por Uso de Substancias Multiplas',
   'Padrao de uso de multiplas substancias com prejuizo no controle e consequencias adversas.',
   ARRAY['drogas','substancias','dependencia','abstinencia','tolerancia','poliuso','compulsao','recaida'],
   'Transtornos por Uso de Substancias')
ON CONFLICT (icd_code) DO NOTHING;

-- Sleep Disorders
INSERT INTO icd11_disorders (icd_code, disorder_name, description, symptom_keywords, category)
VALUES
  ('7A00', 'Insonia',
   'Dificuldade de iniciar ou manter o sono, ou despertar precoce, com prejuizo diurno.',
   ARRAY['insonia','dificuldade de dormir','despertar precoce','sono nao reparador','fadiga diurna','irritabilidade','concentracao','sonolencia'],
   'Transtornos do Sono')
ON CONFLICT (icd_code) DO NOTHING;
