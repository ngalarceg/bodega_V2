const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const DispatchGuide = require('../models/DispatchGuide');
const Product = require('../models/Product');

exports.createDispatchGuide = async (req, res) => {
  try {
    const { guideNumber, vendor, dispatchDate } = req.body;
    const file = req.file;

    if (!guideNumber || !vendor || !dispatchDate) {
      return res.status(400).json({ message: 'Número de guía, proveedor y fecha son obligatorios.' });
    }

    if (!file) {
      return res.status(400).json({ message: 'Debe adjuntar el archivo de la guía de despacho.' });
    }

    const exists = await DispatchGuide.findOne({ guideNumber });
    if (exists) {
      return res.status(409).json({ message: 'Ya existe una guía de despacho con ese número.' });
    }

    const guide = await DispatchGuide.create({
      guideNumber,
      vendor,
      dispatchDate: new Date(dispatchDate),
      fileName: file.originalname,
      storedFileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user._id,
    });

    res.status(201).json(guide);
  } catch (error) {
    console.error('createDispatchGuide error', error);
    res.status(500).json({ message: 'No se pudo crear la guía de despacho.' });
  }
};

exports.listDispatchGuides = async (req, res) => {
  try {
    const guides = await DispatchGuide.find()
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(guides);
  } catch (error) {
    console.error('listDispatchGuides error', error);
    res.status(500).json({ message: 'No se pudieron obtener las guías de despacho.' });
  }
};

exports.getDispatchGuide = async (req, res) => {
  try {
    const guide = await DispatchGuide.findById(req.params.id).populate('uploadedBy', 'name email role');
    if (!guide) {
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    res.json(guide);
  } catch (error) {
    console.error('getDispatchGuide error', error);
    res.status(500).json({ message: 'No se pudo obtener la guía de despacho.' });
  }
};

exports.downloadDispatchGuide = async (req, res) => {
  try {
    const guide = await DispatchGuide.findById(req.params.id);
    if (!guide) {
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const normalizedPath = path.normalize(
      path.join(__dirname, '..', '..', 'uploads', guide.storedFileName)
    );

    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ message: 'Archivo no encontrado en el servidor.' });
    }

    res.download(normalizedPath, guide.fileName);
  } catch (error) {
    console.error('downloadDispatchGuide error', error);
    res.status(500).json({ message: 'No se pudo descargar la guía de despacho.' });
  }
};

exports.deleteDispatchGuide = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const guide = await DispatchGuide.findById(req.params.id);
    if (!guide) {
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const associatedProducts = await Product.countDocuments({ dispatchGuide: guide._id });
    if (associatedProducts > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la guía porque está asociada a productos registrados.',
      });
    }

    const normalizedPath = path.normalize(
      path.join(__dirname, '..', '..', 'uploads', guide.storedFileName)
    );

    if (fs.existsSync(normalizedPath)) {
      try {
        await fs.promises.unlink(normalizedPath);
      } catch (fileError) {
        console.warn('No se pudo eliminar el archivo de la guía de despacho', fileError);
      }
    }

    await guide.deleteOne();

    res.status(204).send();
  } catch (error) {
    console.error('deleteDispatchGuide error', error);
    res.status(500).json({ message: 'No se pudo eliminar la guía de despacho.' });
  }
};
