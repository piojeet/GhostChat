export type NotificationPreferenceKey =
  | 'push'
  | 'snaps'
  | 'stories'
  | 'friendRequests'
  | 'mentions'
  | 'comments'
  | 'likes'
  | 'newFollowers'
  | 'systemUpdates';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

const notificationPreferences: NotificationPreferences = {
  push: true,
  snaps: true,
  stories: true,
  friendRequests: true,
  mentions: true,
  comments: false,
  likes: true,
  newFollowers: true,
  systemUpdates: true,
};

export const getNotificationPreferences = (): NotificationPreferences => ({
  ...notificationPreferences,
});

export const setNotificationPreference = (
  key: NotificationPreferenceKey,
  enabled: boolean,
): NotificationPreferences => {
  notificationPreferences[key] = enabled;
  return getNotificationPreferences();
};

export type PrivacyChoice = 'Everyone' | 'Friends Only' | 'Nobody';

export type PrivacyPreferenceKey =
  | 'whoCanContact'
  | 'whoCanViewStory'
  | 'whoCanSeeLocation'
  | 'showInQuickAdd'
  | 'allowFriendRequests'
  | 'readReceipts'
  | 'activityStatus';

export type PrivacyPreferences = {
  whoCanContact: PrivacyChoice;
  whoCanViewStory: PrivacyChoice;
  whoCanSeeLocation: PrivacyChoice;
  showInQuickAdd: boolean;
  allowFriendRequests: boolean;
  readReceipts: boolean;
  activityStatus: boolean;
};

const privacyPreferences: PrivacyPreferences = {
  whoCanContact: 'Everyone',
  whoCanViewStory: 'Friends Only',
  whoCanSeeLocation: 'Friends Only',
  showInQuickAdd: true,
  allowFriendRequests: true,
  readReceipts: false,
  activityStatus: true,
};

export const getPrivacyPreferences = (): PrivacyPreferences => ({
  ...privacyPreferences,
});

export const setPrivacyChoice = (
  key: 'whoCanContact' | 'whoCanViewStory' | 'whoCanSeeLocation',
  value: PrivacyChoice,
): PrivacyPreferences => {
  privacyPreferences[key] = value;
  return getPrivacyPreferences();
};

export const setPrivacyToggle = (
  key: 'showInQuickAdd' | 'allowFriendRequests' | 'readReceipts' | 'activityStatus',
  value: boolean,
): PrivacyPreferences => {
  privacyPreferences[key] = value;
  return getPrivacyPreferences();
};

export type SecurityPreferences = {
  twoFactorEnabled: boolean;
};

const securityPreferences: SecurityPreferences = {
  twoFactorEnabled: false,
};

export const getSecurityPreferences = (): SecurityPreferences => ({
  ...securityPreferences,
});

export const setTwoFactorEnabled = (enabled: boolean): SecurityPreferences => {
  securityPreferences.twoFactorEnabled = enabled;
  return getSecurityPreferences();
};