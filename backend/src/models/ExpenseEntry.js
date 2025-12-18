import mongoose from 'mongoose';

const expenseEntrySchema = new mongoose.Schema(
  {
    cardNumber: {
      type: String,
      required: true,
      trim: true,
    },
    cardAssignedTo: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Declined', 'Deactive'],
      default: 'Active',
    },
    particulars: {
      type: String,
      required: true,
      trim: true,
    },
    narration: {
      type: String,
      required: true,
      trim: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
      default: 'USD',
    },
    billStatus: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    xeRate: {
      type: Number,
      required: true,
      default: 83.50,
    },
    amountInINR: {
      type: Number,
      required: true,
    },
    typeOfService: {
      type: String,
      enum: ['Domain', 'Google', 'Google Adwords Expense', 'Hosting', 'Proxy', 'Server', 'Service', 'Tool'],
      required: true,
    },
    businessUnit: {
      type: String,
      enum: ['DWSG', 'Signature', 'Collabx', 'Wytlabs', 'Smegoweb'],
      required: true,
    },
    costCenter: {
      type: String,
      enum: ['Ops', 'FE', 'OH Exps', 'Support', 'Management EXPS'],
      required: true,
    },
    approvedBy: {
      type: String,
      enum: ['Vaibhav', 'Marc', 'Dawood', 'Raghav', 'Tarun', 'Yulia', 'Sarthak', 'Harshit'],
      required: true,
    },
    serviceHandler: {
      type: String,
      required: true,
      trim: true,
    },
    recurring: {
      type: String,
      enum: ['Monthly', 'Yearly', 'One-time'],
      required: true,
    },
    entryStatus: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
    duplicateStatus: {
      type: String,
      enum: ['Unique', 'Merged', null],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvalToken: {
      type: String,
      default: null,
    },
    nextRenewalDate: {
      type: Date,
      default: null,
    },
    renewalNotificationSent: {
      type: Boolean,
      default: false,
    },
    autoCancellationNotificationSent: {
      type: Boolean,
      default: false,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedAllocations: [
      {
        businessUnit: {
          type: String,
          enum: ['DWSG', 'Signature', 'Collabx', 'Wytlabs', 'Smegoweb'],
        },
        amount: {
          type: Number,
          min: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculate amount in INR before saving
expenseEntrySchema.pre('save', function () {
  if (this.isModified('amount') || this.isModified('xeRate')) {
    this.amountInINR = this.amount * this.xeRate;
  }
});

// Index for faster queries
expenseEntrySchema.index({ businessUnit: 1, date: -1 });
expenseEntrySchema.index({ serviceHandler: 1 });
expenseEntrySchema.index({ entryStatus: 1 });
expenseEntrySchema.index({ cardNumber: 1 });

const ExpenseEntry = mongoose.model('ExpenseEntry', expenseEntrySchema);

export default ExpenseEntry;
