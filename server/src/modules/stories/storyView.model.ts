import { Schema, model, type InferSchemaType } from 'mongoose';

const storyViewSchema = new Schema(
  {
    story: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    viewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

storyViewSchema.index({ story: 1, viewer: 1 }, { unique: true });
storyViewSchema.index({ story: 1, viewedAt: -1 });

export type StoryViewDocument = InferSchemaType<typeof storyViewSchema>;

export const StoryView = model('StoryView', storyViewSchema);
