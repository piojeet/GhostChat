import { Schema, model, type InferSchemaType } from 'mongoose';

const friendSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      required: true,
      default: 'pending',
    },
    activePairKey: { type: String, select: false },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

friendSchema.index({ activePairKey: 1 }, { unique: true, sparse: true });
friendSchema.index({ requester: 1, status: 1, createdAt: -1 });
friendSchema.index({ recipient: 1, status: 1, createdAt: -1 });

export type FriendDocument = InferSchemaType<typeof friendSchema>;

export const Friend = model('Friend', friendSchema);