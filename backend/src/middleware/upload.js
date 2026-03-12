'use strict';

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
const EXAMS_UPLOAD_DIR = path.join(__dirname, '../../uploads/exams');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Aceitos: PDF, JPEG, PNG.'), false);
  }
};

const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

const examsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!require('fs').existsSync(EXAMS_UPLOAD_DIR)) {
      require('fs').mkdirSync(EXAMS_UPLOAD_DIR, { recursive: true });
    }
    cb(null, EXAMS_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}-${Date.now()}${ext}`);
  },
});

const uploadExam = multer({
  storage: examsStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file');

const CHAT_UPLOAD_DIR = path.join(__dirname, '../../uploads/chat');

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!require('fs').existsSync(CHAT_UPLOAD_DIR)) {
      require('fs').mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    }
    cb(null, CHAT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}-${Date.now()}${ext}`);
  },
});

const uploadChatFile = multer({
  storage: chatStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file');

module.exports = { uploadDocument, uploadExam, uploadChatFile };
