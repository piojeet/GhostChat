import { Schema, model } from 'mongoose';

export type OtpPurpose = 'registration' | 'password-reset';

const authChallengeSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: {
      type: String,
      enum: ['registration', 'password-reset'],
      required: true,
    },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0, required: true },
    resendCount: { type: Number, default: 0, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

authChallengeSchema.index({ email: 1, purpose: 1 }, { unique: true });

export const AuthChallenge = model('AuthChallenge', authChallengeSchema);