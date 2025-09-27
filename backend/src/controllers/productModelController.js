const { ValidationError } = require('sequelize');
const { isUUID } = require('validator');
const { ProductModel, Product } = require('../models');

exports.createProductModel = async (req, res) => {
  try {
    const { name, description, partNumber } = req.body;

    if (!name || !partNumber) {
      return res.status(400).json({ message: 'Nombre y número de parte son obligatorios.' });
    }

    const normalizedPartNumber = partNumber.trim();
    const existing = await ProductModel.findOne({
      where: { partNumber: normalizedPartNumber },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'Ya existe un modelo de producto con ese número de parte.' });
    }

    const productModel = await ProductModel.create({
      name: name.trim(),
      description: description ? description.trim() : undefined,
      partNumber: normalizedPartNumber,
      createdById: req.user?._id || req.user?.id || null,
    });

    res.status(201).json(productModel.toJSON());
  } catch (error) {
    console.error('createProductModel error', error);
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: 'Datos inválidos para crear el modelo de producto.' });
    }
    res.status(500).json({ message: 'No se pudo crear el modelo de producto.' });
  }
};

exports.listProductModels = async (req, res) => {
  try {
    const models = await ProductModel.findAll({
      order: [
        ['name', 'ASC'],
        ['partNumber', 'ASC'],
      ],
    });
    res.json(models.map((model) => model.toJSON()));
  } catch (error) {
    console.error('listProductModels error', error);
    res.status(500).json({ message: 'No se pudieron obtener los modelos de producto.' });
  }
};

exports.deleteProductModel = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ message: 'Identificador de modelo inválido.' });
    }

    const productModel = await ProductModel.findByPk(id);
    if (!productModel) {
      return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
    }

    const relatedProducts = await Product.count({ where: { productModelId: id } });
    if (relatedProducts > 0) {
      return res.status(400).json({
        message:
          'No se puede eliminar el modelo porque existen productos registrados que lo utilizan.',
      });
    }

    await productModel.destroy();

    res.json({ message: 'Modelo eliminado correctamente.' });
  } catch (error) {
    console.error('deleteProductModel error', error);
    res.status(500).json({ message: 'No se pudo eliminar el modelo de producto.' });
  }
};
