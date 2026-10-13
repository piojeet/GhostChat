import { Types } from 'mongoose';
import { User } from '../users/user.model';
import { Friend } from './friend.model';
import type { FriendStatus } from './friend.types';

const safeUserFields = '_id username displayName avatar gender';

export const pairKeyFor = (firstId: string, secondId: string): string =>
  [firstId, secondId].sort().join(':');

export const friendRepository = {
  getAcceptedFriendIds: async (
    userId: string,
    hiddenUserIds: string[],
  ): Promise<string[]> => {
    const userObjectId = new Types.ObjectId(userId);
    const hiddenObjectIds = hiddenUserIds.map(id => new Types.ObjectId(id));
    const relationships = await Friend.find({
      status: 'accepted',
      $or: [
        { requester: userObjectId, recipient: { $nin: hiddenObjectIds } },
        { recipient: userObjectId, requester: { $nin: hiddenObjectIds } },
      ],
    })
      .select('requester recipient')
      .lean();
    return relationships.map(relationship =>
      relationship.requester.toString() === userId
        ? relationship.recipient.toString()
        : relationship.requester.toString(),
    );
  },

  findEligibleUser: (userId: string) =>
    User.findOne({
      _id: userId,
      isActive: true,
      isEmailVerified: true,
    })
      .select(safeUserFields)
      .lean(),

  findRelationship: (pairKey: string) =>
    Friend.findOne({ activePairKey: pairKey })
      .select('+activePairKey')
      .populate({ path: 'requester', select: safeUserFields })
      .populate({ path: 'recipient', select: safeUserFields })
      .lean(),

  createRequest: async (requester: string, recipient: string, pairKey: string) =>
    Friend.create({
      requester,
      recipient,
      status: 'pending',
      activePairKey: pairKey,
    }),

  findRequestById: (requestId: string) =>
    Friend.findById(requestId).select('+activePairKey').lean(),

  cancelRequest: (requestId: string, requester: string) =>
    Friend.findOneAndDelete({ _id: requestId, requester, status: 'pending' }),

  acceptRequest: (requestId: string, recipient: string) =>
    Friend.findOneAndUpdate(
      { _id: requestId, recipient, status: 'pending' },
      { $set: { status: 'accepted', acceptedAt: new Date() } },
      { new: true },
    )
      .select('+activePairKey')
      .populate({ path: 'requester', select: safeUserFields })
      .populate({ path: 'recipient', select: safeUserFields })
      .lean(),

  declineRequest: (requestId: string, recipient: string) =>
    Friend.findOneAndUpdate(
      { _id: requestId, recipient, status: 'pending' },
      { $set: { status: 'declined' }, $unset: { activePairKey: 1 } },
      { new: true },
    ).lean(),

  findIncoming: (userId: string, hiddenUserIds: string[], skip: number, limit: number) => {
    const filter = {
      recipient: userId,
      status: 'pending' as FriendStatus,
      requester: { $nin: hiddenUserIds },
    };
    return Promise.all([
      Friend.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'requester', select: safeUserFields })
        .lean(),
      Friend.countDocuments(filter),
    ]);
  },

  findOutgoing: (userId: string, hiddenUserIds: string[], skip: number, limit: number) => {
    const filter = {
      requester: userId,
      status: 'pending' as FriendStatus,
      recipient: { $nin: hiddenUserIds },
    };
    return Promise.all([
      Friend.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'recipient', select: safeUserFields })
        .lean(),
      Friend.countDocuments(filter),
    ]);
  },

  findFriends: (userId: string, hiddenUserIds: string[], skip: number, limit: number) => {
    const userObjectId = new Types.ObjectId(userId);
    const hiddenObjectIds = hiddenUserIds.map(id => new Types.ObjectId(id));
    const filter = {
      status: 'accepted' as FriendStatus,
      $or: [
        { requester: userObjectId, recipient: { $nin: hiddenObjectIds } },
        { recipient: userObjectId, requester: { $nin: hiddenObjectIds } },
      ],
    };
    return Promise.all([
      Friend.find(filter)
        .sort({ acceptedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'requester', select: safeUserFields })
        .populate({ path: 'recipient', select: safeUserFields })
        .lean(),
      Friend.countDocuments(filter),
    ]);
  },

  countFriends: async (userId: string, hiddenUserIds: string[]): Promise<number> => {
    const userObjectId = new Types.ObjectId(userId);
    const hiddenObjectIds = hiddenUserIds.map(id => new Types.ObjectId(id));
    return Friend.countDocuments({
      status: 'accepted',
      $or: [
        { requester: userObjectId, recipient: { $nin: hiddenObjectIds } },
        { recipient: userObjectId, requester: { $nin: hiddenObjectIds } },
      ],
    });
  },

  removeFriendship: (userId: string, friendUserId: string) =>
    Friend.findOneAndDelete({
      status: 'accepted',
      $or: [
        { requester: userId, recipient: friendUserId },
        { requester: friendUserId, recipient: userId },
      ],
    }),

  searchUsers: (userId: string, hiddenUserIds: string[], query: string, skip: number, limit: number) => {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = {
      _id: { $nin: [userId, ...hiddenUserIds] },
      isActive: true,
      isEmailVerified: true,
      $or: [
        { username: { $regex: `^${escapedQuery.toLowerCase()}` } },
        { displayName: { $regex: `^${escapedQuery}`, $options: 'i' } },
      ],
    };
    return Promise.all([
      User.find(filter)
        .select(safeUserFields)
        .sort({ username: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
  },

  findSuggestions: async (
    userId: string,
    hiddenUserIds: string[],
    skip: number,
    limit: number,
  ) => {
    const relationships = await Friend.find({
      status: { $in: ['pending', 'accepted'] },
      $or: [{ requester: userId }, { recipient: userId }],
    })
      .select('requester recipient')
      .lean();
    const excludedUserIds = new Set([
      userId,
      ...hiddenUserIds,
      ...relationships.map(relationship =>
        relationship.requester.toString() === userId
          ? relationship.recipient.toString()
          : relationship.requester.toString(),
      ),
    ]);
    const filter = {
      _id: { $nin: [...excludedUserIds] },
      isActive: true,
      isEmailVerified: true,
    };
    return Promise.all([
      User.find(filter)
        .select(`${safeUserFields} createdAt`)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
  },
};