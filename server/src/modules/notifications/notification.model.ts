import { Schema, model, type InferSchemaType } from 'mongoose';
import { notificationCategories, notificationTypes } from './notification.types';

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: { type: String, enum: notificationTypes, required: true },
    category: { type: String, enum: notificationCategories, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    entityType: { type: String, enum: ['snap', 'story', 'chat', 'user'] },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    eventKey: { type: String, select: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
notificationSchema.index({ eventKey: 1 }, { unique: true, sparse: true });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;

export const Notification = model('Notification', notificationSchema);