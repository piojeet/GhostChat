import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { getPublicProfile } from '../services/profileService';
import type { PublicProfileUser } from '../types/profile.types';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriendStatus,
  getIncomingRequests,
  getOutgoingRequests,
  removeFriend,
  searchFriends,
  sendFriendRequest,
} from '../../friends/services/friendService';
import type { FriendStatus } from '../../friends/types/friend.types';
import { getUserStories } from '../../stories/services/storyService';
import type { Story } from '../../stories/types/story.types';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'PublicProfile'>;
type ProfileTab = 'Snaps' | 'Stories';

const PublicProfileScreen = ({ navigation, route }: Props) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('Snaps');
  const [profile, setProfile] = useState<PublicProfileUser | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyCount, setStoryCount] = useState(0);
  const [status, setStatus] = useState<FriendStatus | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isStories = activeTab === 'Stories';

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let username = route.params?.username;
      if (!username && route.params?.name) {
        const search = await searchFriends(route.params.name, 1, 100);
        const match = search.items.find(user => user.id === route.params?.userId);
        username = match?.username;
      }
      if (!username) {
        throw new Error('This profile is unavailable because its username could not be resolved.');
      }
      const publicProfile = await getPublicProfile(username);
      setProfile(publicProfile);
      const [relationship, userStories] = await Promise.all([
        getFriendStatus(publicProfile.id),
        getUserStories(publicProfile.id),
      ]);
      setStatus(relationship);
      setStories(userStories.items);
      setStoryCount(userStories.pagination.total);
      setRequestId(null);
      if (relationship === 'incoming_pending' || relationship === 'outgoing_pending') {
        const requests = relationship === 'incoming_pending'
          ? await getIncomingRequests(1, 100)
          : await getOutgoingRequests(1, 100);
        setRequestId(requests.items.find(item => item.user.id === publicProfile.id)?.id ?? null);
      }
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  }, [route.params?.username, route.params?.name, route.params?.userId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleFriendAction = async () => {
    if (!profile || busy || !status) return;
    setBusy(true);
    try {
      if (status === 'none') await sendFriendRequest(profile.id);
      else if (status === 'outgoing_pending' && requestId) await cancelFriendRequest(requestId);
      else if (status === 'incoming_pending' && requestId) await acceptFriendRequest(requestId);
      else if (status === 'friends') {
        Alert.alert('Remove friend?', `Remove ${profile.displayName} from your friends?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => {
            removeFriend(profile.id).then(loadProfile).catch(removeError =>
              Alert.alert('Unable to remove friend', removeError instanceof ApiError ? removeError.message : 'Please try again.'),
            );
          } },
        ]);
        return;
      }
      else return;
      await loadProfile();
    } catch (actionError) {
      Alert.alert('Friend action failed', actionError instanceof ApiError ? actionError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const showOptions = () => {
    if (!profile) return;
    Alert.alert(profile.displayName, 'Profile options', [
      { text: 'Share Profile', onPress: () => Alert.alert('Share Profile', 'Profile sharing is not connected yet.') },
      {
        text: 'Report',
        onPress: () => route.params?.userId &&
          navigation.navigate('Report', {
            userId: profile.id,
            name: profile.displayName,
            username: profile.username,
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) return <SafeAreaView style={styles.screen}><ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /></SafeAreaView>;
  if (error || !profile) return <SafeAreaView style={styles.screen}><Text style={styles.emptyText}>{error || 'Profile unavailable.'}</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.emptyText}>Go back</Text></Pressable></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.cover}>
          <CoverArtwork />
          <View style={styles.coverShade} />
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={[styles.coverButton, styles.backButton]}
          >
            <Icon name="chevron-left" size={30} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Pressable
            accessibilityLabel="More profile options"
            accessibilityRole="button"
            onPress={showOptions}
            style={[styles.coverButton, styles.optionsButton]}
          >
            <Icon name="more-vertical" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.avatarWrap}>
            {profile.avatar ? <Image source={{ uri: profile.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View>}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.displayName}</Text>
          </View>
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>

          <View style={styles.statsRow}>
            <Stat icon="users" value="—" label="Friends" />
            <Stat icon="play" value={String(storyCount)} label="Stories" />
            <Stat icon="camera" value="—" label="Snaps" />
          </View>

          <Pressable
            accessibilityLabel={`${status ?? 'Loading'} friend status`}
            accessibilityRole="button"
            disabled={busy || status === 'blocked' || !status || ((status === 'incoming_pending' || status === 'outgoing_pending') && !requestId)}
            onPress={handleFriendAction}
            style={[styles.addFriendButton, status !== 'none' && styles.requestSentButton]}
          >
            <Icon
              name={status === 'none' ? 'user-plus' : status === 'blocked' ? 'slash' : 'check'}
              size={22}
              color={status === 'none' ? '#080808' : '#FFFFFF'}
            />
            <Text style={[styles.addFriendText, status !== 'none' && styles.requestSentText]}>
              {busy ? 'Please wait…' : status === 'none' ? 'Add Friend' : status === 'outgoing_pending' ? 'Cancel Request' : status === 'incoming_pending' ? 'Accept Request' : status === 'friends' ? 'Friends' : 'Unavailable'}
            </Text>
          </Pressable>

          <View style={styles.profileActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${profile.displayName}`}
              onPress={() =>
                navigation.navigate('Chat', { userId: profile.id, name: profile.displayName })
              }
              style={styles.profileActionButton}
            >
              <Icon name="message-circle" size={20} color={adaptThemeColor('#FFFFFF', 'color')} />
              <Text style={styles.profileActionText}>Chat</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${profile.displayName}`}
              onPress={() =>
                navigation.navigate('AudioCall', { userId: profile.id, name: profile.displayName })
              }
              style={styles.profileActionButton}
            >
              <Icon name="phone" size={20} color={adaptThemeColor('#FFFFFF', 'color')} />
              <Text style={styles.profileActionText}>Call</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Video call ${profile.displayName}`}
              onPress={() =>
                navigation.navigate('VideoCall', { userId: profile.id, name: profile.displayName })
              }
              style={styles.profileActionButton}
            >
              <Icon name="video" size={20} color={adaptThemeColor('#FFFFFF', 'color')} />
              <Text style={styles.profileActionText}>Video</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(['Snaps', 'Stories'] as ProfileTab[]).map(tab => {
              const selected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveTab(tab)}
                  style={styles.tab}
                >
                  <View style={[styles.tabPill, selected && styles.selectedTabPill]}>
                    <Text style={[styles.tabText, selected && styles.selectedTabText]}>
                      {tab}
                    </Text>
                  </View>
                  {selected && <View style={styles.tabUnderline} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.grid}>
          {isStories ? stories.map(story => (
            <Pressable
              key={story.id}
              accessibilityLabel={`View ${profile.displayName}'s story`}
              accessibilityRole="button"
              onPress={() => navigation.navigate('StoryViewer', { storyId: story.id, source: 'Stories' })}
              style={styles.gridItem}
            >
              {story.mediaType === 'image' ? (
                <ImageBackground source={{ uri: story.media }} resizeMode="cover" style={styles.gridImage} imageStyle={styles.gridImageStyle} />
              ) : (
                <View style={[styles.gridImage, styles.videoPlaceholder]}><Icon name="video" size={28} color={adaptThemeColor('#FFFFFF', 'color')} /></View>
              )}
            </Pressable>
          )) : (
            <Text style={styles.emptyText}>Public snap content is not available from the backend.</Text>
          )}
          {isStories && stories.length === 0 && <Text style={styles.emptyText}>No active stories.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <View style={styles.stat}>
    <Icon name={icon} size={22} color={adaptThemeColor('#FFEA00', 'color')} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const CoverArtwork = () => (
  <Svg
    width="100%"
    height="100%"
    viewBox="0 0 400 250"
    preserveAspectRatio="xMidYMid slice"
    style={StyleSheet.absoluteFill}
  >
    <Rect width="400" height="250" fill="#79A9D8" />
    <Circle cx="64" cy="40" r="19" fill="#FFF4D0" opacity="0.8" />
    <Path d="M-10 145 47 75l39 45 70-91 48 79 47-58 76 81 49-53 43 65z" fill="#496E91" />
    <Path d="m133 83 23-54 27 42-16-10-12 12-8-10zM225 91l26-41 21 32-16-9-8 11-10-8z" fill="#F1F4F4" />
    <Path d="M0 148 74 79l45 62 50-67 62 77 48-69 44 65 49-46 35 51v40H0z" fill="#274A61" />
    <Path d="M0 174c53-21 98-19 152-5 53 14 110 5 153-12 34-13 67-9 95 3v90H0z" fill="#123B3A" />
    <Path d="M0 193c65-13 116-5 171 2 89 11 145-13 229-8v63H0z" fill="#145766" />
    <Path d="M0 214c57-9 108 2 162 7 90 9 157-8 238-6" fill="none" stroke="#A9D5D1" strokeWidth="2" opacity="0.65" />
    <Path d="M0 177 21 127l20 36 20-23 33 49M400 169l-25-54-20 41-20-24-33 50" fill="#123224" />
    <Path d="M20 163v-50m0 0-17 28h12L3 158h34l-12-17h12zM62 177v-62m0 0-20 34h15l-14 22h38l-15-22h15zM364 164v-62m0 0-19 34h15l-14 22h37l-15-22h15zM390 175v-48m0 0-15 27h11l-11 18h29l-12-18h12z" fill="#0C241B" />
  </Svg>
);

export default PublicProfileScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  content: {
    paddingBottom: 24,
  },
  cover: {
    height: 255,
    overflow: 'hidden',
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    backgroundColor: '#315C80',
  },
  coverShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  coverButton: {
    position: 'absolute',
    top: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(13, 19, 25, 0.72)',
  },
  backButton: {
    left: 16,
  },
  optionsButton: {
    right: 16,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: -94,
    paddingHorizontal: 22,
  },
  avatarWrap: {
    position: 'relative',
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFEA00',
    borderRadius: 66,
    backgroundColor: '#080808',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292929',
  },
  initial: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    right: 3,
    bottom: 6,
    width: 22,
    height: 22,
    borderWidth: 3,
    borderColor: '#080808',
    borderRadius: 11,
    backgroundColor: '#35D45B',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  verifiedStar: {
    overflow: 'hidden',
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#FFEA00',
  },
  username: {
    marginTop: 3,
    color: '#95A0B2',
    fontSize: 16,
  },
  bio: {
    marginTop: 8,
    color: '#D2D9E2',
    fontSize: 15,
    textAlign: 'center',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },
  stat: {
    minHeight: 106,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#202326',
    borderRadius: 19,
    backgroundColor: '#0E1012',
  },
  statValue: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    color: '#98A1AF',
    fontSize: 13,
  },
  addFriendButton: {
    width: '100%',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#FFEA00',
  },
  profileActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
  },
  profileActionButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#30343A',
    borderRadius: 16,
    backgroundColor: '#17191D',
  },
  profileActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  requestSentButton: {
    borderWidth: 1,
    borderColor: '#464A4F',
    backgroundColor: '#222529',
  },
  addFriendText: {
    color: '#080808',
    fontSize: 19,
    fontWeight: '800',
  },
  requestSentText: {
    color: '#FFFFFF',
  },
  tabs: {
    width: '100%',
    height: 58,
    flexDirection: 'row',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1F2124',
    borderRadius: 17,
    backgroundColor: '#0B0C0E',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    width: '76%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  selectedTabPill: {
    backgroundColor: '#FFEA00',
  },
  tabText: {
    color: '#9299A6',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedTabText: {
    color: '#080808',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
    height: 3,
    backgroundColor: '#FFEA00',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  gridItem: {
    width: '32.2%',
    height: 205,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#17191C',
  },
  gridImage: {
    flex: 1,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242424',
  },
  gridImageStyle: {
    borderRadius: 14,
  },
  snapMoreButton: {
    position: 'absolute',
    top: 7,
    right: 6,
    width: 29,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(15, 19, 24, 0.5)',
  },
  snapOptionsPopover: {
    position: 'absolute',
    top: 44,
    right: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 12, 15, 0.9)',
  },
  snapOptionsText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  emptyText: {
    padding: 28,
    color: '#B6B6B6',
    fontSize: 15,
    textAlign: 'center',
  },
});
