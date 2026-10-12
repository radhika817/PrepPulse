import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required'],
      index: true,
    },
    mode: {
      type: String,
      required: [true, 'Mode is required'],
      enum: ['daily', 'practice', 'study', 'revision'],
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyChallenge',
      default: null,
    },
    selectedOption: {
      type: String,
      default: null, // MCQ only
    },
    isCorrect: {
      type: Boolean,
      default: null, // MCQ only, computed by server
    },
    selfRating: {
      type: String,
      enum: ['knew', 'partly', 'missed', null],
      default: null, // Required for non-MCQ
    },
    revealedFirst: {
      type: Boolean,
      default: false, // True if answer was revealed before attempting
    },
    timeSpentSec: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // SYSTEM_DESIGN.md uses createdAt
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes matching SYSTEM_DESIGN.md section 3.3
attemptSchema.index({ userId: 1, createdAt: -1 });
attemptSchema.index({ userId: 1, questionId: 1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);
export default Attempt;
