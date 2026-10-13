import { HttpError } from '../../utils/httpError';
import { blockRepository } from '../blocks/block.repository';
import { notificationService } from '../notifications/notification.service';
import { friendRepository, pairKeyFor } from './friend.repository';
import type { SafeFriendUser } from './friend.types';

type PopulatedRelationship = {
  _id: { toString(): string };
  requester: SafeFriendUser;
  recipient: SafeFriendUser;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
};

const toSafeUser = (user: SafeFriendUser) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar ?? null,
  gender: user.gender ?? null,
});

const getPagination = (page: number, limit: number, total: number) => ({
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

const assertNoBlock = async (firstId: string, secondId: string): Promise<void> => {
  if (await blockRepository.isBlockedBetween(firstId, secondId)) {
    throw new HttpError(403, 'This user relationship is blocked', 'ALREADY_BLOCKED');
  }
};

export const friendService = {
  async sendRequest(requesterId: string, recipientId: string) {
    if (requesterId === recipientId) {
      throw new HttpError(400, 'You cannot add yourself', 'CANNOT_ADD_SELF');
    }
    const recipient = await friendRepository.findEligibleUser(recipientId);
    if (!recipient) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    await assertNoBlock(requesterId, recipientId);

    const pairKey = pairKeyFor(requesterId, recipientId);
    const existing = await friendRepository.findRelationship(pairKey);
    if (existing?.status === 'accepted') {
      throw new HttpError(409, 'You are already friends', 'ALREADY_FRIENDS');
    }
    if (existing?.status === 'pending') {
      throw new HttpError(
        409,
        'A friend request already exists for this user',
        'FRIEND_REQUEST_EXISTS',
      );
    }

    try {
      await friendRepository.createRequest(requesterId, recipientId, pairKey);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new HttpError(
          409,
          'A friend request already exists for this user',
          'FRIEND_REQUEST_EXISTS',
        );
      }
      throw error;
    }

    const friendRequest = await friendRepository.findRelationship(pairKey);
    if (!friendRequest) {
      throw new HttpError(500, 'Unable to create friend request', 'INTERNAL_ERROR');
    }
    const relationship = friendRequest as unknown as PopulatedRelationship;
    try {
      await notificationService.create({
        recipientId,
        actorId: requesterId,
        type: 'FRIEND_REQUEST',
        entityType: 'user',
        entityId: requesterId,
        eventKey: `friend_request:${relationship._id.toString()}`,
      });
    } catch (error) {
      console.error('Unable to create friend-request notification', {
        requestId: relationship._id.toString(),
        code: typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : 'NOTIFICATION_CREATE_FAILED',
      });
    }
    return {
      id: relationship._id.toString(),
      requester: toSafeUser(relationship.requester),
      recipient: toSafeUser(relationship.recipient),
      status: relationship.status,
      createdAt: relationship.createdAt,
    };
  },

  async cancelRequest(requesterId: string, requestId: string) {
    const request = await friendRepository.findRequestById(requestId);
    if (!request) {
      throw new HttpError(404, 'Friend request not found', 'FRIEND_REQUEST_NOT_FOUND');
    }
    if (request.requester.toString() !== requesterId) {
      throw new HttpError(403, 'Not authorized to cancel this request', 'NOT_AUTHORIZED');
    }
    if (request.status !== 'pending') {
      throw new HttpError(409, 'Friend request is no longer pending', 'INVALID_FRIENDSHIP');
    }
    const deleted = await friendRepository.cancelRequest(requestId, requesterId);
    if (!deleted) {
      throw new HttpError(409, 'Friend request is no longer pending', 'INVALID_FRIENDSHIP');
    }
    return { success: true };
  },

  async acceptRequest(recipientId: string, requestId: string) {
    const request = await friendRepository.findRequestById(requestId);
    if (!request) {
      throw new HttpError(404, 'Friend request not found', 'FRIEND_REQUEST_NOT_FOUND');
    }
    if (request.recipient.toString() !== recipientId) {
      throw new HttpError(403, 'Not authorized to accept this request', 'NOT_AUTHORIZED');
    }
    if (request.status !== 'pending') {
      throw new HttpError(409, 'Friend request is no longer pending', 'INVALID_FRIENDSHIP');
    }
    await assertNoBlock(request.requester.toString(), recipientId);
    const accepted = await friendRepository.acceptRequest(requestId, recipientId);
    if (!accepted) {
      throw new HttpError(409, 'Friend request is no longer pending', 'INVALID_FRIENDSHIP');
    }
    const relationship = accepted as unknown as PopulatedRelationship;
    return {
      id: relationship._id.toString(),
      requester: toSafeUser(relationship.requester),
      recipient: toSafeUser(relationship.recipient),
      status: relationship.status,
      friendsSince: relationship.acceptedAt ?? relationship.updatedAt,
    };
  },

  async declineRequest(recipientId: string, requestId: string) {
    const request = await friendRepository.findRequestById(requestId);
    if (!request) {
      throw new HttpError(404, 'Friend request not found', 'FRIEND_REQUEST_NOT_FOUND');
    }
    if (request.recipient.toString() !== recipientId) {
      throw new HttpError(403, 'Not authorized to decline this request', 'NOT_AUTHORIZED');
    }
    if (request.status !== 'pending') {
      throw new HttpError(409, 'Friend request is no longer pending', 'INVALID_FRIENDSHIP');
    }
    const declined = await friendRepository.declineRequest(requestId, recipientId);
    if (!declined) {
      throw new HttpError(409, 'Friend request is no longer pending', 'INVALID_FRIENDSHIP');
    }
    return { success: true };
  },

  async getIncoming(userId: string, page: number, limit: number) {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    const [requests, total] = await friendRepository.findIncoming(
      userId,
      hiddenUserIds,
      (page - 1) * limit,
      limit,
    );
    return {
      items: requests.map(request => ({
        id: request._id.toString(),
        user: toSafeUser(request.requester as unknown as SafeFriendUser),
        createdAt: request.createdAt,
      })),
      pagination: getPagination(page, limit, total),
    };
  },

  async getOutgoing(userId: string, page: number, limit: number) {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    const [requests, total] = await friendRepository.findOutgoing(
      userId,
      hiddenUserIds,
      (page - 1) * limit,
      limit,
    );
    return {
      items: requests.map(request => ({
        id: request._id.toString(),
        user: toSafeUser(request.recipient as unknown as SafeFriendUser),
        createdAt: request.createdAt,
      })),
      pagination: getPagination(page, limit, total),
    };
  },

  async getFriends(userId: string, page: number, limit: number) {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    const [friendships, total] = await friendRepository.findFriends(
      userId,
      hiddenUserIds,
      (page - 1) * limit,
      limit,
    );
    return {
      items: friendships.map(friendship => {
        const relationship = friendship as unknown as PopulatedRelationship;
        const user =
          relationship.requester._id.toString() === userId
            ? relationship.recipient
            : relationship.requester;
        return {
          id: relationship._id.toString(),
          user: toSafeUser(user),
          friendsSince: relationship.acceptedAt ?? relationship.updatedAt,
        };
      }),
      pagination: getPagination(page, limit, total),
    };
  },

  async removeFriend(userId: string, friendUserId: string) {
    if (userId === friendUserId) {
      throw new HttpError(400, 'Invalid friendship', 'INVALID_FRIENDSHIP');
    }
    const removed = await friendRepository.removeFriendship(userId, friendUserId);
    if (!removed) {
      throw new HttpError(404, 'Friendship not found', 'INVALID_FRIENDSHIP');
    }
    return { success: true };
  },

  async getStatus(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      return { status: 'none' as const };
    }
    if (await blockRepository.isBlockedBetween(userId, otherUserId)) {
      return { status: 'blocked' as const };
    }
    const relationship = await friendRepository.findRelationship(
      pairKeyFor(userId, otherUserId),
    );
    if (!relationship) {
      return { status: 'none' as const };
    }
    if (relationship.status === 'accepted') {
      return { status: 'friends' as const };
    }
    const requesterId = (relationship as unknown as PopulatedRelationship).requester._id.toString();
    return {
      status: requesterId === userId ? 'outgoing_pending' as const : 'incoming_pending' as const,
    };
  },

  async searchUsers(userId: string, query: string, page: number, limit: number) {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    const [users, total] = await friendRepository.searchUsers(
      userId,
      hiddenUserIds,
      query,
      (page - 1) * limit,
      limit,
    );
    return {
      items: users.map(user => toSafeUser(user as unknown as SafeFriendUser)),
      pagination: getPagination(page, limit, total),
    };
  },

  async getSuggestions(userId: string, page: number, limit: number) {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    const [users, total] = await friendRepository.findSuggestions(
      userId,
      hiddenUserIds,
      (page - 1) * limit,
      limit,
    );
    return {
      items: users.map(user => ({
        ...toSafeUser(user as unknown as SafeFriendUser),
        joinedAt: user.createdAt,
      })),
      pagination: getPagination(page, limit, total),
    };
  },

  async getFriendCount(userId: string): Promise<number> {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    return friendRepository.countFriends(userId, hiddenUserIds);
  },

  async getFriendIds(userId: string): Promise<string[]> {
    const hiddenUserIds = await blockRepository.getBlockedUserIds(userId);
    return friendRepository.getAcceptedFriendIds(userId, hiddenUserIds);
  },
};