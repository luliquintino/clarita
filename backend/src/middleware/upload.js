'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Em produção com Cloudinary configurado, usa nuvem; caso contrário, disco local
const isProduction =
  process.env.NODE_ENV === 'production' && !!process.env.CLOUDINARY_CLOUD_NAME;

// Configurar Cloudinary apenas se estiver em produção
// Nota: multer-storage-cloudinary@4.0.0 lista apenas cloudinary como peer dep (não multer),
// portanto é compatível com multer@2.x — testado e funcional.
let cloudinary = null;
let CloudinaryStorage = null;

if (isProduction) {
  cloudinary = require('cloudinary').v2;
  CloudinaryStorage = require('multer-storage-cloudinary').CloudinaryStorage;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Aceitos: PDF, JPEG, PNG.'), false);
  }
};

function makeUpload(folder) {
  let storage;

  if (isProduction) {
    storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: `clarita/${folder}`,
        allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
      },
    });
  } else {
    storage = multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(__dirname, `../../uploads/${folder}`);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
      },
    });
  }

  return multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single('file');
}

const uploadDocument = makeUpload('documents');
const uploadExam = makeUpload('exams');
const uploadChatFile = makeUpload('chat');

module.exports = { uploadDocument, uploadExam, uploadChatFile };
