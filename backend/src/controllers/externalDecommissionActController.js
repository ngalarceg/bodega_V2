const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const ExternalDecommissionAct = require('../models/ExternalDecommissionAct');

exports.createExternalDecommissionAct = async (req, res) => {
  try {
    const { inventoryManager, productName, serialNumber, operationalUnit, recordDate } = req.body;
    const file = req.file;

    if (!inventoryManager || !productName || !operationalUnit || !recordDate) {
      return res.status(400).json({
        message: 'Encargado, producto, unidad operativa y fecha son obligatorios.',
      });
    }

    if (!file) {
      return res
        .status(400)
        .json({ message: 'Debe adjuntar el documento del acta de baja externa.' });
    }

    const parsedRecordDate = new Date(recordDate);
    if (Number.isNaN(parsedRecordDate.getTime())) {
      return res.status(400).json({ message: 'La fecha del acta no es válida.' });
    }

    const act = await ExternalDecommissionAct.create({
      inventoryManager,
      productName,
      serialNumber: serialNumber || '',
      operationalUnit,
      recordDate: parsedRecordDate,
      fileName: file.originalname,
      storedFileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user._id,
    });

    res.status(201).json(act);
  } catch (error) {
    console.error('createExternalDecommissionAct error', error);
    res.status(500).json({ message: 'No se pudo registrar el acta de baja externa.' });
  }
};

exports.listExternalDecommissionActs = async (req, res) => {
  try {
    const acts = await ExternalDecommissionAct.find()
      .populate('uploadedBy', 'name email role')
      .sort({ recordDate: -1, createdAt: -1 });
    res.json(acts);
  } catch (error) {
    console.error('listExternalDecommissionActs error', error);
    res.status(500).json({ message: 'No se pudieron obtener las actas de bajas externas.' });
  }
};

exports.getExternalDecommissionAct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const act = await ExternalDecommissionAct.findById(req.params.id).populate(
      'uploadedBy',
      'name email role'
    );
    if (!act) {
      return res.status(404).json({ message: 'Acta de baja externa no encontrada.' });
    }

    res.json(act);
  } catch (error) {
    console.error('getExternalDecommissionAct error', error);
    res.status(500).json({ message: 'No se pudo obtener el acta de baja externa.' });
  }
};

exports.downloadExternalDecommissionAct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const act = await ExternalDecommissionAct.findById(req.params.id);
    if (!act) {
      return res.status(404).json({ message: 'Acta de baja externa no encontrada.' });
    }

    const normalizedPath = path.normalize(
      path.join(__dirname, '..', '..', 'uploads', act.storedFileName)
    );

    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ message: 'Archivo no encontrado en el servidor.' });
    }

    res.download(normalizedPath, act.fileName);
  } catch (error) {
    console.error('downloadExternalDecommissionAct error', error);
    res.status(500).json({ message: 'No se pudo descargar el acta de baja externa.' });
  }
};
