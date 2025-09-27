const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const dispatchGuideController = require('../controllers/dispatchGuideController');

const uploadPath = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  upload.single('guideFile'),
  dispatchGuideController.createDispatchGuide
);

router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  dispatchGuideController.listDispatchGuides
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  dispatchGuideController.getDispatchGuide
);

router.get(
  '/:id/download',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  dispatchGuideController.downloadDispatchGuide
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  dispatchGuideController.deleteDispatchGuide
);

module.exports = router;
