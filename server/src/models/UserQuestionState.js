import mongoose from 'mongoose';

const userQuestionStateSchema = new mongoose.Schema(
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
    bookmarked: {
      type: Boolean,
      default: false,
    },
    lastRating: {
      type: String,
      enum: ['knew', 'partly', 'missed', null],
      default: null,
    },
    box: {
      type: Number,
      default: 0,
      min: 0,
      max: 3, // Spaced repetition Leitner box (0 to 3)
    },
    nextReviewAt: {
      type: Date,
      default: null, // Null when the question is mastered
      index: true,
    },
    timesSeen: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index matching SYSTEM_DESIGN.md section 3.4
userQuestionStateSchema.index({ userId: 1, questionId: 1 }, { unique: true });

export const UserQuestionState = mongoose.model(
  'UserQuestionState',
  userQuestionStateSchema
);
export default UserQuestionState;
