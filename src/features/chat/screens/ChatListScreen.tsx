import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { ApiError } from '../../../services/api/apiError';
import {
  getFriends,
  getFriendSuggestions,
  getIncomingRequests,
  sendFriendRequest,
} from '../../friends/services/friendService';
import type {
  FriendItem,
  FriendSuggestion,
  PaginatedResponse,
  SearchUser,
} from '../../friends/types/friend.types';
import { getSentSnaps, getSnapInbox } from '../../snaps/services/snapService';
import type { SentSnap, SnapInboxItem } from '../../snaps/types/snap.types';
import ConversationItem from '../components/ConversationItem';
import GenderAvatar from '../../profile/components/GenderAvatar';
import { authStore } from '../../../store/authStore';
import { chatStore } from '../../../store/chatStore';
import { getUnreadCount } from '../../notifications/services/notificationService';
import { getSocketClient } from '../../../services/socket/socketClient';
import { getChats } from '../services/chatService';
import type { ChatConversation } from '../types/chat.types';

type Props = BottomTabScreenProps<MainTabParamList, 'Chats'>;
const INITIAL_FRIEND_LIMIT = 5;
const fixedWhiteText = StyleSheet.create({
  color: { color: '#FFFFFF' },
});
const avatarBackground = StyleSheet.create({
  color: { backgroundColor: '#f2f2f2' },
});

type FriendRow = {
  friend: FriendItem;
  incomingSnap?: SnapInboxItem;
  sentSnap?: SentSnap['recipients'][number] & { createdAt: string };
  chat?: ChatConversation;
};

const loadAllPages = async <T,>(
  loadPage: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> => {
  const items: T[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const result = await loadPage(page, 100);
    items.push(...result.items);
    hasNextPage = result.pagination.hasNextPage;
    page += 1;
  }
  return items;
};

const ChatListScreen = ({ navigation }: Props) => {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incomingSnaps, setIncomingSnaps] = useState<SnapInboxItem[]>([]);
  const [sentSnaps, setSentSnaps] = useState<SentSnap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [snapError, setSnapError] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [suggestionError, setSuggestionError] = useState('');
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [friendRequestCount, setFriendRequestCount] = useState<number | null>(null);
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(() => new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [showAllFriends, setShowAllFriends] = useState(false);
  const auth = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    authStore.getState,
  );
  const socket = getSocketClient();
  const { conversations } = useSyncExternalStore(
    chatStore.subscribe,
    chatStore.getState,
    chatStore.getState,
  );

  const loadFriendsAndSnaps = useCallback(async (isRefresh = false) => {
    setError('');
    setSnapError('');
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [friendsResult, inboxResult, sentResult, suggestionsResult, chatsResult] = await Promise.allSettled([
      loadAllPages(getFriends),
      loadAllPages(getSnapInbox),
      loadAllPages(getSentSnaps),
      getFriendSuggestions(1, 10),
      loadAllPages(getChats),
    ]);
    if (friendsResult.status === 'fulfilled') {
      setFriends(friendsResult.value);
    } else {
      setError(
        friendsResult.reason instanceof ApiError
          ? friendsResult.reason.message
          : 'Unable to load friends.',
      );
      setFriends([]);
    }
    if (inboxResult.status === 'fulfilled') {
      setIncomingSnaps(inboxResult.value);
    } else {
      setIncomingSnaps([]);
      setSnapError(
        inboxResult.reason instanceof ApiError
          ? inboxResult.reason.message
          : 'Unable to load received Snaps.',
      );
    }
    if (sentResult.status === 'fulfilled') {
      setSentSnaps(sentResult.value);
    } else {
      setSentSnaps([]);
      setSnapError(current => current || (
        sentResult.reason instanceof ApiError
          ? sentResult.reason.message
          : 'Unable to load sent Snap statuses.'
      ));
    }
    if (suggestionsResult.status === 'fulfilled') {
      setSuggestions(suggestionsResult.value.items);
      setSuggestionError('');
    } else {
      setSuggestions([]);
      setSuggestionError(
        suggestionsResult.reason instanceof ApiError
          ? suggestionsResult.reason.message
          : 'Unable to load friend suggestions.',
      );
    }
    if (chatsResult.status === 'fulfilled') {
      chatStore.setConversations(chatsResult.value);
    }
    const [requestsResult, notificationsResult] = await Promise.allSettled([
      getIncomingRequests(1, 1),
      getUnreadCount(),
    ]);
    setFriendRequestCount(
      requestsResult.status === 'fulfilled' ? requestsResult.value.pagination.total : null,
    );
    setNotificationCount(
      notificationsResult.status === 'fulfilled' ? notificationsResult.value.count : null,
    );
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadFriendsAndSnaps();
  }, [loadFriendsAndSnaps]));

  useEffect(() => {
    const updateOnlineUsers = (userId: string, isOnline: boolean) => {
      setOnlineUserIds(current => {
        if (current.has(userId) === isOnline) return current;
        const next = new Set(current);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    const onUserOnline = (event: { userId: string }) => {
      updateOnlineUsers(event.userId, true);
    };
    const onUserOffline = (event: { userId: string }) => {
      updateOnlineUsers(event.userId, false);
    };
    const onDisconnect = () => setOnlineUserIds(new Set());
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    const onNotification = (event: { category: string }) => {
      if (event.category === 'chats') {
        setNotificationCount(current => current === null ? current : current + 1);
      }
    };
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [socket]);

  useEffect(() => {
    const onTypingStart = (event: { userId: string }) => {
      setTypingUserIds(current => {
        if (current.has(event.userId)) return current;
        const next = new Set(current);
        next.add(event.userId);
        return next;
      });
    };
    const onTypingStop = (event: { userId: string }) => {
      setTypingUserIds(current => {
        if (!current.has(event.userId)) return current;
        const next = new Set(current);
        next.delete(event.userId);
        return next;
      });
    };
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      setTypingUserIds(new Set());
    };
  }, [socket]);

  const friendRows = useMemo<FriendRow[]>(() => {
    const latestIncoming = new Map<string, SnapInboxItem>();
    incomingSnaps.forEach(snap => {
      const previous = latestIncoming.get(snap.sender.id);
      if (
        !previous ||
        (!snap.opened && previous.opened) ||
        (snap.opened === previous.opened &&
          new Date(snap.createdAt) > new Date(previous.createdAt))
      ) {
        latestIncoming.set(snap.sender.id, snap);
      }
    });

    const latestSent = new Map<string, FriendRow['sentSnap']>();
    sentSnaps.forEach(snap => {
      snap.recipients.forEach(recipient => {
        const previous = latestSent.get(recipient.user.id);
        if (!previous || new Date(snap.createdAt) > new Date(previous.createdAt)) {
          latestSent.set(recipient.user.id, {
            ...recipient,
            createdAt: snap.createdAt,
          });
        }
      });
    });

    return friends
      .map(friend => ({
        friend,
        incomingSnap: latestIncoming.get(friend.user.id),
        sentSnap: latestSent.get(friend.user.id),
        chat: conversations.find(item => item.participant.id === friend.user.id),
      }))
      .sort((first, second) => {
        const firstUnreadMessages = (first.chat?.unreadCount ?? 0) > 0;
        const secondUnreadMessages = (second.chat?.unreadCount ?? 0) > 0;
        if (firstUnreadMessages !== secondUnreadMessages) {
          return firstUnreadMessages ? -1 : 1;
        }
        const firstNewSnap = first.incomingSnap && !first.incomingSnap.opened;
        const secondNewSnap = second.incomingSnap && !second.incomingSnap.opened;
        if (firstNewSnap !== secondNewSnap) return firstNewSnap ? -1 : 1;
        const firstActivity = [
          first.incomingSnap?.createdAt,
          first.sentSnap?.createdAt,
          first.chat?.lastMessage?.sentAt,
        ].filter((date): date is string => Boolean(date))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          ?? first.friend.friendsSince;
        const secondActivity = [
          second.incomingSnap?.createdAt,
          second.sentSnap?.createdAt,
          second.chat?.lastMessage?.sentAt,
        ].filter((date): date is string => Boolean(date))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          ?? second.friend.friendsSince;
        return new Date(secondActivity ?? 0).getTime() - new Date(firstActivity ?? 0).getTime();
      });
  }, [conversations, friends, incomingSnaps, sentSnaps]);

  const incomingSnapCounts = useMemo(() => {
    const counts = new Map<string, number>();
    incomingSnaps.forEach(snap => {
      if (!snap.opened) {
        counts.set(snap.sender.id, (counts.get(snap.sender.id) ?? 0) + 1);
      }
    });
    return counts;
  }, [incomingSnaps]);

  const unreadFriendCount = useMemo(
    () => conversations.filter(conversation => conversation.unreadCount > 0).length,
    [conversations],
  );

  const filteredFriendRows = filterUnread
    ? friendRows.filter(row =>
        (row.chat?.unreadCount ?? 0) > 0 ||
        (incomingSnapCounts.get(row.friend.user.id) ?? 0) > 0,
      )
    : friendRows;
  const visibleFriendRows = filterUnread || showAllFriends
    ? filteredFriendRows
    : filteredFriendRows.slice(0, INITIAL_FRIEND_LIMIT);
  const visibleSuggestions = suggestions.filter(
    user => !dismissedSuggestionIds.includes(user.id),
  );

  const openChat = useCallback((friend: FriendItem['user']) => {
    navigation.navigate('Chat', { userId: friend.id, name: friend.displayName });
  }, [navigation]);

  const openSnap = useCallback((snap: SnapInboxItem) => {
    navigation.navigate('SnapViewer', {
      snapId: snap.id,
      userId: snap.sender.id,
      name: snap.sender.displayName,
      mode: 'open',
    });
  }, [navigation]);

  const sendSnap = useCallback((friend: FriendItem['user']) => {
    navigation.navigate('Camera', {
      recipientId: friend.id,
      recipientName: friend.displayName,
    });
  }, [navigation]);

  const sendRequest = useCallback(async (user: SearchUser) => {
    setSendingRequestId(user.id);
    try {
      await sendFriendRequest(user.id);
      setRequestedUserIds(current =>
        current.includes(user.id) ? current : [...current, user.id],
      );
    } catch (requestError) {
      Alert.alert(
        'Unable to add friend',
        requestError instanceof ApiError ? requestError.message : 'Please try again.',
      );
    } finally {
      setSendingRequestId(null);
    }
  }, []);

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator color="#FFEA00" style={styles.loading} />;
    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chats couldn’t load</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadFriendsAndSnaps()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Icon name="users" size={42} color="#E11A45" />
        <Text style={styles.emptyTitle}>No friends yet</Text>
        <Text style={styles.emptyText}>Add friends to chat and exchange Snaps.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Friends')}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Find friends</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
          style={styles.headerAvatarButton}
        >
          <GenderAvatar
            avatar={auth.user?.avatar}
            gender={auth.user?.gender}
            size={38}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search people"
          onPress={() => navigation.navigate('Search')}
          style={[styles.roundHeaderButton, avatarBackground.color]}
        >
          <Icon name="search" size={20} color="#68737D" />
        </Pressable>
        <Text style={styles.title}>Chat</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.roundHeaderButton}
          >
            <Icon name="bell" size={22} color="#68737D" />
            {notificationCount !== null && notificationCount > 0 ? (
              <View style={styles.badge}>
                <Text style={[styles.badgeText, fixedWhiteText.color]}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add friends"
            onPress={() => navigation.navigate('AddFriends')}
            style={[styles.roundHeaderButton, styles.yellowHeaderButton]}
          >
            <Icon name="user-plus" size={25} color="#090909" />
            {friendRequestCount !== null && friendRequestCount > 0 ? (
              <View style={styles.badge}>
                <Text style={[styles.badgeText, fixedWhiteText.color]}>
                  {friendRequestCount > 99 ? '99+' : friendRequestCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            onPress={() => navigation.navigate('Settings')}
            style={styles.roundHeaderButton}
          >
            <Icon name="more-horizontal" size={27} color="#68737D" />
          </Pressable>
        </View>
      </View>
      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {filterUnread ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
            onPress={() => setFilterUnread(false)}
            style={styles.filterButton}
          >
            <Text style={styles.filterText}>All</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: filterUnread }}
          onPress={() => setFilterUnread(true)}
          style={[styles.filterButton, filterUnread && styles.activeFilterButton]}
        >
          <Text style={[styles.filterText, filterUnread && styles.activeFilterText]}>Unread</Text>
          {unreadFriendCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadFriendCount > 9 ? '9+' : unreadFriendCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('My AI', 'AI chat is not available in this version.')}
          style={styles.filterButton}
        >
          <View style={styles.aiAvatar}>
            <Icon name="cpu" size={17} color="#64727B" />
          </View>
          <Text style={styles.filterText}>My AI</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })}
          style={styles.filterButton}
        >
          <Text style={styles.filterText}>Near Me</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('AddFriends')}
          style={styles.filterButton}
        >
          <Text style={styles.newFilterText}>New</Text>
          <View style={styles.newFilterIcon}>
            <Icon name="plus" size={17} color="#FFFFFF" />
          </View>
        </Pressable>
      </ScrollView>
      <FlatList
        data={visibleFriendRows}
        keyExtractor={item => item.friend.user.id}
        renderItem={({ item }) => {
          const hasNewSnap = Boolean(item.incomingSnap && !item.incomingSnap.opened);
          return (
            <ConversationItem
              friend={item.friend.user}
              incomingSnap={item.incomingSnap}
              incomingSnapCount={incomingSnapCounts.get(item.friend.user.id) ?? 0}
              sentSnap={item.sentSnap}
              chat={item.chat}
              currentUserId={auth.user?.id}
              typing={typingUserIds.has(item.friend.user.id)}
              online={onlineUserIds.has(item.friend.user.id)}
              onPress={() => {
                if (hasNewSnap && item.incomingSnap) openSnap(item.incomingSnap);
                else openChat(item.friend.user);
              }}
              onOpenChat={() => openChat(item.friend.user)}
              onSendSnap={() => sendSnap(item.friend.user)}
            />
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          visibleFriendRows.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFriendsAndSnaps(true)}
            tintColor="#FF3158"
          />
        }
        ListEmptyComponent={filterUnread && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No unread messages or Snaps</Text>
          </View>
        ) : renderEmpty}
        ListFooterComponent={
          !loading && !error && !filterUnread ? (
            <View>
              {friendRows.length > INITIAL_FRIEND_LIMIT ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showAllFriends }}
                  onPress={() => setShowAllFriends(current => !current)}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllText}>
                    {showAllFriends ? 'Show Less' : 'View All'}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.findFriendsSection}>
                <Text style={styles.findFriendsTitle}>Find Friends</Text>
                {suggestionError ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => loadFriendsAndSnaps(true)}
                  >
                    <Text style={styles.suggestionError}>
                      {suggestionError} · Tap to retry
                    </Text>
                  </Pressable>
                ) : null}
                {visibleSuggestions.map(user => {
                  const isRequested = requestedUserIds.includes(user.id);
                  const recentlyJoined =
                    Date.now() - new Date(user.joinedAt).getTime() < 30 * 24 * 60 * 60 * 1000;
                  return (
                    <View key={user.id} style={styles.suggestionRow}>
                      {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.suggestionAvatar} />
                      ) : (
                        <View style={[styles.suggestionAvatar, styles.suggestionAvatarFallback]}>
                          <Text style={styles.suggestionInitial}>
                            {user.displayName.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.suggestionInfo}>
                        <Text numberOfLines={1} style={styles.suggestionName}>
                          {user.displayName}
                        </Text>
                        <Text numberOfLines={1} style={styles.suggestionUsername}>
                          {user.username}
                        </Text>
                        {recentlyJoined ? (
                          <Text numberOfLines={1} style={styles.suggestionMeta}>
                            Recently Joined
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${user.displayName}`}
                        disabled={isRequested || sendingRequestId === user.id}
                        onPress={() => sendRequest(user)}
                        style={styles.addFriendButton}
                      >
                        {sendingRequestId === user.id ? (
                          <ActivityIndicator color="#111111" size="small" />
                        ) : (
                          <>
                            <Icon
                              name={isRequested ? 'check' : 'user-plus'}
                              size={16}
                              color="#17191B"
                            />
                            <Text style={styles.addFriendText}>
                              {isRequested ? 'Sent' : 'Add'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Dismiss ${user.displayName}`}
                        onPress={() =>
                          setDismissedSuggestionIds(current => [...current, user.id])
                        }
                        style={styles.dismissSuggestionButton}
                      >
                        <Icon name="x" size={21} color="#AFBAC2" />
                      </Pressable>
                    </View>
                  );
                })}
                {!suggestionError && visibleSuggestions.length === 0 ? (
                  <Text style={styles.findFriendsHint}>No friend suggestions right now.</Text>
                ) : null}
              </View>
            </View>
          ) : undefined
        }
      />
      {snapError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => loadFriendsAndSnaps(true)}
          style={styles.snapError}
        >
          <Text style={styles.snapErrorText}>Snap status unavailable · Tap to retry</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start a conversation"
        onPress={() => navigation.navigate('Search')}
        style={styles.composeButton}
      >
        <Icon name="edit-2" size={25} color="#080808" />
      </Pressable>
    </SafeAreaView>
  );
};

export default ChatListScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  filterScroll: {
    height: 50,
    flexGrow: 0,
    flexShrink: 0,
  },
  headerAvatarButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  roundHeaderButton: {
    width: 40,
    height: 40,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#EEF1F3',
  },
  yellowHeaderButton: {
    backgroundColor: '#FFEB00',
  },
  title: {
    flex: 1,
    color: '#1B1E20',
    fontSize: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#FF3158',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  filterBar: {
    minHeight: 50,
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E6E9',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 42,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterButton: {
    borderBottomColor: '#17191B',
  },
  filterText: {
    color: '#202326',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#111111',
  },
  unreadBadge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#17191B',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  aiAvatar: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E6EBEE',
  },
  newFilterText: {
    color: '#68737D',
    fontSize: 14,
    fontWeight: '600',
  },
  newFilterIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#56616A',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 72,
  },
  emptyListContent: {
    justifyContent: 'center',
  },
  loading: {
    marginTop: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 14,
    color: '#181B1E',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#8C979E',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FF3158',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  viewAllButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E6E9',
  },
  viewAllText: {
    color: '#68737D',
    fontSize: 14,
    fontWeight: '600',
  },
  findFriendsSection: {
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E6E9',
  },
  findFriendsTitle: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    color: '#202326',
    fontSize: 18,
    fontWeight: '700',
  },
  findFriendsHint: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#77828A',
    fontSize: 13,
  },
  suggestionError: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#C72C4D',
    fontSize: 13,
  },
  suggestionRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E9ECEE',
  },
  suggestionAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  suggestionAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8ECEF',
  },
  suggestionInitial: {
    color: '#30363A',
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  suggestionName: {
    color: '#202326',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionUsername: {
    color: '#758089',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionMeta: {
    color: '#758089',
    fontSize: 13,
  },
  addFriendButton: {
    minWidth: 108,
    minHeight: 40,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFEB00',
  },
  addFriendText: {
    color: '#17191B',
    fontSize: 15,
    fontWeight: '600',
  },
  dismissSuggestionButton: {
    width: 38,
    height: 44,
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeButton: {
    position: 'absolute',
    right: 18,
    bottom: 16,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFEB00',
    elevation: 5,
  },
  snapError: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFF1F3',
  },
  snapErrorText: {
    color: '#C72C4D',
    fontSize: 12,
    textAlign: 'center',
  },
});
