import { Schema, model, type InferSchemaType } from 'mongoose';

const receiptSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'voice', 'call'],
      required: true,
      default: 'text',
    },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    mediaUrl: { type: String, default: null },
    mediaMimeType: { type: String, default: null },
    mediaPublicId: { type: String, default: null },
    mediaResourceType: { type: String, enum: ['image', 'video', null], default: null },
    mediaSizeBytes: { type: Number, default: null, min: 0 },
    callId: { type: Schema.Types.ObjectId, ref: 'Call' },
    callKind: { type: String, enum: ['audio', 'video'], default: null },
    callStatus: {
      type: String,
      enum: [
        'ringing',
        'accepted',
        'connected',
        'ended',
        'rejected',
        'cancelled',
        'missed',
        'busy',
        'unavailable',
        'timeout',
        'failed',
      ],
      default: null,
    },
    durationSeconds: { type: Number, default: null, min: 0 },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    sentAt: { type: Date, required: true, default: Date.now },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    receipts: { type: [receiptSchema], default: [] },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, sentAt: -1, _id: -1 });
messageSchema.index({ callId: 1 }, { unique: true, sparse: true });
messageSchema.index({ conversation: 1, sender: 1, sentAt: -1 });
messageSchema.index({
  conversation: 1,
  'receipts.recipient': 1,
  'receipts.readAt': 1,
});

export type MessageDocument = InferSchemaType<typeof messageSchema>;

export const Message = model('Message', messageSchema);