const sequelize = require('../database');

const defineUser = require('./user');
const defineProductModel = require('./productModel');
const defineDispatchGuide = require('./dispatchGuide');
const defineProduct = require('./product');
const defineAssignment = require('./assignment');
const defineExternalDecommissionAct = require('./externalDecommissionAct');

const User = defineUser(sequelize);
const ProductModel = defineProductModel(sequelize);
const DispatchGuide = defineDispatchGuide(sequelize);
const Product = defineProduct(sequelize);
const Assignment = defineAssignment(sequelize);
const ExternalDecommissionAct = defineExternalDecommissionAct(sequelize);

ProductModel.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
User.hasMany(ProductModel, { as: 'productModels', foreignKey: 'createdById' });

DispatchGuide.belongsTo(User, { as: 'uploadedBy', foreignKey: 'uploadedById' });
User.hasMany(DispatchGuide, { as: 'dispatchGuides', foreignKey: 'uploadedById' });

ExternalDecommissionAct.belongsTo(User, { as: 'uploadedBy', foreignKey: 'uploadedById' });
User.hasMany(ExternalDecommissionAct, { as: 'externalDecommissionActs', foreignKey: 'uploadedById' });

Product.belongsTo(ProductModel, { as: 'productModel', foreignKey: 'productModelId' });
ProductModel.hasMany(Product, { as: 'products', foreignKey: 'productModelId' });

Product.belongsTo(DispatchGuide, { as: 'dispatchGuide', foreignKey: 'dispatchGuideId' });
DispatchGuide.hasMany(Product, { as: 'products', foreignKey: 'dispatchGuideId' });

Product.belongsTo(User, { as: 'decommissionedBy', foreignKey: 'decommissionedById' });
User.hasMany(Product, { as: 'decommissionedProducts', foreignKey: 'decommissionedById' });

Product.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
User.hasMany(Product, { as: 'createdProducts', foreignKey: 'createdById' });

Assignment.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
Product.hasMany(Assignment, { as: 'assignments', foreignKey: 'productId' });

Assignment.belongsTo(User, { as: 'performedBy', foreignKey: 'performedById' });
User.hasMany(Assignment, { as: 'performedAssignments', foreignKey: 'performedById' });

module.exports = {
  sequelize,
  User,
  ProductModel,
  DispatchGuide,
  Product,
  Assignment,
  ExternalDecommissionAct,
};
