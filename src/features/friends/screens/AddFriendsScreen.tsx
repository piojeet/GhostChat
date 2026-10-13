import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriendStatus,
  getIncomingRequests,
  getOutgoingRequests,
  removeFriend,
  searchFriends,
  sendFriendRequest,
} from '../services/friendService';
import type { FriendStatus, SearchUser } from '../types/friend.types';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'AddFriends'>;

type SearchResult = SearchUser & { status: FriendStatus; requestId?: string };

const AddFriendsScreen = ({ navigation }: Props) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const query = search.trim();

  const loadSearch = useCallback(async (requestedPage = 1, append = false) => {
    setError('');
    if (query.length < 2) { setResults([]); setLoading(false); setHasNextPage(false); return; }
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const [users, incoming, outgoing] = await Promise.all([
        searchFriends(query, requestedPage),
        getIncomingRequests(1, 100),
        getOutgoingRequests(1, 100),
      ]);
      const statusResults = await Promise.all(users.items.map(async user => ({
        ...user,
        status: await getFriendStatus(user.id),
      })));
      const mappedResults = statusResults.map(result => {
        const request = result.status === 'incoming_pending'
          ? incoming.items.find(item => item.user.id === result.id)
          : outgoing.items.find(item => item.user.id === result.id);
        return { ...result, requestId: request?.id };
      });
      setResults(current => append ? [...current, ...mappedResults] : mappedResults);
      setPage(requestedPage);
      setHasNextPage(users.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to search users.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => { loadSearch(1); }, 300);
    return () => clearTimeout(timer);
  }, [loadSearch]);

  const performAction = async (person: SearchResult) => {
    if (busyId) return;
    setBusyId(person.id);
    try {
      if (person.status === 'none') await sendFriendRequest(person.id);
      else if (person.status === 'outgoing_pending' && person.requestId) await cancelFriendRequest(person.requestId);
      else if (person.status === 'incoming_pending' && person.requestId) await acceptFriendRequest(person.requestId);
      else if (person.status === 'friends') {
        Alert.alert('Remove friend?', `Remove ${person.displayName} from your friends?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => { removeFriend(person.id).then(() => loadSearch()).catch(removeError => Alert.alert('Unable to remove friend', removeError instanceof ApiError ? removeError.message : 'Please try again.')); } },
        ]);
        return;
      } else return;
      await loadSearch();
    } catch (actionError) {
      Alert.alert('Friend action failed', actionError instanceof ApiError ? actionError.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const showSyncInfo = () => {
    Alert.alert(
      'Contacts unavailable',
      'Contact syncing will be available after contacts permission and sync service are connected.',
    );
  };

  const buttonLabel = (person: SearchResult) => ({
    none: 'Add Friend',
    outgoing_pending: 'Cancel',
    incoming_pending: 'Accept',
    friends: 'Friends',
    blocked: 'Unavailable',
  }[person.status]);

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
          <Icon name="arrow-left" size={26} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Add Friends</Text>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={22} color={adaptThemeColor('#E0E0E3', 'color')} />
        <TextInput
          accessibilityLabel="Search by name or username"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Search by name or username..."
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.discoveryCard, styles.contactsCard]}>
          <View style={[styles.discoveryIcon, styles.contactsIcon]}>
            <Icon name="users" size={27} color={adaptThemeColor('#FFFFFF', 'color')} />
          </View>
          <View style={styles.discoveryCopy}>
            <Text style={styles.discoveryTitle}>Find Contacts</Text>
            <Text style={styles.discoverySubtitle}>Sync your contacts and find friends</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={showSyncInfo}
            style={styles.discoveryAction}
          >
            <Text style={styles.discoveryActionText}>Sync</Text>
          </Pressable>
          <Icon name="chevron-right" size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
        </View>

        <View style={[styles.discoveryCard, styles.nearbyCard]}>
          <View style={[styles.discoveryIcon, styles.nearbyIcon]}>
            <Icon name="map-pin" size={28} color={adaptThemeColor('#FFFFFF', 'color')} />
          </View>
          <View style={styles.discoveryCopy}>
            <Text style={styles.discoveryTitle}>Nearby Users</Text>
            <Text style={styles.discoverySubtitle}>Find people nearby</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Map' })
            }
            style={styles.discoveryAction}
          >
            <Text style={styles.discoveryActionText}>Scan</Text>
          </Pressable>
          <Icon name="chevron-right" size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {query.length >= 2 ? 'Search Results' : 'Search for friends'}
          </Text>
        </View>

        <View style={styles.suggestions}>
          {results.map(suggestion => {
            const needsRequestId = suggestion.status === 'outgoing_pending' || suggestion.status === 'incoming_pending';
            const disabled = suggestion.status === 'blocked' || busyId === suggestion.id || (needsRequestId && !suggestion.requestId);
            return (
              <View key={suggestion.id} style={styles.suggestionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${suggestion.displayName}'s profile`}
                  onPress={() =>
                    navigation.navigate('PublicProfile', {
                      userId: suggestion.id,
                      username: suggestion.username,
                      name: suggestion.displayName,
                    })
                  }
                  style={styles.suggestionProfile}
                >
                  <View style={styles.avatarWrap}>
                    {suggestion.avatar ? <Image source={{ uri: suggestion.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{suggestion.displayName.slice(0, 1).toUpperCase()}</Text></View>}
                  </View>
                  <View style={styles.suggestionCopy}>
                    <Text numberOfLines={1} style={styles.suggestionName}>
                      {suggestion.displayName}
                    </Text>
                    <Text style={styles.username}>@{suggestion.username}</Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${buttonLabel(suggestion)} ${suggestion.displayName}`}
                  disabled={disabled}
                  onPress={() => performAction(suggestion)}
                  style={[styles.addButton, suggestion.status !== 'none' && styles.sentButton]}
                >
                  {suggestion.status !== 'none' && <Icon name="check" size={17} color={adaptThemeColor('#FFEA00', 'color')} />}
                  <Text style={[styles.addButtonText, suggestion.status !== 'none' && styles.sentButtonText]}>
                    {buttonLabel(suggestion)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          {loading && <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} />}
          {error ? <Text style={styles.emptySubtitle}>{error} <Text onPress={() => loadSearch()}>Try again</Text></Text> : null}
          {!loading && !error && results.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="users" size={34} color={adaptThemeColor('#777780', 'color')} />
              <Text style={styles.emptyTitle}>{query.length < 2 ? 'Enter at least 2 characters' : 'No users found'}</Text>
              {query.length >= 2 && <Text style={styles.emptySubtitle}>Try another name or username.</Text>}
            </View>
          )}
          {!loading && !error && hasNextPage && (
            <Pressable disabled={loadingMore} onPress={() => loadSearch(page + 1, true)} style={styles.loadMoreButton}>
              {loadingMore ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : <Text style={styles.seeAllText}>Load more</Text>}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddFriendsScreen;

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
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
  },
  backButton: {
    width: 43,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  searchBox: {
    height: 57,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 3,
    marginBottom: 17,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B2B2D',
    backgroundColor: '#171718',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 13,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 15,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  discoveryCard: {
    minHeight: 91,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    paddingHorizontal: 13,
    borderRadius: 19,
    borderWidth: 1,
  },
  contactsCard: {
    borderColor: 'rgba(48, 211, 104, 0.25)',
    backgroundColor: '#111810',
  },
  nearbyCard: {
    borderColor: 'rgba(126, 82, 255, 0.3)',
    backgroundColor: '#14111D',
  },
  discoveryIcon: {
    width: 57,
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
  },
  contactsIcon: {
    backgroundColor: '#35C66B',
  },
  nearbyIcon: {
    backgroundColor: '#6644EA',
  },
  discoveryCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },
  discoveryTitle: {
    color: '#F7F7F8',
    fontSize: 15,
    fontWeight: '700',
  },
  discoverySubtitle: {
    marginTop: 4,
    color: '#B2B2BC',
    fontSize: 11,
  },
  discoveryAction: {
    minWidth: 64,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 13,
    borderRadius: 22,
    backgroundColor: '#FFEA00',
  },
  discoveryActionText: {
    color: '#080808',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#F7F7F8',
    fontSize: 19,
    fontWeight: '800',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  seeAllText: {
    color: '#D3D3D8',
    fontSize: 13,
    fontWeight: '500',
  },
  suggestions: {
    gap: 6,
  },
  suggestionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#222224',
    backgroundColor: '#101011',
  },
  suggestionProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    padding: 2,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#D6D6D8',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
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
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#101011',
  },
  onlineDot: {
    backgroundColor: '#36D66C',
  },
  offlineDot: {
    backgroundColor: '#AEB2BB',
  },
  suggestionCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  suggestionName: {
    color: '#F6F6F7',
    fontSize: 15,
    fontWeight: '700',
  },
  username: {
    marginTop: 3,
    color: '#A5A5AE',
    fontSize: 13,
  },
  addButton: {
    minWidth: 87,
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 23,
    backgroundColor: '#FFEA00',
  },
  addButtonText: {
    color: '#080808',
    fontSize: 14,
    fontWeight: '800',
  },
  sentButton: {
    borderWidth: 1,
    borderColor: '#FFEA00',
    backgroundColor: 'rgba(255,234,0,0.08)',
  },
  sentButtonText: {
    color: '#FFEA00',
  },
  moreButton: {
    width: 30,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 13,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 5,
    color: '#9999A2',
    fontSize: 13,
  },
});
