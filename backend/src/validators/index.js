'use strict';

const { body, param, query: queryValidator } = require('express-validator');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const isUUID = (field) =>
  param(field).isUUID(4).withMessage(`${field} deve ser um UUID válido`);

const optionalDateRange = [
  queryValidator('start_date')
    .optional()
    .isISO8601()
    .withMessage('start_date deve ser uma data ISO 8601 válida'),
  queryValidator('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date deve ser uma data ISO 8601 válida'),
];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const registrationValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Um email válido é obrigatório'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter pelo menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('A senha deve conter pelo menos uma letra maiúscula')
    .matches(/[0-9]/)
    .withMessage('A senha deve conter pelo menos um número'),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Nome máximo de 100 caracteres'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Sobrenome é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Sobrenome máximo de 100 caracteres'),
  body('role')
    .isIn(['patient', 'psychologist', 'psychiatrist'])
    .withMessage('Papel deve ser patient, psychologist ou psychiatrist'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Telefone máximo de 30 caracteres'),
  // Professional-specific fields (optional at registration level; route can enforce)
  body('license_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Número de registro máximo de 100 caracteres'),
  body('specialization')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('institution')
    .optional()
    .trim()
    .isLength({ max: 300 }),
];

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Um email válido é obrigatório'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Um email válido é obrigatório'),
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('O token é obrigatório'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter pelo menos 8 caracteres'),
];

// ---------------------------------------------------------------------------
// Emotional logs
// ---------------------------------------------------------------------------

const emotionalLogValidator = [
  body('mood_score')
    .isInt({ min: 1, max: 10 })
    .withMessage('mood_score deve ser de 1 a 10'),
  body('anxiety_score')
    .isInt({ min: 1, max: 10 })
    .withMessage('anxiety_score deve ser de 1 a 10'),
  body('energy_score')
    .isInt({ min: 1, max: 10 })
    .withMessage('energy_score deve ser de 1 a 10'),
  body('sleep_quality')
    .optional()
    .isIn(['very_poor', 'poor', 'fair', 'good', 'excellent'])
    .withMessage('sleep_quality deve ser very_poor, poor, fair, good ou excellent'),
  body('sleep_hours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('sleep_hours deve ser de 0 a 24'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Notas máximo de 5000 caracteres'),
  body('logged_at')
    .optional()
    .isISO8601()
    .withMessage('logged_at deve ser um timestamp ISO 8601 válido'),
];

// ---------------------------------------------------------------------------
// Symptom report
// ---------------------------------------------------------------------------

const symptomReportValidator = [
  body('symptom_id')
    .isUUID(4)
    .withMessage('symptom_id deve ser um UUID válido'),
  body('severity')
    .isInt({ min: 1, max: 10 })
    .withMessage('severity deve ser de 1 a 10'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('reported_at')
    .optional()
    .isISO8601()
    .withMessage('reported_at deve ser um timestamp ISO 8601 válido'),
];

// ---------------------------------------------------------------------------
// Medication (prescription)
// ---------------------------------------------------------------------------

const medicationValidator = [
  body('patient_id')
    .isUUID(4)
    .withMessage('patient_id deve ser um UUID válido'),
  body('medication_id')
    .isUUID(4)
    .withMessage('medication_id deve ser um UUID válido'),
  body('dosage')
    .trim()
    .notEmpty()
    .withMessage('Dosagem é obrigatória')
    .isLength({ max: 100 }),
  body('frequency')
    .trim()
    .notEmpty()
    .withMessage('Frequência é obrigatória')
    .isLength({ max: 100 }),
  body('start_date')
    .isISO8601()
    .withMessage('start_date deve ser uma data válida'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date deve ser uma data válida'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
];

// ---------------------------------------------------------------------------
// Assessment result
// ---------------------------------------------------------------------------

const assessmentResultValidator = [
  body('assessment_id')
    .isUUID(4)
    .withMessage('assessment_id deve ser um UUID válido'),
  body('answers')
    .isObject()
    .withMessage('answers deve ser um objeto JSON'),
];

// ---------------------------------------------------------------------------
// Life event
// ---------------------------------------------------------------------------

const lifeEventValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório')
    .isLength({ max: 300 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('category')
    .isIn(['relationship', 'work', 'health', 'family', 'financial', 'loss', 'achievement', 'other'])
    .withMessage('Categoria inválida'),
  body('impact_level')
    .isInt({ min: 1, max: 10 })
    .withMessage('impact_level deve ser de 1 a 10'),
  body('event_date')
    .isISO8601()
    .withMessage('event_date deve ser uma data válida'),
];

// ---------------------------------------------------------------------------
// Clinical note
// ---------------------------------------------------------------------------

const clinicalNoteValidator = [
  body('patient_id')
    .isUUID(4)
    .withMessage('patient_id deve ser um UUID válido'),
  body('session_date')
    .isISO8601()
    .withMessage('session_date deve ser uma data válida'),
  body('note_type')
    .isIn(['session', 'observation', 'treatment_plan', 'progress'])
    .withMessage('note_type deve ser session, observation, treatment_plan ou progress'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Conteúdo é obrigatório')
    .isLength({ max: 50000 }),
  body('is_private')
    .optional()
    .isBoolean()
    .withMessage('is_private deve ser um booleano'),
];

// ---------------------------------------------------------------------------
// Validation result handler middleware
// ---------------------------------------------------------------------------

const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Erro de validação',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = {
  registrationValidator,
  loginValidator,
  forgotPasswordValidation,
  resetPasswordValidation,
  emotionalLogValidator,
  symptomReportValidator,
  medicationValidator,
  assessmentResultValidator,
  lifeEventValidator,
  clinicalNoteValidator,
  handleValidation,
  isUUID,
  optionalDateRange,
};
