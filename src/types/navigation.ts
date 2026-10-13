import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SnapMedia } from '../features/camera/types/media';
import type { SnapFilter } from '../features/camera/types/filters';

type CameraMediaParams = {
  media?: SnapMedia;
  imageUri?: string;
  mediaType?: 'photo' | 'video';
  selectedFilter?: SnapFilter;
  initialText?: string;
  initialTool?: 'text' | 'draw';
};

export type SnapRecipientTarget = {
  recipientId?: string;
  recipientName?: string;
};

export type CallRouteParams = {
  userId: string;
  name: string;
  avatar?: string | null;
  callId?: string;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOtp: { email?: string; purpose?: 'registration' | 'password-reset' };
  ResetPassword: { email?: string; otp?: string } | undefined;
};

export type MainTabParamList = {
  MainTabs: NavigatorScreenParams<PrimaryTabParamList> | undefined;
  Chats: undefined;
  Friends: undefined;
  AddFriends: undefined;
  FriendRequests: undefined;
  Discover: { tag?: string } | undefined;
  Search: undefined;
  Camera: SnapRecipientTarget | undefined;
  MediaPreview: (CameraMediaParams & SnapRecipientTarget) | undefined;
  CameraPreview: (CameraMediaParams & { sampleMedia?: boolean } & SnapRecipientTarget) | undefined;
  EditSnap: (CameraMediaParams & { sampleMedia?: boolean } & SnapRecipientTarget) | undefined;
  MediaMessage:
    | {
        mediaId?: string;
        imageUri?: string;
        userId?: string;
        name?: string;
      }
    | undefined;
  ResetPassword: { email?: string; otp?: string } | undefined;
  VerifyOtp: { email: string; purpose: 'registration' | 'password-reset' };
  SendSnap: ({ media?: SnapMedia; imageUri?: string; sampleMedia?: boolean; mediaType?: 'photo' | 'video'; caption?: string } & SnapRecipientTarget) | undefined;
  Stories: undefined;
  CreateStory: { imageUri?: string; sampleMedia?: boolean; mediaType?: 'photo' | 'video' } | undefined;
  StoryViewer: { storyId?: string; source?: 'Stories' | 'Discover' } | undefined;
  SnapViewer: { snapId: string; userId: string; name: string; mode?: 'open' | 'replay' };
  Chat: { userId: string; name: string; initialMessage?: string; chatId?: string };
  IncomingAudioCall: CallRouteParams & { callId: string; kind: 'audio' | 'video' };
  AudioCall: CallRouteParams;
  VideoCall: CallRouteParams;
  Map: undefined;
  LocationDetails: undefined;
  Notifications: undefined;
  Profile: undefined;
  EditProfile: undefined;
  PublicProfile: { userId?: string; username?: string; name?: string } | undefined;
  Settings: undefined;
  AccountSettings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  SecuritySettings: undefined;
  Report: { userId: string; name: string; username?: string };
  BlockedUsers: undefined;
};

export type PrimaryTabParamList = {
  Chats: undefined;
  Discover: { tag?: string } | undefined;
  Camera: SnapRecipientTarget | undefined;
  Map: undefined;
  Profile: undefined;
};

export type MainStackParamList = MainTabParamList;

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
};
