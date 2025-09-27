const path = require('path');
const fs = require('fs');
const { isUUID } = require('validator');
const { ExternalDecommissionAct, User } = require('../models');

function getUserId(user) {
  return user?._id || user?.id || null;
}

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
      uploadedById: getUserId(req.user),
    });

    res.status(201).json(act.toJSON());
  } catch (error) {
    console.error('createExternalDecommissionAct error', error);
    res.status(500).json({ message: 'No se pudo registrar el acta de baja externa.' });
  }
};

exports.listExternalDecommissionActs = async (req, res) => {
  try {
    const acts = await ExternalDecommissionAct.findAll({
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'name', 'email', 'role'] }],
      order: [
        ['recordDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
    res.json(acts.map((act) => act.toJSON()));
  } catch (error) {
    console.error('listExternalDecommissionActs error', error);
    res.status(500).json({ message: 'No se pudieron obtener las actas de bajas externas.' });
  }
};

exports.getExternalDecommissionAct = async (req, res) => {
  try {
    if (!isUUID(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const act = await ExternalDecommissionAct.findByPk(req.params.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'name', 'email', 'role'] }],
    });
    if (!act) {
      return res.status(404).json({ message: 'Acta de baja externa no encontrada.' });
    }

    res.json(act.toJSON());
  } catch (error) {
    console.error('getExternalDecommissionAct error', error);
    res.status(500).json({ message: 'No se pudo obtener el acta de baja externa.' });
  }
};

exports.downloadExternalDecommissionAct = async (req, res) => {
  try {
    if (!isUUID(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const act = await ExternalDecommissionAct.findByPk(req.params.id);
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
