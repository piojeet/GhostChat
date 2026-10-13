import { Schema, model, type InferSchemaType } from 'mongoose';

const recipientSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['sent', 'opened'], required: true, default: 'sent' },
    openedAt: { type: Date, default: null },
    replayUsed: { type: Boolean, default: false },
  },
  { _id: false },
);

const snapSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipients: { type: [recipientSchema], required: true, validate: [(items: unknown[]) => items.length > 0, 'At least one recipient is required'] },
    media: { type: String, required: true },
    mediaPublicId: { type: String, required: true, select: false },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    caption: { type: String, trim: true, maxlength: 500, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

snapSchema.index({ sender: 1, createdAt: -1 });
snapSchema.index({ 'recipients.user': 1, 'recipients.status': 1, expiresAt: 1, createdAt: -1 });
snapSchema.index({ expiresAt: 1 });

export type SnapDocument = InferSchemaType<typeof snapSchema>;

export const Snap = model('Snap', snapSchema);