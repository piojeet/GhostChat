import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../../types/navigation';
import { getFriendStatus, getFriends } from '../../friends/services/friendService';
import type { FriendItem } from '../../friends/types/friend.types';
import { sendSnap } from '../services/snapService';
import { ApiError } from '../../../services/api/apiError';
import { useFocusEffect } from '@react-navigation/native';
import { authStore } from '../../../store/authStore';
import { mediaFromLegacyParams } from '../../camera/types/media';

type Props = NativeStackScreenProps<MainTabParamList, 'SendSnap'>;
const MAX_RECIPIENTS = 50;

const SendSnapScreen = ({ navigation, route }: Props) => {
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendsPage, setFriendsPage] = useState(1);
  const [friendsHaveNextPage, setFriendsHaveNextPage] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(
    route.params?.recipientId ? [route.params.recipientId] : [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<'checking' | 'uploading' | 'sending'>('checking');
  const sendingRef = useRef(false);
  const currentUserId = useSyncExternalStore(
    authStore.subscribe,
    () => authStore.getState().user?.id,
    () => authStore.getState().user?.id,
  );
  const media = mediaFromLegacyParams(route.params);
  const targetRecipientId = route.params?.recipientId;
  const targetRecipientName = route.params?.recipientName;

  useEffect(() => {
    setSelectedRecipients(targetRecipientId ? [targetRecipientId] : []);
  }, [targetRecipientId]);

  const filteredRecipients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return friends
      .map(item => item.user)
      .filter(friend => friend.id !== currentUserId)
      .filter(friend => !targetRecipientId || friend.id === targetRecipientId)
      .filter(friend =>
        `${friend.displayName} ${friend.username}`.toLowerCase().includes(query),
      );
  }, [currentUserId, friends, search, targetRecipientId]);

  const areAllFilteredRecipientsSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every(recipient =>
      selectedRecipients.includes(recipient.id),
    );

  const loadFriends = useCallback(async (page = 1) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      if (targetRecipientId) {
        const allFriends: FriendItem[] = [];
        let requestedFriendsPage = 1;
        let hasMoreFriends = true;
        while (hasMoreFriends) {
          const result = await getFriends(requestedFriendsPage, 100);
          allFriends.push(...result.items);
          hasMoreFriends = result.pagination.hasNextPage;
          requestedFriendsPage += 1;
        }
        setFriends(allFriends);
        setFriendsPage(requestedFriendsPage - 1);
        setFriendsHaveNextPage(false);
      } else {
        const result = await getFriends(page);
        setFriends(current => page === 1 ? result.items : [...current, ...result.items]);
        setFriendsPage(page);
        setFriendsHaveNextPage(result.pagination.hasNextPage);
      }
    } catch (error) {
      Alert.alert('Unable to load friends', error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [targetRecipientId]);

  useFocusEffect(useCallback(() => { loadFriends(); }, [loadFriends]));

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(current => {
      if (current.includes(id)) {
        return current.filter(recipientId => recipientId !== id);
      }
      if (current.length >= MAX_RECIPIENTS) {
        Alert.alert('Recipient limit', `You can send a snap to up to ${MAX_RECIPIENTS} friends.`);
        return current;
      }
      return [...current, id];
    });
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredRecipients.map(recipient => recipient.id);
    setSelectedRecipients(current => {
      if (areAllFilteredRecipientsSelected) {
        return current.filter(id => !filteredIds.includes(id));
      }

      const next = [...new Set([...current, ...filteredIds])];
      if (next.length > MAX_RECIPIENTS) {
        Alert.alert('Recipient limit', `You can send a snap to up to ${MAX_RECIPIENTS} friends.`);
        return next.slice(0, MAX_RECIPIENTS);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!media || route.params?.sampleMedia) {
      Alert.alert('Media required', 'Capture or select a photo or video before sending.');
      return;
    }
    if (selectedRecipients.length === 0) {
      Alert.alert('Choose someone', 'Select at least one friend to send this snap.');
      return;
    }
    const eligibleRecipientIds = new Set(
      friends
        .map(item => item.user.id)
        .filter(id => id !== currentUserId),
    );
    if (selectedRecipients.some(id => !eligibleRecipientIds.has(id))) {
      Alert.alert(
        'Recipients changed',
        'One or more selected recipients are no longer available friends. Refresh the list and choose again.',
      );
      await loadFriends();
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setSendPhase('checking');
    try {
      const statuses = await Promise.all(
        selectedRecipients.map(async id => [id, await getFriendStatus(id)] as const),
      );
      const confirmedFriendIds = new Set(
        statuses.filter(([, status]) => status === 'friends').map(([id]) => id),
      );
      if (confirmedFriendIds.size !== selectedRecipients.length) {
        setSelectedRecipients(current =>
          current.filter(id => confirmedFriendIds.has(id)),
        );
        Alert.alert(
          'Recipients changed',
          'Snaps can only be sent to friends who are not blocked. Review your selection and try again.',
        );
        await loadFriends();
        return;
      }
      setSendPhase('uploading');
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await sendSnap(
        media,
        media.type === 'video' ? 'video' : 'image',
        selectedRecipients,
        route.params?.caption ?? '',
        () => setSendPhase('sending'),
      );
      Alert.alert(
        'Snap sent',
        'Your snap was sent successfully.',
        [{
          text: 'OK',
          onPress: () => navigation.popTo('MainTabs', { screen: 'Chats' }),
        }],
        { cancelable: false },
      );
    } catch (error) {
      Alert.alert(
        'Unable to send snap',
        error instanceof ApiError
          ? error.message
          : 'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close send screen"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Icon name="x" size={27} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Send To</Text>
      </View>
      {targetRecipientId && (
        <Text style={styles.targetRecipient}>
          Sending only to {targetRecipientName ?? filteredRecipients[0]?.displayName ?? 'selected friend'}
        </Text>
      )}

      <View style={styles.searchBox}>
        <Icon name="search" size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
        <TextInput
          accessibilityLabel="Search friends"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Search friends..."
          placeholderTextColor={adaptThemeColor('#858585', 'color')}
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Unavailable', 'Story publishing from Send To is not supported by the snaps API.')}
          style={styles.storyRow}
        >
          <View style={[styles.storyIcon, styles.myStoryIcon]}>
            <Image
              source={require('../../../assets/images/splash/snapapp-ghost.png')}
              style={styles.ghost}
              resizeMode="contain"
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>My Story</Text>
            <Text style={styles.rowSubtitle}>Share with all friends</Text>
          </View>
          <View style={styles.expandButton}>
            <Icon
              name="chevron-right"
              size={22}
              color={adaptThemeColor('#FFFFFF', 'color')}
            />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Unavailable', 'Close Friends snap delivery is not supported by the current API.')}
          style={styles.storyRow}
        >
          <View style={[styles.storyIcon, styles.closeFriendsIcon]}>
            <Icon name="star" size={31} color={adaptThemeColor('#FFFFFF', 'color')} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Close Friends</Text>
            <Text style={styles.rowSubtitle}>Share with close friends</Text>
          </View>
          <View style={styles.expandButton}>
            <Icon
              name="chevron-right"
              size={22}
              color={adaptThemeColor('#FFFFFF', 'color')}
            />
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {!targetRecipientId && filteredRecipients.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={toggleSelectAll}
              style={styles.selectAllButton}
            >
              <Text style={styles.selectAllText}>
                {areAllFilteredRecipientsSelected ? 'Deselect all' : 'Select all'}
              </Text>
            </Pressable>
          )}
        </View>

        {filteredRecipients.map(recipient => {
          const isSelected = selectedRecipients.includes(recipient.id);

          return (
            <Pressable
              key={recipient.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              disabled={Boolean(targetRecipientId)}
              onPress={() => {
                if (!targetRecipientId) toggleRecipient(recipient.id);
              }}
              style={styles.recipientRow}
            >
              {recipient.avatar ? <Image source={{ uri: recipient.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{recipient.displayName.slice(0, 1).toUpperCase()}</Text></View>}
              <Text numberOfLines={1} style={styles.recipientName}>
                {recipient.displayName}
              </Text>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && <Icon name="check" size={22} color={adaptThemeColor('#080808', 'color')} />}
              </View>
            </Pressable>
          );
        })}

        {loading && <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} />}
        {filteredRecipients.length === 0 && (
          <Text style={styles.emptyText}>{loading ? '' : 'No friends found'}</Text>
        )}
        {!loading && friendsHaveNextPage && search.trim().length === 0 && (
          <Pressable disabled={loadingMore} onPress={() => loadFriends(friendsPage + 1)} style={styles.loadMoreButton}>
            {loadingMore ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : <Text style={styles.loadMoreText}>Load more friends</Text>}
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={sending || loading}
          onPress={handleSend}
          style={styles.sendButton}
        >
            {sending ? (
              <View style={styles.sendingContent}>
                <ActivityIndicator color={adaptThemeColor('#080808', 'color')} />
                <Text style={styles.sendText}>
                  {sendPhase === 'checking'
                    ? 'Checking friends...'
                    : sendPhase === 'uploading'
                      ? 'Uploading...'
                      : 'Sending...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.sendText}>Send ({selectedRecipients.length})</Text>
            )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default SendSnapScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  targetRecipient: {
    marginHorizontal: 22,
    marginBottom: 10,
    color: '#FFEA00',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  loadMoreText: {
    color: '#FFEA00',
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginLeft: 18,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  searchBox: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 10,
    paddingHorizontal: 17,
    borderRadius: 17,
    backgroundColor: '#202020',
  },
  searchInput: {
    flex: 1,
    marginLeft: 14,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 16,
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 12,
  },
  storyRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  storyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStoryIcon: {
    backgroundColor: '#000000',
  },
  closeFriendsIcon: {
    backgroundColor: '#4CC65E',
  },
  ghost: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  rowText: {
    flex: 1,
    marginLeft: 20,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  rowSubtitle: {
    marginTop: 6,
    color: '#858585',
    fontSize: 15,
  },
  expandButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#353535',
    borderRadius: 13,
  },
  audienceOptions: {
    marginHorizontal: 120,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#1B1B1B',
  },
  audienceOption: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audienceText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  selectAllText: {
    color: '#FFEA00',
    fontSize: 14,
    fontWeight: '600',
  },
  recipientRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
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
  recipientName: {
    flex: 1,
    marginLeft: 20,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
  checkbox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#353535',
    borderRadius: 12,
  },
  checkboxSelected: {
    borderColor: '#FFEA00',
    backgroundColor: '#FFEA00',
  },
  emptyText: {
    padding: 24,
    color: '#858585',
    fontSize: 15,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
    backgroundColor: '#080808',
  },
  sendButton: {
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    backgroundColor: '#FFEA00',
  },
  sendText: {
    color: '#080808',
    fontSize: 20,
    fontWeight: '800',
  },
  sendingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});