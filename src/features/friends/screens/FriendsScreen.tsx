import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { getFriends, removeFriend } from '../services/friendService';
import type { FriendItem } from '../types/friend.types';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../../../services/api/apiError';
import { getSnapInbox } from '../../snaps/services/snapService';
import type { SnapInboxItem } from '../../snaps/types/snap.types';

type Props = BottomTabScreenProps<MainTabParamList, 'Friends'>;
const FriendsScreen = ({ navigation }: Props) => {
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incomingSnaps, setIncomingSnaps] = useState<SnapInboxItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoredReplayByFriend, setRestoredReplayByFriend] = useState<Record<string, string>>({});
  const longPressedFriendId = useRef<string | null>(null);
  const longPressResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFriends = useCallback(async (refresh = false, pageOverride = 1) => {
    const requestedPage = refresh ? 1 : pageOverride;
    setError('');
    if (refresh) setRefreshing(true);
    else if (requestedPage === 1) setLoading(true);
    try {
      const result = await getFriends(requestedPage);
      setFriends(current => refresh || requestedPage === 1 ? result.items : [...current, ...result.items]);
      setPage(requestedPage);
      setHasNextPage(result.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load friends.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadIncomingSnaps = useCallback(async () => {
    try {
      const items: SnapInboxItem[] = [];
      let snapsPage = 1;
      let hasMoreSnaps = true;
      while (hasMoreSnaps) {
        const result = await getSnapInbox(snapsPage, 100);
        items.push(...result.items);
        hasMoreSnaps = result.pagination.hasNextPage;
        snapsPage += 1;
      }
      setIncomingSnaps(items);
    } catch (loadError) {
      Alert.alert(
        'Unable to load snaps',
        loadError instanceof ApiError ? loadError.message : 'Please try again.',
      );
    }
  }, []);

  const refreshFriends = useCallback(() => {
    loadFriends(true);
    loadIncomingSnaps();
  }, [loadFriends, loadIncomingSnaps]);

  useFocusEffect(useCallback(() => {
    refreshFriends();
  }, [refreshFriends]));

  const openChat = (friend: FriendItem['user']) => {
    navigation.navigate('Chat', { userId: friend.id, name: friend.displayName });
  };

  const latestSnapBySender = useMemo(() => {
    const unopened = new Map<string, SnapInboxItem>();
    const replayable = new Map<string, SnapInboxItem>();
    incomingSnaps.forEach(item => {
      if (!item.opened && !unopened.has(item.sender.id)) {
        unopened.set(item.sender.id, item);
      }
      if (item.replayAvailable && !replayable.has(item.sender.id)) {
        replayable.set(item.sender.id, item);
      }
    });
    return { unopened, replayable };
  }, [incomingSnaps]);

  const openSnap = (snap: SnapInboxItem, mode: 'open' | 'replay') => {
    navigation.navigate('SnapViewer', {
      snapId: snap.id,
      userId: snap.sender.id,
      name: snap.sender.displayName,
      mode,
    });
  };

  const handleFriendPress = (
    friend: FriendItem['user'],
    snap: SnapInboxItem | undefined,
    replayRestored: boolean,
  ) => {
    if (longPressedFriendId.current === friend.id) {
      longPressedFriendId.current = null;
      if (longPressResetTimer.current) clearTimeout(longPressResetTimer.current);
      longPressResetTimer.current = null;
      return;
    }
    if (snap && !snap.opened) {
      openSnap(snap, 'open');
      return;
    }
    if (snap?.replayAvailable && replayRestored) {
      openSnap(snap, 'replay');
      return;
    }
    navigation.navigate('PublicProfile', {
      userId: friend.id,
      username: friend.username,
      name: friend.displayName,
    });
  };

  const handleFriendLongPress = (
    friend: FriendItem['user'],
    snap: SnapInboxItem | undefined,
  ) => {
    if (!snap?.replayAvailable) return;
    longPressedFriendId.current = friend.id;
    setRestoredReplayByFriend(current => ({ ...current, [friend.id]: snap.id }));
    if (longPressResetTimer.current) clearTimeout(longPressResetTimer.current);
    longPressResetTimer.current = setTimeout(() => {
      longPressedFriendId.current = null;
      longPressResetTimer.current = null;
    }, 1000);
  };

  const filteredFriends = friends.filter(({ user }) =>
    `${user.displayName} ${user.username}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const callFriend = (friend: FriendItem['user']) => {
    navigation.navigate('AudioCall', { userId: friend.id, name: friend.displayName });
  };

  const showFriendOptions = (friend: FriendItem['user']) => {
    Alert.alert(friend.displayName, 'Choose an action', [
      { text: 'View chat', onPress: () => openChat(friend) },
      { text: 'Remove friend', style: 'destructive', onPress: () => {
        Alert.alert('Remove friend?', `Remove ${friend.displayName} from your friends?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => {
            setBusyId(friend.id);
            removeFriend(friend.id).then(() => loadFriends(true)).catch(removeError =>
              Alert.alert('Unable to remove friend', removeError instanceof ApiError ? removeError.message : 'Please try again.'),
            ).finally(() => setBusyId(null));
          } },
        ]);
      } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={27} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Friends</Text>
        <Pressable
          accessibilityLabel="Friend requests"
          accessibilityRole="button"
          onPress={() => navigation.navigate('FriendRequests')}
          style={styles.addButton}
        >
          <Icon name="user-check" size={22} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Pressable
          accessibilityLabel="Add friends"
          accessibilityRole="button"
          onPress={() => navigation.navigate('AddFriends')}
          style={styles.addButton}
        >
          <Icon name="user-plus" size={22} color={adaptThemeColor('#FFEA00', 'color')} />
        </Pressable>
        <Pressable
          accessibilityLabel="Friend notifications"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Notifications')}
          style={styles.notificationButton}
        >
          <Icon name="bell" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={22} color={adaptThemeColor('#E0E0E3', 'color')} />
        <TextInput
          accessibilityLabel="Search friends"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Search friends..."
          placeholderTextColor={adaptThemeColor('#9999A2', 'color')}
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 && (
          <Pressable
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            onPress={() => setSearch('')}
          >
            <Icon name="x-circle" size={20} color={adaptThemeColor('#9999A2', 'color')} />
          </Pressable>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFriends} tintColor={adaptThemeColor('#FFEA00', 'color')} />}
        contentContainerStyle={styles.friendList}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {filteredFriends.map(item => {
          const friend = item.user;
          const newSnap = latestSnapBySender.unopened.get(friend.id);
          const replayableSnap = latestSnapBySender.replayable.get(friend.id);
          const friendSnap = newSnap ?? replayableSnap;
          const replayRestored = Boolean(
            replayableSnap && restoredReplayByFriend[friend.id] === replayableSnap.id,
          );
          return (
          <View key={friend.id} style={styles.friendRow}>
            <Pressable
              accessibilityLabel={
                newSnap && replayableSnap
                  ? `Open new snap from ${friend.displayName}. ${replayRestored ? 'A previous snap is restored for replay' : 'Hold to restore a previous snap'}`
                  : newSnap
                  ? `Open snap from ${friend.displayName}`
                  : replayableSnap
                    ? replayRestored
                      ? `Replay from ${friend.displayName} is restored. Tap to replay once`
                      : `View ${friend.displayName}'s profile. Hold to restore snap replay`
                    : `View ${friend.displayName}'s profile`
              }
              accessibilityRole="button"
              delayLongPress={500}
              onPress={() => handleFriendPress(friend, friendSnap, replayRestored)}
              onLongPress={() => handleFriendLongPress(friend, replayableSnap)}
              style={styles.profileButton}
            >
              <View style={styles.avatarWrap}>
                {friend.avatar ? <Image source={{ uri: friend.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{friend.displayName.slice(0, 1).toUpperCase()}</Text></View>}
                {friendSnap && (
                  <View
                    style={[
                      styles.snapIndicator,
                      !newSnap && !replayRestored && styles.replayIndicator,
                    ]}
                  />
                )}
              </View>
              <View style={styles.friendInfo}>
                <Text numberOfLines={1} style={styles.friendName}>{friend.displayName}</Text>
                <View style={styles.presenceLine}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.presenceText,
                      (newSnap || replayRestored) && styles.newSnapText,
                      !newSnap && replayableSnap && !replayRestored && styles.replayText,
                    ]}
                  >
                    {newSnap
                      ? `New ${newSnap.mediaType} snap · Tap to open${replayableSnap && !replayRestored ? ' · Hold to restore replay' : ''}`
                      : replayableSnap
                        ? replayRestored
                          ? 'New Snap'
                          : 'Snap opened · Hold to restore replay'
                        : `@${friend.username}`}
                  </Text>
                </View>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={`Call ${friend.displayName}`}
              accessibilityRole="button"
              onPress={() => callFriend(friend)}
              style={styles.actionButton}
            >
              <Icon
                name="phone"
                size={24}
                color={adaptThemeColor('#FFFFFF', 'color')}
                style={styles.phoneIcon}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={`More options for ${friend.displayName}`}
              accessibilityRole="button"
              hitSlop={8}
              disabled={busyId === friend.id}
              onPress={() => showFriendOptions(friend)}
              style={styles.moreButton}
            >
              <Icon name="more-vertical" size={23} color={adaptThemeColor('#D5D5D9', 'color')} />
            </Pressable>
          </View>
        )})}
        {loading && <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} />}
        {error ? <Text style={styles.emptySubtitle}>{error} <Text onPress={() => loadFriends(true)}>Try again</Text></Text> : null}
        {!loading && !error && filteredFriends.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="users" size={34} color={adaptThemeColor('#777780', 'color')} />
            <Text style={styles.emptyTitle}>{friends.length === 0 ? 'No friends yet' : 'No friends found'}</Text>
            {friends.length > 0 && <Text style={styles.emptySubtitle}>Try a different name.</Text>}
          </View>
        )}
        {!loading && hasNextPage && <Pressable onPress={() => loadFriends(false, page + 1)}><Text style={styles.emptySubtitle}>Load more</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FriendsScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  notificationButton: {
    position: 'relative',
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFEA00',
  },
  searchBox: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 7,
    marginBottom: 17,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B2B2D',
    backgroundColor: '#171718',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 14,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 16,
  },
  friendList: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 8,
  },
  friendRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1D1D1F',
    backgroundColor: '#101011',
  },
  profileButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: '#D2D2D4',
    padding: 3,
  },
  snapIndicator: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#101011',
    backgroundColor: '#FF3F83',
  },
  replayIndicator: {
    backgroundColor: '#FFEA00',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292929',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: 1,
    width: 17,
    height: 17,
    borderWidth: 2,
    borderColor: '#101011',
    borderRadius: 9,
  },
  onlineDot: {
    backgroundColor: '#39E968',
  },
  busyDot: {
    backgroundColor: '#FF5361',
  },
  offlineDot: {
    backgroundColor: '#B5B9C3',
  },
  friendInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 15,
  },
  friendName: {
    color: '#F7F7F8',
    fontSize: 17,
    fontWeight: '700',
  },
  presenceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  presenceText: {
    color: '#B5B9C3',
    fontSize: 15,
  },
  newSnapText: {
    color: '#FF3F83',
    fontWeight: '700',
  },
  replayText: {
    color: '#FFEA00',
    fontWeight: '700',
  },
  onlineText: {
    color: '#39E968',
  },
  busyText: {
    color: '#FF5361',
  },
  actionButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: '#29292B',
    backgroundColor: '#19191A',
  },
  phoneIcon: {
    transform: [{ rotate: '0deg' }],
  },
  moreButton: {
    width: 34,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyTitle: {
    marginTop: 13,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#92929A',
    fontSize: 14,
  },
});
