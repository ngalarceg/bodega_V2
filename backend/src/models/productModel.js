const { DataTypes, Model } = require('sequelize');

class ProductModel extends Model {
  toJSON() {
    const values = { ...this.get({ plain: true }) };
    values._id = values.id;
    delete values.id;
    return values;
  }
}

module.exports = (sequelize) => {
  ProductModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      partNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_id',
      },
    },
    {
      sequelize,
      modelName: 'ProductModel',
      tableName: 'product_models',
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['name', 'part_number'],
        },
      ],
    }
  );

  return ProductModel;
};
