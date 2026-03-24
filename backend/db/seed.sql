-- ============================================================================
-- CLARITA - Mental Health Monitoring Platform
-- Seed Data
-- Version: 1.0.0
-- ============================================================================

BEGIN;

-- ============================================================================
-- SYMPTOMS
-- ============================================================================

INSERT INTO symptoms (name, category, description, severity_scale) VALUES

-- Sintomas de Humor
('Humor deprimido',              'mood',       'Persistent feelings of sadness, emptiness, or hopelessness.',                              '1-10: 1=minimal, 5=moderate, 10=severe'),
('Irritabilidade',               'mood',       'Increased frustration, short temper, or agitation disproportionate to circumstances.',      '1-10: 1=minimal, 5=moderate, 10=severe'),
('Labilidade emocional',         'mood',       'Rapid or extreme fluctuations in emotional state.',                                        '1-10: 1=minimal, 5=moderate, 10=severe'),
('Entorpecimento emocional',     'mood',       'Diminished ability to feel emotions or emotional detachment.',                             '1-10: 1=minimal, 5=moderate, 10=severe'),
('Anedonia',                     'mood',       'Markedly diminished interest or pleasure in all or almost all activities.',                '1-10: 1=minimal, 5=moderate, 10=severe'),

-- Sintomas de Ansiedade
('Ansiedade generalizada',       'anxiety',    'Excessive, hard-to-control worry about multiple areas of life.',                           '1-10: 1=minimal, 5=moderate, 10=severe'),
('Ataques de pânico',            'anxiety',    'Sudden episodes of intense fear with physical symptoms such as chest pain and shortness of breath.', '1-10: 1=minimal, 5=moderate, 10=severe'),
('Ansiedade social',             'anxiety',    'Intense fear or anxiety about social situations involving potential scrutiny by others.',   '1-10: 1=minimal, 5=moderate, 10=severe'),
('Evitação fóbica',              'anxiety',    'Active avoidance of specific feared objects, situations, or activities.',                  '1-10: 1=minimal, 5=moderate, 10=severe'),
('Inquietação',                  'anxiety',    'Feeling keyed up, on edge, or unable to relax.',                                          '1-10: 1=minimal, 5=moderate, 10=severe'),

-- Sintomas de Sono
('Insônia',                      'sleep',      'Difficulty falling asleep, staying asleep, or waking too early.',                          '1-10: 1=minimal, 5=moderate, 10=severe'),
('Hipersonia',                   'sleep',      'Excessive daytime sleepiness or prolonged nighttime sleep despite adequate hours.',         '1-10: 1=minimal, 5=moderate, 10=severe'),
('Pesadelos',                    'sleep',      'Recurrent disturbing dreams that cause awakening and distress.',                           '1-10: 1=minimal, 5=moderate, 10=severe'),
('Fragmentação do sono',         'sleep',      'Frequent awakenings throughout the night disrupting restorative sleep.',                   '1-10: 1=minimal, 5=moderate, 10=severe'),

-- Sintomas Cognitivos
('Dificuldade de concentração',  'cognitive',  'Trouble sustaining attention, following conversations, or completing tasks.',               '1-10: 1=minimal, 5=moderate, 10=severe'),
('Problemas de memória',         'cognitive',  'Difficulty recalling recent events, information, or instructions.',                        '1-10: 1=minimal, 5=moderate, 10=severe'),
('Indecisão',                    'cognitive',  'Persistent difficulty making decisions, even minor ones.',                                 '1-10: 1=minimal, 5=moderate, 10=severe'),
('Pensamentos acelerados',       'cognitive',  'Rapid, uncontrollable flow of thoughts that may jump between topics.',                     '1-10: 1=minimal, 5=moderate, 10=severe'),
('Pensamentos intrusivos',       'cognitive',  'Unwanted, recurring thoughts, images, or urges that cause distress.',                      '1-10: 1=minimal, 5=moderate, 10=severe'),

-- Sintomas Físicos
('Fadiga',                       'physical',   'Persistent tiredness or exhaustion not relieved by rest.',                                 '1-10: 1=minimal, 5=moderate, 10=severe'),
('Alterações de apetite',        'physical',   'Significant increase or decrease in appetite or eating patterns.',                         '1-10: 1=minimal, 5=moderate, 10=severe'),
('Agitação psicomotora',         'physical',   'Observable restlessness such as pacing, hand-wringing, or inability to sit still.',        '1-10: 1=minimal, 5=moderate, 10=severe'),
('Retardo psicomotor',           'physical',   'Observable slowing of physical movement, speech, or reaction time.',                       '1-10: 1=minimal, 5=moderate, 10=severe'),
('Queixas somáticas',            'physical',   'Recurring physical symptoms such as headaches, stomach problems, or muscle tension without clear medical cause.', '1-10: 1=minimal, 5=moderate, 10=severe'),
('Diminuição da libido',         'physical',   'Decreased sexual desire or interest in sexual activity.',                                  '1-10: 1=minimal, 5=moderate, 10=severe'),

-- Sintomas Comportamentais
('Isolamento social',            'behavioral', 'Avoidance of social interactions, activities, or relationships.',                          '1-10: 1=minimal, 5=moderate, 10=severe'),
('Uso de substâncias',           'behavioral', 'Increased or problematic use of alcohol, drugs, or other substances.',                     '1-10: 1=minimal, 5=moderate, 10=severe'),
('Pensamentos de autolesão',     'behavioral', 'Thoughts or urges to intentionally harm oneself.',                                        '1-10: 1=minimal, 5=moderate, 10=severe'),
('Comportamentos compulsivos',   'behavioral', 'Repetitive behaviors performed to reduce anxiety or according to rigid rules.',            '1-10: 1=minimal, 5=moderate, 10=severe'),
('Procrastinação',               'behavioral', 'Persistent avoidance or delay of tasks despite negative consequences.',                    '1-10: 1=minimal, 5=moderate, 10=severe');


-- ============================================================================
-- MEDICATIONS
-- ============================================================================

INSERT INTO medications (name, category, description, common_dosages, side_effects) VALUES

-- SSRIs (Selective Serotonin Reuptake Inhibitors)
(
    'Sertraline',
    'SSRI',
    'Selective serotonin reuptake inhibitor used to treat depression, anxiety disorders, OCD, PTSD, and panic disorder.',
    ARRAY['25mg', '50mg', '100mg', '150mg', '200mg'],
    ARRAY['Nausea', 'Diarrhea', 'Insomnia', 'Dizziness', 'Dry mouth', 'Fatigue', 'Decreased libido', 'Headache']
),
(
    'Fluoxetine',
    'SSRI',
    'Selective serotonin reuptake inhibitor used to treat major depressive disorder, OCD, panic disorder, and bulimia nervosa.',
    ARRAY['10mg', '20mg', '40mg', '60mg'],
    ARRAY['Nausea', 'Headache', 'Insomnia', 'Nervousness', 'Anxiety', 'Decreased appetite', 'Dry mouth', 'Tremor']
),
(
    'Escitalopram',
    'SSRI',
    'Selective serotonin reuptake inhibitor used to treat major depressive disorder and generalized anxiety disorder.',
    ARRAY['5mg', '10mg', '20mg'],
    ARRAY['Nausea', 'Insomnia', 'Ejaculation disorder', 'Fatigue', 'Dizziness', 'Dry mouth', 'Increased sweating']
),
(
    'Paroxetine',
    'SSRI',
    'Selective serotonin reuptake inhibitor used to treat depression, GAD, social anxiety, panic disorder, OCD, and PTSD.',
    ARRAY['10mg', '20mg', '30mg', '40mg'],
    ARRAY['Drowsiness', 'Nausea', 'Dry mouth', 'Weight gain', 'Decreased libido', 'Dizziness', 'Constipation', 'Insomnia']
),
(
    'Citalopram',
    'SSRI',
    'Selective serotonin reuptake inhibitor primarily used to treat major depressive disorder.',
    ARRAY['10mg', '20mg', '40mg'],
    ARRAY['Nausea', 'Dry mouth', 'Drowsiness', 'Insomnia', 'Increased sweating', 'Tremor', 'Diarrhea']
),

-- SNRIs (Serotonin-Norepinephrine Reuptake Inhibitors)
(
    'Venlafaxine',
    'SNRI',
    'Serotonin-norepinephrine reuptake inhibitor used to treat depression, GAD, social anxiety, and panic disorder.',
    ARRAY['37.5mg', '75mg', '150mg', '225mg'],
    ARRAY['Nausea', 'Dizziness', 'Dry mouth', 'Insomnia', 'Increased sweating', 'Constipation', 'Elevated blood pressure', 'Decreased appetite']
),
(
    'Duloxetine',
    'SNRI',
    'Serotonin-norepinephrine reuptake inhibitor used to treat depression, GAD, fibromyalgia, and chronic pain.',
    ARRAY['20mg', '30mg', '60mg', '90mg', '120mg'],
    ARRAY['Nausea', 'Dry mouth', 'Constipation', 'Fatigue', 'Decreased appetite', 'Dizziness', 'Increased sweating', 'Insomnia']
),
(
    'Desvenlafaxine',
    'SNRI',
    'Serotonin-norepinephrine reuptake inhibitor used to treat major depressive disorder.',
    ARRAY['25mg', '50mg', '100mg'],
    ARRAY['Nausea', 'Dizziness', 'Insomnia', 'Increased sweating', 'Constipation', 'Decreased appetite', 'Fatigue']
),

-- Atypical Antidepressants
(
    'Bupropion',
    'Atypical Antidepressant',
    'Norepinephrine-dopamine reuptake inhibitor used to treat depression and as a smoking cessation aid. Less likely to cause sexual side effects.',
    ARRAY['150mg SR', '300mg SR', '150mg XL', '300mg XL', '450mg XL'],
    ARRAY['Dry mouth', 'Insomnia', 'Headache', 'Nausea', 'Agitation', 'Constipation', 'Tremor', 'Dizziness']
),
(
    'Mirtazapine',
    'Atypical Antidepressant',
    'Noradrenergic and specific serotonergic antidepressant. Often used when sedation and appetite stimulation are desired.',
    ARRAY['7.5mg', '15mg', '30mg', '45mg'],
    ARRAY['Drowsiness', 'Increased appetite', 'Weight gain', 'Dry mouth', 'Dizziness', 'Constipation', 'Elevated cholesterol']
),
(
    'Trazodone',
    'Atypical Antidepressant',
    'Serotonin antagonist and reuptake inhibitor commonly used at low doses for insomnia and at higher doses for depression.',
    ARRAY['25mg', '50mg', '100mg', '150mg', '300mg'],
    ARRAY['Drowsiness', 'Dizziness', 'Dry mouth', 'Blurred vision', 'Nausea', 'Headache', 'Orthostatic hypotension']
),

-- Benzodiazepines
(
    'Alprazolam',
    'Benzodiazepine',
    'Short-acting benzodiazepine used for acute anxiety and panic disorder. Use with caution due to dependence risk.',
    ARRAY['0.25mg', '0.5mg', '1mg', '2mg'],
    ARRAY['Drowsiness', 'Fatigue', 'Memory impairment', 'Ataxia', 'Dependence risk', 'Rebound anxiety', 'Dizziness']
),
(
    'Clonazepam',
    'Benzodiazepine',
    'Long-acting benzodiazepine used for panic disorder and certain seizure disorders.',
    ARRAY['0.25mg', '0.5mg', '1mg', '2mg'],
    ARRAY['Drowsiness', 'Dizziness', 'Fatigue', 'Depression', 'Memory impairment', 'Ataxia', 'Dependence risk']
),
(
    'Lorazepam',
    'Benzodiazepine',
    'Intermediate-acting benzodiazepine used for anxiety, insomnia, and acute agitation.',
    ARRAY['0.5mg', '1mg', '2mg'],
    ARRAY['Sedation', 'Dizziness', 'Weakness', 'Unsteadiness', 'Memory impairment', 'Dependence risk']
),

-- Mood Stabilizers
(
    'Lithium',
    'Mood Stabilizer',
    'First-line mood stabilizer used for bipolar disorder. Requires regular blood level monitoring.',
    ARRAY['150mg', '300mg', '450mg', '600mg'],
    ARRAY['Tremor', 'Increased thirst', 'Frequent urination', 'Nausea', 'Weight gain', 'Thyroid changes', 'Kidney effects', 'Cognitive dulling']
),
(
    'Lamotrigine',
    'Mood Stabilizer',
    'Anticonvulsant used as a mood stabilizer, especially effective for preventing depressive episodes in bipolar disorder.',
    ARRAY['25mg', '50mg', '100mg', '200mg', '300mg'],
    ARRAY['Headache', 'Dizziness', 'Nausea', 'Blurred vision', 'Rash (requires immediate attention)', 'Insomnia', 'Fatigue']
),
(
    'Valproic Acid',
    'Mood Stabilizer',
    'Anticonvulsant used as a mood stabilizer for bipolar disorder, particularly manic episodes.',
    ARRAY['250mg', '500mg', '750mg', '1000mg'],
    ARRAY['Nausea', 'Tremor', 'Weight gain', 'Hair loss', 'Drowsiness', 'Liver toxicity risk', 'Pancreatitis risk']
),

-- Antipsychotics (Atypical)
(
    'Quetiapine',
    'Atypical Antipsychotic',
    'Atypical antipsychotic used for schizophrenia, bipolar disorder, and as adjunct for depression. Low doses used for insomnia.',
    ARRAY['25mg', '50mg', '100mg', '200mg', '300mg', '400mg'],
    ARRAY['Sedation', 'Weight gain', 'Dry mouth', 'Dizziness', 'Metabolic changes', 'Orthostatic hypotension', 'Constipation']
),
(
    'Aripiprazole',
    'Atypical Antipsychotic',
    'Atypical antipsychotic used for schizophrenia, bipolar disorder, and as adjunct for depression. Partial dopamine agonist.',
    ARRAY['2mg', '5mg', '10mg', '15mg', '20mg', '30mg'],
    ARRAY['Akathisia', 'Insomnia', 'Nausea', 'Headache', 'Dizziness', 'Weight gain', 'Restlessness']
),
(
    'Risperidone',
    'Atypical Antipsychotic',
    'Atypical antipsychotic used for schizophrenia, bipolar mania, and irritability associated with autism.',
    ARRAY['0.5mg', '1mg', '2mg', '3mg', '4mg'],
    ARRAY['Weight gain', 'Sedation', 'Elevated prolactin', 'Dizziness', 'Akathisia', 'Metabolic changes', 'Extrapyramidal symptoms']
),

-- Sleep Aids
(
    'Zolpidem',
    'Sleep Aid',
    'Non-benzodiazepine hypnotic used for short-term treatment of insomnia.',
    ARRAY['5mg', '10mg', '6.25mg CR', '12.5mg CR'],
    ARRAY['Drowsiness', 'Dizziness', 'Headache', 'Diarrhea', 'Complex sleep behaviors', 'Next-day impairment']
),
(
    'Melatonin',
    'Sleep Aid',
    'Hormone supplement used to regulate sleep-wake cycles. Available over the counter.',
    ARRAY['1mg', '3mg', '5mg', '10mg'],
    ARRAY['Headache', 'Dizziness', 'Nausea', 'Daytime drowsiness']
),

-- Anxiolytics (Non-Benzodiazepine)
(
    'Buspirone',
    'Anxiolytic',
    'Non-benzodiazepine anxiolytic used for generalized anxiety disorder. Does not cause dependence.',
    ARRAY['5mg', '10mg', '15mg', '30mg'],
    ARRAY['Dizziness', 'Nausea', 'Headache', 'Nervousness', 'Lightheadedness', 'Excitement']
),
(
    'Hydroxyzine',
    'Anxiolytic',
    'Antihistamine used for anxiety and as a sedative. Non-habit forming alternative for short-term anxiety relief.',
    ARRAY['10mg', '25mg', '50mg'],
    ARRAY['Drowsiness', 'Dry mouth', 'Dizziness', 'Headache', 'Constipation']
),

-- ADHD Medications (commonly co-prescribed)
(
    'Methylphenidate',
    'Stimulant',
    'Central nervous system stimulant used for ADHD. May be relevant for patients with comorbid attention difficulties.',
    ARRAY['5mg', '10mg', '20mg', '18mg ER', '36mg ER', '54mg ER'],
    ARRAY['Decreased appetite', 'Insomnia', 'Headache', 'Stomach pain', 'Nervousness', 'Increased heart rate', 'Irritability']
),
(
    'Atomoxetine',
    'Non-Stimulant ADHD',
    'Selective norepinephrine reuptake inhibitor used for ADHD. Non-stimulant option.',
    ARRAY['10mg', '18mg', '25mg', '40mg', '60mg', '80mg', '100mg'],
    ARRAY['Decreased appetite', 'Nausea', 'Fatigue', 'Dizziness', 'Dry mouth', 'Insomnia', 'Mood swings']
);


-- ============================================================================
-- ASSESSMENTS
-- ============================================================================

-- PHQ-9 (Patient Health Questionnaire-9)
INSERT INTO assessments (name, description, questions, scoring_rules) VALUES
(
    'PHQ-9',
    'Patient Health Questionnaire-9. A validated self-report screening tool for the severity of depression. Covers the nine DSM-5 criteria for major depressive disorder over the last two weeks.',
    '[
        {
            "number": 1,
            "text": "Little interest or pleasure in doing things",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 2,
            "text": "Feeling down, depressed, or hopeless",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 3,
            "text": "Trouble falling or staying asleep, or sleeping too much",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 4,
            "text": "Feeling tired or having little energy",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 5,
            "text": "Poor appetite or overeating",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 6,
            "text": "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 7,
            "text": "Trouble concentrating on things, such as reading the newspaper or watching television",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 8,
            "text": "Moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 9,
            "text": "Thoughts that you would be better off dead, or of hurting yourself in some way",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        }
    ]'::jsonb,
    '{
        "method": "sum",
        "min_score": 0,
        "max_score": 27,
        "severity_levels": [
            {"min": 0,  "max": 4,  "level": "minimal",            "description": "Minimal depression. Monitor; may not require treatment."},
            {"min": 5,  "max": 9,  "level": "mild",               "description": "Mild depression. Use clinical judgment about treatment based on duration and functional impairment."},
            {"min": 10, "max": 14, "level": "moderate",            "description": "Moderate depression. Consider counseling and/or pharmacotherapy."},
            {"min": 15, "max": 19, "level": "moderately_severe",   "description": "Moderately severe depression. Active treatment with pharmacotherapy and/or psychotherapy."},
            {"min": 20, "max": 27, "level": "severe",              "description": "Severe depression. Immediate initiation of pharmacotherapy and psychotherapy. Consider referral to specialist."}
        ],
        "clinical_notes": "If question 9 is scored 1 or higher, a suicide risk assessment should be conducted regardless of total score.",
        "frequency": "Administer at baseline and at regular intervals (e.g., every 2 weeks) to monitor treatment response."
    }'::jsonb
),

-- GAD-7 (Generalized Anxiety Disorder-7)
(
    'GAD-7',
    'Generalized Anxiety Disorder 7-item scale. A validated self-report screening tool for the severity of generalized anxiety disorder over the last two weeks.',
    '[
        {
            "number": 1,
            "text": "Feeling nervous, anxious, or on edge",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 2,
            "text": "Not being able to stop or control worrying",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 3,
            "text": "Worrying too much about different things",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 4,
            "text": "Trouble relaxing",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 5,
            "text": "Being so restless that it is hard to sit still",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 6,
            "text": "Becoming easily annoyed or irritable",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        },
        {
            "number": 7,
            "text": "Feeling afraid, as if something awful might happen",
            "options": [
                {"value": 0, "label": "Not at all"},
                {"value": 1, "label": "Several days"},
                {"value": 2, "label": "More than half the days"},
                {"value": 3, "label": "Nearly every day"}
            ]
        }
    ]'::jsonb,
    '{
        "method": "sum",
        "min_score": 0,
        "max_score": 21,
        "severity_levels": [
            {"min": 0,  "max": 4,  "level": "minimal",   "description": "Minimal anxiety. Monitor symptoms."},
            {"min": 5,  "max": 9,  "level": "mild",       "description": "Mild anxiety. Monitor; consider watchful waiting and repeat assessment at follow-up."},
            {"min": 10, "max": 14, "level": "moderate",    "description": "Moderate anxiety. Consider counseling and/or pharmacotherapy."},
            {"min": 15, "max": 21, "level": "severe",      "description": "Severe anxiety. Active treatment with pharmacotherapy and/or psychotherapy is indicated."}
        ],
        "clinical_notes": "A score of 10 or greater is a reasonable cut point for identifying cases of GAD. Further assessment is recommended to confirm diagnosis.",
        "frequency": "Administer at baseline and at regular intervals (e.g., every 2-4 weeks) to monitor treatment response."
    }'::jsonb
);

COMMIT;
