import { HttpError } from '../../utils/httpError';
import { blockRepository } from '../blocks/block.repository';
import { friendService } from '../friends/friend.service';
import { notificationService } from '../notifications/notification.service';
import {
  deleteCloudinaryAsset,
  getCloudinaryClient,
  uploadCloudinaryBuffer,
} from '../media/cloudinaryStorage';
import { snapRepository } from './snap.repository';
import type {
  SafeSnapUser,
  SendSnapInput,
  SnapMediaType,
} from './snap.types';

const SNAP_LIFETIME_MS = 24 * 60 * 60 * 1000;

type PopulatedRecipient = {
  user: SafeSnapUser;
  status: 'sent' | 'opened';
  openedAt: Date | null;
  replayUsed?: boolean;
};

type PopulatedSnap = {
  _id: { toString(): string };
  sender: SafeSnapUser;
  recipients: PopulatedRecipient[];
  media: string;
  mediaType: SnapMediaType;
  caption: string;
  createdAt: Date;
  expiresAt: Date;
};

const toSafeUser = (user: SafeSnapUser) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar ?? null,
});

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  hasNextPage: page * limit < total,
});

const hasSupportedMediaContent = (
  file: Express.Multer.File,
  mediaType: SnapMediaType,
): boolean => {
  const { buffer, mimetype } = file;
  if (mediaType === 'image') {
    const png =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    const gif =
      buffer.length >= 6 &&
      ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    const webp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return (
      (mimetype === 'image/png' && png) ||
      (mimetype === 'image/jpeg' && jpeg) ||
      (mimetype === 'image/gif' && gif) ||
      (mimetype === 'image/webp' && webp)
    );
  }
  const mp4 =
    buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  const webm =
    buffer.length >= 4 &&
    buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return (
    ((mimetype === 'video/mp4' || mimetype === 'video/quicktime') && mp4) ||
    (mimetype === 'video/webm' && webm)
  );
};

const safeSnapResponse = (snap: PopulatedSnap) => ({
  id: snap._id.toString(),
  sender: toSafeUser(snap.sender),
  recipients: snap.recipients.map(recipient => ({
    user: toSafeUser(recipient.user),
    status: recipient.status,
    openedAt: recipient.openedAt,
  })),
  media: snap.media,
  mediaType: snap.mediaType,
  caption: snap.caption,
  createdAt: snap.createdAt,
  expiresAt: snap.expiresAt,
});

export const snapService = {
  async sendSnap(senderId: string, file: Express.Multer.File, input: SendSnapInput) {
    if (!(await snapRepository.findEligibleSender(senderId))) {
      throw new HttpError(401, 'Authenticated user is unavailable', 'UNAUTHENTICATED');
    }
    if (input.recipients.includes(senderId)) {
      throw new HttpError(400, 'You cannot send a snap to yourself', 'INVALID_RECIPIENT');
    }
    if (!hasSupportedMediaContent(file, input.mediaType)) {
      throw new HttpError(
        400,
        'File content does not match the selected media type',
        'INVALID_SNAP_MEDIA',
      );
    }
    const sizeLimit = input.mediaType === 'image' ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > sizeLimit) {
      throw new HttpError(
        413,
        input.mediaType === 'image'
          ? 'Snap images must be 15 MB or smaller'
          : 'Snap videos must be 50 MB or smaller',
        'INVALID_SNAP_MEDIA',
      );
    }

    const users = await snapRepository.findEligibleUsers(input.recipients);
    if (users.length !== input.recipients.length) {
      throw new HttpError(404, 'One or more recipients were not found', 'INVALID_RECIPIENT');
    }

    const blockedIds = new Set(await blockRepository.getBlockedUserIds(senderId));
    if (input.recipients.some(recipientId => blockedIds.has(recipientId))) {
      throw new HttpError(403, 'A recipient is blocked', 'ALREADY_BLOCKED');
    }
    const friendIds = new Set(await friendService.getFriendIds(senderId));
    if (input.recipients.some(recipientId => !friendIds.has(recipientId))) {
      throw new HttpError(403, 'Snaps can only be sent to friends', 'NOT_FRIENDS');
    }

    getCloudinaryClient();
    const uploaded = await uploadCloudinaryBuffer(file.buffer, {
      folder: 'snapapp/snaps',
      resource_type: input.mediaType === 'video' ? 'video' : 'image',
    });
    const createdAt = new Date();
    let snapId: string;
    try {
      const snap = await snapRepository.create(
        senderId,
        input.recipients,
        uploaded.url,
        uploaded.publicId,
        input.mediaType,
        input.caption,
        createdAt,
        new Date(createdAt.getTime() + SNAP_LIFETIME_MS),
      );
      snapId = snap._id.toString();
    } catch (error) {
      try {
        await deleteCloudinaryAsset(
          uploaded.publicId,
          input.mediaType,
        );
      } catch (cleanupError) {
        console.error('Unable to clean up snap media after database failure', cleanupError);
      }
      throw error;
    }
    const notificationResults = await Promise.allSettled(
      input.recipients.map(recipientId =>
        notificationService.create({
          recipientId,
          actorId: senderId,
          type: 'SNAP_RECEIVED',
          entityType: 'snap',
          entityId: snapId,
          eventKey: `snap_received:${snapId}:${recipientId}`,
        }),
      ),
    );
    notificationResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('Unable to create snap notification', {
          snapId,
          recipientId: input.recipients[index],
          error: result.reason,
        });
      }
    });
    const created = await snapRepository.findById(snapId, new Date());
    if (!created) {
      throw new HttpError(500, 'Unable to load created snap', 'SNAP_CREATE_FAILED');
    }
    return safeSnapResponse(created as unknown as PopulatedSnap);
  },

  async getInbox(userId: string, page: number, limit: number) {
    const hiddenSenderIds = await blockRepository.getBlockedUserIds(userId);
    const [snaps, total] = await snapRepository.findInbox(
      userId,
      hiddenSenderIds,
      new Date(),
      (page - 1) * limit,
      limit,
    );
    return {
      items: snaps.flatMap(snap => {
        const item = snap as unknown as PopulatedSnap;
        const recipient = item.recipients.find(
          entry => entry.user._id.toString() === userId,
        );
        if (!recipient) return [];
        return [{
          id: item._id.toString(),
          sender: toSafeUser(item.sender),
          mediaType: item.mediaType,
          createdAt: item.createdAt,
          expiresAt: item.expiresAt,
          opened: recipient.status === 'opened',
          replayAvailable: recipient.status === 'opened' && recipient.replayUsed !== true,
        }];
      }),
      pagination: pagination(page, limit, total),
    };
  },

  async getSent(userId: string, page: number, limit: number) {
    const hiddenRecipientIds = await blockRepository.getBlockedUserIds(userId);
    const hidden = new Set(hiddenRecipientIds);
    const [snaps, total] = await snapRepository.findSent(
      userId,
      hiddenRecipientIds,
      new Date(),
      (page - 1) * limit,
      limit,
    );
    return {
      items: snaps.map(snap => {
        const item = snap as unknown as PopulatedSnap;
        return {
          id: item._id.toString(),
          recipients: item.recipients
            .filter(recipient => !hidden.has(recipient.user._id.toString()))
            .map(recipient => ({
              user: toSafeUser(recipient.user),
              status: recipient.status,
              openedAt: recipient.openedAt,
            })),
          mediaType: item.mediaType,
          caption: item.caption,
          createdAt: item.createdAt,
          expiresAt: item.expiresAt,
        };
      }),
      pagination: pagination(page, limit, total),
    };
  },

  async openSnap(userId: string, snapId: string) {
    const initial = await snapRepository.findOpenState(snapId);
    if (!initial) {
      throw new HttpError(404, 'Snap not found', 'SNAP_NOT_FOUND');
    }
    const initialRecipient = initial.recipients.find(
      recipient => recipient.user.toString() === userId,
    );
    if (!initialRecipient) {
      throw new HttpError(403, 'You are not a recipient of this snap', 'NOT_A_RECIPIENT');
    }
    const initialSenderId = initial.sender.toString();
    if (await blockRepository.isBlockedBetween(initialSenderId, userId)) {
      throw new HttpError(403, 'This snap is not available', 'ALREADY_BLOCKED');
    }
    if (initial.expiresAt <= new Date()) {
      throw new HttpError(410, 'Snap has expired', 'SNAP_EXPIRED');
    }
    if (initialRecipient.status === 'opened') {
      throw new HttpError(410, 'Snap has already been opened', 'SNAP_ALREADY_OPENED');
    }

    const result = await snapRepository.openForRecipient(snapId, userId, new Date());
    if (result) {
      const snap = result as unknown as PopulatedSnap;
      if (await blockRepository.isBlockedBetween(snap.sender._id.toString(), userId)) {
        throw new HttpError(403, 'This snap is not available', 'ALREADY_BLOCKED');
      }
      return {
        snap: {
          id: snap._id.toString(),
          sender: toSafeUser(snap.sender),
          media: snap.media,
          mediaType: snap.mediaType,
          caption: snap.caption,
          createdAt: snap.createdAt,
          expiresAt: snap.expiresAt,
          openedAt: snap.recipients.find(
            recipient => recipient.user._id.toString() === userId,
          )?.openedAt,
          replayAvailable: true,
        },
      };
    }

    const existing = await snapRepository.getRecipientState(snapId, userId);
    if (!existing) {
      throw new HttpError(404, 'Snap not found', 'SNAP_NOT_FOUND');
    }
    if (existing.expiresAt <= new Date()) {
      throw new HttpError(410, 'Snap has expired', 'SNAP_EXPIRED');
    }
    const senderId = existing.sender.toString();
    if (await blockRepository.isBlockedBetween(senderId, userId)) {
      throw new HttpError(403, 'This snap is not available', 'ALREADY_BLOCKED');
    }
    const recipient = existing.recipients.find(
      entry => entry.user.toString() === userId,
    );
    if (!recipient) {
      throw new HttpError(403, 'You are not a recipient of this snap', 'NOT_A_RECIPIENT');
    }
    if (recipient.status === 'opened') {
      throw new HttpError(410, 'Snap has already been opened', 'SNAP_ALREADY_OPENED');
    }
    throw new HttpError(409, 'Snap could not be opened', 'INVALID_SNAP');
  },

  async replaySnap(userId: string, snapId: string) {
    const existing = await snapRepository.getRecipientState(snapId, userId);
    if (!existing) {
      throw new HttpError(404, 'Snap not found', 'SNAP_NOT_FOUND');
    }
    if (existing.expiresAt <= new Date()) {
      throw new HttpError(410, 'Snap has expired', 'SNAP_EXPIRED');
    }
    const senderId = existing.sender.toString();
    if (await blockRepository.isBlockedBetween(senderId, userId)) {
      throw new HttpError(403, 'This snap is not available', 'ALREADY_BLOCKED');
    }
    const recipient = existing.recipients.find(
      entry => entry.user.toString() === userId,
    );
    if (!recipient) {
      throw new HttpError(403, 'You are not a recipient of this snap', 'NOT_A_RECIPIENT');
    }
    if (recipient.status !== 'opened') {
      throw new HttpError(409, 'Open this snap before replaying it', 'SNAP_NOT_OPENED');
    }
    if (recipient.replayUsed === true) {
      throw new HttpError(410, 'This snap replay has already been used', 'SNAP_REPLAY_USED');
    }

    const replayed = await snapRepository.replayForRecipient(
      snapId,
      userId,
      new Date(),
    );
    if (!replayed) {
      throw new HttpError(410, 'This snap replay is no longer available', 'SNAP_REPLAY_USED');
    }
    const snap = replayed as unknown as PopulatedSnap;
    return {
      snap: {
        id: snap._id.toString(),
        sender: toSafeUser(snap.sender),
        media: snap.media,
        mediaType: snap.mediaType,
        caption: snap.caption,
        createdAt: snap.createdAt,
        expiresAt: snap.expiresAt,
        openedAt: snap.recipients.find(
          entry => entry.user._id.toString() === userId,
        )?.openedAt,
        replayAvailable: false,
      },
    };
  },

  async getSnap(userId: string, snapId: string) {
    const snap = await snapRepository.findById(snapId, new Date());
    if (!snap) {
      throw new HttpError(404, 'Snap not found', 'SNAP_NOT_FOUND');
    }
    const item = snap as unknown as PopulatedSnap;
    const senderId = item.sender._id.toString();
    const recipient = item.recipients.find(
      entry => entry.user._id.toString() === userId,
    );
    if (senderId !== userId && !recipient) {
      throw new HttpError(404, 'Snap not found', 'SNAP_NOT_FOUND');
    }
    if (senderId !== userId && await blockRepository.isBlockedBetween(senderId, userId)) {
      throw new HttpError(404, 'Snap not found', 'SNAP_NOT_FOUND');
    }
    return {
      snap: {
        id: item._id.toString(),
        sender: toSafeUser(item.sender),
        recipients: senderId === userId
          ? item.recipients.map(entry => ({
              user: toSafeUser(entry.user),
              status: entry.status,
              openedAt: entry.openedAt,
            }))
          : undefined,
        mediaType: item.mediaType,
        caption: item.caption,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        opened: recipient?.status === 'opened',
        mediaAvailable: false,
      },
    };
  },

  countActiveSent(userId: string): Promise<number> {
    return snapRepository.countActiveSent(userId, new Date());
  },

  isCloudinaryConfigured(): boolean {
    try {
      getCloudinaryClient();
      return true;
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 503) return false;
      throw error;
    }
  },
};