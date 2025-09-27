const express = require('express');
const productModelController = require('../controllers/productModelController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, productModelController.listProductModels);

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productModelController.createProductModel
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productModelController.deleteProductModel
);

module.exports = router;
