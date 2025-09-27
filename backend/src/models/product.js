const { DataTypes, Model } = require('sequelize');

class Product extends Model {
  toJSON() {
    const values = { ...this.get({ plain: true }) };
    values._id = values.id;
    values.currentAssignment = this.currentAssignment || null;
    delete values.id;
    delete values.currentAssignedTo;
    delete values.currentAssignedEmail;
    delete values.currentAssignmentLocation;
    delete values.currentAssignmentDate;
    return values;
  }

  get currentAssignment() {
    const assignedTo = this.getDataValue('currentAssignedTo');
    const assignmentDate = this.getDataValue('currentAssignmentDate');
    if (!assignedTo) {
      return null;
    }

    return {
      assignedTo,
      assignedEmail: this.getDataValue('currentAssignedEmail'),
      location: this.getDataValue('currentAssignmentLocation'),
      assignmentDate,
    };
  }

  set currentAssignment(value) {
    if (!value) {
      this.setDataValue('currentAssignedTo', null);
      this.setDataValue('currentAssignedEmail', null);
      this.setDataValue('currentAssignmentLocation', null);
      this.setDataValue('currentAssignmentDate', null);
      return;
    }

    this.setDataValue('currentAssignedTo', value.assignedTo || null);
    this.setDataValue('currentAssignedEmail', value.assignedEmail || null);
    this.setDataValue('currentAssignmentLocation', value.location || null);
    this.setDataValue('currentAssignmentDate', value.assignmentDate || null);
  }
}

module.exports = (sequelize) => {
  Product.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productModelId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'product_model_id',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('PURCHASED', 'RENTAL'),
        allowNull: false,
      },
      isSerialized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_serialized',
      },
      serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'serial_number',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      partNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'part_number',
      },
      inventoryNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'inventory_number',
      },
      rentalId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'rental_id',
      },
      dispatchGuideId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'dispatch_guide_id',
      },
      status: {
        type: DataTypes.ENUM('AVAILABLE', 'ASSIGNED', 'DECOMMISSIONED'),
        allowNull: false,
        defaultValue: 'AVAILABLE',
      },
      currentAssignedTo: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'current_assigned_to',
      },
      currentAssignedEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'current_assigned_email',
      },
      currentAssignmentLocation: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'current_assignment_location',
      },
      currentAssignmentDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'current_assignment_date',
      },
      decommissionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'decommission_reason',
      },
      decommissionedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'decommissioned_at',
      },
      decommissionedById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'decommissioned_by_id',
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_id',
      },
    },
    {
      sequelize,
      modelName: 'Product',
      tableName: 'products',
      underscored: true,
      indexes: [],
    }
  );

  return Product;
};
