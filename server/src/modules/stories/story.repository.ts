import { Types } from 'mongoose';
import { User } from '../users/user.model';
import { Story } from './story.model';
import { StoryView } from './storyView.model';
import type { StoryMediaType, StoryVisibility } from './story.types';

const safeUserFields = '_id username displayName avatar';
const safeStoryFields =
  '_id user media mediaType caption visibility createdAt expiresAt';

export const storyRepository = {
  create: (
    userId: string,
    media: string,
    mediaPublicId: string,
    mediaType: StoryMediaType,
    caption: string,
    visibility: StoryVisibility,
    createdAt: Date,
    expiresAt: Date,
  ) =>
    Story.create({
      user: userId,
      media,
      mediaPublicId,
      mediaType,
      caption,
      visibility,
      createdAt,
      expiresAt,
    }),

  findUser: (userId: string) =>
    User.findOne({ _id: userId, isActive: true, isEmailVerified: true })
      .select(safeUserFields)
      .lean(),

  findActiveById: (storyId: string, now: Date) =>
    Story.findOne({ _id: storyId, expiresAt: { $gt: now } })
      .select(safeStoryFields)
      .populate({ path: 'user', select: safeUserFields })
      .lean(),

  findOwned: (storyId: string) =>
    Story.findById(storyId)
      .select('_id user mediaPublicId mediaType expiresAt')
      .lean(),

  findActiveByUser: (userId: string, now: Date, skip: number, limit: number) => {
    const filter = { user: userId, expiresAt: { $gt: now } };
    return Promise.all([
      Story.find(filter)
        .select(safeStoryFields)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'user', select: safeUserFields })
        .lean(),
      Story.countDocuments(filter),
    ]);
  },

  findActiveFeed: (
    userIds: string[],
    now: Date,
    skip: number,
    limit: number,
  ) => {
    const filter = {
      user: { $in: userIds },
      visibility: { $in: ['public', 'friends'] as StoryVisibility[] },
      expiresAt: { $gt: now },
    };
    return Promise.all([
      Story.find(filter)
        .select(safeStoryFields)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'user', select: safeUserFields })
        .lean(),
      Story.countDocuments(filter),
    ]);
  },

  findActivePublicStoriesByUser: (
    userId: string,
    now: Date,
    skip: number,
    limit: number,
  ) => {
    const filter = {
      user: userId,
      visibility: 'public' as StoryVisibility,
      expiresAt: { $gt: now },
    };
    return Promise.all([
      Story.find(filter)
        .select(safeStoryFields)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'user', select: safeUserFields })
        .lean(),
      Story.countDocuments(filter),
    ]);
  },

  findActiveFriendStoriesByUser: (
    userId: string,
    now: Date,
    skip: number,
    limit: number,
  ) => {
    const filter = {
      user: userId,
      visibility: { $in: ['public', 'friends'] as StoryVisibility[] },
      expiresAt: { $gt: now },
    };
    return Promise.all([
      Story.find(filter)
        .select(safeStoryFields)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'user', select: safeUserFields })
        .lean(),
      Story.countDocuments(filter),
    ]);
  },

  countActiveByUser: (userId: string, now: Date) =>
    Story.countDocuments({ user: userId, expiresAt: { $gt: now } }),

  findView: (storyId: string, viewerId: string) =>
    StoryView.findOne({ story: storyId, viewer: viewerId }).select('_id').lean(),

  upsertView: (storyId: string, viewerId: string, viewedAt: Date) =>
    StoryView.findOneAndUpdate(
      { story: storyId, viewer: viewerId },
      { $set: { viewedAt } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).catch(async error => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        return StoryView.findOneAndUpdate(
          { story: storyId, viewer: viewerId },
          { $set: { viewedAt } },
          { new: true },
        );
      }
      throw error;
    }),

  findViewers: (
    storyId: string,
    hiddenUserIds: string[],
    skip: number,
    limit: number,
  ) => {
    const filter = {
      story: storyId,
      viewer: { $nin: hiddenUserIds.map(id => new Types.ObjectId(id)) },
    };
    return Promise.all([
      StoryView.find(filter)
        .sort({ viewedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'viewer', select: safeUserFields })
        .lean(),
      StoryView.countDocuments(filter),
    ]);
  },

  getViewedStoryIds: (storyIds: string[], viewerId: string) =>
    StoryView.find({
      story: { $in: storyIds.map(id => new Types.ObjectId(id)) },
      viewer: viewerId,
    })
      .select('story')
      .lean(),

  deleteStory: (storyId: string, userId: string) =>
    Story.findOneAndDelete({ _id: storyId, user: userId }).select('+mediaPublicId').lean(),

  deleteViewsForStory: (storyId: string) => StoryView.deleteMany({ story: storyId }),

  findExpired: (now: Date, limit: number) =>
    Story.find({ expiresAt: { $lte: now } })
      .select('_id mediaPublicId mediaType')
      .limit(limit)
      .lean(),

  deleteExpired: (storyIds: string[]) =>
    Story.deleteMany({ _id: { $in: storyIds }, expiresAt: { $lte: new Date() } }),

  deleteViewsForStories: (storyIds: string[]) =>
    StoryView.deleteMany({ story: { $in: storyIds } }),
};