const { Op, UniqueConstraintError, ValidationError } = require('sequelize');
const { isUUID } = require('validator');
const { sequelize, Product, Assignment, DispatchGuide, ProductModel, User } = require('../models');

const ALLOWED_STATUSES = ['AVAILABLE', 'ASSIGNED', 'DECOMMISSIONED'];

function getUserId(user) {
  return user?._id || user?.id || null;
}

function buildSearchOptions({ type, status, search }) {
  const where = {};

  if (type && ['PURCHASED', 'RENTAL'].includes(type)) {
    where.type = type;
  }

  if (status) {
    const statusValues = status
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => ALLOWED_STATUSES.includes(value));

    if (statusValues.length === 1) {
      where.status = statusValues[0];
    } else if (statusValues.length > 1) {
      where.status = { [Op.in]: statusValues };
    }
  }

  if (search) {
    const likeValue = `%${search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: likeValue } },
      { serialNumber: { [Op.like]: likeValue } },
      { partNumber: { [Op.like]: likeValue } },
      { inventoryNumber: { [Op.like]: likeValue } },
      { rentalId: { [Op.like]: likeValue } },
    ];
  }

  return { where };
}

function includeForProduct(options = {}) {
  const include = [
    { model: DispatchGuide, as: 'dispatchGuide' },
    { model: ProductModel, as: 'productModel' },
    {
      model: User,
      as: 'decommissionedBy',
      attributes: ['id', 'name', 'email', 'role'],
    },
  ];

  if (options.withAssignments) {
    include.push({
      model: Assignment,
      as: 'assignments',
      include: [{ model: User, as: 'performedBy', attributes: ['id', 'name', 'email', 'role'] }],
    });
  }

  return include;
}

async function findProductOr404(id, res, transaction) {
  if (!isUUID(id)) {
    res.status(400).json({ message: 'Identificador inválido.' });
    return null;
  }

  const product = await Product.findByPk(id, {
    include: includeForProduct(),
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!product) {
    res.status(404).json({ message: 'Producto no encontrado.' });
    return null;
  }

  return product;
}

exports.createProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      productModelId,
      type,
      serialNumber,
      inventoryNumber,
      rentalId,
      dispatchGuideId,
      isSerialized,
      quantity,
    } = req.body;

    if (!productModelId || !type) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Debes indicar el modelo y el tipo del producto.' });
    }

    const serializedFlag = typeof isSerialized === 'boolean' ? isSerialized : true;
    const sanitizedSerialNumber = typeof serialNumber === 'string' ? serialNumber.trim() : '';

    if (serializedFlag && !sanitizedSerialNumber) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'El número de serie es obligatorio para este producto.' });
    }

    if (!serializedFlag) {
      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Debes indicar la cantidad de unidades para el ingreso sin serie.',
        });
      }
    }

    if (!isUUID(productModelId)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
    }

    const productModel = await ProductModel.findByPk(productModelId, { transaction });
    if (!productModel) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
    }

    if (!['PURCHASED', 'RENTAL'].includes(type)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tipo de producto inválido.' });
    }

    if (type === 'RENTAL' && !rentalId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Los productos de arriendo requieren un ID de arriendo.' });
    }

    if (!dispatchGuideId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Debes asociar el producto a una guía de despacho.' });
    }

    if (!isUUID(dispatchGuideId)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
    }

    const dispatchGuide = await DispatchGuide.findByPk(dispatchGuideId, { transaction });
    if (!dispatchGuide) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const normalizedQuantity = serializedFlag ? 1 : Math.max(1, Math.floor(Number(quantity)));

    if (serializedFlag) {
      const existingSerial = await Product.findOne({
        where: { serialNumber: sanitizedSerialNumber },
        transaction,
      });

      if (existingSerial) {
        await transaction.rollback();
        return res
          .status(409)
          .json({ message: 'Ya existe un producto con ese número de serie.' });
      }
    }

    const productPayload = {
      productModelId: productModel.id,
      name: productModel.name,
      description: productModel.description,
      type,
      isSerialized: serializedFlag,
      serialNumber: serializedFlag ? sanitizedSerialNumber : null,
      partNumber: productModel.partNumber,
      inventoryNumber:
        type === 'PURCHASED' ? (inventoryNumber ? inventoryNumber.trim() || null : null) : null,
      rentalId: type === 'RENTAL' ? rentalId : null,
      dispatchGuideId: dispatchGuide.id,
      createdById: getUserId(req.user),
      quantity: serializedFlag ? 1 : normalizedQuantity,
    };

    const product = await Product.create(productPayload, { transaction });

    await transaction.commit();

    const createdProduct = await Product.findByPk(product.id, {
      include: includeForProduct(),
    });

    res.status(201).json(createdProduct.toJSON());
  } catch (error) {
    await transaction.rollback();
    console.error('createProduct error', error);
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ message: 'Ya existe un producto con ese número de serie.' });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: 'Datos inválidos para crear el producto.' });
    }
    res.status(500).json({ message: 'No se pudo crear el producto.' });
  }
};

exports.createProductsBulk = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { productModelId, type, serialNumbers, rentalId, dispatchGuideId } = req.body;

    if (!productModelId || !type) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Debes indicar el modelo de producto y el tipo de ingreso.' });
    }

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Ingresa al menos un número de serie para registrar los productos.',
      });
    }

    if (!isUUID(productModelId)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
    }

    const sanitizedSerials = serialNumbers
      .map((serial) => (typeof serial === 'string' ? serial.trim() : ''))
      .filter(Boolean);

    if (!sanitizedSerials.length) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Los números de serie ingresados no son válidos.' });
    }

    const duplicatesInPayload = sanitizedSerials.filter(
      (serial, index, self) => self.indexOf(serial) !== index
    );

    if (duplicatesInPayload.length) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Los siguientes números de serie están repetidos: ${[
          ...new Set(duplicatesInPayload),
        ].join(', ')}.`,
      });
    }

    const productModel = await ProductModel.findByPk(productModelId, { transaction });
    if (!productModel) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
    }

    if (!['PURCHASED', 'RENTAL'].includes(type)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tipo de producto inválido.' });
    }

    if (type === 'RENTAL' && !rentalId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Los productos de arriendo requieren un ID de arriendo.' });
    }

    if (!dispatchGuideId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Debes asociar los productos a una guía de despacho.' });
    }

    if (!isUUID(dispatchGuideId)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
    }

    const dispatchGuide = await DispatchGuide.findByPk(dispatchGuideId, { transaction });
    if (!dispatchGuide) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const existingProducts = await Product.findAll({
      where: {
        serialNumber: {
          [Op.in]: sanitizedSerials,
        },
      },
      attributes: ['serialNumber'],
      transaction,
    });

    if (existingProducts.length) {
      await transaction.rollback();
      const existingSerials = existingProducts.map((product) => product.serialNumber);
      return res.status(409).json({
        message: `Ya existen productos registrados con los números de serie: ${existingSerials.join(', ')}.`,
      });
    }

    const toCreate = sanitizedSerials.map((serial) => ({
      productModelId: productModel.id,
      name: productModel.name,
      description: productModel.description,
      type,
      isSerialized: true,
      serialNumber: serial,
      partNumber: productModel.partNumber,
      inventoryNumber: type === 'PURCHASED' ? null : null,
      rentalId: type === 'RENTAL' ? rentalId : null,
      dispatchGuideId: dispatchGuide.id,
      createdById: getUserId(req.user),
      quantity: 1,
    }));

    const createdProducts = await Product.bulkCreate(toCreate, {
      returning: true,
      transaction,
    });

    await transaction.commit();

    const populatedProducts = await Product.findAll({
      where: {
        id: {
          [Op.in]: createdProducts.map((product) => product.id),
        },
      },
      include: includeForProduct(),
    });

    res.status(201).json({ products: populatedProducts.map((product) => product.toJSON()) });
  } catch (error) {
    await transaction.rollback();
    console.error('createProductsBulk error', error);
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ message: 'Algunos números de serie ya están registrados.' });
    }
    res.status(500).json({ message: 'No se pudieron crear los productos.' });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const options = buildSearchOptions(req.query);
    const products = await Product.findAll({
      ...options,
      include: includeForProduct(),
      order: [['createdAt', 'DESC']],
    });
    res.json(products.map((product) => product.toJSON()));
  } catch (error) {
    console.error('listProducts error', error);
    res.status(500).json({ message: 'No se pudieron obtener los productos.' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    if (!isUUID(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findByPk(req.params.id, {
      include: includeForProduct(),
    });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json(product.toJSON());
  } catch (error) {
    console.error('getProduct error', error);
    res.status(500).json({ message: 'No se pudo obtener el producto.' });
  }
};

exports.updateProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!isUUID(req.params.id)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const allowedUpdates = [
      'description',
      'serialNumber',
      'inventoryNumber',
      'rentalId',
      'dispatchGuideId',
      'productModelId',
      'quantity',
    ];

    const updates = Object.keys(req.body).filter((key) => allowedUpdates.includes(key));

    if (!updates.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'No hay campos válidos para actualizar.' });
    }

    const product = await Product.findByPk(req.params.id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    for (const key of updates) {
      if (key === 'dispatchGuideId') {
        const nextDispatchGuideId = req.body.dispatchGuideId;
        if (!nextDispatchGuideId) {
          await transaction.rollback();
          return res.status(400).json({
            message: 'Los productos deben permanecer asociados a una guía de despacho.',
          });
        }
        if (!isUUID(nextDispatchGuideId)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
        }
        const dispatchGuide = await DispatchGuide.findByPk(nextDispatchGuideId, { transaction });
        if (!dispatchGuide) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
        }
        product.dispatchGuideId = dispatchGuide.id;
      } else if (key === 'productModelId') {
        const nextProductModelId = req.body.productModelId;
        if (!nextProductModelId || !isUUID(nextProductModelId)) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ message: 'Identificador de modelo de producto inválido.' });
        }
        const productModel = await ProductModel.findByPk(nextProductModelId, { transaction });
        if (!productModel) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
        }
        product.productModelId = productModel.id;
        product.name = productModel.name;
        product.partNumber = productModel.partNumber;
        product.description = productModel.description;
      } else if (key === 'serialNumber') {
        if (!product.isSerialized) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ message: 'Los registros sin serie no pueden editar este campo.' });
        }
        const nextSerial = typeof req.body.serialNumber === 'string' ? req.body.serialNumber.trim() : '';
        if (!nextSerial) {
          await transaction.rollback();
          return res.status(400).json({ message: 'El número de serie no puede quedar vacío.' });
        }
        product.serialNumber = nextSerial;
      } else if (key === 'quantity') {
        if (product.isSerialized) {
          await transaction.rollback();
          return res.status(400).json({ message: 'La cantidad solo aplica a productos sin serie.' });
        }
        const parsedQuantity = Number(req.body.quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Ingresa una cantidad válida (mayor o igual a 1).' });
        }
        product.quantity = Math.max(1, Math.floor(parsedQuantity));
      } else {
        product[key] = req.body[key];
      }
    }

    await product.save({ transaction });
    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: includeForProduct(),
    });

    res.json(updatedProduct.toJSON());
  } catch (error) {
    await transaction.rollback();
    console.error('updateProduct error', error);
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ message: 'Ya existe un producto con ese número de serie.' });
    }
    res.status(500).json({ message: 'No se pudo actualizar el producto.' });
  }
};

exports.assignProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    if (!isUUID(id)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { assignedTo, assignedEmail, location, assignmentDate, notes } = req.body;

    const sanitizedAssignedTo = typeof assignedTo === 'string' ? assignedTo.trim() : '';
    const sanitizedAssignedEmail = typeof assignedEmail === 'string' ? assignedEmail.trim() : '';
    const sanitizedLocation = typeof location === 'string' ? location.trim() : '';

    if (!sanitizedAssignedTo || !sanitizedAssignedEmail || !sanitizedLocation) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Usuario, correo electrónico y ubicación son obligatorios.',
      });
    }

    const product = await Product.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (!product.isSerialized) {
      await transaction.rollback();
      return res.status(400).json({
        message:
          'Este registro corresponde a un ingreso por cantidad y no admite asignaciones individuales.',
      });
    }

    if (product.status === 'DECOMMISSIONED') {
      await transaction.rollback();
      return res.status(400).json({ message: 'El producto está dado de baja y no puede asignarse.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    if (product.status !== 'AVAILABLE' || product.currentAssignment) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Debes liberar el producto antes de asignarlo a otra persona.',
      });
    }

    const assignment = await Assignment.create(
      {
        productId: product.id,
        action: 'ASSIGN',
        assignedTo: sanitizedAssignedTo,
        assignedEmail: sanitizedAssignedEmail,
        location: sanitizedLocation,
        assignmentDate: effectiveAssignmentDate,
        performedById: getUserId(req.user),
        notes,
      },
      { transaction }
    );

    product.currentAssignment = {
      assignedTo: sanitizedAssignedTo,
      assignedEmail: sanitizedAssignedEmail,
      location: sanitizedLocation,
      assignmentDate: effectiveAssignmentDate,
    };
    product.status = 'ASSIGNED';
    product.decommissionReason = null;
    product.decommissionedAt = null;
    product.decommissionedById = null;

    await product.save({ transaction });

    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: includeForProduct(),
    });

    const populatedAssignment = await Assignment.findByPk(assignment.id, {
      include: [{ model: User, as: 'performedBy', attributes: ['id', 'name', 'email', 'role'] }],
    });

    res.json({ product: updatedProduct.toJSON(), assignment: populatedAssignment.toJSON() });
  } catch (error) {
    await transaction.rollback();
    console.error('assignProduct error', error);
    res.status(500).json({ message: 'No se pudo asignar el producto.' });
  }
};

exports.unassignProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    if (!isUUID(id)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { location, assignmentDate, notes } = req.body;
    const sanitizedLocation = typeof location === 'string' ? location.trim() : '';

    const product = await Product.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (!product.isSerialized) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Este registro se administra por cantidad y no posee asignaciones activas.',
      });
    }

    if (product.status === 'DECOMMISSIONED') {
      await transaction.rollback();
      return res.status(400).json({ message: 'El producto se encuentra dado de baja.' });
    }

    if (!product.currentAssignment) {
      await transaction.rollback();
      return res.status(400).json({ message: 'El producto no tiene una asignación activa.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    const assignment = await Assignment.create(
      {
        productId: product.id,
        action: 'UNASSIGN',
        assignedTo: product.currentAssignment.assignedTo,
        assignedEmail: product.currentAssignment.assignedEmail,
        location: sanitizedLocation || product.currentAssignment.location,
        assignmentDate: effectiveAssignmentDate,
        performedById: getUserId(req.user),
        notes,
      },
      { transaction }
    );

    product.currentAssignment = null;
    product.status = 'AVAILABLE';

    await product.save({ transaction });

    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: includeForProduct(),
    });

    const populatedAssignment = await Assignment.findByPk(assignment.id, {
      include: [{ model: User, as: 'performedBy', attributes: ['id', 'name', 'email', 'role'] }],
    });

    res.json({ product: updatedProduct.toJSON(), assignment: populatedAssignment.toJSON() });
  } catch (error) {
    await transaction.rollback();
    console.error('unassignProduct error', error);
    res.status(500).json({ message: 'No se pudo desasignar el producto.' });
  }
};

exports.decommissionProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    if (!isUUID(id)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Debes indicar el motivo de la baja.' });
    }

    const product = await Product.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.status === 'DECOMMISSIONED') {
      await transaction.rollback();
      return res.status(400).json({ message: 'El producto ya se encuentra dado de baja.' });
    }

    if (product.currentAssignment) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: 'Debes liberar la asignación antes de dar de baja el producto.' });
    }

    product.currentAssignment = null;
    product.status = 'DECOMMISSIONED';
    product.decommissionReason = reason.trim();
    product.decommissionedAt = new Date();
    product.decommissionedById = getUserId(req.user);

    await product.save({ transaction });

    await transaction.commit();

    const populated = await Product.findByPk(product.id, {
      include: includeForProduct(),
    });

    res.json(populated.toJSON());
  } catch (error) {
    await transaction.rollback();
    console.error('decommissionProduct error', error);
    res.status(500).json({ message: 'No se pudo dar de baja el producto.' });
  }
};

exports.deleteProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!isUUID(req.params.id)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findByPk(req.params.id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.currentAssignment || product.status === 'ASSIGNED') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Debes liberar el producto antes de eliminarlo.' });
    }

    await Assignment.destroy({ where: { productId: product.id }, transaction });
    await product.destroy({ transaction });

    await transaction.commit();

    res.status(204).send();
  } catch (error) {
    await transaction.rollback();
    console.error('deleteProduct error', error);
    res.status(500).json({ message: 'No se pudo eliminar el producto.' });
  }
};

exports.getAssignmentHistory = async (req, res) => {
  try {
    if (!isUUID(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const assignments = await Assignment.findAll({
      where: { productId: req.params.id },
      include: [{ model: User, as: 'performedBy', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['assignmentDate', 'DESC']],
    });

    res.json(assignments.map((assignment) => assignment.toJSON()));
  } catch (error) {
    console.error('getAssignmentHistory error', error);
    res.status(500).json({ message: 'No se pudo obtener el historial de asignaciones.' });
  }
};

function formatAssignmentDate(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleString('es-CL');
  }
}

function buildHistoryFileName(product) {
  const segments = [];

  if (product?.name) {
    segments.push(product.name);
  }

  if (product?.isSerialized && product?.serialNumber) {
    segments.push(product.serialNumber);
  }

  if (!segments.length) {
    segments.push(product?._id || product?.id || 'producto');
  }

  const rawName = segments.join('-');

  return `historial-${rawName}`.replace(/[^a-zA-Z0-9-_]+/g, '_').concat('.pdf');
}

function escapePdfText(input) {
  return String(input || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text, maxLength) {
  const normalized = String(text || '').trim();

  if (!normalized) {
    return ['—'];
  }

  if (!maxLength || maxLength < 20) {
    return [normalized];
  }

  const words = normalized.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!word) {
      continue;
    }

    if (!current) {
      current = word;
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length > maxLength) {
      lines.push(current);
      if (word.length > maxLength) {
        lines.push(word);
        current = '';
      } else {
        current = word;
      }
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  if (!lines.length) {
    lines.push(normalized);
  }

  return lines;
}

function addDetailLine(lines, label, value, indent = '  ') {
  const prefix = `${label}`;
  const availableLength = 90 - indent.length - prefix.length;
  const segments = wrapText(value, availableLength);

  segments.forEach((segment, index) => {
    if (index === 0) {
      lines.push(`${indent}${prefix}${segment}`);
    } else {
      lines.push(`${indent}${segment}`);
    }
  });
}

function buildHistoryLines(product, assignments) {
  const lines = ['Historial de asignaciones', ''];

  lines.push(`Producto: ${product.name || '—'}`);
  lines.push(`Modelo: ${product.productModel?.name || '—'}`);
  const serialLine = product.isSerialized
    ? product.serialNumber || '—'
    : '— (registro por cantidad)';
  lines.push(`Número de serie: ${serialLine}`);
  lines.push(`Cantidad registrada: ${product.quantity || 1}`);
  lines.push(`Número de inventario: ${product.inventoryNumber || '—'}`);
  lines.push(`Tipo: ${product.type === 'RENTAL' ? 'Arriendo' : 'Compra'}`);
  if (product.rentalId) {
    lines.push(`ID de arriendo: ${product.rentalId}`);
  }
  lines.push('');

  if (!assignments.length) {
    lines.push('No hay movimientos registrados.');
    return lines;
  }

  assignments.forEach((item, index) => {
    const actionLabel = item.action === 'ASSIGN' ? 'Asignación' : 'Liberación';
    lines.push(`${index + 1}. ${actionLabel}`);
    addDetailLine(lines, 'Usuario asignado: ', item.assignedTo);
    addDetailLine(lines, 'Correo electrónico: ', item.assignedEmail || '—');
    addDetailLine(lines, 'Ubicación: ', item.location);
    addDetailLine(lines, 'Fecha: ', formatAssignmentDate(item.assignmentDate));
    const performedName = item.performedBy?.name || '—';
    const performedEmail = item.performedBy?.email ? ` (${item.performedBy.email})` : '';
    addDetailLine(lines, 'Registrado por: ', `${performedName}${performedEmail}`.trim());
    addDetailLine(lines, 'Notas: ', item.notes || '—');
    lines.push('');
  });

  return lines;
}

function generatePdfBufferFromLines(lines) {
  const sanitizedLines = Array.isArray(lines) && lines.length ? lines : ['Historial'];
  const [title, ...content] = sanitizedLines;
  const startX = 50;
  let currentY = 800;
  const commands = ['BT', '/F1 16 Tf', `1 0 0 1 ${startX} ${currentY} Tm`, `(${escapePdfText(title)}) Tj`, '/F1 12 Tf'];

  currentY -= 24;

  content.forEach((line) => {
    if (!line) {
      currentY -= 16;
      return;
    }

    commands.push(`1 0 0 1 ${startX} ${currentY} Tm`);
    commands.push(`(${escapePdfText(line)}) Tj`);
    currentY -= 16;
  });

  commands.push('ET');

  const textContent = commands.join('\n');
  const textLength = Buffer.byteLength(textContent, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${textLength} >>\nstream\n${textContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  let currentOffset = Buffer.byteLength(pdf, 'utf8');

  objects.forEach((object) => {
    offsets.push(currentOffset);
    pdf += object;
    currentOffset += Buffer.byteLength(object, 'utf8');
  });

  const xrefStart = currentOffset;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    const offset = offsets[index].toString().padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

exports.downloadAssignmentHistoryPdf = async (req, res) => {
  try {
    if (!isUUID(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findByPk(req.params.id, {
      include: includeForProduct(),
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const assignments = await Assignment.findAll({
      where: { productId: product.id },
      include: [{ model: User, as: 'performedBy', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['assignmentDate', 'DESC']],
    });

    const lines = buildHistoryLines(product.toJSON(), assignments.map((assignment) => assignment.toJSON()));
    const pdfBuffer = generatePdfBufferFromLines(lines);
    const fileName = buildHistoryFileName(product.toJSON());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('downloadAssignmentHistoryPdf error', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'No se pudo generar el historial en PDF.' });
    } else {
      res.end();
    }
  }
};

exports.getStockSummary = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: ProductModel, as: 'productModel' }],
    });

    const summaryMap = new Map();

    products.forEach((productInstance) => {
      const product = productInstance.toJSON();
      const quantityValue = product.quantity && product.quantity > 0 ? product.quantity : 1;
      const modelId = product.productModel?._id || product.productModelId;
      const key = modelId || `${product.name}|${product.partNumber}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          productModelId: modelId || null,
          name: product.productModel?.name || product.name,
          partNumber: product.productModel?.partNumber || product.partNumber,
          description: product.productModel?.description || product.description,
          totals: {
            total: 0,
            available: 0,
            assigned: 0,
            decommissioned: 0,
          },
          typeBreakdown: {
            purchased: 0,
            rental: 0,
          },
        });
      }

      const entry = summaryMap.get(key);
      entry.totals.total += quantityValue;
      if (product.status === 'AVAILABLE') {
        entry.totals.available += quantityValue;
      } else if (product.status === 'ASSIGNED') {
        entry.totals.assigned += quantityValue;
      } else if (product.status === 'DECOMMISSIONED') {
        entry.totals.decommissioned += quantityValue;
      }

      if (product.type === 'PURCHASED') {
        entry.typeBreakdown.purchased += quantityValue;
      } else if (product.type === 'RENTAL') {
        entry.typeBreakdown.rental += quantityValue;
      }
    });

    const summary = Array.from(summaryMap.values()).sort((a, b) => {
      if (a.name && b.name) {
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) {
          return nameComparison;
        }
      }
      if (a.partNumber && b.partNumber) {
        return a.partNumber.localeCompare(b.partNumber);
      }
      return 0;
    });

    res.json(summary);
  } catch (error) {
    console.error('getStockSummary error', error);
    res.status(500).json({ message: 'No se pudo obtener el resumen de stock.' });
  }
};
