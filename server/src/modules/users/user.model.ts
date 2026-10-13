import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 80, index: true },
    avatar: { type: String, trim: true, default: null },
    gender: { type: String, enum: ['male', 'female', null], default: null },
    bio: { type: String, trim: true, maxlength: 160, default: '' },
    locationSharingEnabled: { type: Boolean, default: false },
    ghostMode: { type: Boolean, default: true },
    locationSharingSessionId: { type: String, default: null, select: false },
    isEmailVerified: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: false },
    pushDevices: [{
      token: { type: String, required: true, select: false },
      platform: { type: String, enum: ['android', 'ios'], required: true },
      updatedAt: { type: Date, required: true },
    }],
  },
  { timestamps: true },
);

userSchema.index({ 'pushDevices.token': 1 }, { unique: true, sparse: true });

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model('User', userSchema);