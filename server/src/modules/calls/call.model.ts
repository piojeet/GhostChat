import { Schema, model } from 'mongoose';

const callSchema = new Schema(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kind: { type: String, enum: ['audio', 'video'], required: true },
    state: {
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
      required: true,
      index: true,
    },
    activeParticipantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: undefined,
    },
    ringingAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    connectedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

callSchema.index(
  { activeParticipantIds: 1 },
  { unique: true, partialFilterExpression: { activeParticipantIds: { $exists: true } } },
);
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });
callSchema.index({ state: 1, ringingAt: 1 });

export const Call = model('Call', callSchema);