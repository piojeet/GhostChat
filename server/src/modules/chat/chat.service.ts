import { Types } from 'mongoose';
import { HttpError } from '../../utils/httpError';
import { blockRepository } from '../blocks/block.repository';
import { friendService } from '../friends/friend.service';
import { User } from '../users/user.model';
import { chatRepository } from './chat.repository';

const assertObjectId = (id: string, field: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(401, `Authenticated ${field} is invalid`, 'UNAUTHENTICATED');
  }
};

const assertEligibleUser = async (userId: string): Promise<void> => {
  const exists = await User.exists({
    _id: userId,
    isActive: true,
    isEmailVerified: true,
  });
  if (!exists) {
    throw new HttpError(401, 'Authenticated user is unavailable', 'UNAUTHENTICATED');
  }
};

const assertNoBlock = async (firstId: string, secondId: string): Promise<void> => {
  if (await blockRepository.isBlockedBetween(firstId, secondId)) {
    throw new HttpError(403, 'This user relationship is blocked', 'ALREADY_BLOCKED');
  }
};

const assertConversationAccess = async (chatId: string, userId: string) => {
  const conversation = await chatRepository.findForParticipant(chatId, userId);
  if (!conversation) {
    throw new HttpError(404, 'Chat not found', 'CHAT_NOT_FOUND');
  }
  const otherUserId = conversation.participants
    .map(participant => participant.toString())
    .find(participantId => participantId !== userId);
  if (!otherUserId) {
    throw new HttpError(404, 'Chat not found', 'CHAT_NOT_FOUND');
  }
  await assertNoBlock(userId, otherUserId);
  const relationship = await friendService.getStatus(userId, otherUserId);
  if (relationship.status !== 'friends') {
    throw new HttpError(403, 'Chats are only available to friends', 'NOT_FRIENDS');
  }
  const otherUserExists = await User.exists({
    _id: otherUserId,
    isActive: true,
    isEmailVerified: true,
  });
  if (!otherUserExists) {
    throw new HttpError(404, 'Chat not found', 'CHAT_NOT_FOUND');
  }
  return { conversation, otherUserId };
};

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  hasNextPage: page * limit < total,
});

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 11000;

export const chatService = {
  async createOrGet(userId: string, otherUserId: string) {
    assertObjectId(userId, 'user ID');
    assertObjectId(otherUserId, 'user ID');
    await assertEligibleUser(userId);
    if (userId === otherUserId) {
      throw new HttpError(400, 'You cannot start a chat with yourself', 'INVALID_CHAT');
    }

    const otherUser = await User.findOne({
      _id: otherUserId,
      isActive: true,
      isEmailVerified: true,
    })
      .select('_id username displayName avatar gender')
      .lean();
    if (!otherUser) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    await assertNoBlock(userId, otherUserId);

    const relationship = await friendService.getStatus(userId, otherUserId);
    if (relationship.status !== 'friends') {
      throw new HttpError(403, 'Chats can only be started with friends', 'NOT_FRIENDS');
    }

    const pairKey = [userId, otherUserId].sort().join(':');
    let conversation = await chatRepository.findByPairKey(pairKey);
    if (!conversation) {
      try {
        await chatRepository.create([userId, otherUserId], pairKey);
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      conversation = await chatRepository.findByPairKey(pairKey);
    }
    if (!conversation) {
      throw new HttpError(409, 'Unable to create or retrieve chat', 'CHAT_CONFLICT');
    }
    return {
      chat: {
        id: conversation._id.toString(),
        participant: {
          id: otherUser._id.toString(),
          username: otherUser.username,
          displayName: otherUser.displayName,
          avatar: otherUser.avatar ?? null,
          gender: otherUser.gender ?? null,
        },
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  },

  async list(userId: string, page: number, limit: number) {
    assertObjectId(userId, 'user ID');
    await assertEligibleUser(userId);
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    const { items, total } = await chatRepository.listForParticipant(
      userId,
      hiddenUserIds,
      (page - 1) * limit,
      limit,
    );
    return {
      items: items.map(conversation => ({
        id: conversation._id.toString(),
        chatId: conversation.chatId?.toString() ?? null,
        participant: {
          id: conversation.otherUser._id.toString(),
          username: conversation.otherUser.username,
          displayName: conversation.otherUser.displayName,
          avatar: conversation.otherUser.avatar ?? null,
          gender: conversation.otherUser.gender ?? null,
        },
        lastMessage: conversation.lastMessage
          ? {
              id: conversation.lastMessage.messageId.toString(),
              senderId: conversation.lastMessage.sender.toString(),
              text: conversation.lastMessage.text,
              sentAt: conversation.lastMessage.sentAt,
            }
          : null,
        unreadCount: conversation.unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
      pagination: pagination(page, limit, total),
    };
  },

  async assertAccess(chatId: string, userId: string) {
    assertObjectId(userId, 'user ID');
    await assertEligibleUser(userId);
    return assertConversationAccess(chatId, userId);
  },
};