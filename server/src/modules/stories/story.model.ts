import { Schema, model, type InferSchemaType } from 'mongoose';

const storySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    media: { type: String, required: true },
    mediaPublicId: { type: String, required: true, select: false },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    caption: { type: String, trim: true, maxlength: 500, default: '' },
    visibility: {
      type: String,
      enum: ['public', 'friends'],
      required: true,
      default: 'friends',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

storySchema.index({ user: 1, expiresAt: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });

export type StoryDocument = InferSchemaType<typeof storySchema>;

export const Story = model('Story', storySchema);