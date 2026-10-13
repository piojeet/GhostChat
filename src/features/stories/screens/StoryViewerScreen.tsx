import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { getUserStories, viewStory } from '../services/storyService';
import type { Story } from '../types/story.types';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'StoryViewer'>;

const StoryViewerScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [stories, setStories] = useState<Story[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [reaction, setReaction] = useState<string | null>(null);
  const story = stories[storyIndex];

  useEffect(() => {
    let active = true;
    const loadStory = async () => {
      const storyId = route.params?.storyId;
      if (!storyId) {
        setError('Story not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const viewed = await viewStory(storyId);
        const result = await getUserStories(viewed.user.id);
        if (!active) return;
        const index = result.items.findIndex(item => item.id === viewed.id);
        if (index < 0) throw new Error('This story is no longer available.');
        setStories(result.items);
        setStoryIndex(index);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof ApiError ? loadError.message : 'This story is no longer available.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadStory();
    setReaction(null);
    return () => { active = false; };
  }, [route.params?.storyId]);

  const moveStory = async (direction: -1 | 1) => {
    const nextIndex = storyIndex + direction;
    if (nextIndex < 0 || nextIndex >= stories.length) {
      navigation.goBack();
      return;
    }
    try {
      const viewed = await viewStory(stories[nextIndex].id);
      setStories(current => current.map(item => item.id === viewed.id ? viewed : item));
      setStoryIndex(nextIndex);
      setReaction(null);
    } catch (moveError) {
      Alert.alert('Story unavailable', moveError instanceof ApiError ? moveError.message : 'This story is no longer available.');
      navigation.goBack();
    }
  };

  const sendReply = () => {
    const message = reply.trim();
    if (!message) {
      return;
    }
    setReply('');
    Alert.alert('Reply unavailable', 'Story replies are not supported by the current backend.');
    setReply('');
  };

  if (loading) return <View style={styles.screen}><ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /></View>;
  if (error || !story) return <View style={styles.screen}><Text style={styles.userName}>{error || 'Story not found.'}</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.userName}>Close</Text></Pressable></View>;
  if (story.mediaType === 'video') return <View style={styles.screen}><Text style={styles.userName}>Video playback is unavailable in this app build.</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.userName}>Close</Text></Pressable></View>;

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <ImageBackground
        source={{ uri: story.media }}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.imageShade} />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        <View style={styles.progressRow}>
          {stories.map((item, index) => (
            <View key={item.id} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressValue,
                  index < storyIndex && styles.progressComplete,
                  index === storyIndex && styles.progressCurrent,
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          {story.user.avatar ? <Image source={{ uri: story.user.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]} />}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{story.user.displayName}</Text>
            <Text style={styles.storyTime}>{new Date(story.createdAt).toLocaleString()}</Text>
          </View>
          <Pressable
            accessibilityLabel="Close story"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Icon name="x" size={32} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
        </View>

        <View style={styles.tapZones}>
          <Pressable
            accessibilityLabel="Previous story"
            onPress={() => moveStory(-1)}
            style={styles.tapZone}
          />
          <Pressable
            accessibilityLabel="Next story"
            onPress={() => moveStory(1)}
            style={styles.tapZone}
          />
        </View>

        <View style={styles.reactions}>
          {[
            { emoji: '😍', label: 'Love reaction' },
            { emoji: '🔥', label: 'Fire reaction' },
          ].map(item => (
            <Pressable
              key={item.emoji}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              onPress={() => Alert.alert('Reaction unavailable', 'Story reactions are not supported by the current backend.')}
              style={[
                styles.reactionButton,
                reaction === item.emoji && styles.reactionSelected,
              ]}
            >
              <Text style={styles.reactionEmoji}>{item.emoji}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.replyBar}>
          <TextInput
            accessibilityLabel="Reply to story"
            onChangeText={setReply}
            onSubmitEditing={sendReply}
            placeholder="Send a reply..."
            placeholderTextColor={adaptThemeColor('#A0A0A0', 'color')}
            returnKeyType="send"
            style={styles.replyInput}
            value={reply}
          />
          <Pressable
            accessibilityLabel="Send reply"
            accessibilityRole="button"
            onPress={sendReply}
            style={styles.sendButton}
          >
            <Icon name="send" size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default StoryViewerScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#080808',
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 16,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  progressValue: {
    width: '0%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  progressComplete: {
    width: '100%',
  },
  progressCurrent: {
    width: '28%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    backgroundColor: '#242424',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  storyTime: {
    marginTop: 3,
    color: '#D0D0D0',
    fontSize: 14,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapZones: {
    ...StyleSheet.absoluteFill,
    top: 110,
    bottom: 120,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },
  reactions: {
    position: 'absolute',
    right: 18,
    bottom: 118,
    gap: 12,
  },
  reactionButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  reactionSelected: {
    borderColor: '#FFEA00',
    backgroundColor: 'rgba(255, 234, 0, 0.2)',
  },
  reactionEmoji: {
    fontSize: 26,
  },
  replyBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    paddingLeft: 18,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 30,
    backgroundColor: 'rgba(20, 20, 20, 0.68)',
    zIndex: 2,
  },
  replyInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 16,
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
