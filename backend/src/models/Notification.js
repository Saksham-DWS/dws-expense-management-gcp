import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'renewal_reminder',
        'entry_approval',
        'entry_approved',
        'entry_rejected',
        'service_cancellation',
        'service_continued',
        'service_disable_request',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseEntry',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
