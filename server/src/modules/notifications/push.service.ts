import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type BatchResponse, type MulticastMessage } from 'firebase-admin/messaging';
import { env } from '../../config/env';
import { getSocketServer } from '../../config/socket';
import { chatRoom, userRoom } from '../../sockets/socketEvents';
import { User } from '../users/user.model';
import { userRepository } from '../users/user.repository';
import {
  incomingCallSoundForKind,
  notificationSoundForType,
  notificationSoundRoutes,
} from './notification.sound';
import type { NotificationType } from './notification.types';

const firebaseApp = env.FIREBASE_PROJECT_ID && env.GOOGLE_APPLICATION_CREDENTIALS
  ? getApps()[0] ?? initializeApp({
      credential: applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    })
  : null;
const messaging = firebaseApp ? getMessaging(firebaseApp) : null;

const invalidTokenCodes = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

const tokenChunks = <T,>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let offset = 0; offset < values.length; offset += size) {
    chunks.push(values.slice(offset, offset + size));
  }
  return chunks;
};

const removeInvalidTokens = async (recipientId: string, tokens: string[]) => {
  await Promise.all(tokens.map(token => userRepository.removePushDevice(recipientId, token)));
};

type PushPlatform = 'android' | 'ios';

const sendToRecipient = async (
  recipientId: string,
  payloadForPlatform: (
    platform: PushPlatform,
  ) => Omit<MulticastMessage, 'tokens'>,
): Promise<{ sentCount: number; failureCount: number; reason?: 'not_configured' | 'no_devices' }> => {
  if (!messaging) {
    return { sentCount: 0, failureCount: 0, reason: 'not_configured' };
  }
  const devices = await userRepository.listPushDevices(recipientId);
  if (devices.length === 0) {
    return { sentCount: 0, failureCount: 0, reason: 'no_devices' };
  }

  const invalidTokens: string[] = [];
  let sentCount = 0;
  let failureCount = 0;
  for (const platform of ['android', 'ios'] as const) {
    const platformDevices = devices.filter(device => device.platform === platform);
    for (const devicesChunk of tokenChunks(platformDevices, 500)) {
      const tokens = devicesChunk.map(device => device.token);
      const result: BatchResponse = await messaging.sendEachForMulticast({
        ...payloadForPlatform(platform),
        tokens,
      });
      sentCount += result.successCount;
      failureCount += result.failureCount;
      result.responses.forEach((response, index) => {
        if (
          !response.success &&
          invalidTokenCodes.has(response.error?.code ?? '')
        ) {
          invalidTokens.push(tokens[index]);
        }
      });
    }
  }
  await removeInvalidTokens(recipientId, invalidTokens);
  return { sentCount, failureCount };
};

const pushToUser = async (
  recipientId: string,
  title: string,
  body: string,
  data: Record<string, string>,
  route: { channelId: string; sound: string },
  androidDataOnly = false,
): Promise<{ sentCount: number; failureCount: number; reason?: 'not_configured' | 'no_devices' }> => {
  return sendToRecipient(recipientId, platform => ({
    ...(platform === 'ios' || !androidDataOnly
      ? { notification: { title, body } }
      : {}),
    data: { ...data, title, body },
    android: {
      priority: 'high',
      notification: { channelId: route.channelId, sound: route.sound },
    },
    apns: {
      headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
      payload: { aps: { sound: route.sound === 'default' ? 'default' : `${route.sound}.wav` } },
    },
  }));
};

const recipientHasChatOpen = async (recipientId: string, chatId: string): Promise<boolean> => {
  try {
    const sockets = await getSocketServer().in(userRoom(recipientId)).fetchSockets();
    return sockets.some(socket =>
      socket.data.userId === recipientId && socket.rooms.has(chatRoom(chatId)),
    );
  } catch {
    return false;
  }
};

export const pushService = {
  async sendNotification(input: {
    recipientId: string;
    actorId: string;
    type: Exclude<NotificationType, 'SYSTEM'>;
    entityType?: string;
    entityId?: string;
    body: string;
  }) {
    if (input.type === 'MESSAGE_RECEIVED' &&
        input.entityType === 'chat' &&
        input.entityId &&
        await recipientHasChatOpen(input.recipientId, input.entityId)) {
      return { sentCount: 0, failureCount: 0, reason: 'chat_open' as const };
    }
    const actor = await User.findOne({
      _id: input.actorId,
      isActive: true,
      isEmailVerified: true,
    }).select('displayName avatar').lean();
    const avatarUrl = actor?.avatar?.match(/^https:\/\//i)
      ? actor.avatar
      : undefined;
    return pushToUser(
      input.recipientId,
      actor?.displayName ?? 'SnapApp',
      input.body,
      {
        type: input.type,
        actorId: input.actorId,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.type === 'MESSAGE_RECEIVED' && input.entityId
          ? { chatId: input.entityId }
          : {}),
      },
      notificationSoundForType(input.type),
      true,
    );
  },

  async sendSystemNotification(input: {
    recipientId: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
  }) {
    return pushToUser(
      input.recipientId,
      input.title,
      input.body,
      {
        type: 'SYSTEM',
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
      },
      notificationSoundRoutes.SYSTEM,
      true,
    );
  },

  async sendIncomingCall(input: {
    recipientId: string;
    callerId: string;
    callId: string;
    kind: 'audio' | 'video';
  }) {
    const caller = await User.findById(input.callerId).select('displayName').lean();
    const title = caller?.displayName ?? 'SnapApp';
    const route = incomingCallSoundForKind(input.kind);
    return pushToUser(
      input.recipientId,
      title,
      `Incoming ${input.kind} call`,
      { type: 'INCOMING_CALL', callId: input.callId, kind: input.kind },
      route,
    );
  },
};
