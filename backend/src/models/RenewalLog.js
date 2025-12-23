import mongoose from 'mongoose';

const renewalLogSchema = new mongoose.Schema(
  {
    expenseEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseEntry',
      required: true,
    },
    serviceHandler: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['Continue', 'Cancel', 'DisableByMIS', 'SharedEdit'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    renewalDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const RenewalLog = mongoose.model('RenewalLog', renewalLogSchema);

export default RenewalLog;
