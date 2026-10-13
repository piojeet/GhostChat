import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getIncomingRequests,
  getOutgoingRequests,
} from '../services/friendService';
import type { FriendRequestItem } from '../types/friend.types';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'FriendRequests'>;

const FriendRequestsScreen = ({ navigation }: Props) => {
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [incomingPage, setIncomingPage] = useState(1);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [incomingHasNextPage, setIncomingHasNextPage] = useState(false);
  const [outgoingHasNextPage, setOutgoingHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [incomingResult, outgoingResult] = await Promise.all([
        getIncomingRequests(),
        getOutgoingRequests(),
      ]);
      setRequests(incomingResult.items);
      setOutgoing(outgoingResult.items);
      setIncomingPage(1);
      setOutgoingPage(1);
      setIncomingHasNextPage(incomingResult.pagination.hasNextPage);
      setOutgoingHasNextPage(outgoingResult.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load friend requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextIncomingPage = incomingHasNextPage ? incomingPage + 1 : incomingPage;
      const nextOutgoingPage = outgoingHasNextPage ? outgoingPage + 1 : outgoingPage;
      const [incomingResult, outgoingResult] = await Promise.all([
        incomingHasNextPage ? getIncomingRequests(nextIncomingPage) : Promise.resolve(null),
        outgoingHasNextPage ? getOutgoingRequests(nextOutgoingPage) : Promise.resolve(null),
      ]);
      if (incomingResult) {
        setRequests(current => [...current, ...incomingResult.items]);
        setIncomingPage(nextIncomingPage);
        setIncomingHasNextPage(incomingResult.pagination.hasNextPage);
      }
      if (outgoingResult) {
        setOutgoing(current => [...current, ...outgoingResult.items]);
        setOutgoingPage(nextOutgoingPage);
        setOutgoingHasNextPage(outgoingResult.pagination.hasNextPage);
      }
    } catch (loadError) {
      Alert.alert('Unable to load more requests', loadError instanceof ApiError ? loadError.message : 'Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => { loadRequests(); }, [loadRequests]));

  const updateRequest = async (id: string, action: 'accepted' | 'declined' | 'cancelled') => {
    if (busyId) return;
    setBusyId(id);
    try {
      if (action === 'accepted') await acceptFriendRequest(id);
      else if (action === 'declined') await declineFriendRequest(id);
      else await cancelFriendRequest(id);
      await loadRequests(true);
    } catch (actionError) {
      Alert.alert('Friend request failed', actionError instanceof ApiError ? actionError.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to friends"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={27} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Friend Requests</Text>
        <Pressable
          accessibilityLabel="More request options"
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('Friend requests', 'Manage your incoming friend requests.')
          }
          style={styles.moreHeaderButton}
        >
          <Icon name="more-vertical" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRequests(true)} tintColor={adaptThemeColor('#FFEA00', 'color')} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.requestHeading}>{requests.length} Requests</Text>
        </View>

        <View style={styles.requestList}>
          {requests.map(request => (
            <View key={request.id} style={styles.personCard}>
              <PersonDetails
                user={request.user}
                onPress={() =>
                  navigation.navigate('PublicProfile', {
                    userId: request.user.id,
                    username: request.user.username,
                    name: request.user.displayName,
                  })
                }
              />
              <View style={styles.requestActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Accept ${request.user.displayName}'s request`}
                  disabled={busyId === request.id}
                  onPress={() => updateRequest(request.id, 'accepted')}
                  style={styles.acceptButton}
                >
                  <Icon name="user-plus" size={19} color={adaptThemeColor('#080808', 'color')} />
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Decline ${request.user.displayName}'s request`}
                  disabled={busyId === request.id}
                  onPress={() => updateRequest(request.id, 'declined')}
                  style={styles.declineButton}
                >
                  <Icon name="x" size={20} color={adaptThemeColor('#F2F2F4', 'color')} />
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} />}
          {error ? <Text style={styles.emptySubtitle}>{error} <Text onPress={() => loadRequests()}>Try again</Text></Text> : null}
          {!loading && !error && requests.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="user-check" size={35} color={adaptThemeColor('#FFEA00', 'color')} />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>You are all caught up.</Text>
            </View>
          )}
        </View>

        <View style={[styles.sectionHeader, styles.suggestedHeading]}>
          <Text style={styles.suggestedTitle}>Sent Requests ({outgoing.length})</Text>
        </View>

        <View style={styles.suggestionList}>
          {outgoing.map(request => (
              <View key={request.id} style={styles.suggestionCard}>
                <PersonDetails
                  user={request.user}
                  onPress={() =>
                    navigation.navigate('PublicProfile', {
                      userId: request.user.id,
                      username: request.user.username,
                      name: request.user.displayName,
                    })
                  }
                />
                <View style={styles.suggestionActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel request to ${request.user.displayName}`}
                    disabled={busyId === request.id}
                    onPress={() => updateRequest(request.id, 'cancelled')}
                    style={styles.addButton}
                  >
                    <Icon name="x" size={19} color={adaptThemeColor('#080808', 'color')} />
                    <Text style={styles.addText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
          ))}
          {!loading && outgoing.length === 0 && <Text style={styles.emptySubtitle}>No sent requests.</Text>}
        </View>
        {!loading && (incomingHasNextPage || outgoingHasNextPage) && (
          <Pressable disabled={loadingMore} onPress={loadMore} style={styles.loadMoreButton}>
            {loadingMore ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : <Text style={styles.seeAllText}>Load more</Text>}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const PersonDetails = ({
  user,
  onPress,
}: {
  user: FriendRequestItem['user'];
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`View ${user.displayName}'s profile`}
    onPress={onPress}
    style={styles.personDetails}
  >
    <View style={styles.avatarWrap}>
      {user.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{user.displayName.slice(0, 1).toUpperCase()}</Text></View>}
    </View>
    <View style={styles.personCopy}>
      <Text numberOfLines={1} style={styles.personName}>{user.displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
    </View>
  </Pressable>
);

export default FriendRequestsScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 43,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginLeft: 5,
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  moreHeaderButton: {
    width: 38,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 17,
    paddingBottom: 20,
  },
  sectionHeader: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  requestHeading: {
    color: '#F5F5F6',
    fontSize: 21,
    fontWeight: '800',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  seeAllText: {
    color: '#C6C6CE',
    fontSize: 13,
  },
  requestList: {
    gap: 9,
  },
  personCard: {
    minHeight: 151,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#222224',
    backgroundColor: '#101011',
  },
  personDetails: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    position: 'relative',
    width: 67,
    height: 67,
    padding: 2,
    borderRadius: 35,
    borderWidth: 1.2,
    borderColor: '#D6D6D8',
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
    bottom: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#101011',
  },
  onlineDot: {
    backgroundColor: '#34D86B',
  },
  offlineDot: {
    backgroundColor: '#AEB1BA',
  },
  personCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  personName: {
    color: '#F7F7F8',
    fontSize: 15,
    fontWeight: '700',
  },
  username: {
    marginTop: 3,
    color: '#A5A5AE',
    fontSize: 13,
  },
  mutualLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },
  mutualText: {
    color: '#BFC0C8',
    fontSize: 12,
  },
  mutualAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  mutualAvatar: {
    width: 25,
    height: 25,
    marginRight: -4,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#101011',
  },
  mutualCountBadge: {
    minWidth: 30,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
    paddingHorizontal: 5,
    borderRadius: 13,
    backgroundColor: '#252528',
  },
  mutualCountText: {
    color: '#D0D0D5',
    fontSize: 11,
    fontWeight: '600',
  },
  requestActions: {
    width: 104,
    gap: 7,
    marginLeft: 7,
  },
  acceptButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 22,
    backgroundColor: '#FFEA00',
  },
  acceptText: {
    color: '#080808',
    fontSize: 13,
    fontWeight: '800',
  },
  declineButton: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333337',
    backgroundColor: '#171718',
  },
  declineText: {
    color: '#F0F0F2',
    fontSize: 13,
    fontWeight: '600',
  },
  requestMoreButton: {
    width: 24,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  suggestedHeading: {
    marginTop: 15,
  },
  suggestedTitle: {
    color: '#F5F5F6',
    fontSize: 19,
    fontWeight: '800',
  },
  suggestionList: {
    gap: 8,
  },
  suggestionCard: {
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#222224',
    backgroundColor: '#101011',
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  addButton: {
    minWidth: 84,
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 23,
    backgroundColor: '#FFEA00',
  },
  addText: {
    color: '#080808',
    fontSize: 14,
    fontWeight: '800',
  },
  sentButton: {
    borderWidth: 1,
    borderColor: '#FFEA00',
    backgroundColor: 'rgba(255,234,0,0.08)',
  },
  sentText: {
    color: '#FFEA00',
  },
  suggestionMoreButton: {
    width: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 46,
  },
  emptyTitle: {
    marginTop: 13,
    color: '#F6F6F7',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 5,
    color: '#9999A2',
    fontSize: 13,
  },
});
