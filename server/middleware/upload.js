const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Allowed MIME types (extended to include ZIP and Office docs)
const allowedMimes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/zip',
  'application/x-zip',
  'application/x-zip-compressed',
  'application/msword',                                                             // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',        // .docx
];

const allowedExts = /\.(pdf|png|jpg|jpeg|zip|doc|docx)$/i;

const fileFilter = (req, file, cb) => {
  const extOk = allowedExts.test(path.extname(file.originalname));
  const mimeOk = allowedMimes.includes(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(
      new Error('File type not allowed. Supported: PDF, PNG, JPG, ZIP, DOC, DOCX'),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
