import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground,
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
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { deleteStory, getMyStories, getStoryFeed } from '../services/storyService';
import type { Story } from '../types/story.types';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'Stories'>;
type StoriesFilter = 'All' | 'Friends' | 'Nearby';

const filters: StoriesFilter[] = ['All', 'Friends', 'Nearby'];

const StoriesScreen = ({ navigation }: Props) => {
  const [activeFilter, setActiveFilter] = useState<StoriesFilter>('All');
  const [feed, setFeed] = useState<Story[]>([]);
  const [mine, setMine] = useState<Story[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasNextPage, setFeedHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStories = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [ownStories, storyFeed] = await Promise.all([getMyStories(), getStoryFeed()]);
      setMine(ownStories.items);
      setFeed(storyFeed.items);
      setFeedPage(1);
      setFeedHasNextPage(storyFeed.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load stories.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = feedPage + 1;
      const result = await getStoryFeed(nextPage);
      setFeed(current => [...current, ...result.items]);
      setFeedPage(nextPage);
      setFeedHasNextPage(result.pagination.hasNextPage);
    } catch (loadError) {
      Alert.alert('Unable to load more stories', loadError instanceof ApiError ? loadError.message : 'Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => { loadStories(); }, [loadStories]));

  const groups = useMemo(() => {
    const grouped = new Map<string, Story[]>();
    feed.forEach(story => grouped.set(story.user.id, [...(grouped.get(story.user.id) ?? []), story]));
    return Array.from(grouped.values());
  }, [feed]);
  const visibleStories = activeFilter === 'Nearby' ? [] : feed;

  const openStory = (storyId: string) => {
    navigation.navigate('StoryViewer', { storyId, source: 'Stories' });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Image
            source={require('../../../assets/images/splash/snapapp-ghost.png')}
            style={styles.ghost}
            resizeMode="contain"
          />
          <Text style={styles.title}>Stories</Text>
        </View>
        <Pressable
          accessibilityLabel="Story notifications"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Notifications')}
          style={styles.notificationButton}
        >
          <Icon name="bell" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyStrip}
      >
        {[...(mine.length ? [{ id: 'mine', user: mine[0].user, stories: mine, own: true }] : []),
          ...groups.map(stories => ({ id: stories[0].user.id, user: stories[0].user, stories, own: false }))].map(group => (
          <Pressable
            key={group.id}
            accessibilityRole="button"
            accessibilityLabel={group.own ? 'View your story' : `View ${group.user.displayName}'s story`}
            onPress={() =>
              openStory(group.stories[0].id)
            }
            style={styles.storyBubble}
          >
            <View style={[styles.storyRing, !group.own && styles.friendStoryRing, group.stories.some(story => !story.hasViewed) && !group.own && styles.unviewedRing]}>
              {group.user.avatar ? <Image source={{ uri: group.user.avatar }} style={styles.storyAvatar} /> : <View style={[styles.storyAvatar, styles.avatarFallback]}><Text style={styles.initial}>{group.user.displayName.slice(0, 1).toUpperCase()}</Text></View>}
              {group.own && (
                <View style={styles.addStoryBadge}>
                  <Icon name="plus" size={15} color={adaptThemeColor('#080808', 'color')} />
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={styles.storyName}>{group.own ? 'Your Story' : group.user.displayName}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => navigation.navigate('CreateStory')} style={styles.storyBubble}>
          <View style={styles.storyRing}><View style={[styles.storyAvatar, styles.avatarFallback]}><Icon name="plus" size={24} color={adaptThemeColor('#FFEA00', 'color')} /></View></View>
          <Text style={styles.storyName}>Create</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.filterBar}>
        {filters.map(filter => {
          const isActive = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterTab, isActive && styles.activeFilterTab]}
            >
              <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStories(true)} tintColor={adaptThemeColor('#FFEA00', 'color')} />}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : error ? <Text style={styles.emptyState}>{error}  Try again</Text> : activeFilter === 'Nearby' ? <Text style={styles.emptyState}>Nearby stories are not available.</Text> : visibleStories.map(story => (
          <Pressable
            key={story.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${story.user.displayName}'s story`}
            onPress={() => openStory(story.id)}
            style={styles.card}
          >
            <ImageBackground
              source={{ uri: story.mediaType === 'image' ? story.media : undefined }}
              resizeMode="cover"
              style={styles.cardImage}
              imageStyle={styles.cardImageStyle}
            >
              <View style={styles.cardShade} />
              <View style={styles.cardHeader}>
                {story.user.avatar ? <Image source={{ uri: story.user.avatar }} style={styles.cardAvatar} /> : <View style={[styles.cardAvatar, styles.avatarFallback]} />}
                <View style={styles.cardUserDetails}>
                  <Text numberOfLines={1} style={styles.cardName}>{story.user.displayName}</Text>
                  <Text style={styles.cardTime}>{new Date(story.createdAt).toLocaleString()}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`More options for ${story.user.displayName}'s story`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    if (story.user.id !== mine[0]?.user.id) return;
                    Alert.alert('Delete story?', 'This will remove your active story.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => {
                        deleteStory(story.id).then(() => loadStories(true)).catch(deleteError =>
                          Alert.alert('Unable to delete story', deleteError instanceof ApiError ? deleteError.message : 'Please try again.'),
                        );
                      } },
                    ]);
                  }}
                  style={styles.cardMore}
                >
                  <Icon name="more-vertical" size={20} color={adaptThemeColor('#FFFFFF', 'color')} />
                </Pressable>
              </View>
              <View style={styles.viewCount}>
                <Icon name="eye" size={15} color={adaptThemeColor('#FFFFFF', 'color')} />
                <Text style={styles.viewText}>{story.mediaType === 'video' ? 'Video' : story.hasViewed ? 'Viewed' : 'New'}</Text>
              </View>
            </ImageBackground>
          </Pressable>
        ))}
        {!loading && !error && visibleStories.length === 0 && activeFilter !== 'Nearby' && (
          <Text style={styles.emptyState}>No stories right now.</Text>
        )}
        {!loading && !error && activeFilter !== 'Nearby' && feedHasNextPage && (
          <Pressable disabled={loadingMore} onPress={loadMore} style={styles.loadMoreButton}>
            {loadingMore ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : <Text style={styles.emptyState}>Load more</Text>}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default StoriesScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  loadMoreButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ghost: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  title: {
    marginLeft: 13,
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
  },
  notificationButton: {
    position: 'relative',
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
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
  storyStrip: {
    gap: 14,
    paddingHorizontal: 17,
    paddingTop: 4,
    paddingBottom: 12,
  },
  storyBubble: {
    width: 79,
    alignItems: 'center',
  },
  storyRing: {
    position: 'relative',
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFEA00',
  },
  friendStoryRing: {
    borderColor: '#D52AFF',
  },
  unviewedRing: {
    borderColor: '#FFEA00',
  },
  storyAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303030',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addStoryBadge: {
    position: 'absolute',
    right: -3,
    bottom: 0,
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#080808',
    borderRadius: 13,
    backgroundColor: '#FFEA00',
  },
  storyName: {
    width: 78,
    marginTop: 5,
    color: '#F0F0F1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterBar: {
    height: 52,
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 5,
    marginBottom: 11,
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  activeFilterTab: {
    backgroundColor: '#FFEA00',
  },
  filterText: {
    color: '#E1E1E4',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#080808',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  card: {
    width: '32.3%',
    height: 220,
    overflow: 'hidden',
    borderRadius: 15,
    backgroundColor: '#1B1B1B',
  },
  cardImage: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 8,
  },
  cardImageStyle: {
    borderRadius: 15,
  },
  cardShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  cardHeader: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardUserDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 5,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardTime: {
    marginTop: 2,
    color: '#E1E1E1',
    fontSize: 9,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardMore: {
    width: 22,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCount: {
    zIndex: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(20,20,20,0.62)',
  },
  viewText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 55,
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
  },
});
