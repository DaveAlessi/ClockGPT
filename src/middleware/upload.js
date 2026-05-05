const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { IMAGE_MIME_TYPES, IMAGE_EXTENSIONS } = require('../lib/constants');

function createUploadMiddleware(uploadDir, uploadMaxBytes) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: uploadMaxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!IMAGE_MIME_TYPES.has(file.mimetype) || !IMAGE_EXTENSIONS.has(ext)) {
        return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
      }
      return cb(null, true);
    }
  });

  function uploadProfilePicture(req, res, next) {
    upload.single('profilePicture')(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File size must be less than ${Math.floor(uploadMaxBytes / (1024 * 1024))}MB` });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    });
  }

  return { uploadProfilePicture };
}

module.exports = { createUploadMiddleware };
