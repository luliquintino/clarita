-- ==========================================================================
-- Seed: Psychological Tests (PHQ-9, GAD-7, DASS-21, BDI-II, BAI)
-- ==========================================================================

-- PHQ-9 (Patient Health Questionnaire-9)
INSERT INTO psychological_tests (id, name, description, category, dsm_references, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  'PHQ-9',
  'Patient Health Questionnaire - avalia sintomas de depressao nas ultimas 2 semanas.',
  'depression',
  ARRAY['F32', 'F33'],
  '[
    {"text": "Pouco interesse ou prazer em fazer as coisas", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "anhedonia"},
    {"text": "Sentir-se para baixo, deprimido(a) ou sem esperanca", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "mood"},
    {"text": "Dificuldade para pegar no sono ou manter o sono, ou dormir mais do que de costume", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "sleep"},
    {"text": "Sentir-se cansado(a) ou com pouca energia", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "fatigue"},
    {"text": "Falta de apetite ou comendo demais", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "appetite"},
    {"text": "Sentir-se mal consigo mesmo(a) ou achar que e um fracasso", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "self_esteem"},
    {"text": "Dificuldade para se concentrar nas coisas", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "concentration"},
    {"text": "Lentidao para se movimentar ou falar, ou inquietacao excessiva", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "psychomotor"},
    {"text": "Pensamentos de que seria melhor estar morto(a) ou de se machucar", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "suicidal_ideation"}
  ]'::jsonb,
  '{
    "method": "sum",
    "thresholds": [
      {"min": 0, "max": 4, "label": "Minimo", "severity": "minimal"},
      {"min": 5, "max": 9, "label": "Leve", "severity": "mild"},
      {"min": 10, "max": 14, "label": "Moderado", "severity": "moderate"},
      {"min": 15, "max": 19, "label": "Moderadamente Grave", "severity": "moderately_severe"},
      {"min": 20, "max": 27, "label": "Grave", "severity": "severe"}
    ]
  }'::jsonb,
  '{
    "recommendations": {
      "minimal": ["Monitoramento de rotina"],
      "mild": ["Acompanhamento terapeutico recomendado", "Reavaliar em 4 semanas"],
      "moderate": ["Psicoterapia indicada", "Considerar farmacoterapia"],
      "moderately_severe": ["Psicoterapia + farmacoterapia recomendada", "Acompanhamento frequente"],
      "severe": ["Farmacoterapia + psicoterapia urgente", "Avaliar risco de suicidio", "Considerar encaminhamento psiquiatrico"]
    }
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- GAD-7 (Generalized Anxiety Disorder-7)
INSERT INTO psychological_tests (id, name, description, category, dsm_references, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  'GAD-7',
  'Generalized Anxiety Disorder Scale - avalia sintomas de ansiedade nas ultimas 2 semanas.',
  'anxiety',
  ARRAY['F41.1'],
  '[
    {"text": "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "nervousness"},
    {"text": "Nao ser capaz de impedir ou de controlar as preocupacoes", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "worry_control"},
    {"text": "Preocupar-se muito com diversas coisas", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "excessive_worry"},
    {"text": "Dificuldade para relaxar", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "relaxation"},
    {"text": "Ficar tao agitado(a) que se torna dificil ficar parado(a)", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "restlessness"},
    {"text": "Ficar facilmente aborrecido(a) ou irritado(a)", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "irritability"},
    {"text": "Sentir medo como se algo horrivel fosse acontecer", "options": [{"label": "Nenhuma vez", "value": 0}, {"label": "Varios dias", "value": 1}, {"label": "Mais da metade dos dias", "value": 2}, {"label": "Quase todos os dias", "value": 3}], "max_value": 3, "domain": "dread"}
  ]'::jsonb,
  '{
    "method": "sum",
    "thresholds": [
      {"min": 0, "max": 4, "label": "Minimo", "severity": "minimal"},
      {"min": 5, "max": 9, "label": "Leve", "severity": "mild"},
      {"min": 10, "max": 14, "label": "Moderado", "severity": "moderate"},
      {"min": 15, "max": 21, "label": "Grave", "severity": "severe"}
    ]
  }'::jsonb,
  '{
    "recommendations": {
      "minimal": ["Monitoramento de rotina"],
      "mild": ["Psicoeducacao sobre ansiedade", "Tecnicas de relaxamento"],
      "moderate": ["Psicoterapia (TCC recomendada)", "Considerar farmacoterapia"],
      "severe": ["Psicoterapia + farmacoterapia recomendada", "Acompanhamento frequente", "Avaliar comorbidades"]
    }
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- DASS-21 (Depression, Anxiety and Stress Scale)
INSERT INTO psychological_tests (id, name, description, category, dsm_references, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  'DASS-21',
  'Depression, Anxiety and Stress Scale - avalia depressao, ansiedade e estresse na ultima semana.',
  'general',
  ARRAY['F32', 'F41.1', 'F43'],
  '[
    {"text": "Achei dificil me acalmar", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Senti minha boca seca", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Nao consegui ter sentimento positivo algum", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"},
    {"text": "Tive dificuldade em respirar", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Achei dificil ter iniciativa para fazer as coisas", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"},
    {"text": "Tendi a reagir exageradamente", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Senti tremores (nas maos por exemplo)", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Senti que estava sempre nervoso", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Preocupei-me com situacoes em que pudesse entrar em panico", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Senti que nao tinha nada a esperar do futuro", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"},
    {"text": "Senti-me agitado", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Achei dificil relaxar", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Senti-me deprimido e sem animo", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"},
    {"text": "Fui intolerante com as coisas que me impediam de continuar o que estava fazendo", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Senti-me quase entrando em panico", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Nao consegui me entusiasmar com nada", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"},
    {"text": "Senti que nao tinha valor como pessoa", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"},
    {"text": "Senti que estava sensivel demais", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "stress", "subscale": "stress"},
    {"text": "Sabia que meu coracao estava alterado mesmo nao tendo feito esforco fisico", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Senti medo sem ter um bom motivo", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "anxiety", "subscale": "anxiety"},
    {"text": "Senti que a vida nao tinha sentido", "options": [{"label": "Nao se aplicou", "value": 0}, {"label": "Aplicou-se um pouco", "value": 1}, {"label": "Aplicou-se bastante", "value": 2}, {"label": "Aplicou-se muito", "value": 3}], "max_value": 3, "domain": "depression", "subscale": "depression"}
  ]'::jsonb,
  '{
    "method": "subscale",
    "thresholds": [
      {"min": 0, "max": 9, "label": "Normal", "severity": "normal"},
      {"min": 10, "max": 13, "label": "Leve", "severity": "mild"},
      {"min": 14, "max": 20, "label": "Moderado", "severity": "moderate"},
      {"min": 21, "max": 27, "label": "Grave", "severity": "severe"},
      {"min": 28, "max": 63, "label": "Muito Grave", "severity": "extremely_severe"}
    ],
    "subscales": {
      "depression": {
        "indices": [2, 4, 9, 12, 15, 16, 20],
        "thresholds": [
          {"min": 0, "max": 4, "label": "Normal", "severity": "normal"},
          {"min": 5, "max": 6, "label": "Leve", "severity": "mild"},
          {"min": 7, "max": 10, "label": "Moderado", "severity": "moderate"},
          {"min": 11, "max": 13, "label": "Grave", "severity": "severe"},
          {"min": 14, "max": 21, "label": "Muito Grave", "severity": "extremely_severe"}
        ]
      },
      "anxiety": {
        "indices": [1, 3, 6, 8, 14, 18, 19],
        "thresholds": [
          {"min": 0, "max": 3, "label": "Normal", "severity": "normal"},
          {"min": 4, "max": 5, "label": "Leve", "severity": "mild"},
          {"min": 6, "max": 7, "label": "Moderado", "severity": "moderate"},
          {"min": 8, "max": 9, "label": "Grave", "severity": "severe"},
          {"min": 10, "max": 21, "label": "Muito Grave", "severity": "extremely_severe"}
        ]
      },
      "stress": {
        "indices": [0, 5, 7, 10, 11, 13, 17],
        "thresholds": [
          {"min": 0, "max": 7, "label": "Normal", "severity": "normal"},
          {"min": 8, "max": 9, "label": "Leve", "severity": "mild"},
          {"min": 10, "max": 12, "label": "Moderado", "severity": "moderate"},
          {"min": 13, "max": 16, "label": "Grave", "severity": "severe"},
          {"min": 17, "max": 21, "label": "Muito Grave", "severity": "extremely_severe"}
        ]
      }
    }
  }'::jsonb,
  '{
    "recommendations": {
      "normal": ["Manter acompanhamento regular"],
      "mild": ["Psicoeducacao", "Tecnicas de manejo de estresse"],
      "moderate": ["Psicoterapia recomendada", "Avaliar necessidade de farmacoterapia"],
      "severe": ["Intervencao clinica recomendada", "Encaminhamento psiquiatrico"],
      "extremely_severe": ["Intervencao urgente", "Psicoterapia + farmacoterapia", "Monitoramento intensivo"]
    }
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- BDI-II (Beck Depression Inventory-II) — simplified 21-item version
INSERT INTO psychological_tests (id, name, description, category, dsm_references, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  'BDI-II',
  'Inventario de Depressao de Beck - avalia intensidade de sintomas depressivos nas ultimas 2 semanas.',
  'depression',
  ARRAY['F32', 'F33'],
  '[
    {"text": "Tristeza", "options": [{"label": "Nao me sinto triste", "value": 0}, {"label": "Sinto-me triste grande parte do tempo", "value": 1}, {"label": "Estou triste o tempo todo", "value": 2}, {"label": "Estou tao triste que nao consigo suportar", "value": 3}], "max_value": 3, "domain": "sadness"},
    {"text": "Pessimismo", "options": [{"label": "Nao estou desanimado(a) sobre meu futuro", "value": 0}, {"label": "Sinto-me mais desanimado(a) sobre meu futuro", "value": 1}, {"label": "Nao espero que as coisas melhorem", "value": 2}, {"label": "Sinto que meu futuro e sem esperanca", "value": 3}], "max_value": 3, "domain": "pessimism"},
    {"text": "Fracasso passado", "options": [{"label": "Nao me sinto um fracasso", "value": 0}, {"label": "Fracassei mais do que deveria", "value": 1}, {"label": "Quando olho para tras, vejo muitos fracassos", "value": 2}, {"label": "Sinto que sou um completo fracasso", "value": 3}], "max_value": 3, "domain": "failure"},
    {"text": "Perda de prazer", "options": [{"label": "Tenho prazer nas coisas como sempre", "value": 0}, {"label": "Nao sinto tanto prazer como antes", "value": 1}, {"label": "Tenho muito pouco prazer nas coisas", "value": 2}, {"label": "Nao tenho prazer algum", "value": 3}], "max_value": 3, "domain": "anhedonia"},
    {"text": "Sentimento de culpa", "options": [{"label": "Nao me sinto culpado(a)", "value": 0}, {"label": "Sinto-me culpado(a) por varias coisas", "value": 1}, {"label": "Sinto-me bastante culpado(a) a maior parte do tempo", "value": 2}, {"label": "Sinto-me culpado(a) o tempo todo", "value": 3}], "max_value": 3, "domain": "guilt"},
    {"text": "Sentimento de punicao", "options": [{"label": "Nao sinto que estou sendo punido(a)", "value": 0}, {"label": "Sinto que posso ser punido(a)", "value": 1}, {"label": "Espero ser punido(a)", "value": 2}, {"label": "Sinto que estou sendo punido(a)", "value": 3}], "max_value": 3, "domain": "punishment"},
    {"text": "Auto-aversao", "options": [{"label": "Sinto-me como sempre me senti", "value": 0}, {"label": "Perdi a confianca em mim mesmo(a)", "value": 1}, {"label": "Estou desapontado(a) comigo mesmo(a)", "value": 2}, {"label": "Nao gosto de mim", "value": 3}], "max_value": 3, "domain": "self_dislike"},
    {"text": "Autocritica", "options": [{"label": "Nao me critico mais do que o habitual", "value": 0}, {"label": "Sou mais critico(a) comigo do que costumava ser", "value": 1}, {"label": "Critico-me por todas as minhas falhas", "value": 2}, {"label": "Culpo-me por tudo de ruim que acontece", "value": 3}], "max_value": 3, "domain": "self_criticism"},
    {"text": "Pensamentos suicidas", "options": [{"label": "Nao tenho pensamentos de me matar", "value": 0}, {"label": "Tenho pensamentos de me matar mas nao os levaria adiante", "value": 1}, {"label": "Gostaria de me matar", "value": 2}, {"label": "Me mataria se tivesse oportunidade", "value": 3}], "max_value": 3, "domain": "suicidal_ideation"},
    {"text": "Choro", "options": [{"label": "Nao choro mais do que costumava", "value": 0}, {"label": "Choro mais do que costumava", "value": 1}, {"label": "Choro por qualquer coisa", "value": 2}, {"label": "Sinto vontade de chorar mas nao consigo", "value": 3}], "max_value": 3, "domain": "crying"},
    {"text": "Agitacao", "options": [{"label": "Nao me sinto mais agitado(a) do que o habitual", "value": 0}, {"label": "Sinto-me mais agitado(a) do que o habitual", "value": 1}, {"label": "Estou tao agitado(a) que e dificil ficar parado(a)", "value": 2}, {"label": "Estou tao agitado(a) que tenho que me movimentar continuamente", "value": 3}], "max_value": 3, "domain": "agitation"},
    {"text": "Perda de interesse", "options": [{"label": "Nao perdi o interesse por outras pessoas ou atividades", "value": 0}, {"label": "Estou menos interessado(a) por outras pessoas ou coisas", "value": 1}, {"label": "Perdi a maior parte do interesse por outras pessoas ou coisas", "value": 2}, {"label": "E dificil me interessar por qualquer coisa", "value": 3}], "max_value": 3, "domain": "loss_of_interest"},
    {"text": "Indecisao", "options": [{"label": "Tomo decisoes como sempre", "value": 0}, {"label": "Acho mais dificil tomar decisoes", "value": 1}, {"label": "Tenho muito mais dificuldade para tomar decisoes", "value": 2}, {"label": "Tenho dificuldade para tomar qualquer decisao", "value": 3}], "max_value": 3, "domain": "indecisiveness"},
    {"text": "Sentimento de inutilidade", "options": [{"label": "Nao me sinto inutil", "value": 0}, {"label": "Nao me considero tao util como antes", "value": 1}, {"label": "Sinto-me mais inutil do que outras pessoas", "value": 2}, {"label": "Sinto-me completamente inutil", "value": 3}], "max_value": 3, "domain": "worthlessness"},
    {"text": "Perda de energia", "options": [{"label": "Tenho energia como sempre", "value": 0}, {"label": "Tenho menos energia do que costumava ter", "value": 1}, {"label": "Nao tenho energia suficiente para fazer muita coisa", "value": 2}, {"label": "Nao tenho energia para nada", "value": 3}], "max_value": 3, "domain": "loss_of_energy"},
    {"text": "Alteracoes no sono", "options": [{"label": "Nao percebi mudancas no meu sono", "value": 0}, {"label": "Durmo um pouco mais/menos do que o habitual", "value": 1}, {"label": "Durmo muito mais/menos do que o habitual", "value": 2}, {"label": "Durmo a maior parte do dia ou acordo muito cedo", "value": 3}], "max_value": 3, "domain": "sleep_changes"},
    {"text": "Irritabilidade", "options": [{"label": "Nao estou mais irritado(a) do que o habitual", "value": 0}, {"label": "Estou mais irritado(a) do que o habitual", "value": 1}, {"label": "Estou muito mais irritado(a) do que o habitual", "value": 2}, {"label": "Estou irritado(a) o tempo todo", "value": 3}], "max_value": 3, "domain": "irritability"},
    {"text": "Alteracoes no apetite", "options": [{"label": "Nao percebi mudancas no meu apetite", "value": 0}, {"label": "Meu apetite esta um pouco diferente", "value": 1}, {"label": "Meu apetite esta muito diferente", "value": 2}, {"label": "Nao tenho apetite algum ou como o tempo todo", "value": 3}], "max_value": 3, "domain": "appetite_changes"},
    {"text": "Dificuldade de concentracao", "options": [{"label": "Consigo me concentrar como sempre", "value": 0}, {"label": "Nao consigo me concentrar tao bem como antes", "value": 1}, {"label": "E dificil manter a concentracao por muito tempo", "value": 2}, {"label": "Nao consigo me concentrar em nada", "value": 3}], "max_value": 3, "domain": "concentration"},
    {"text": "Cansaco ou fadiga", "options": [{"label": "Nao me sinto mais cansado(a) do que o habitual", "value": 0}, {"label": "Canso-me mais facilmente do que antes", "value": 1}, {"label": "Estou cansado(a) demais para fazer muitas coisas", "value": 2}, {"label": "Estou cansado(a) demais para fazer qualquer coisa", "value": 3}], "max_value": 3, "domain": "fatigue"},
    {"text": "Perda de interesse por sexo", "options": [{"label": "Nao notei mudanca recente no meu interesse por sexo", "value": 0}, {"label": "Estou menos interessado(a) em sexo", "value": 1}, {"label": "Estou muito menos interessado(a) em sexo agora", "value": 2}, {"label": "Perdi completamente o interesse por sexo", "value": 3}], "max_value": 3, "domain": "loss_of_libido"}
  ]'::jsonb,
  '{
    "method": "sum",
    "thresholds": [
      {"min": 0, "max": 13, "label": "Minimo", "severity": "minimal"},
      {"min": 14, "max": 19, "label": "Leve", "severity": "mild"},
      {"min": 20, "max": 28, "label": "Moderado", "severity": "moderate"},
      {"min": 29, "max": 63, "label": "Grave", "severity": "severe"}
    ]
  }'::jsonb,
  '{
    "recommendations": {
      "minimal": ["Monitoramento de rotina"],
      "mild": ["Acompanhamento terapeutico", "Psicoeducacao"],
      "moderate": ["Psicoterapia estruturada", "Considerar farmacoterapia"],
      "severe": ["Farmacoterapia + psicoterapia", "Avaliacao de risco", "Acompanhamento intensivo"]
    }
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- BAI (Beck Anxiety Inventory)
INSERT INTO psychological_tests (id, name, description, category, dsm_references, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  'BAI',
  'Inventario de Ansiedade de Beck - avalia intensidade de sintomas de ansiedade na ultima semana.',
  'anxiety',
  ARRAY['F41.1', 'F41.0'],
  '[
    {"text": "Dormencia ou formigamento", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Sensacao de calor", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Tremores nas pernas", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Incapaz de relaxar", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Medo que aconteca o pior", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Atordoado ou tonto", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Palpitacao ou aceleracao do coracao", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Sem equilibrio", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Aterrorizado", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Nervoso", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Sensacao de sufocacao", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Tremores nas maos", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Tremulo", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Medo de perder o controle", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Dificuldade de respirar", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Medo de morrer", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Assustado", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "subjective"},
    {"text": "Indigestao ou desconforto no abdomen", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Sensacao de desmaio", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Rosto afogueado", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"},
    {"text": "Suor (nao devido ao calor)", "options": [{"label": "Absolutamente nao", "value": 0}, {"label": "Levemente", "value": 1}, {"label": "Moderadamente", "value": 2}, {"label": "Gravemente", "value": 3}], "max_value": 3, "domain": "somatic"}
  ]'::jsonb,
  '{
    "method": "sum",
    "thresholds": [
      {"min": 0, "max": 7, "label": "Minimo", "severity": "minimal"},
      {"min": 8, "max": 15, "label": "Leve", "severity": "mild"},
      {"min": 16, "max": 25, "label": "Moderado", "severity": "moderate"},
      {"min": 26, "max": 63, "label": "Grave", "severity": "severe"}
    ]
  }'::jsonb,
  '{
    "recommendations": {
      "minimal": ["Monitoramento de rotina"],
      "mild": ["Psicoeducacao sobre ansiedade", "Tecnicas de respiracao e relaxamento"],
      "moderate": ["Psicoterapia (TCC)", "Considerar farmacoterapia"],
      "severe": ["Farmacoterapia + psicoterapia", "Avaliacao psiquiatrica urgente", "Monitoramento intensivo"]
    }
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Eneagrama Simplificado (36 questions, 9 types)
INSERT INTO psychological_tests (id, name, description, category, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  'Eneagrama Simplificado',
  'Instrumento de autoconhecimento baseado no modelo eneagramático. Identifica tendências de personalidade em 9 tipos. Para uso reflexivo em contexto terapêutico.',
  'personality',
  '[
    {"text": "Tenho um forte senso de certo e errado", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_1"},
    {"text": "Me incomoda quando as coisas não são feitas da forma correta", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_1"},
    {"text": "Sou autocrítico(a) quando cometo erros", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_1"},
    {"text": "Tenho altos padrões que me esforço para alcançar", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_1"},
    {"text": "Fico feliz quando consigo ajudar outras pessoas", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_2"},
    {"text": "Às vezes negligencio minhas necessidades para atender às dos outros", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_2"},
    {"text": "Me sinto satisfeito(a) quando as pessoas precisam de mim", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_2"},
    {"text": "Tenho dificuldade de pedir ajuda", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_2"},
    {"text": "Me importa muito como os outros me percebem", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_3"},
    {"text": "Sou muito orientado(a) a metas e realizações", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_3"},
    {"text": "Adapto meu comportamento conforme a situação para ter sucesso", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_3"},
    {"text": "Fico desconfortável quando fracasso", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_3"},
    {"text": "Sinto que sou fundamentalmente diferente dos outros", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_4"},
    {"text": "Busco experiências intensas e profundas", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_4"},
    {"text": "Me identifico fortemente com minhas emoções", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_4"},
    {"text": "Tenho forte desejo de me expressar criativamente", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_4"},
    {"text": "Prefiro observar antes de participar", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_5"},
    {"text": "Me sinto esgotado(a) após muito tempo com outras pessoas", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_5"},
    {"text": "Valorizo muito o conhecimento e a compreensão", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_5"},
    {"text": "Preciso de tempo sozinho(a) para me recarregar", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_5"},
    {"text": "Tendo a antecipar o que pode dar errado", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_6"},
    {"text": "Preciso me sentir seguro(a) antes de agir", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_6"},
    {"text": "Sou leal às pessoas e grupos em que confio", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_6"},
    {"text": "Frequentemente questiono se estou tomando a decisão certa", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_6"},
    {"text": "Gosto de ter muitas opções e possibilidades", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_7"},
    {"text": "Me entedio facilmente com rotinas", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_7"},
    {"text": "Busco experiências novas e estimulantes", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_7"},
    {"text": "Foco no lado positivo das situações", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_7"},
    {"text": "Defendo minha posição mesmo sob pressão", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_8"},
    {"text": "Me importa ser independente e não depender dos outros", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_8"},
    {"text": "Fico impaciente com hesitação e fraqueza", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_8"},
    {"text": "Prefiro ser direto(a) mesmo que isso gere conflito", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_8"},
    {"text": "Evito conflitos e prefiro a harmonia", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_9"},
    {"text": "Tendo a me adaptar às preferências dos outros", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_9"},
    {"text": "Me sinto bem em situações calmas e sem pressão", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_9"},
    {"text": "Por vezes procrastino decisões difíceis", "options": [{"label":"Não me descreve","value":0},{"label":"Descreve pouco","value":1},{"label":"Descreve bem","value":2},{"label":"Me descreve muito","value":3}], "max_value": 3, "subscale": "type_9"}
  ]'::jsonb,
  '{
    "method": "max_subscale",
    "thresholds": [],
    "subscales": {
      "type_1": {"label": "Tipo 1 — O Reformador", "description": "Principista, perfeccionista, senso moral elevado.", "indices": [0,1,2,3]},
      "type_2": {"label": "Tipo 2 — O Ajudador", "description": "Generoso, atencioso, busca ser necessário e amado.", "indices": [4,5,6,7]},
      "type_3": {"label": "Tipo 3 — O Realizador", "description": "Ambicioso, adaptável, orientado ao sucesso.", "indices": [8,9,10,11]},
      "type_4": {"label": "Tipo 4 — O Individualista", "description": "Expressivo, autoconsciente, busca identidade única.", "indices": [12,13,14,15]},
      "type_5": {"label": "Tipo 5 — O Investigador", "description": "Analítico, reservado, busca compreender o mundo.", "indices": [16,17,18,19]},
      "type_6": {"label": "Tipo 6 — O Leal", "description": "Comprometido, vigilante, busca segurança.", "indices": [20,21,22,23]},
      "type_7": {"label": "Tipo 7 — O Entusiasta", "description": "Espontâneo, versátil, busca experiências positivas.", "indices": [24,25,26,27]},
      "type_8": {"label": "Tipo 8 — O Desafiador", "description": "Autoconfiante, decisivo, busca autonomia.", "indices": [28,29,30,31]},
      "type_9": {"label": "Tipo 9 — O Pacificador", "description": "Receptivo, tranquilo, busca harmonia interior.", "indices": [32,33,34,35]}
    }
  }'::jsonb,
  '{"notes": "Instrumento de autoconhecimento para uso reflexivo em contexto terapêutico. Não constitui diagnóstico clínico."}'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- 16 Personalidades Simplificado (32 questions, 4 binary dimensions)
INSERT INTO psychological_tests (id, name, description, category, questions, scoring_rules, interpretation_guide, is_active)
VALUES (
  gen_random_uuid(),
  '16 Personalidades Simplificado',
  'Avaliação de perfil de personalidade baseada nas 4 dimensões de preferências cognitivas. Identifica o tipo em Extroversão/Introversão, Sensação/Intuição, Pensamento/Sentimento e Julgamento/Percepção.',
  'personality',
  '[
    {"text": "Prefiro socializar do que ficar sozinho(a)", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "A"},
    {"text": "Recarrego energias ficando sozinho(a)", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "B"},
    {"text": "Prefiro lidar com fatos concretos e práticos", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "A"},
    {"text": "Gosto de explorar ideias abstratas e possibilidades", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "B"},
    {"text": "Em grupos, costumo ser um dos primeiros a falar", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "A"},
    {"text": "Penso bastante antes de compartilhar minha opinião", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "B"},
    {"text": "Presto atenção aos detalhes práticos", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "A"},
    {"text": "Fico mais animado(a) com o que poderia ser do que com o que é", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "B"},
    {"text": "Faço amizades facilmente em novos ambientes", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "A"},
    {"text": "Prefiro poucos amigos íntimos a muitos conhecidos", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "B"},
    {"text": "Confio mais na experiência do que na teoria", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "A"},
    {"text": "Confio mais na intuição do que em dados concretos", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "B"},
    {"text": "Me sinto energizado(a) após estar com pessoas", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "A"},
    {"text": "Preciso de silêncio para me concentrar bem", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "EI", "pole": "B"},
    {"text": "Prefiro um plano bem definido a improvisar", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "A"},
    {"text": "Prefiro deixar as coisas em aberto e ver como evoluem", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "SN", "pole": "B"},
    {"text": "Tomo decisões com base em lógica e análise", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "A"},
    {"text": "Tomo decisões considerando como afetará as pessoas", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "B"},
    {"text": "Prefiro ter planos definidos a improvisar", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "A"},
    {"text": "Prefiro manter opções em aberto e ser flexível", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "B"},
    {"text": "Prefiro críticas diretas a feedbacks suavizados", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "A"},
    {"text": "Me preocupo com o impacto emocional das minhas palavras", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "B"},
    {"text": "Gosto de listas e organização nas tarefas", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "A"},
    {"text": "Prefiro trabalhar à medida que surgem as necessidades", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "B"},
    {"text": "Resolvo conflitos buscando a solução mais justa", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "A"},
    {"text": "Resolvo conflitos buscando preservar a harmonia", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "B"},
    {"text": "Gosto de terminar projetos antes de iniciar novos", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "A"},
    {"text": "Gosto de trabalhar em vários projetos ao mesmo tempo", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "B"},
    {"text": "Analiso situações de forma imparcial e objetiva", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "A"},
    {"text": "Analiso situações levando em conta as emoções envolvidas", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "TF", "pole": "B"},
    {"text": "Me sinto bem com rotinas previsíveis", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "A"},
    {"text": "Me adapto facilmente a mudanças e surpresas", "options": [{"label":"Concordo","value":1},{"label":"Discordo","value":0}], "max_value": 1, "dimension": "JP", "pole": "B"}
  ]'::jsonb,
  '{
    "method": "dimension_majority",
    "thresholds": [],
    "dimensions": [
      {"key":"EI","pole_a_label":"E","pole_b_label":"I","pole_a_name":"Extroversão","pole_b_name":"Introversão","pole_a_indices":[0,4,8,12],"pole_b_indices":[1,5,9,13]},
      {"key":"SN","pole_a_label":"S","pole_b_label":"N","pole_a_name":"Sensação","pole_b_name":"Intuição","pole_a_indices":[2,6,10,14],"pole_b_indices":[3,7,11,15]},
      {"key":"TF","pole_a_label":"T","pole_b_label":"F","pole_a_name":"Pensamento","pole_b_name":"Sentimento","pole_a_indices":[16,20,24,28],"pole_b_indices":[17,21,25,29]},
      {"key":"JP","pole_a_label":"J","pole_b_label":"P","pole_a_name":"Julgamento","pole_b_name":"Percepção","pole_a_indices":[18,22,26,30],"pole_b_indices":[19,23,27,31]}
    ]
  }'::jsonb,
  '{
    "types": {
      "ISTJ":"O Inspetor — metódico, confiável, responsável.",
      "ISFJ":"O Protetor — dedicado, caloroso, observador.",
      "INFJ":"O Conselheiro — visionário, empático, íntegro.",
      "INTJ":"O Arquiteto — estratégico, independente, determinado.",
      "ISTP":"O Virtuoso — prático, analítico, reservado.",
      "ISFP":"O Aventureiro — gentil, sensível, aberto a experiências.",
      "INFP":"O Mediador — idealista, empático, criativo.",
      "INTP":"O Lógico — analítico, objetivo, inventivo.",
      "ESTP":"O Empreendedor — enérgico, perceptivo, direto.",
      "ESFP":"O Animador — espontâneo, entusiasta, sociável.",
      "ENFP":"O Campeão — criativo, otimista, orientado a pessoas.",
      "ENTP":"O Debatedor — curioso, engenhoso, estratégico.",
      "ESTJ":"O Executivo — organizado, decisivo, tradicional.",
      "ESFJ":"O Cônsul — prestativo, leal, orientado à harmonia.",
      "ENFJ":"O Protagonista — carismático, empático, líder nato.",
      "ENTJ":"O Comandante — assertivo, estratégico, líder visionário."
    },
    "notes": "Baseado nas 4 dicotomias de preferências cognitivas. Para uso educacional e de autoconhecimento. Não constitui diagnóstico clínico."
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
