const { DataTypes, Model } = require('sequelize');

class DispatchGuide extends Model {
  toJSON() {
    const values = { ...this.get({ plain: true }) };
    values._id = values.id;
    delete values.id;
    return values;
  }
}

module.exports = (sequelize) => {
  DispatchGuide.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      guideNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      vendor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dispatchDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      storedFileName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      uploadedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'uploaded_by_id',
      },
    },
    {
      sequelize,
      modelName: 'DispatchGuide',
      tableName: 'dispatch_guides',
      underscored: true,
    }
  );

  return DispatchGuide;
};
