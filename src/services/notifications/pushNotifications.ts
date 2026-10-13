import {
  deleteToken,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  type Notification,
} from '@notifee/react-native';
import { NativeModules, Platform } from 'react-native';
import { apiRequest } from '../api/apiClient';

type CachedAvatarResult = {
  uri: string | null;
  httpStatus: number | null;
  contentType: string | null;
  downloaded: boolean;
  cacheHit: boolean;
  failure: string | null;
};

type NotificationAvatarCacheModule = {
  cacheRemoteImage(url: string): Promise<CachedAvatarResult>;
  displayMessageNotification(options: {
    id: string;
    title: string;
    body: string;
    channelId: string;
    smallIcon: string;
    defaultAvatar: string;
    actorId: string;
    avatarUri: string | null;
    httpStatus: number | null;
    contentType: string | null;
    downloadSuccess: boolean;
    cacheHit: boolean;
    timestamp: number;
    data: Record<string, string>;
  }): Promise<void>;
};

const avatarCache = NativeModules.NotificationAvatarCache as
  | NotificationAvatarCacheModule
  | undefined;

const registerToken = (token: string): Promise<{ success: true }> =>
  apiRequest('/notifications/devices', {
    method: 'PUT',
    body: {
      token,
      platform: Platform.OS,
    },
  });

const channels = [
  { id: 'message_received_v1', name: 'Incoming messages', sound: 'message_received', importance: AndroidImportance.HIGH, vibration: true },
  { id: 'snap_received_v1', name: 'Incoming Snaps', sound: 'snap_received', importance: AndroidImportance.HIGH, vibration: true },
  { id: 'friend_request_v1', name: 'Friend requests', sound: 'friend_request', importance: AndroidImportance.DEFAULT, vibration: true },
  { id: 'friend_suggestion_v1', name: 'Friend suggestions', sound: 'friend_suggestion', importance: AndroidImportance.DEFAULT, vibration: false },
  { id: 'incoming_audio_call_v1', name: 'Incoming audio calls', sound: 'incoming_call', importance: AndroidImportance.HIGH, vibration: true },
  { id: 'incoming_video_call_v1', name: 'Incoming video calls', sound: 'incoming_video_call', importance: AndroidImportance.HIGH, vibration: true },
  { id: 'system_default_v1', name: 'Other notifications', sound: 'default', importance: AndroidImportance.DEFAULT, vibration: false },
] as const;

const ANDROID_SMALL_ICON = 'ic_notification_ghost';
const ANDROID_DEFAULT_AVATAR = 'ic_notification_avatar';

const cacheSenderAvatar = async (
  path: 'foreground' | 'background',
  avatarUrl: string | undefined,
): Promise<CachedAvatarResult | undefined> => {
  if (!avatarUrl || !/^https:\/\//i.test(avatarUrl)) {
    console.info('Notification avatar result', {
      path,
      urlPresent: Boolean(avatarUrl),
      httpStatus: null,
      contentType: null,
      downloadSuccess: false,
      finalIconSource: 'default-avatar',
    });
    return undefined;
  }

  if (!avatarCache) {
    console.warn('Notification avatar result', {
      path,
      urlPresent: true,
      httpStatus: null,
      contentType: null,
      downloadSuccess: false,
      finalIconSource: 'default-avatar',
      reason: 'native-cache-unavailable',
    });
    return undefined;
  }

  try {
    const result = await avatarCache.cacheRemoteImage(avatarUrl);
    const imageUri = result.uri && /^file:\/\//i.test(result.uri)
      ? result.uri
      : undefined;
    console.info('Notification avatar result', {
      path,
      urlPresent: true,
      httpStatus: result.httpStatus,
      contentType: result.contentType,
      downloadSuccess: Boolean(imageUri && (result.downloaded || result.cacheHit)),
      finalIconSource: imageUri
        ? result.cacheHit
          ? 'local-cache'
          : 'downloaded-file'
        : 'default-avatar',
      ...(result.failure ? { failure: result.failure } : {}),
    });
    return imageUri ? { ...result, uri: imageUri } : undefined;
  } catch {
    console.warn('Notification avatar result', {
      path,
      urlPresent: true,
      httpStatus: null,
      contentType: null,
      downloadSuccess: false,
      finalIconSource: 'default-avatar',
      reason: 'native-download-error',
    });
    return undefined;
  }
};

const channelForNotification = (
  message: RemoteMessage,
): (typeof channels)[number] => {
  if (message.data?.type === 'INCOMING_CALL') {
    return message.data.kind === 'video'
      ? channels[5]
      : channels[4];
  }
  switch (message.data?.type) {
    case 'MESSAGE_RECEIVED':
      return channels[0];
    case 'SNAP_RECEIVED':
      return channels[1];
    case 'FRIEND_REQUEST':
      return channels[2];
    case 'FRIEND_SUGGESTION':
      return channels[3];
    default:
      return channels[6];
  }
};

const displayRemoteNotification = async (
  message: RemoteMessage,
  path: 'foreground' | 'background',
): Promise<void> => {
  if (message.data?.type === 'INCOMING_CALL') return;
  const title = typeof message.notification?.title === 'string'
    ? message.notification.title
    : typeof message.data?.title === 'string'
      ? message.data.title
      : undefined;
  const body = typeof message.notification?.body === 'string'
    ? message.notification.body
    : typeof message.data?.body === 'string'
      ? message.data.body
      : undefined;
  if (!title || !body) return;
  const channel = channelForNotification(message);
  const avatarUrl = typeof message.data?.avatarUrl === 'string'
    ? message.data.avatarUrl
    : undefined;
  const senderAvatar = Platform.OS === 'android'
    ? await cacheSenderAvatar(path, avatarUrl)
    : undefined;
  const actorId = typeof message.data?.actorId === 'string'
    ? message.data.actorId
    : title;
  const data = Object.entries(message.data ?? {}).reduce<Record<string, string>>(
    (fields, [key, value]) => {
      if (typeof value === 'string') fields[key] = value;
      return fields;
    },
    {},
  );
  if (message.data?.type === 'MESSAGE_RECEIVED' && Platform.OS === 'android') {
    if (!avatarCache) {
      throw new Error('Native Android message notification support is unavailable');
    }
    await avatarCache.displayMessageNotification({
      id: message.messageId ?? `${actorId}-${message.sentTime ?? Date.now()}`,
      title,
      body,
      channelId: channel.id,
      smallIcon: ANDROID_SMALL_ICON,
      defaultAvatar: ANDROID_DEFAULT_AVATAR,
      actorId,
      avatarUri: senderAvatar?.uri ?? null,
      httpStatus: senderAvatar?.httpStatus ?? null,
      contentType: senderAvatar?.contentType ?? null,
      downloadSuccess: Boolean(senderAvatar?.uri && (
        senderAvatar.downloaded || senderAvatar.cacheHit
      )),
      cacheHit: senderAvatar?.cacheHit ?? false,
      timestamp: message.sentTime ?? Date.now(),
      data,
    });
    return;
  }

  const android: NonNullable<Notification['android']> = {
    channelId: channel.id,
    smallIcon: ANDROID_SMALL_ICON,
    pressAction: { id: 'default' },
  };

  if (senderAvatar) {
    android.largeIcon = senderAvatar.uri ?? undefined;
    android.circularLargeIcon = true;
  }

  const notification: Notification = {
    id: message.messageId,
    title,
    body,
    data,
    android,
    ios: { sound: channel.sound === 'default' ? 'default' : `${channel.sound}.wav` },
  };

  try {
    await notifee.displayNotification(notification);
  } catch {
    console.warn('Unable to display notification with sender avatar; retrying with default.', {
      path,
      urlPresent: Boolean(avatarUrl),
      httpStatus: null,
      contentType: null,
      downloadSuccess: false,
      finalIconSource: 'default-avatar',
    });
    const androidFallback: NonNullable<Notification['android']> = {
      ...android,
      largeIcon: ANDROID_DEFAULT_AVATAR,
    };
    await notifee.displayNotification({
      ...notification,
      android: androidFallback,
    });
  }
};

setBackgroundMessageHandler(getMessaging(), async message => {
  if (Platform.OS !== 'android') return;
  try {
    await displayRemoteNotification(message, 'background');
  } catch {
    console.error('Unable to display background notification', {
      path: 'background',
    });
  }
});

export const initializePushNotifications = async (): Promise<() => void> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return () => undefined;

  const messagingInstance = getMessaging();
  await notifee.createChannels(channels.map(({ id, name, sound, importance, vibration }) => ({
    id,
    name,
    sound,
    importance,
    vibration,
  })));
  await registerDeviceForRemoteMessages(messagingInstance);

  const permission = await notifee.requestPermission();
  if (
    permission.authorizationStatus !== AuthorizationStatus.AUTHORIZED &&
    permission.authorizationStatus !== AuthorizationStatus.PROVISIONAL
  ) {
    console.warn('Push notifications are disabled by device settings.');
    return () => undefined;
  }

  const token = await getToken(messagingInstance);
  await registerToken(token);

  const unsubscribeMessage = onMessage(messagingInstance, message => {
    displayRemoteNotification(message, 'foreground').catch(() => {
      console.error('Unable to display foreground notification', {
        path: 'foreground',
      });
    });
  });
  const unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, refreshedToken => {
    registerToken(refreshedToken).catch(() => {
      console.error('Unable to register refreshed push token');
    });
  });

  return () => {
    unsubscribeMessage();
    unsubscribeTokenRefresh();
  };
};

export const unregisterPushDevice = async (): Promise<void> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const messagingInstance = getMessaging();
  const token = await getToken(messagingInstance);
  await apiRequest<{ success: true }>('/notifications/devices', {
    method: 'DELETE',
    body: { token },
  });
  await deleteToken(messagingInstance);
};
