const mongoose = require('mongoose');

const { Schema } = mongoose;

const productModelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    partNumber: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productModelSchema.index({ name: 1, partNumber: 1 }, { unique: true });

module.exports = mongoose.model('ProductModel', productModelSchema);
