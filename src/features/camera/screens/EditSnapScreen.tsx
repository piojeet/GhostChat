import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { mediaFromLegacyParams } from '../types/media';
import { snapFilter, snapFilters } from '../types/filters';

type Props = BottomTabScreenProps<MainTabParamList, 'EditSnap'>;
type EditorTool = 'text' | 'draw' | 'sticker' | 'filter' | 'crop' | 'undo' | 'emoji' | 'save';

const tools: { id: EditorTool; icon: string; label: string }[] = [
  { id: 'text', icon: 'type', label: 'Add text' },
  { id: 'draw', icon: 'edit-2', label: 'Draw' },
  { id: 'sticker', icon: 'grid', label: 'Add sticker' },
  { id: 'filter', icon: 'sliders', label: 'Filters' },
  { id: 'crop', icon: 'crop', label: 'Crop' },
  { id: 'undo', icon: 'corner-up-left', label: 'Undo doodles' },
  { id: 'emoji', icon: 'smile', label: 'Add emoji' },
  { id: 'save', icon: 'bookmark', label: 'Save options' },
];

const EditSnapScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState(
    route.params?.selectedFilter ?? snapFilters[0].id,
  );
  const [selectedTool, setSelectedTool] = useState<EditorTool>(
    route.params?.initialTool ?? 'filter',
  );
  const [showDoodles, setShowDoodles] = useState(
    route.params?.initialTool === 'draw',
  );
  const [showFilters, setShowFilters] = useState(true);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [overlayText, setOverlayText] = useState(route.params?.initialText ?? '');
  const [sticker, setSticker] = useState<'crown' | 'heart' | null>(null);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [drawingSize, setDrawingSize] = useState({ width: 1, height: 1 });
  const currentPathRef = useRef('');
  const media = mediaFromLegacyParams(route.params);

  const activeFilter = snapFilter(selectedFilter);
  const drawingResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => showDoodles && selectedTool === 'draw',
    onMoveShouldSetPanResponder: () => showDoodles && selectedTool === 'draw',
    onPanResponderGrant: event => {
      const { locationX, locationY } = event.nativeEvent;
      currentPathRef.current = `M ${locationX} ${locationY}`;
      setCurrentPath(currentPathRef.current);
    },
    onPanResponderMove: event => {
      const { locationX, locationY } = event.nativeEvent;
      currentPathRef.current += ` L ${locationX} ${locationY}`;
      setCurrentPath(currentPathRef.current);
    },
    onPanResponderRelease: () => {
      if (currentPathRef.current) {
        setDrawnPaths(paths => [...paths, currentPathRef.current]);
      }
      currentPathRef.current = '';
      setCurrentPath('');
    },
    onPanResponderTerminate: () => {
      currentPathRef.current = '';
      setCurrentPath('');
    },
  }), [selectedTool, showDoodles]);

  const handleDrawingLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDrawingSize({ width, height });
  };

  const handleToolPress = (tool: EditorTool) => {
    setSelectedTool(tool);
    switch (tool) {
      case 'text':
        setShowTextEditor(true);
        break;
      case 'draw':
        setShowDoodles(value => !value);
        break;
      case 'sticker':
        setSticker(value => (value === 'heart' ? 'crown' : 'heart'));
        break;
      case 'filter':
        setShowFilters(value => !value);
        break;
      case 'undo':
        setDrawnPaths([]);
        currentPathRef.current = '';
        setCurrentPath('');
        setShowDoodles(false);
        setOverlayText('');
        setSticker(null);
        break;
      case 'crop':
        Alert.alert('Crop', 'Image cropping will be available with the media editor.');
        break;
      case 'emoji':
        setOverlayText(value => (value.includes('😊') ? value : `${value} 😊`));
        break;
      case 'save':
        Alert.alert('Save', 'Saving to your device will be available after media access is connected.');
        break;
      default:
        break;
    }
  };

  const handleSave = () => {
    Alert.alert('Save unavailable', 'Saving to your device requires media library access.');
  };

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      {media?.type === 'video' ? (
        <Video
          source={{ uri: media.uri }}
          resizeMode="cover"
          repeat
          style={StyleSheet.absoluteFill}
        />
      ) : media ? (
        <Image
          source={{ uri: media.uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.missingMedia]}>
          <Text style={styles.missingMediaText}>Select or capture media to edit.</Text>
        </View>
      )}
      {activeFilter.tint !== 'transparent' && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: activeFilter.tint }]}
        />
      )}
      <View pointerEvents="none" style={styles.imageShade} />

      <View
        pointerEvents={showDoodles && selectedTool === 'draw' ? 'auto' : 'none'}
        onLayout={handleDrawingLayout}
        style={styles.doodleLayer}
        {...drawingResponder.panHandlers}
      >
        <Svg
          width={drawingSize.width}
          height={drawingSize.height}
          viewBox={`0 0 ${drawingSize.width} ${drawingSize.height}`}
        >
          {drawnPaths.map((path, index) => (
            <Path
              key={`drawn-${index}`}
              d={path}
              fill="none"
              stroke="#FFEA00"
              strokeWidth={7}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {currentPath.length > 0 && (
            <Path
              d={currentPath}
              fill="none"
              stroke="#FFEA00"
              strokeWidth={7}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </Svg>
      </View>

      {sticker && (
        <Text pointerEvents="none" style={styles.sticker}>
          {sticker === 'crown' ? '♕' : '♡'}
        </Text>
      )}

      {overlayText.length > 0 && (
        <Text pointerEvents="none" style={styles.overlayText}>
          {overlayText}
        </Text>
      )}

      <Pressable
        accessibilityLabel="Close editor"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={[styles.closeButton, { top: insets.top + 14 }]}
      >
        <Icon name="x" size={28} color={adaptThemeColor('#FFFFFF', 'color')} />
      </Pressable>

      <View style={[styles.tools, { top: insets.top + 14 }]}>
        {tools.map(tool => (
          <Pressable
            key={tool.id}
            accessibilityLabel={tool.label}
            accessibilityRole="button"
            onPress={() => handleToolPress(tool.id)}
            style={[
              styles.toolButton,
              selectedTool === tool.id && styles.selectedTool,
            ]}
          >
            <Icon name={tool.icon} size={23} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
        ))}
      </View>

      {showTextEditor && (
        <View style={styles.textEditor}>
          <TextInput
            autoFocus
            accessibilityLabel="Snap caption"
            onChangeText={setOverlayText}
            onSubmitEditing={() => setShowTextEditor(false)}
            maxLength={500}
            placeholder="Type something..."
            placeholderTextColor={adaptThemeColor('#A0A0A0', 'color')}
            returnKeyType="done"
            style={styles.textInput}
            value={overlayText}
          />
          <Pressable
            accessibilityLabel="Done editing text"
            accessibilityRole="button"
            onPress={() => setShowTextEditor(false)}
          >
            <Icon name="check" size={23} color={adaptThemeColor('#FFEA00', 'color')} />
          </Pressable>
        </View>
      )}

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
        {showFilters && (
          <View style={styles.filters}>
            {snapFilters.map(filter => {
              const isSelected = selectedFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  accessibilityLabel={`${filter.id} filter`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedFilter(filter.id)}
                  style={[styles.filterItem, isSelected && styles.selectedFilter]}
                >
                  {media?.type === 'photo' ? (
                    <Image
                      source={{ uri: media.uri }}
                      resizeMode="cover"
                      style={styles.filterImage}
                    />
                  ) : (
                    <View style={[styles.filterImage, styles.videoFilterPreview]}>
                      <Icon name="video" size={20} color={adaptThemeColor('#FFFFFF', 'color')} />
                    </View>
                  )}
                  {filter.tint !== 'transparent' && (
                    <View
                      pointerEvents="none"
                      style={[styles.filterTint, { backgroundColor: filter.tint }]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            style={styles.secondaryAction}
          >
            <Icon name="download" size={25} color={adaptThemeColor('#FFFFFF', 'color')} />
            <Text style={styles.actionLabel}>Save</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('CreateStory', {
                imageUri: media?.uri,
                sampleMedia: route.params?.sampleMedia,
                mediaType: media?.type,
              })
            }
            style={styles.secondaryAction}
          >
            <Icon name="plus-circle" size={25} color={adaptThemeColor('#FFFFFF', 'color')} />
            <Text style={styles.actionLabel}>Story</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!media}
            onPress={() => {
              if (!media) return;
              navigation.navigate('SendSnap', {
                media,
                caption: overlayText.trim(),
                recipientId: route.params?.recipientId,
                recipientName: route.params?.recipientName,
              });
            }}
            style={styles.sendAction}
          >
            <Text style={styles.sendLabel}>Send</Text>
            <Icon name="chevron-right" size={25} color={adaptThemeColor('#080808', 'color')} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default EditSnapScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#080808',
  },
  missingMedia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingMediaText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    zIndex: 3,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tools: {
    position: 'absolute',
    right: 17,
    zIndex: 3,
    gap: 8,
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 24, 24, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
  },
  selectedTool: {
    borderWidth: 2,
    borderColor: '#FFEA00',
  },
  doodleLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  sticker: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    zIndex: 2,
    color: '#FFEA00',
    fontSize: 54,
    fontWeight: '700',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  overlayText: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    zIndex: 2,
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  textEditor: {
    position: 'absolute',
    top: '42%',
    left: 24,
    right: 24,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(12,12,12,0.9)',
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
    paddingTop: 11,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: 'rgba(5, 5, 5, 0.94)',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 11,
  },
  filterItem: {
    width: 58,
    height: 59,
    padding: 2,
    overflow: 'hidden',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFilter: {
    borderColor: '#FFEA00',
  },
  filterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  videoFilterPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303030',
  },
  filterTint: {
    ...StyleSheet.absoluteFill,
    margin: 2,
    borderRadius: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 76,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
  },
  actionLabel: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sendAction: {
    flex: 1.25,
    minHeight: 76,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFEA00',
  },
  sendLabel: {
    color: '#080808',
    fontSize: 18,
    fontWeight: '800',
  },
});
