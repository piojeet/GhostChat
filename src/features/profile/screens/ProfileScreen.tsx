import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import {
  getMyProfile,
  getProfileSnaps,
  getProfileStats,
  getProfileStories,
} from '../services/profileService';
import type { ProfileSnap, ProfileStats, ProfileUser } from '../types/profile.types';
import type { Story } from '../../stories/types/story.types';
import { ApiError } from '../../../services/api/apiError';
import GenderAvatar from '../components/GenderAvatar';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;
type ProfileTab = 'Snaps' | 'Stories' | 'Saved';

const ProfileScreen = ({ navigation }: Props) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('Snaps');
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [snaps, setSnaps] = useState<ProfileSnap[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [snapPage, setSnapPage] = useState(1);
  const [storyPage, setStoryPage] = useState(1);
  const [snapsHaveNextPage, setSnapsHaveNextPage] = useState(false);
  const [storiesHaveNextPage, setStoriesHaveNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [currentProfile, currentStats, snapResult, storyResult] = await Promise.all([
        getMyProfile(),
        getProfileStats(),
        getProfileSnaps(),
        getProfileStories(),
      ]);
      setProfile(currentProfile);
      setStats(currentStats);
      setSnaps(snapResult.items);
      setStories(storyResult.items);
      setSnapPage(1);
      setStoryPage(1);
      setSnapsHaveNextPage(snapResult.pagination.hasNextPage);
      setStoriesHaveNextPage(storyResult.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    const currentTab = activeTab;
    const nextPage = currentTab === 'Snaps' ? snapPage + 1 : storyPage + 1;
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      if (currentTab === 'Snaps') {
        const page = await getProfileSnaps(nextPage);
        setSnaps(current => [...current, ...page.items]);
        setSnapPage(nextPage);
        setSnapsHaveNextPage(page.pagination.hasNextPage);
      } else {
        const page = await getProfileStories(nextPage);
        setStories(current => [...current, ...page.items]);
        setStoryPage(nextPage);
        setStoriesHaveNextPage(page.pagination.hasNextPage);
      }
    } catch (loadError) {
      Alert.alert('Unable to load more', loadError instanceof ApiError ? loadError.message : 'Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadProfile();
  }, [loadProfile]));

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor={adaptThemeColor('#FFEA00', 'color')}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image
              source={require('../../../assets/images/splash/snapapp-ghost.png')}
              style={styles.ghost}
              resizeMode="contain"
            />
            <Text style={styles.brandText}>
              Snap<Text style={styles.brandAccent}>App</Text>
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Create a snap"
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'Camera' })
              }
              style={styles.headerAction}
            >
              <Icon name="camera" size={22} color={adaptThemeColor('#FFFFFF', 'color')} />
            </Pressable>
            <Pressable
              accessibilityLabel="Profile settings"
              accessibilityRole="button"
              onPress={handleSettings}
              style={styles.headerAction}
            >
              <Icon name="settings" size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
            </Pressable>
          </View>
        </View>

        <View style={styles.profileHero}>
          <View style={styles.heroGlow} />
          <Pressable
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
            onPress={handleEditProfile}
            style={styles.avatarRing}
          >
            <GenderAvatar
              avatar={profile?.avatar}
              gender={profile?.gender}
              size={120}
            />
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={15} color={adaptThemeColor('#FFFFFF', 'color')} />
            </View>
          </Pressable>
          <Text style={styles.displayName}>{profile?.displayName ?? ''}</Text>
          <Text style={styles.username}>{profile ? `@${profile.username}` : ''}</Text>
          <Text style={styles.bio}>{profile?.bio ?? ''}</Text>
        </View>

        <View style={styles.stats}>
          <Stat
            value={stats ? String(stats.friends) : loading ? '…' : '—'}
            label="Friends"
            onPress={() => navigation.navigate('Friends')}
          />
          <View style={styles.statDivider} />
          <Stat
            value={stats ? String(stats.stories) : loading ? '…' : '—'}
            label="Stories"
            onPress={() => navigation.navigate('Stories')}
          />
          <View style={styles.statDivider} />
          <Stat
            value={stats ? String(stats.snaps) : loading ? '…' : '—'}
            label="Snaps"
            onPress={() => setActiveTab('Snaps')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleEditProfile}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
          <Icon name="chevron-right" size={23} color={adaptThemeColor('#9A9A9A', 'color')} />
        </Pressable>

        <View style={styles.tabs}>
          {(['Snaps', 'Stories', 'Saved'] as ProfileTab[]).map(tab => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveTab(tab)}
                style={styles.tab}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.activeTabIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} style={styles.loading} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable onPress={() => loadProfile()}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : activeTab === 'Snaps' && snaps.length > 0 ? (
          <View style={styles.grid}>
            {snaps.map(snap => (
              <View key={snap.id} style={[styles.gridItem, styles.contentCard]}>
                <Icon name={snap.mediaType === 'video' ? 'video' : 'image'} size={30} color={adaptThemeColor('#FFFFFF', 'color')} />
                <Text style={styles.cardCaption} numberOfLines={2}>
                  {snap.caption || `${snap.recipients.length} recipient${snap.recipients.length === 1 ? '' : 's'}`}
                </Text>
                <Text style={styles.cardDate}>{new Date(snap.createdAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        ) : activeTab === 'Stories' && stories.length > 0 ? (
          <View style={styles.grid}>
            {stories.map(story => (
              <Pressable
                key={story.id}
                accessibilityRole="button"
                accessibilityLabel="View your story"
                onPress={() => navigation.navigate('StoryViewer', { storyId: story.id, source: 'Stories' })}
                style={styles.gridItem}
              >
                {story.mediaType === 'image' ? (
                  <ImageBackground
                    source={{ uri: story.media }}
                    resizeMode="cover"
                    style={styles.gridImage}
                    imageStyle={styles.gridImageStyle}
                  >
                    <Text style={styles.cardDate}>{new Date(story.createdAt).toLocaleDateString()}</Text>
                  </ImageBackground>
                ) : (
                  <View style={[styles.gridImage, styles.contentCard]}>
                    <Icon name="video" size={30} color={adaptThemeColor('#FFFFFF', 'color')} />
                    <Text style={styles.cardDate}>Video</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ) : activeTab === 'Saved' ? (
          <Text style={styles.emptyText}>Saved content is not available yet.</Text>
        ) : (
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} yet.</Text>
        )}
        {!loading && !error && activeTab !== 'Saved' &&
          (activeTab === 'Snaps' ? snapsHaveNextPage : storiesHaveNextPage) && (
          <Pressable disabled={loadingMore} onPress={loadMore} style={styles.loadMore}>
            {loadingMore ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : <Text style={styles.retryText}>Load more</Text>}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat = ({
  value,
  label,
  onPress,
}: {
  value: string;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${value} ${label}`}
    onPress={onPress}
    style={styles.stat}
  >
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Pressable>
);

export default ProfileScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  content: {
    paddingBottom: 18,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ghost: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandText: {
    marginLeft: 9,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  brandAccent: {
    color: '#FFEA00',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerAction: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
  },
  profileHero: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: 72,
    left: -40,
    right: -40,
    height: 140,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 234, 0, 0.035)',
  },
  avatarRing: {
    position: 'relative',
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 66,
    borderWidth: 3,
    borderColor: '#FFEA00',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 5,
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#080808',
    backgroundColor: '#C52BEE',
  },
  username: {
    marginTop: 3,
    color: '#B3B3B3',
    fontSize: 15,
    fontWeight: '600',
  },
  displayName: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  bio: {
    marginTop: 5,
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 3,
    color: '#A0A0A0',
    fontSize: 14,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: '#282828',
  },
  editButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#151515',
  },
  editButtonText: {
    flex: 1,
    marginLeft: 36,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabs: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    marginTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#292929',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#A0A0A0',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFEA00',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '52%',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFEA00',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  gridItem: {
    width: '32.4%',
    height: 176,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#1B1B1B',
  },
  gridImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gridImageStyle: {
    borderRadius: 12,
  },
  contentCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  cardCaption: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  cardDate: {
    margin: 8,
    color: '#FFFFFF',
    fontSize: 11,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loading: {
    marginTop: 36,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  retryText: {
    color: '#FFEA00',
    padding: 10,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  moreButton: {
    position: 'absolute',
    top: 7,
    right: 5,
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  views: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingBottom: 9,
  },
  viewCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyText: {
    paddingVertical: 50,
    color: '#A0A0A0',
    fontSize: 15,
    textAlign: 'center',
  },
});
