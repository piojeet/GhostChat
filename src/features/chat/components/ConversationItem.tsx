import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import type { SafeUser } from '../../friends/types/friend.types';
import type { SentSnap, SnapInboxItem } from '../../snaps/types/snap.types';
import type { ChatConversation } from '../types/chat.types';
import GenderAvatar from '../../profile/components/GenderAvatar';

type Props = {
  friend: SafeUser;
  incomingSnap?: SnapInboxItem;
  incomingSnapCount?: number;
  sentSnap?: SentSnap['recipients'][number] & { createdAt: string };
  chat?: ChatConversation;
  currentUserId?: string;
  typing?: boolean;
  online?: boolean;
  onPress: () => void;
  onOpenChat: () => void;
  onSendSnap: () => void;
};

const relativeTime = (value?: string): string => {
  if (!value) return '';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
};

const ConversationItem = ({
  friend,
  incomingSnap,
  incomingSnapCount = 0,
  sentSnap,
  chat,
  currentUserId,
  typing = false,
  online = false,
  onPress,
  onOpenChat,
  onSendSnap,
}: Props) => {
  const hasNewSnap = Boolean(incomingSnap && !incomingSnap.opened);
  const incomingIsLatest = Boolean(
    incomingSnap &&
      (!sentSnap || new Date(incomingSnap.createdAt) >= new Date(sentSnap.createdAt)),
  );
  const latestSnapAt = Math.max(
    incomingSnap ? new Date(incomingSnap.createdAt).getTime() : 0,
    sentSnap ? new Date(sentSnap.createdAt).getTime() : 0,
  );
  const messageIsLatest = Boolean(
    chat?.lastMessage &&
      new Date(chat.lastMessage.sentAt).getTime() >= latestSnapAt,
  );
  const status = messageIsLatest && chat?.lastMessage
    ? `${chat.lastMessage.senderId === currentUserId ? 'You' : friend.displayName}: ${chat.lastMessage.text}`
    : incomingIsLatest
    ? hasNewSnap
      ? `${incomingSnapCount > 1 ? `${incomingSnapCount} ` : ''}New Snap${incomingSnapCount > 1 ? 's' : ''}`
      : 'Received'
    : sentSnap?.status === 'opened'
      ? 'Opened'
      : sentSnap
        ? 'Sent'
        : null;
  const statusTime = messageIsLatest
    ? chat?.lastMessage?.sentAt
    : incomingIsLatest ? incomingSnap?.createdAt : sentSnap?.createdAt;
  const isOutgoingOpened = !incomingIsLatest && sentSnap?.status === 'opened';
  const isOutgoingPending = !incomingIsLatest && sentSnap?.status === 'sent';
  const statusColor = messageIsLatest
    ? chat?.unreadCount ? '#181B1E' : '#737B82'
    : hasNewSnap
    ? incomingSnap?.mediaType === 'video' ? '#AF19F5' : '#FF3158'
    : incomingIsLatest
      ? '#FF3158'
      : isOutgoingPending
        ? '#AF55D7'
      : sentSnap
        ? '#AF55D7'
        : '#AFBAC2';
  const preview = typing ? 'Typing…' : status;
  const previewColor = typing ? '#FF3158' : statusColor;
  const unreadMessageCount = chat?.unreadCount ?? 0;

  return (
    <View style={[styles.row, unreadMessageCount > 0 && styles.unreadRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hasNewSnap
            ? `Open new Snap from ${friend.displayName}`
            : `Open chat with ${friend.displayName}`
        }
        onPress={onPress}
        style={styles.friendButton}
      >
        <View style={styles.avatarWrap}>
          <GenderAvatar
            avatar={friend.avatar}
            gender={friend.gender}
            size={38}
          />
          {online ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={styles.details}>
          <Text
            numberOfLines={1}
            style={[styles.name, unreadMessageCount > 0 && styles.unreadName]}
          >
            {friend.displayName}
          </Text>
          {preview || unreadMessageCount > 0 ? (
            <View style={styles.statusLine}>
              {preview ? (
                <>
                  {typing ? (
                    <Icon name="more-horizontal" size={16} color={previewColor} style={styles.statusIcon} />
                  ) : messageIsLatest ? (
                    <Icon name="message-square" size={14} color={statusColor} style={styles.statusIcon} />
                  ) : isOutgoingOpened ? (
                    <Icon name="send" size={14} color={statusColor} style={styles.statusIcon} />
                  ) : (
                    <View
                      style={[
                        styles.statusIcon,
                        styles.statusSquare,
                        { borderColor: statusColor },
                        (hasNewSnap || isOutgoingPending) && { backgroundColor: statusColor },
                      ]}
                    />
                  )}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.status,
                      !typing && hasNewSnap && styles.newStatus,
                      isOutgoingPending && styles.sentStatus,
                      !hasNewSnap && !isOutgoingPending && styles.oldStatus,
                      isOutgoingOpened && styles.openedStatus,
                      messageIsLatest && unreadMessageCount > 0 && styles.messageUnread,
                      typing && styles.typingStatus,
                      { color: previewColor },
                    ]}
                  >
                    {preview}
                  </Text>
                  {!typing ? (
                    <>
                      <Text style={styles.separator}>·</Text>
                      <Text style={styles.time}>{relativeTime(statusTime)}</Text>
                    </>
                  ) : null}
                </>
              ) : null}
              {unreadMessageCount > 0 ? (
                <View
                  accessible
                  accessibilityLabel={`${unreadMessageCount} unread message${unreadMessageCount === 1 ? '' : 's'}`}
                  style={styles.messageUnreadBadge}
                >
                  <Text style={styles.messageUnreadBadgeText}>
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      {hasNewSnap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open chat with ${friend.displayName}`}
          onPress={onOpenChat}
          style={styles.actionButton}
        >
          <Icon name="message-square" size={23} color="#B6C0C6" />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Send a Snap to ${friend.displayName}`}
          onPress={onSendSnap}
          style={styles.actionButton}
        >
          <Icon name="camera" size={27} color="#B6C0C6" />
        </Pressable>
      )}
    </View>
  );
};

export default ConversationItem;

const styles = createAdaptiveStyles({
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E6E9',
    backgroundColor: '#FFFFFF',
  },
  unreadRow: {
    backgroundColor: '#FFF8F8',
  },
  friendButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 38,
    height: 38,
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 6,
    backgroundColor: '#34C759',
  },
  details: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  name: {
    color: '#181B1E',
    fontSize: 15,
    fontWeight: '600',
  },
  unreadName: {
    fontWeight: '700',
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusSquare: {
    width: 11,
    height: 11,
    borderWidth: 1.5,
    borderRadius: 3,
  },
  status: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  newStatus: {
    color: '#FF3158',
  },
  sentStatus: {
    color: '#AF55D7',
  },
  oldStatus: {
    color: '#AFBAC2',
  },
  openedStatus: {
    color: '#AFBAC2',
  },
  messageUnread: {
    fontWeight: '700',
  },
  typingStatus: {
    fontWeight: '600',
  },
  separator: {
    marginHorizontal: 7,
    color: '#D6DDE2',
    fontSize: 13,
  },
  time: {
    color: '#AFBAC2',
    fontSize: 13,
  },
  messageUnreadBadge: {
    minWidth: 19,
    height: 19,
    marginLeft: 'auto',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FF3158',
  },
  messageUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  actionButton: {
    width: 54,
    height: 40,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E7EAEC',
  },
});
