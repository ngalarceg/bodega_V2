const { DataTypes, Model } = require('sequelize');

class Assignment extends Model {
  toJSON() {
    const values = { ...this.get({ plain: true }) };
    values._id = values.id;
    delete values.id;
    return values;
  }
}

module.exports = (sequelize) => {
  Assignment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'product_id',
      },
      action: {
        type: DataTypes.ENUM('ASSIGN', 'UNASSIGN'),
        allowNull: false,
      },
      assignedTo: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'assigned_to',
      },
      assignedEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'assigned_email',
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      assignmentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'assignment_date',
      },
      performedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'performed_by_id',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Assignment',
      tableName: 'assignments',
      underscored: true,
      indexes: [
        {
          fields: ['product_id', 'assignment_date'],
        },
      ],
    }
  );

  return Assignment;
};
