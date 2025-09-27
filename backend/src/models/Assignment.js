const mongoose = require('mongoose');

const { Schema } = mongoose;

const assignmentSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    action: { type: String, enum: ['ASSIGN', 'UNASSIGN'], required: true },
    assignedTo: { type: String, required: true },
    assignedEmail: { type: String, trim: true },
    location: { type: String, required: true },
    assignmentDate: { type: Date, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

assignmentSchema.index({ product: 1, assignmentDate: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
