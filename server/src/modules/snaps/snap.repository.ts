import { Types } from 'mongoose';
import { User } from '../users/user.model';
import { Snap } from './snap.model';
import type { SnapMediaType } from './snap.types';

const safeUserFields = '_id username displayName avatar';
const safeSnapFields = '_id sender recipients media mediaType caption createdAt expiresAt';

export const snapRepository = {
  findEligibleSender: (userId: string) =>
    User.exists({
      _id: userId,
      isActive: true,
      isEmailVerified: true,
    }),

  findEligibleUsers: (userIds: string[]) =>
    User.find({
      _id: { $in: userIds.map(id => new Types.ObjectId(id)) },
      isActive: true,
      isEmailVerified: true,
    })
      .select(safeUserFields)
      .lean(),

  create: (
    senderId: string,
    recipientIds: string[],
    media: string,
    mediaPublicId: string,
    mediaType: SnapMediaType,
    caption: string,
    createdAt: Date,
    expiresAt: Date,
  ) =>
    Snap.create({
      sender: senderId,
      recipients: recipientIds.map(user => ({ user, status: 'sent', openedAt: null })),
      media,
      mediaPublicId,
      mediaType,
      caption,
      createdAt,
      expiresAt,
    }),

  findById: (snapId: string, now: Date) =>
    Snap.findOne({ _id: snapId, expiresAt: { $gt: now } })
      .select(safeSnapFields)
      .populate({ path: 'sender', select: safeUserFields })
      .populate({ path: 'recipients.user', select: safeUserFields })
      .lean(),

  findInbox: (userId: string, hiddenSenderIds: string[], now: Date, skip: number, limit: number) => {
    const filter = {
      recipients: {
        $elemMatch: {
          user: userId,
          $or: [
            { status: 'sent' },
            { status: 'opened', replayUsed: { $ne: true } },
          ],
        },
      },
      sender: { $nin: hiddenSenderIds },
      expiresAt: { $gt: now },
    };
    return Promise.all([
      Snap.find(filter)
        .select('_id sender mediaType createdAt expiresAt recipients')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'sender', select: safeUserFields })
        .lean(),
      Snap.countDocuments(filter),
    ]);
  },

  findSent: (senderId: string, hiddenRecipientIds: string[], now: Date, skip: number, limit: number) => {
    const filter = {
      sender: senderId,
      expiresAt: { $gt: now },
      recipients: { $elemMatch: { user: { $nin: hiddenRecipientIds } } },
    };
    return Promise.all([
      Snap.find(filter)
        .select('_id mediaType caption createdAt expiresAt recipients')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'recipients.user', select: safeUserFields })
        .lean(),
      Snap.countDocuments(filter),
    ]);
  },

  openForRecipient: (snapId: string, recipientId: string, now: Date) =>
    Snap.findOneAndUpdate(
      {
        _id: snapId,
        expiresAt: { $gt: now },
        recipients: { $elemMatch: { user: recipientId, status: 'sent' } },
      },
      { $set: { 'recipients.$.status': 'opened', 'recipients.$.openedAt': now } },
      { new: true },
    )
      .select(safeSnapFields)
      .populate({ path: 'sender', select: safeUserFields })
      .populate({ path: 'recipients.user', select: safeUserFields })
      .lean(),

  replayForRecipient: (snapId: string, recipientId: string, now: Date) =>
    Snap.findOneAndUpdate(
      {
        _id: snapId,
        expiresAt: { $gt: now },
        recipients: {
          $elemMatch: {
            user: recipientId,
            status: 'opened',
            replayUsed: { $ne: true },
          },
        },
      },
      { $set: { 'recipients.$.replayUsed': true } },
      { new: true },
    )
      .select(safeSnapFields)
      .populate({ path: 'sender', select: safeUserFields })
      .populate({ path: 'recipients.user', select: safeUserFields })
      .lean(),

  findOpenState: (snapId: string) =>
    Snap.findById(snapId)
      .select('_id sender recipients expiresAt')
      .lean(),

  getRecipientState: (snapId: string, recipientId: string) =>
    Snap.findOne({ _id: snapId, 'recipients.user': recipientId })
      .select('_id sender recipients expiresAt')
      .lean(),

  countActiveSent: (senderId: string, now: Date) =>
    Snap.countDocuments({ sender: senderId, expiresAt: { $gt: now } }),

  findExpired: (now: Date, limit: number) =>
    Snap.find({ expiresAt: { $lte: now } })
      .select('_id mediaType +mediaPublicId')
      .limit(limit)
      .lean(),

  deleteExpired: (snapIds: string[]) =>
    Snap.deleteMany({ _id: { $in: snapIds }, expiresAt: { $lte: new Date() } }),
};