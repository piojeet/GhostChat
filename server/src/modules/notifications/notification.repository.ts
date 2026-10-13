import { Types, type PipelineStage } from 'mongoose';
import { User } from '../users/user.model';
import { Notification } from './notification.model';
import type {
  NotificationCategoryFilter,
  NotificationResponse,
} from './notification.types';

type NotificationAggregateResult = {
  items: NotificationResponse[];
  total: { count: number }[];
};

const actorVisibilityMatch = (blockedActorIds: Types.ObjectId[]) => ({
  $or: [
    { $and: [{ type: 'SYSTEM' }, { actor: null }] },
    {
      $and: [
        { type: { $ne: 'SYSTEM' } },
        { actor: { $nin: [null, ...blockedActorIds] } },
        { 'actorData.isActive': true },
        { 'actorData.isEmailVerified': true },
      ],
    },
  ],
});

const aggregationPrefix = (
  recipientId: string,
  blockedActorIds: string[],
  category?: NotificationCategoryFilter,
  unreadOnly = false,
): PipelineStage[] => {
  const match: Record<string, unknown> = { recipient: new Types.ObjectId(recipientId) };
  if (category && category !== 'all') match.category = category;
  if (unreadOnly) match.readAt = null;

  return [
    { $match: match },
    {
      $lookup: {
        from: User.collection.name,
        localField: 'actor',
        foreignField: '_id',
        as: 'actorData',
      },
    },
    { $unwind: { path: '$actorData', preserveNullAndEmptyArrays: true } },
    {
      $match: actorVisibilityMatch(
        blockedActorIds.map(id => new Types.ObjectId(id)),
      ),
    },
  ];
};

export const notificationRepository = {
  create: async (notification: Record<string, unknown>): Promise<void> => {
    await Notification.create(notification);
  },

  createOnce: async (
    notification: Record<string, unknown>,
    eventKey: string,
  ): Promise<boolean> => {
    try {
      const result = await Notification.updateOne(
        { eventKey },
        { $setOnInsert: { ...notification, eventKey } },
        { upsert: true },
      );
      return result.upsertedCount > 0;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 11000 ||
        !(await Notification.exists({ eventKey }))
      ) {
        throw error;
      }
      return false;
    }
  },

  findVisible: async (
    recipientId: string,
    blockedActorIds: string[],
    category: NotificationCategoryFilter,
    skip: number,
    limit: number,
  ) => {
    const pipeline: PipelineStage[] = [
      ...aggregationPrefix(recipientId, blockedActorIds, category),
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                type: 1,
                category: 1,
                title: 1,
                body: 1,
                entityType: 1,
                entityId: 1,
                readAt: 1,
                createdAt: 1,
                actor: {
                  $cond: [
                    { $eq: ['$type', 'SYSTEM'] },
                    null,
                    {
                      id: { $toString: '$actorData._id' },
                      username: '$actorData.username',
                      displayName: '$actorData.displayName',
                      avatar: { $ifNull: ['$actorData.avatar', null] },
                    },
                  ],
                },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];
    const [result] = await Notification.aggregate<NotificationAggregateResult>(pipeline);
    return {
      items: result?.items ?? [],
      total: result?.total[0]?.count ?? 0,
    };
  },

  countUnread: async (recipientId: string, blockedActorIds: string[]) => {
    const pipeline: PipelineStage[] = [
      ...aggregationPrefix(recipientId, blockedActorIds, undefined, true),
      { $count: 'count' },
    ];
    const [result] = await Notification.aggregate<{ count: number }>(pipeline);
    return result?.count ?? 0;
  },

  markRead: (notificationId: string, recipientId: string, readAt: Date) =>
    Notification.updateOne(
      { _id: notificationId, recipient: recipientId, readAt: null },
      { $set: { readAt } },
    ),

  existsForRecipient: (notificationId: string, recipientId: string) =>
    Notification.exists({ _id: notificationId, recipient: recipientId }),

  markAllRead: (recipientId: string, readAt: Date) =>
    Notification.updateMany(
      { recipient: recipientId, readAt: null },
      { $set: { readAt } },
    ),

  deleteForRecipient: (notificationId: string, recipientId: string) =>
    Notification.deleteOne({ _id: notificationId, recipient: recipientId }),
};