import mongoose from 'mongoose';

/**
 * AiUsage Schema
 * Tracks daily AI usage count per user atomically.
 * Scoped by calendar date (YYYY-MM-DD) in the user's configured time zone.
 */
const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one usage record per user per day
aiUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema);

export default AiUsage;
