import { Schema, model, type InferSchemaType } from 'mongoose';

const lastMessageSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 200 },
    sentAt: { type: Date, required: true },
  },
  { _id: false },
);

const conversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      required: true,
      validate: {
        validator: (participants: unknown[]) => participants.length === 2,
        message: 'A one-to-one conversation must have exactly two participants',
      },
    },
    participantPairKey: { type: String, required: true, unique: true, select: false },
    lastMessage: { type: lastMessageSchema, default: undefined },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, 'lastMessage.sentAt': -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema>;

export const Conversation = model('Conversation', conversationSchema);