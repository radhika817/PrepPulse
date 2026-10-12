import mongoose from 'mongoose';

const dailyChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date string is required'], // YYYY-MM-DD in user's timezone
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    questionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
      ],
      required: [true, 'Question IDs are required'],
      validate: {
        validator: function (val) {
          // Exactly 5 questions per daily challenge
          return Array.isArray(val) && val.length === 5;
        },
        message: 'A daily challenge must contain exactly 5 questions',
      },
    },
    completedQuestionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
      ],
      default: [],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index per user and date matching SYSTEM_DESIGN.md section 3.5
dailyChallengeSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyChallenge = mongoose.model(
  'DailyChallenge',
  dailyChallengeSchema
);
export default DailyChallenge;
