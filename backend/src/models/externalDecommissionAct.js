const { DataTypes, Model } = require('sequelize');

class ExternalDecommissionAct extends Model {
  toJSON() {
    const values = { ...this.get({ plain: true }) };
    values._id = values.id;
    delete values.id;
    return values;
  }
}

module.exports = (sequelize) => {
  ExternalDecommissionAct.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      inventoryManager: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'inventory_manager',
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'product_name',
      },
      serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'serial_number',
      },
      operationalUnit: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'operational_unit',
      },
      recordDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'record_date',
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'file_name',
      },
      storedFileName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'stored_file_name',
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'file_size',
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'mime_type',
      },
      uploadedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'uploaded_by_id',
      },
    },
    {
      sequelize,
      modelName: 'ExternalDecommissionAct',
      tableName: 'external_decommission_acts',
      underscored: true,
      indexes: [
        { fields: ['record_date'] },
        { fields: ['inventory_manager', 'product_name'] },
      ],
    }
  );

  return ExternalDecommissionAct;
};
