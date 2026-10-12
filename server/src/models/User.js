import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not expose password hash in queries by default
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    streak: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastCompletedDate: {
        type: String,
        default: null, // Format: YYYY-MM-DD in the user's timezone
      },
    },
  },
  {
    timestamps: true,
  }
);

// Note: Unique index on email is created automatically via `unique: true`
export const User = mongoose.model('User', userSchema);
export default User;
