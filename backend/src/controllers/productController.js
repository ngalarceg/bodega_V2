const mongoose = require('mongoose');
const Product = require('../models/Product');
const Assignment = require('../models/Assignment');
const DispatchGuide = require('../models/DispatchGuide');
const ProductModel = require('../models/ProductModel');

const ALLOWED_STATUSES = ['AVAILABLE', 'ASSIGNED', 'DECOMMISSIONED'];

function buildSearchQuery({ type, status, search }) {
  const query = {};

  if (type && ['PURCHASED', 'RENTAL'].includes(type)) {
    query.type = type;
  }

  if (status) {
    const statusValues = status
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => ALLOWED_STATUSES.includes(value));

    if (statusValues.length === 1) {
      query.status = statusValues[0];
    } else if (statusValues.length > 1) {
      query.status = { $in: statusValues };
    }
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [
      { name: regex },
      { serialNumber: regex },
      { partNumber: regex },
      { inventoryNumber: regex },
      { rentalId: regex },
    ];
  }

  return query;
}

exports.createProduct = async (req, res) => {
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
      return res.status(400).json({ message: 'Debes indicar el modelo y el tipo del producto.' });
    }

    const serializedFlag = typeof isSerialized === 'boolean' ? isSerialized : true;
    const sanitizedSerialNumber = typeof serialNumber === 'string' ? serialNumber.trim() : '';

    if (serializedFlag && !sanitizedSerialNumber) {
      return res.status(400).json({ message: 'El número de serie es obligatorio para este producto.' });
    }

    if (!serializedFlag) {
      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res
          .status(400)
          .json({ message: 'Debes indicar la cantidad de unidades para el ingreso sin serie.' });
      }
    }

    if (!mongoose.Types.ObjectId.isValid(productModelId)) {
      return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
    }

    const productModel = await ProductModel.findById(productModelId);
    if (!productModel) {
      return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
    }

    if (!['PURCHASED', 'RENTAL'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de producto inválido.' });
    }

    if (type === 'RENTAL' && !rentalId) {
      return res.status(400).json({ message: 'Los productos de arriendo requieren un ID de arriendo.' });
    }

    if (!dispatchGuideId) {
      return res.status(400).json({ message: 'Debes asociar el producto a una guía de despacho.' });
    }

    if (!mongoose.Types.ObjectId.isValid(dispatchGuideId)) {
      return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
    }

    const dispatchGuide = await DispatchGuide.findById(dispatchGuideId);
    if (!dispatchGuide) {
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const normalizedQuantity = serializedFlag ? 1 : Math.max(1, Math.floor(Number(quantity)));

    if (type === 'PURCHASED' && serializedFlag && !inventoryNumber) {
      // El inventario es opcional, pero avisamos si falta.
      console.warn('Producto de compra sin número de inventario, se almacenará vacío.');
    }

    const productPayload = {
      productModel: productModel._id,
      name: productModel.name,
      description: productModel.description,
      type,
      isSerialized: serializedFlag,
      serialNumber: serializedFlag ? sanitizedSerialNumber : undefined,
      partNumber: productModel.partNumber,
      inventoryNumber:
        type === 'PURCHASED' && serializedFlag ? inventoryNumber?.trim() || null : undefined,
      rentalId: type === 'RENTAL' ? rentalId : undefined,
      dispatchGuide: dispatchGuide._id,
      createdBy: req.user._id,
      quantity: serializedFlag ? 1 : normalizedQuantity,
    };

    if (type === 'PURCHASED' && !serializedFlag) {
      productPayload.inventoryNumber = inventoryNumber ? inventoryNumber.trim() || null : null;
    }

    const product = await Product.create(productPayload);

    const populated = await product.populate('productModel');

    res.status(201).json(populated);
  } catch (error) {
    console.error('createProduct error', error);
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Ya existe un producto con ese número de serie.' });
    }
    res.status(500).json({ message: 'No se pudo crear el producto.' });
  }
};

exports.createProductsBulk = async (req, res) => {
  try {
    const { productModelId, type, serialNumbers, rentalId, dispatchGuideId } = req.body;

    if (!productModelId || !type) {
      return res
        .status(400)
        .json({ message: 'Debes indicar el modelo de producto y el tipo de ingreso.' });
    }

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return res
        .status(400)
        .json({ message: 'Ingresa al menos un número de serie para registrar los productos.' });
    }

    if (!mongoose.Types.ObjectId.isValid(productModelId)) {
      return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
    }

    const sanitizedSerials = serialNumbers
      .map((serial) => (typeof serial === 'string' ? serial.trim() : ''))
      .filter(Boolean);

    if (!sanitizedSerials.length) {
      return res
        .status(400)
        .json({ message: 'Los números de serie ingresados no son válidos.' });
    }

    const duplicatesInPayload = sanitizedSerials.filter(
      (serial, index, self) => self.indexOf(serial) !== index
    );

    if (duplicatesInPayload.length) {
      return res.status(400).json({
        message: `Los siguientes números de serie están repetidos: ${[
          ...new Set(duplicatesInPayload),
        ].join(', ')}.`,
      });
    }

    const productModel = await ProductModel.findById(productModelId);
    if (!productModel) {
      return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
    }

    if (!['PURCHASED', 'RENTAL'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de producto inválido.' });
    }

    if (type === 'RENTAL' && !rentalId) {
      return res
        .status(400)
        .json({ message: 'Los productos de arriendo requieren un ID de arriendo.' });
    }

    if (!dispatchGuideId) {
      return res.status(400).json({ message: 'Debes asociar los productos a una guía de despacho.' });
    }

    if (!mongoose.Types.ObjectId.isValid(dispatchGuideId)) {
      return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
    }

    const dispatchGuide = await DispatchGuide.findById(dispatchGuideId);
    if (!dispatchGuide) {
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const existingProducts = await Product.find(
      { serialNumber: { $in: sanitizedSerials } },
      'serialNumber'
    );

    if (existingProducts.length) {
      const existingSerials = existingProducts.map((product) => product.serialNumber);
      return res.status(409).json({
        message: `Ya existen productos registrados con los números de serie: ${existingSerials.join(', ')}.`,
      });
    }

    const toCreate = sanitizedSerials.map((serialNumber) => ({
      productModel: productModel._id,
      name: productModel.name,
      description: productModel.description,
      type,
      isSerialized: true,
      serialNumber,
      partNumber: productModel.partNumber,
      inventoryNumber: type === 'PURCHASED' ? null : undefined,
      rentalId: type === 'RENTAL' ? rentalId : undefined,
      dispatchGuide: dispatchGuide._id,
      createdBy: req.user._id,
      quantity: 1,
    }));

    const createdProducts = await Product.insertMany(toCreate);
    const populatedProducts = await Product.populate(createdProducts, { path: 'productModel' });

    res.status(201).json({ products: populatedProducts });
  } catch (error) {
    console.error('createProductsBulk error', error);
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Algunos números de serie ya están registrados.' });
    }
    res.status(500).json({ message: 'No se pudieron crear los productos.' });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const query = buildSearchQuery(req.query);
    const products = await Product.find(query)
      .populate('dispatchGuide')
      .populate('productModel')
      .populate('decommissionedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('listProducts error', error);
    res.status(500).json({ message: 'No se pudieron obtener los productos.' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findById(req.params.id)
      .populate('dispatchGuide')
      .populate('productModel')
      .populate('decommissionedBy', 'name email role');
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json(product);
  } catch (error) {
    console.error('getProduct error', error);
    res.status(500).json({ message: 'No se pudo obtener el producto.' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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
      return res.status(400).json({ message: 'No hay campos válidos para actualizar.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    for (const key of updates) {
      if (key === 'dispatchGuideId') {
        const dispatchGuideId = req.body.dispatchGuideId;
        if (!dispatchGuideId) {
          return res.status(400).json({ message: 'Los productos deben permanecer asociados a una guía de despacho.' });
        }
        if (!mongoose.Types.ObjectId.isValid(dispatchGuideId)) {
          return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
        }
        const dispatchGuide = await DispatchGuide.findById(dispatchGuideId);
        if (!dispatchGuide) {
          return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
        }
        product.dispatchGuide = dispatchGuide._id;
      } else if (key === 'productModelId') {
        const productModelId = req.body.productModelId;
        if (!productModelId || !mongoose.Types.ObjectId.isValid(productModelId)) {
          return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
        }
        const productModel = await ProductModel.findById(productModelId);
        if (!productModel) {
          return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
        }
        product.productModel = productModel._id;
        product.name = productModel.name;
        product.partNumber = productModel.partNumber;
        product.description = productModel.description;
      } else if (key === 'serialNumber') {
        if (!product.isSerialized) {
          return res
            .status(400)
            .json({ message: 'Los registros sin serie no pueden editar este campo.' });
        }
        const nextSerial = typeof req.body.serialNumber === 'string' ? req.body.serialNumber.trim() : '';
        if (!nextSerial) {
          return res.status(400).json({ message: 'El número de serie no puede quedar vacío.' });
        }
        product.serialNumber = nextSerial;
      } else if (key === 'quantity') {
        if (product.isSerialized) {
          return res.status(400).json({ message: 'La cantidad solo aplica a productos sin serie.' });
        }
        const parsedQuantity = Number(req.body.quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          return res.status(400).json({ message: 'Ingresa una cantidad válida (mayor o igual a 1).' });
        }
        product.quantity = Math.max(1, Math.floor(parsedQuantity));
      } else {
        product[key] = req.body[key];
      }
    }

    await product.save();

    const populated = await product.populate('productModel');

    res.json(populated);
  } catch (error) {
    console.error('updateProduct error', error);
    res.status(500).json({ message: 'No se pudo actualizar el producto.' });
  }
};

exports.assignProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { assignedTo, assignedEmail, location, assignmentDate, notes } = req.body;

    const sanitizedAssignedTo = typeof assignedTo === 'string' ? assignedTo.trim() : '';
    const sanitizedAssignedEmail = typeof assignedEmail === 'string' ? assignedEmail.trim() : '';
    const sanitizedLocation = typeof location === 'string' ? location.trim() : '';

    if (!sanitizedAssignedTo || !sanitizedAssignedEmail || !sanitizedLocation) {
      return res
        .status(400)
        .json({ message: 'Usuario, correo electrónico y ubicación son obligatorios.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (!product.isSerialized) {
      return res
        .status(400)
        .json({
          message:
            'Este registro corresponde a un ingreso por cantidad y no admite asignaciones individuales.',
        });
    }

    if (product.status === 'DECOMMISSIONED') {
      return res.status(400).json({ message: 'El producto está dado de baja y no puede asignarse.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    if (product.status !== 'AVAILABLE' || product.currentAssignment) {
      return res.status(400).json({
        message: 'Debes liberar el producto antes de asignarlo a otra persona.',
      });
    }

    const assignment = await Assignment.create({
      product: product._id,
      action: 'ASSIGN',
      assignedTo: sanitizedAssignedTo,
      assignedEmail: sanitizedAssignedEmail,
      location: sanitizedLocation,
      assignmentDate: effectiveAssignmentDate,
      performedBy: req.user._id,
      notes,
    });

    await assignment.populate('performedBy', 'name email role');

    product.currentAssignment = {
      assignedTo: sanitizedAssignedTo,
      assignedEmail: sanitizedAssignedEmail,
      location: sanitizedLocation,
      assignmentDate: effectiveAssignmentDate,
    };

    product.status = 'ASSIGNED';
    product.decommissionReason = undefined;
    product.decommissionedAt = undefined;
    product.decommissionedBy = undefined;

    await product.save();

    const updatedProduct = await product.populate([
      { path: 'dispatchGuide' },
      { path: 'productModel' },
    ]);

    res.json({ product: updatedProduct, assignment });
  } catch (error) {
    console.error('assignProduct error', error);
    res.status(500).json({ message: 'No se pudo asignar el producto.' });
  }
};

exports.unassignProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { location, assignmentDate, notes } = req.body;
    const sanitizedLocation = typeof location === 'string' ? location.trim() : '';

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (!product.isSerialized) {
      return res
        .status(400)
        .json({ message: 'Este registro se administra por cantidad y no posee asignaciones activas.' });
    }

    if (product.status === 'DECOMMISSIONED') {
      return res.status(400).json({ message: 'El producto se encuentra dado de baja.' });
    }

    if (!product.currentAssignment) {
      return res.status(400).json({ message: 'El producto no tiene una asignación activa.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    const assignment = await Assignment.create({
      product: product._id,
      action: 'UNASSIGN',
      assignedTo: product.currentAssignment.assignedTo,
      assignedEmail: product.currentAssignment.assignedEmail,
      location: sanitizedLocation || product.currentAssignment.location,
      assignmentDate: effectiveAssignmentDate,
      performedBy: req.user._id,
      notes,
    });

    await assignment.populate('performedBy', 'name email role');

    product.currentAssignment = undefined;
    product.status = 'AVAILABLE';
    await product.save();

    const updatedProduct = await product.populate([
      { path: 'dispatchGuide' },
      { path: 'productModel' },
    ]);

    res.json({ product: updatedProduct, assignment });
  } catch (error) {
    console.error('unassignProduct error', error);
    res.status(500).json({ message: 'No se pudo desasignar el producto.' });
  }
};

exports.decommissionProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Debes indicar el motivo de la baja.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.status === 'DECOMMISSIONED') {
      return res.status(400).json({ message: 'El producto ya se encuentra dado de baja.' });
    }

    if (product.currentAssignment) {
      return res
        .status(400)
        .json({ message: 'Debes liberar la asignación antes de dar de baja el producto.' });
    }

    product.currentAssignment = undefined;
    product.status = 'DECOMMISSIONED';
    product.decommissionReason = reason.trim();
    product.decommissionedAt = new Date();
    product.decommissionedBy = req.user._id;

    await product.save();

    const populated = await product.populate([
      { path: 'dispatchGuide' },
      { path: 'decommissionedBy', select: 'name email role' },
    ]);

    res.json(populated);
  } catch (error) {
    console.error('decommissionProduct error', error);
    res.status(500).json({ message: 'No se pudo dar de baja el producto.' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.currentAssignment || product.status === 'ASSIGNED') {
      return res.status(400).json({ message: 'Debes liberar el producto antes de eliminarlo.' });
    }

    await Assignment.deleteMany({ product: product._id });
    await product.deleteOne();

    res.status(204).send();
  } catch (error) {
    console.error('deleteProduct error', error);
    res.status(500).json({ message: 'No se pudo eliminar el producto.' });
  }
};

exports.getAssignmentHistory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const assignments = await Assignment.find({ product: req.params.id })
      .populate('performedBy', 'name email role')
      .sort({ assignmentDate: -1 });

    res.json(assignments);
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
    segments.push(product?._id?.toString() || 'producto');
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findById(req.params.id)
      .populate('dispatchGuide')
      .populate('productModel');

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const assignments = await Assignment.find({ product: product._id })
      .populate('performedBy', 'name email role')
      .sort({ assignmentDate: -1 });

    const lines = buildHistoryLines(product, assignments);
    const pdfBuffer = generatePdfBufferFromLines(lines);
    const fileName = buildHistoryFileName(product);

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
    const summary = await Product.aggregate([
      {
        $addFields: {
          quantityValue: {
            $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 1],
          },
        },
      },
      {
        $group: {
          _id: {
            productModel: '$productModel',
            name: '$name',
            partNumber: '$partNumber',
          },
          description: { $first: '$description' },
          total: { $sum: '$quantityValue' },
          available: {
            $sum: {
              $cond: [{ $eq: ['$status', 'AVAILABLE'] }, '$quantityValue', 0],
            },
          },
          assigned: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ASSIGNED'] }, '$quantityValue', 0],
            },
          },
          decommissioned: {
            $sum: {
              $cond: [{ $eq: ['$status', 'DECOMMISSIONED'] }, '$quantityValue', 0],
            },
          },
          purchased: {
            $sum: {
              $cond: [{ $eq: ['$type', 'PURCHASED'] }, '$quantityValue', 0],
            },
          },
          rental: {
            $sum: {
              $cond: [{ $eq: ['$type', 'RENTAL'] }, '$quantityValue', 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'productmodels',
          localField: '_id.productModel',
          foreignField: '_id',
          as: 'productModel',
        },
      },
      {
        $unwind: {
          path: '$productModel',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          productModelId: { $ifNull: ['$productModel._id', '$_id.productModel'] },
          name: { $ifNull: ['$productModel.name', '$_id.name'] },
          partNumber: { $ifNull: ['$productModel.partNumber', '$_id.partNumber'] },
          description: { $ifNull: ['$productModel.description', '$description'] },
          totals: {
            total: '$total',
            available: '$available',
            assigned: '$assigned',
            decommissioned: '$decommissioned',
          },
          typeBreakdown: {
            purchased: '$purchased',
            rental: '$rental',
          },
        },
      },
      {
        $sort: { name: 1, partNumber: 1 },
      },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('getStockSummary error', error);
    res.status(500).json({ message: 'No se pudo obtener el resumen de stock.' });
  }
};
