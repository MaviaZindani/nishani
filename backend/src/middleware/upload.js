const multer = require('multer');
const path = require('path');
const fs = require('fs');

// All uploaded images/videos land in backend/uploads and are served
// statically at /uploads (see src/index.js).
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const ALLOWED = /\.(jpe?g|png|webp|gif|avif|mp4|webm|ogg|mov)$/i;

function fileFilter(req, file, cb) {
  if (ALLOWED.test(path.extname(file.originalname))) cb(null, true);
  else cb(new Error('Unsupported file type — use an image or video'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 40 * 1024 * 1024 }, // 40 MB (covers short offer videos)
});

// Public URL stored in the database for an uploaded file.
const fileUrl = (file) => `/uploads/${file.filename}`;

module.exports = { upload, uploadDir, fileUrl };
