const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');

// Store payment proof images on disk under uploads/payment-proofs/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'payment-proofs'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

// Only allow common image types
const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  cb(null, extOk && mimeOk);
};

const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('paymentProof');

module.exports = { uploadPaymentProof };
