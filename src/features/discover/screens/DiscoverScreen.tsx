import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import { authStore } from '../../../store/authStore';
import { ApiError } from '../../../services/api/apiError';
import { getUnreadCount } from '../../notifications/services/notificationService';
import { getMyStories, getStoryFeed } from '../../stories/services/storyService';
import type { Story } from '../../stories/types/story.types';
import type { SafeUser } from '../../friends/types/friend.types';
import GenderAvatar from '../../profile/components/GenderAvatar';
import type { MainTabParamList } from '../../../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Discover'>;
type StoryGroup = {
  id: string;
  user: SafeUser;
  stories: Story[];
  isOwn: boolean;
};

const STORY_PAGE_SIZE = 20;

const isActiveStory = (story: Story, now: number): boolean =>
  Boolean(
    story &&
    typeof story.id === 'string' &&
    story.id.trim() &&
    story.user &&
    typeof story.user.id === 'string' &&
    story.user.id.trim() &&
    typeof story.user.username === 'string' &&
    story.user.username.trim() &&
    typeof story.user.displayName === 'string' &&
    story.user.displayName.trim() &&
    typeof story.media === 'string' &&
    story.media.trim() &&
    (story.mediaType === 'image' || story.mediaType === 'video') &&
    (story.visibility === 'public' || story.visibility === 'friends') &&
    Number.isFinite(Date.parse(story.createdAt)) &&
    Number.isFinite(Date.parse(story.expiresAt)) &&
    Date.parse(story.expiresAt) > now,
  );

const DiscoverScreen = ({ navigation }: Props) => {
  const [friendStories, setFriendStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [storyPage, setStoryPage] = useState(1);
  const [hasMoreStories, setHasMoreStories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [storyError, setStoryError] = useState('');
  const [myStoryError, setMyStoryError] = useState('');
  const [moreStoriesError, setMoreStoriesError] = useState('');
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const auth = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    authStore.getState,
  );
  const currentUser = auth.user;

  const loadStories = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setStoryError('');
    setMyStoryError('');
    setMoreStoriesError('');

    const [feedResult, ownResult, notificationsResult] = await Promise.allSettled([
      getStoryFeed(1, STORY_PAGE_SIZE),
      getMyStories(1, STORY_PAGE_SIZE),
      getUnreadCount(),
    ]);

    const now = Date.now();
    if (feedResult.status === 'fulfilled') {
      const ownId = currentUser?.id;
      const validStories = feedResult.value.items.filter(
        story => isActiveStory(story, now) && story.user.id !== ownId,
      );
      setFriendStories(validStories);
      setStoryPage(1);
      setHasMoreStories(feedResult.value.pagination.hasNextPage);
    } else {
      setFriendStories([]);
      setStoryPage(1);
      setHasMoreStories(false);
      setStoryError(
        feedResult.reason instanceof ApiError
          ? feedResult.reason.message
          : 'Unable to load friends’ stories right now.',
      );
    }

    if (ownResult.status === 'fulfilled') {
      setMyStories(
        ownResult.value.items.filter(
          story => isActiveStory(story, now) && story.user.id === currentUser?.id,
        ),
      );
    } else {
      setMyStories([]);
      setMyStoryError(
        ownResult.reason instanceof ApiError
          ? ownResult.reason.message
          : 'Unable to load your story right now.',
      );
    }

    setNotificationCount(
      notificationsResult.status === 'fulfilled'
        ? notificationsResult.value.count
        : null,
    );
    setLoading(false);
    setRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(useCallback(() => {
    loadStories();
  }, [loadStories]));

  const loadMoreStories = useCallback(async () => {
    if (!hasMoreStories || loadingMore || loading || storyError) return;
    setLoadingMore(true);
    setMoreStoriesError('');
    try {
      const nextPage = storyPage + 1;
      const result = await getStoryFeed(nextPage, STORY_PAGE_SIZE);
      const now = Date.now();
      const ownId = currentUser?.id;
      const validStories = result.items.filter(
        story => isActiveStory(story, now) && story.user.id !== ownId,
      );
      setFriendStories(current => [
        ...current,
        ...validStories.filter(story => !current.some(item => item.id === story.id)),
      ]);
      setStoryPage(nextPage);
      setHasMoreStories(result.pagination.hasNextPage);
    } catch (failure) {
      setMoreStoriesError(
        failure instanceof ApiError
          ? failure.message
          : 'Unable to load more stories.',
      );
    } finally {
      setLoadingMore(false);
    }
  }, [currentUser?.id, hasMoreStories, loading, loadingMore, storyError, storyPage]);

  const storyGroups = useMemo(() => {
    const groups: StoryGroup[] = [];
    if (currentUser) {
      const ownUser: SafeUser = {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar ?? null,
        gender: currentUser.gender,
      };
      groups.push({
        id: `own-${ownUser.id}`,
        user: ownUser,
        stories: myStories,
        isOwn: true,
      });
    }

    const groupByUser = new Map<string, StoryGroup>();
    friendStories.forEach(story => {
      const group = groupByUser.get(story.user.id);
      if (group) {
        group.stories.push(story);
      } else {
        groupByUser.set(story.user.id, {
          id: story.user.id,
          user: story.user,
          stories: [story],
          isOwn: false,
        });
      }
    });
    groups.push(...groupByUser.values());
    return groups;
  }, [currentUser, friendStories, myStories]);

  const openStory = useCallback((story: Story) => {
    navigation.navigate('StoryViewer', {
      storyId: story.id,
      source: 'Discover',
    });
  }, [navigation]);

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>GhostChat</Text>
          <Text style={styles.brandSubtitle}>Stories and moments</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => navigation.navigate('Search')}
            style={styles.headerButton}
          >
            <Icon name="search" size={20} color="#F7F7F7" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerButton}
          >
            <Icon name="bell" size={20} color="#F7F7F7" />
            {notificationCount !== null && notificationCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileShortcut}
          >
            <GenderAvatar
              avatar={currentUser?.avatar}
              gender={currentUser?.gender}
              size={38}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.storiesSection}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Friends’ Stories</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Stories')}
            hitSlop={8}
          >
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {storyError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => loadStories(true)}
            style={styles.errorRow}
          >
            <Icon name="wifi-off" size={17} color="#FF9A9A" />
            <Text style={styles.errorText}>{storyError} · Tap to retry</Text>
          </Pressable>
        ) : null}

        <FlatList
          horizontal
          data={storyGroups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const firstStory = item.stories[0];
            const isUnseen = !item.isOwn && item.stories.some(story => !story.hasViewed);
            return (
              <View style={styles.storyItem}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.isOwn
                      ? item.stories.length ? 'View your story' : 'Add to your story'
                      : `View @${item.user.username}'s story`
                  }
                  onPress={() => {
                    if (firstStory) openStory(firstStory);
                    else navigation.navigate('Camera');
                  }}
                  style={styles.storyAvatarButton}
                >
                  <View
                    style={[
                      styles.storyRing,
                      isUnseen ? styles.storyRingUnseen : styles.storyRingSeen,
                    ]}
                  >
                    <View style={styles.storyRingInner}>
                      <GenderAvatar
                        avatar={item.user.avatar}
                        gender={item.user.gender}
                        size={56}
                      />
                    </View>
                  </View>
                </Pressable>
                {item.isOwn ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a story"
                    onPress={() => navigation.navigate('Camera')}
                    style={styles.addStoryBadge}
                  >
                    <Icon name="plus" size={15} color="#111111" />
                  </Pressable>
                ) : null}
                <Text numberOfLines={1} style={styles.storyUsername}>
                  {item.isOwn ? 'Your Story' : `@${item.user.username}`}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color="#FFEA00" style={styles.storiesLoading} />
            ) : undefined
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#FFEA00" style={styles.storiesLoading} />
            ) : undefined
          }
          onEndReached={() => loadMoreStories()}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.storyStrip}
          showsHorizontalScrollIndicator={false}
        />

        {!loading && !storyError && friendStories.length === 0 ? (
          <Text style={styles.storiesEmpty}>No friends have active stories yet.</Text>
        ) : null}
        {myStoryError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => loadStories(true)}
            style={styles.myStoryError}
          >
            <Text style={styles.errorText}>{myStoryError} · Tap to retry</Text>
          </Pressable>
        ) : null}
        {moreStoriesError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => loadMoreStories()}
            style={styles.myStoryError}
          >
            <Text style={styles.errorText}>{moreStoriesError} · Tap to retry</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.feedHeading}>
        <View>
          <Text style={styles.discoverTitle}>Discover</Text>
          <Text style={styles.sectionSubtitle}>Public posts from the community</Text>
        </View>
        <Icon name="compass" size={22} color="#FFEA00" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <FlatList
        data={[]}
        keyExtractor={item => item}
        renderItem={() => null}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.postsEmpty}>
            <View style={styles.emptyIcon}>
              <Icon name="image" size={25} color="#FFEA00" />
            </View>
            <Text style={styles.emptyTitle}>Public posts aren’t available yet</Text>
            <Text style={styles.emptyCopy}>
              GhostChat’s current backend has no public-post feed. Your friends’ active
              stories are shown above; no sample posts are displayed.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStories(true)}
            tintColor="#FFEA00"
            colors={['#FFEA00']}
          />
        }
      />
    </SafeAreaView>
  );
};

export default DiscoverScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  brand: {
    flex: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    marginTop: 2,
    color: '#8B8C91',
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerButton: {
    width: 38,
    height: 38,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#28292C',
    borderRadius: 19,
    backgroundColor: '#151618',
  },
  profileShortcut: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: '#FFEA00',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  storiesSection: {
    paddingTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F7F7F7',
    fontSize: 16,
    fontWeight: '700',
  },
  seeAll: {
    color: '#FFEA00',
    fontSize: 12,
    fontWeight: '600',
  },
  storyStrip: {
    minHeight: 94,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  storyItem: {
    width: 72,
    height: 83,
    alignItems: 'center',
    marginRight: 11,
    position: 'relative',
  },
  storyAvatarButton: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    padding: 2,
  },
  storyRingUnseen: {
    backgroundColor: '#FF8A00',
    borderWidth: 2,
    borderColor: '#FFEA00',
  },
  storyRingSeen: {
    backgroundColor: '#242529',
    borderWidth: 2,
    borderColor: '#5C5D63',
  },
  storyRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    padding: 1,
    backgroundColor: '#080808',
  },
  addStoryBadge: {
    position: 'absolute',
    top: 43,
    right: 2,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#080808',
    borderRadius: 11,
    backgroundColor: '#FFEA00',
  },
  storyUsername: {
    maxWidth: 72,
    marginTop: 4,
    color: '#D2D2D4',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  storiesLoading: {
    width: 56,
    height: 58,
    marginHorizontal: 8,
  },
  storiesEmpty: {
    marginHorizontal: 4,
    marginTop: 8,
    color: '#999A9E',
    fontSize: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    color: '#FFAAAA',
    fontSize: 12,
    lineHeight: 17,
  },
  myStoryError: {
    paddingHorizontal: 18,
    marginTop: 2,
  },
  feedHeading: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: '#1C1D20',
    marginTop: 2,
  },
  discoverTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    marginTop: 3,
    color: '#88898D',
    fontSize: 11,
  },
  postsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingTop: 24,
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#343126',
    borderRadius: 29,
    backgroundColor: '#17160F',
    marginBottom: 15,
  },
  emptyTitle: {
    color: '#F4F4F4',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    maxWidth: 310,
    marginTop: 8,
    color: '#96979B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
