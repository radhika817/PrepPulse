import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'OS',
        'DSA',
        'OOP',
        'CPP',
        'DBMS',
        'SQL',
        'CN',
        'COA',
        'WEB',
        'SYSDESIGN',
        'APTITUDE',
        'HR',
      ],
      index: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: ['easy', 'medium', 'hard'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Question type is required'],
      enum: ['mcq', 'short', 'coding_link', 'hr'],
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    // Normalized question text used for reliable deduplication during seeding
    normalizedQuestion: {
      type: String,
      index: true,
      select: false,
    },
    options: {
      type: [String],
      default: [],
    },
    // The correct answer / model answer.
    // 'select: false' ensures answer is never leaked in standard list/detail queries.
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      select: false,
    },
    // Optional follow-up question.
    // 'select: false' ensures followUp is only returned by reveal and attempt endpoints.
    followUp: {
      type: String,
      trim: true,
      default: null,
      select: false,
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
      required: [
        function () {
          return this.type === 'mcq';
        },
        'Explanation is required for MCQ questions',
      ],
    },
    link: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    sourceType: {
      type: String,
      enum: ['own', 'ai_draft', 'licensed'],
      default: 'own',
    },
    sourceNote: {
      type: String,
      default: '',
    },
    reviewStatus: {
      type: String,
      enum: ['draft', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    companyTags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index matching SYSTEM_DESIGN.md section 3.2
questionSchema.index({
  reviewStatus: 1,
  category: 1,
  topic: 1,
  difficulty: 1,
});

// Full-text search index for searching questions by keywords and tags
questionSchema.index({
  question: 'text',
  tags: 'text',
});

// Pre-save hook to ensure normalizedQuestion is always updated
questionSchema.pre('save', function (next) {
  if (this.question) {
    this.normalizedQuestion = this.question
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }
  next();
});

export const Question = mongoose.model('Question', questionSchema);
export default Question;
