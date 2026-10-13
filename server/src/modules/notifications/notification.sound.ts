import type { NotificationType } from './notification.types';

export const notificationSoundRoutes = {
  MESSAGE_RECEIVED: { channelId: 'message_received_v1', sound: 'message_received' },
  SNAP_RECEIVED: { channelId: 'snap_received_v1', sound: 'snap_received' },
  FRIEND_REQUEST: { channelId: 'friend_request_v1', sound: 'friend_request' },
  FRIEND_SUGGESTION: { channelId: 'friend_suggestion_v1', sound: 'friend_suggestion' },
  INCOMING_AUDIO_CALL: { channelId: 'incoming_audio_call_v1', sound: 'incoming_call' },
  INCOMING_VIDEO_CALL: { channelId: 'incoming_video_call_v1', sound: 'incoming_video_call' },
  SYSTEM: { channelId: 'system_default_v1', sound: 'default' },
} as const;

export const notificationSoundForType = (type: NotificationType) => {
  switch (type) {
    case 'MESSAGE_RECEIVED':
      return notificationSoundRoutes.MESSAGE_RECEIVED;
    case 'SNAP_RECEIVED':
      return notificationSoundRoutes.SNAP_RECEIVED;
    case 'FRIEND_REQUEST':
      return notificationSoundRoutes.FRIEND_REQUEST;
    default:
      return notificationSoundRoutes.SYSTEM;
  }
};

export const incomingCallSoundForKind = (kind: 'audio' | 'video') =>
  kind === 'audio'
    ? notificationSoundRoutes.INCOMING_AUDIO_CALL
    : notificationSoundRoutes.INCOMING_VIDEO_CALL;
