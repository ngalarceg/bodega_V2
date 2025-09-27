const { DataTypes, Model } = require('sequelize');

class User extends Model {
  toJSON() {
    const values = { ...this.get({ plain: true }) };
    values._id = values.id;
    delete values.id;
    delete values.passwordHash;
    return values;
  }
}

module.exports = (sequelize) => {
  User.init(
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(value) {
          if (typeof value === 'string') {
            this.setDataValue('email', value.trim().toLowerCase());
          } else {
            this.setDataValue('email', value);
          }
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('ADMIN', 'MANAGER', 'VIEWER'),
        allowNull: false,
        defaultValue: 'VIEWER',
      },
      adAccount: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
    }
  );

  return User;
};
