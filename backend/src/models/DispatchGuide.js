const mongoose = require('mongoose');

const { Schema } = mongoose;

const dispatchGuideSchema = new Schema(
  {
    guideNumber: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    dispatchDate: { type: Date, required: true },
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

dispatchGuideSchema.index({ guideNumber: 1 }, { unique: true });

module.exports = mongoose.model('DispatchGuide', dispatchGuideSchema);
