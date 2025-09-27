const mongoose = require('mongoose');

const { Schema } = mongoose;

const externalDecommissionActSchema = new Schema(
  {
    inventoryManager: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    serialNumber: { type: String, trim: true },
    operationalUnit: { type: String, required: true, trim: true },
    recordDate: { type: Date, required: true },
    fileName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

externalDecommissionActSchema.index({ recordDate: -1 });
externalDecommissionActSchema.index({ inventoryManager: 1, productName: 1 });

module.exports = mongoose.model('ExternalDecommissionAct', externalDecommissionActSchema);
