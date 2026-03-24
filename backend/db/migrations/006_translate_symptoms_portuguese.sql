-- Migration 006: Translate all symptom names to Portuguese
-- Date: 2026-03-24

-- Humor (Mood)
UPDATE symptoms SET name = 'Humor deprimido'       WHERE name = 'Depressed mood';
UPDATE symptoms SET name = 'Irritabilidade'         WHERE name = 'Irritability';
UPDATE symptoms SET name = 'Labilidade emocional'   WHERE name = 'Mood swings';
UPDATE symptoms SET name = 'Entorpecimento emocional' WHERE name = 'Emotional numbness';
UPDATE symptoms SET name = 'Anedonia'               WHERE name = 'Anhedonia';

-- Ansiedade (Anxiety)
UPDATE symptoms SET name = 'Ansiedade generalizada' WHERE name = 'Generalized anxiety';
UPDATE symptoms SET name = 'Ataques de pânico'      WHERE name = 'Panic attacks';
UPDATE symptoms SET name = 'Ansiedade social'        WHERE name = 'Social anxiety';
UPDATE symptoms SET name = 'Evitação fóbica'         WHERE name = 'Phobic avoidance';
UPDATE symptoms SET name = 'Inquietação'             WHERE name = 'Restlessness';

-- Sono (Sleep)
UPDATE symptoms SET name = 'Insônia'                 WHERE name = 'Insomnia';
UPDATE symptoms SET name = 'Hipersonia'              WHERE name = 'Hypersomnia';
UPDATE symptoms SET name = 'Pesadelos'               WHERE name = 'Nightmares';
UPDATE symptoms SET name = 'Fragmentação do sono'    WHERE name = 'Sleep fragmentation';

-- Cognitivo (Cognitive)
UPDATE symptoms SET name = 'Dificuldade de concentração' WHERE name = 'Difficulty concentrating';
UPDATE symptoms SET name = 'Problemas de memória'    WHERE name = 'Memory problems';
UPDATE symptoms SET name = 'Indecisão'               WHERE name = 'Indecisiveness';
UPDATE symptoms SET name = 'Pensamentos acelerados'  WHERE name = 'Racing thoughts';
UPDATE symptoms SET name = 'Pensamentos intrusivos'  WHERE name = 'Intrusive thoughts';

-- Físico (Physical)
UPDATE symptoms SET name = 'Fadiga'                  WHERE name = 'Fatigue';
UPDATE symptoms SET name = 'Alterações de apetite'   WHERE name = 'Appetite changes';
UPDATE symptoms SET name = 'Agitação psicomotora'    WHERE name = 'Psychomotor agitation';
UPDATE symptoms SET name = 'Retardo psicomotor'      WHERE name = 'Psychomotor retardation';
UPDATE symptoms SET name = 'Queixas somáticas'       WHERE name = 'Somatic complaints';
UPDATE symptoms SET name = 'Diminuição da libido'    WHERE name = 'Low libido';

-- Comportamental (Behavioral)
UPDATE symptoms SET name = 'Isolamento social'       WHERE name = 'Social withdrawal';
UPDATE symptoms SET name = 'Uso de substâncias'      WHERE name = 'Substance use';
UPDATE symptoms SET name = 'Pensamentos de autolesão' WHERE name = 'Self-harm urges';
UPDATE symptoms SET name = 'Comportamentos compulsivos' WHERE name = 'Compulsive behaviors';
UPDATE symptoms SET name = 'Procrastinação'          WHERE name = 'Procrastination';
