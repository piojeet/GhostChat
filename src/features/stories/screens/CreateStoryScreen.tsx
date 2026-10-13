import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
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
import { createStory } from '../services/storyService';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'CreateStory'>;
type StoryTool = 'text' | 'draw' | 'sticker' | 'layout' | 'crop' | 'emoji' | 'music' | 'effects';

const storyTools: { id: StoryTool; icon: string; label: string }[] = [
  { id: 'text', icon: 'type', label: 'Add text' },
  { id: 'draw', icon: 'edit-2', label: 'Draw' },
  { id: 'sticker', icon: 'smile', label: 'Stickers' },
  { id: 'layout', icon: 'share-2', label: 'Layout' },
  { id: 'crop', icon: 'crop', label: 'Crop' },
  { id: 'emoji', icon: 'smile', label: 'Emoji' },
  { id: 'music', icon: 'music', label: 'Music' },
];

const CreateStoryScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [activeTool, setActiveTool] = useState<StoryTool | null>(null);
  const [showTextEntry, setShowTextEntry] = useState(false);
  const [caption, setCaption] = useState('');
  const [showDoodle, setShowDoodle] = useState(false);
  const [sticker, setSticker] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const onToolPress = (tool: StoryTool) => {
    setActiveTool(tool);
    switch (tool) {
      case 'text':
        setShowTextEntry(true);
        break;
      case 'draw':
        setShowDoodle(value => !value);
        break;
      case 'sticker':
        setSticker(value => (value === '✨' ? '💛' : '✨'));
        break;
      case 'emoji':
        setCaption(value => (value.includes('😍') ? value : `${value} 😍`));
        break;
      case 'layout':
      case 'crop':
      case 'music':
      case 'effects':
        Alert.alert(tool[0].toUpperCase() + tool.slice(1), `${tool} editing will be available soon.`);
        break;
      default:
        break;
    }
  };

  const closeEditor = () => navigation.goBack();

  const shareStory = async () => {
    if (publishing) return;
    const uri = route.params?.imageUri;
    if (!uri || route.params?.sampleMedia) {
      Alert.alert('Media required', 'Select or capture a real photo or video before publishing. A media picker is not currently available.');
      return;
    }
    setPublishing(true);
    try {
      await createStory(
        uri,
        route.params?.mediaType === 'video' ? 'video' : 'image',
        caption.trim(),
      );
      navigation.navigate('Stories');
    } catch (error) {
      Alert.alert('Unable to publish story', error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const saveStory = () => {
    Alert.alert('Save unavailable', 'Saving to your device requires media library access.');
  };

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      {route.params?.imageUri && !route.params.sampleMedia ? <Image source={{ uri: route.params.imageUri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, styles.noMedia]}><Text style={styles.noMediaText}>Choose a photo or video to create a story</Text></View>}
      <View pointerEvents="none" style={styles.imageShade} />

      {showDoodle && (
        <View pointerEvents="none" style={styles.doodle}>
          <Text style={styles.crown}>♕</Text>
          <Text style={styles.heartOne}>♡</Text>
          <Text style={styles.heartTwo}>♡</Text>
          <Text style={styles.sparkle}>✦</Text>
        </View>
      )}
      {sticker && !showDoodle && (
        <Text pointerEvents="none" style={styles.sticker}>{sticker}</Text>
      )}
      {caption.length > 0 && (
        <Text pointerEvents="none" style={styles.captionOverlay}>{caption}</Text>
      )}

      <Pressable
        accessibilityLabel="Close story editor"
        accessibilityRole="button"
        onPress={closeEditor}
        style={[styles.closeButton, { top: insets.top + 14 }]}
      >
        <Icon name="x" size={30} color={adaptThemeColor('#FFFFFF', 'color')} />
      </Pressable>

      <View style={[styles.tools, { top: insets.top + 14 }]}>
        {storyTools.map(tool => (
          <Pressable
            key={tool.id}
            accessibilityLabel={tool.label}
            accessibilityRole="button"
            onPress={() => onToolPress(tool.id)}
            style={[styles.toolButton, activeTool === tool.id && styles.activeTool]}
          >
            <Icon name={tool.icon} size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityLabel="Story effects"
        accessibilityRole="button"
        onPress={() => onToolPress('effects')}
        style={[styles.effectsButton, { bottom: 105 + insets.bottom }]}
      >
        <Icon name="sparkles" size={25} color={adaptThemeColor('#FFFFFF', 'color')} />
      </Pressable>

      {showTextEntry && (
        <View style={styles.textEntry}>
          <TextInput
            autoFocus
            accessibilityLabel="Story text"
            onChangeText={setCaption}
            onSubmitEditing={() => setShowTextEntry(false)}
            placeholder="Type something..."
            placeholderTextColor={adaptThemeColor('#A0A0A0', 'color')}
            returnKeyType="done"
            style={styles.textInput}
            value={caption}
          />
          <Pressable
            accessibilityLabel="Finish text editing"
            accessibilityRole="button"
            onPress={() => setShowTextEntry(false)}
          >
            <Icon name="check" size={24} color={adaptThemeColor('#FFEA00', 'color')} />
          </Pressable>
        </View>
      )}

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={saveStory}
            style={styles.saveButton}
          >
            <Icon name="download" size={25} color={adaptThemeColor('#FFFFFF', 'color')} />
            <Text style={styles.saveLabel}>Save</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={shareStory}
            disabled={publishing}
            style={styles.shareButton}
          >
            {publishing ? <ActivityIndicator color={adaptThemeColor('#080808', 'color')} /> : <><Text style={styles.shareLabel}>Share Story</Text><Icon name="chevron-right" size={25} color={adaptThemeColor('#080808', 'color')} /></>}
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel="Choose another story photo"
          accessibilityRole="button"
          onPress={() => Alert.alert('Gallery unavailable', 'A media picker is not installed in this app yet.')}
          style={styles.galleryButton}
        >
          <Icon name="image" size={18} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
      </View>
    </View>
  );
};

export default CreateStoryScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#080808',
  },
  noMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    backgroundColor: '#141414',
  },
  noMediaText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    zIndex: 3,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15,15,15,0.74)',
  },
  tools: {
    position: 'absolute',
    right: 18,
    zIndex: 3,
    gap: 8,
  },
  toolButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(16,16,16,0.78)',
  },
  activeTool: {
    borderColor: '#FFEA00',
    borderWidth: 2,
  },
  effectsButton: {
    position: 'absolute',
    right: 18,
    zIndex: 3,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(16,16,16,0.78)',
  },
  doodle: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  crown: {
    position: 'absolute',
    top: '10%',
    left: '23%',
    color: '#FFEA00',
    fontSize: 115,
    fontWeight: '500',
    transform: [{ rotate: '-10deg' }],
  },
  heartOne: {
    position: 'absolute',
    top: '44%',
    left: '14%',
    color: '#FFEA00',
    fontSize: 105,
    transform: [{ rotate: '-18deg' }],
  },
  heartTwo: {
    position: 'absolute',
    top: '53%',
    left: '39%',
    color: '#FFEA00',
    fontSize: 95,
    transform: [{ rotate: '12deg' }],
  },
  sparkle: {
    position: 'absolute',
    top: '29%',
    right: '25%',
    color: '#FFEA00',
    fontSize: 45,
  },
  sticker: {
    position: 'absolute',
    top: '30%',
    left: '18%',
    zIndex: 2,
    fontSize: 62,
  },
  captionOverlay: {
    position: 'absolute',
    top: '43%',
    alignSelf: 'center',
    zIndex: 2,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  textEntry: {
    position: 'absolute',
    top: '42%',
    left: 22,
    right: 22,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(12,12,12,0.92)',
  },
  textInput: {
    flex: 1,
    minHeight: 52,
    color: '#FFFFFF',
    fontSize: 17,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    paddingTop: 12,
    paddingHorizontal: 17,
    backgroundColor: 'rgba(6,6,6,0.96)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButton: {
    width: '33%',
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    backgroundColor: '#141414',
  },
  saveLabel: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 23,
    backgroundColor: '#FFEA00',
  },
  shareLabel: {
    color: '#080808',
    fontSize: 18,
    fontWeight: '800',
  },
  galleryButton: {
    position: 'absolute',
    right: 20,
    top: -42,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(20,20,20,0.75)',
  },
});
