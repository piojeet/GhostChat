import { Types } from 'mongoose';
import { HttpError } from '../../utils/httpError';
import { blockRepository } from '../blocks/block.repository';
import { User } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import { pushService } from './push.service';
import { notificationRepository } from './notification.repository';
import type {
  ActorNotificationType,
  CreateActorNotificationInput,
  CreateSystemNotificationInput,
  NotificationCategory,
} from './notification.types';

const actorContent: Record<
  ActorNotificationType,
  { category: NotificationCategory; body: string }
> = {
  SNAP_RECEIVED: { category: 'snaps', body: 'Sent you a Snap' },
  SNAP_REPLY: { category: 'snaps', body: 'Replied to your Snap' },
  STORY_MENTION: { category: 'stories', body: 'Mentioned you in a story' },
  STORY_LIKED: { category: 'stories', body: 'Liked your story' },
  USER_FOLLOWED: { category: 'system', body: 'Started following you' },
  MESSAGE_RECEIVED: { category: 'chats', body: 'Sent you a message' },
  FRIEND_REQUEST: { category: 'system', body: 'Sent you a friend request' },
};

const assertObjectId = (id: string, field: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(400, `Invalid ${field}`, 'INVALID_NOTIFICATION');
  }
};

const findEligibleUser = async (userId: string, field: string) => {
  const user = await User.findOne({
    _id: userId,
    isActive: true,
    isEmailVerified: true,
  })
    .select('_id displayName')
    .lean();
  if (!user) {
    throw new HttpError(404, `${field} not found`, 'USER_NOT_FOUND');
  }
  return user;
};

export const notificationService = {
  async create(input: CreateActorNotificationInput): Promise<boolean> {
    assertObjectId(input.recipientId, 'recipient');
    assertObjectId(input.actorId, 'actor');
    if (input.actorId === input.recipientId) {
      throw new HttpError(400, 'Self notifications are not allowed', 'INVALID_NOTIFICATION');
    }

    const [recipient, actor] = await Promise.all([
      findEligibleUser(input.recipientId, 'Notification recipient'),
      findEligibleUser(input.actorId, 'Notification actor'),
    ]);
    if (await blockRepository.isBlockedBetween(input.actorId, input.recipientId)) {
      return false;
    }

    const content = actorContent[input.type];
    const notification = {
      recipient: recipient._id,
      actor: actor._id,
      type: input.type,
      category: content.category,
      title: actor.displayName,
      body: content.body,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      readAt: null,
    };
    let created = true;
    if (input.eventKey) {
      created = await notificationRepository.createOnce(notification, input.eventKey);
    } else {
      await notificationRepository.create(notification);
    }
    if (created) {
      try {
        const result = await pushService.sendNotification({
          recipientId: input.recipientId,
          actorId: input.actorId,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId,
          body: input.messagePreview?.trim().slice(0, 200) || content.body,
        });
        if (result.failureCount > 0) {
          console.error('Some notification push deliveries failed', {
            type: input.type,
            failureCount: result.failureCount,
          });
        }
      } catch (error) {
        console.error('Notification push delivery failed', {
          type: input.type,
          code: typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : 'FCM_SEND_FAILED',
        });
      }
    }
    return created;
  },

  async registerPushDevice(
    userId: string,
    token: string,
    platform: 'android' | 'ios',
  ): Promise<void> {
    assertObjectId(userId, 'user');
    await findEligibleUser(userId, 'User');
    await userRepository.registerPushDevice(userId, token, platform);
  },

  async removePushDevice(userId: string, token: string): Promise<void> {
    assertObjectId(userId, 'user');
    await userRepository.removePushDevice(userId, token);
  },

  async createSystemNotification(
    input: CreateSystemNotificationInput,
  ): Promise<void> {
    assertObjectId(input.recipientId, 'recipient');
    if (!input.title.trim() || !input.body.trim()) {
      throw new HttpError(400, 'System notification title and body are required', 'INVALID_NOTIFICATION');
    }
    const recipient = await findEligibleUser(input.recipientId, 'Notification recipient');
    await notificationRepository.create({
      recipient: recipient._id,
      actor: null,
      type: 'SYSTEM',
      category: 'system',
      title: input.title.trim(),
      body: input.body.trim(),
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      readAt: null,
    });
    try {
      const result = await pushService.sendSystemNotification(input);
      if (result.failureCount > 0) {
        console.error('Some system notification push deliveries failed', {
          failureCount: result.failureCount,
        });
      }
    } catch (error) {
      console.error('System notification push delivery failed', {
        code: typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : 'FCM_SEND_FAILED',
      });
    }
  },

  async getNotifications(
    recipientId: string,
    page: number,
    limit: number,
    category: 'all' | NotificationCategory,
  ) {
    const blockedActorIds = await blockRepository.getBlockedUserIds(recipientId);
    const { items, total } = await notificationRepository.findVisible(
      recipientId,
      blockedActorIds,
      category,
      (page - 1) * limit,
      limit,
    );
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };
  },

  async getUnreadCount(recipientId: string) {
    const blockedActorIds = await blockRepository.getBlockedUserIds(recipientId);
    return notificationRepository.countUnread(recipientId, blockedActorIds);
  },

  async markRead(notificationId: string, recipientId: string): Promise<void> {
    const result = await notificationRepository.markRead(
      notificationId,
      recipientId,
      new Date(),
    );
    if (result.matchedCount === 0 &&
        !(await notificationRepository.existsForRecipient(notificationId, recipientId))) {
      throw new HttpError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
    }
  },

  async markAllRead(recipientId: string): Promise<number> {
    const result = await notificationRepository.markAllRead(recipientId, new Date());
    return result.modifiedCount;
  },

  async deleteNotification(notificationId: string, recipientId: string): Promise<void> {
    const result = await notificationRepository.deleteForRecipient(
      notificationId,
      recipientId,
    );
    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
    }
  },
};