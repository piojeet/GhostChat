import { Schema, model } from 'mongoose';

const locationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    sharingSessionId: { type: String, required: true, select: false },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export const Location = model('Location', locationSchema);
