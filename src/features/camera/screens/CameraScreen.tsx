import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import CameraView from '../components/CameraView';
import CameraPermissionView from '../components/CameraPermissionView';
import { useCamera } from '../hooks/useCamera';
import { createCapturedMedia, createPickedMedia } from '../types/media';
import { snapFilters, type SnapFilter } from '../types/filters';

type Props = BottomTabScreenProps<MainTabParamList, 'Camera'>;
type Tool = 'camera' | 'filters' | 'flash' | 'text' | 'draw';

const tools: { id: Tool; icon: string; label: string }[] = [
  { id: 'camera', icon: 'camera', label: 'Switch camera' },
  { id: 'filters', icon: 'star', label: 'Filters' },
  { id: 'flash', icon: 'zap', label: 'Flash' },
  { id: 'text', icon: 'type', label: 'Text' },
  { id: 'draw', icon: 'edit-2', label: 'Draw' },
];

const filterSwatchStyles: Record<SnapFilter, ViewStyle> = {
  original: { backgroundColor: '#292929' },
  warm: { backgroundColor: 'rgba(255, 164, 72, 0.72)' },
  cool: { backgroundColor: 'rgba(66, 151, 255, 0.72)' },
  mono: { backgroundColor: 'rgba(150, 150, 150, 0.72)' },
  vivid: { backgroundColor: 'rgba(255, 190, 30, 0.78)' },
  rose: { backgroundColor: 'rgba(246, 92, 172, 0.72)' },
};

const CameraScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SnapFilter>('original');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [drawAfterCapture, setDrawAfterCapture] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingStarted = useRef(false);
  const {
    cameraRef,
    device,
    position,
    hasBackCamera,
    hasFrontCamera,
    setPosition,
    flashEnabled,
    setFlashEnabled,
    hasPermission,
    requestPermission,
    hasMicrophonePermission,
    requestMicrophonePermission,
  } = useCamera();

  useEffect(() => {
    if (!hasPermission || !device || !isFocused) {
      setCameraReady(false);
      return;
    }
    setCameraError(null);
    setCameraReady(false);
  }, [device, hasPermission, isFocused]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSeconds(seconds => seconds + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const requestCameraAccess = async () => {
    try {
      const granted = await requestPermission();
      if (!granted) {
        setCameraError('Camera permission was denied. Allow camera access to take a Snap.');
      } else {
        setCameraError(null);
      }
    } catch {
      setCameraError('Camera permission could not be requested. Try again in Settings.');
    }
  };

  const currentSnapText = () => showTextInput ? textInput.trim() : overlayText;

  const showCaptureError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Please try again.';
    Alert.alert('Unable to capture media', message);
  };

  const takePhoto = async () => {
    if (isCapturing || !cameraReady || !cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: flashEnabled && device?.hasFlash ? 'on' : 'off',
      });
      navigation.navigate('CameraPreview', {
        media: createCapturedMedia(photo.path, 'photo', photo.width, photo.height),
        recipientId: route.params?.recipientId,
        recipientName: route.params?.recipientName,
        selectedFilter,
        initialText: currentSnapText(),
        initialTool: drawAfterCapture ? 'draw' : currentSnapText() ? 'text' : undefined,
      });
    } catch (error) {
      showCaptureError(error);
    } finally {
      setIsCapturing(false);
    }
  };

  const startVideoRecording = () => {
    if (isCapturing || recordingStarted.current || !cameraReady || !cameraRef.current) return;
    if (!hasMicrophonePermission) {
      Alert.alert(
        'Microphone permission required',
        'Allow microphone access in Settings to record video with sound.',
      );
      return;
    }

    try {
      cameraRef.current.startRecording({
        fileType: 'mp4',
        flash: flashEnabled && device?.hasTorch ? 'on' : 'off',
        onRecordingFinished: video => {
          recordingStarted.current = false;
          setIsRecording(false);
          navigation.navigate('CameraPreview', {
            media: createCapturedMedia(
              video.path,
              'video',
              video.width,
              video.height,
              video.duration,
            ),
            recipientId: route.params?.recipientId,
            recipientName: route.params?.recipientName,
            selectedFilter,
            initialText: currentSnapText(),
            initialTool: drawAfterCapture ? 'draw' : currentSnapText() ? 'text' : undefined,
          });
        },
        onRecordingError: error => {
          recordingStarted.current = false;
          setIsRecording(false);
          showCaptureError(error);
        },
      });
      recordingStarted.current = true;
      setIsRecording(true);
    } catch (error) {
      showCaptureError(error);
    }
  };

  const stopVideoRecording = () => {
    if (!recordingStarted.current || !cameraRef.current) return;
    cameraRef.current.stopRecording().catch(error => {
      recordingStarted.current = false;
      setIsRecording(false);
      showCaptureError(error);
    });
  };

  const openGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 1,
        includeBase64: false,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        const message =
          result.errorCode === 'permission'
            ? 'Gallery access was denied. Allow photo access in Settings to select a snap.'
            : result.errorMessage ?? 'Please try again.';
        Alert.alert(
          result.errorCode === 'permission' ? 'Gallery permission denied' : 'Unable to open gallery',
          message,
        );
        return;
      }
      const media = result.assets?.[0] && createPickedMedia(result.assets[0]);
      if (!media) {
        Alert.alert('Unable to select media', 'The selected file could not be opened.');
        return;
      }
      navigation.navigate('MediaPreview', {
        media,
        recipientId: route.params?.recipientId,
        recipientName: route.params?.recipientName,
        selectedFilter,
        initialText: currentSnapText(),
        initialTool: drawAfterCapture ? 'draw' : currentSnapText() ? 'text' : undefined,
      });
    } catch (error) {
      showCaptureError(error);
    }
  };

  const handleToolPress = (tool: Tool) => {
    if (tool === 'camera') {
      if (isRecording) return;
      const nextPosition = position === 'back' ? 'front' : 'back';
      if (
        (nextPosition === 'front' && !hasFrontCamera) ||
        (nextPosition === 'back' && !hasBackCamera) ||
        !hasPermission
      ) {
        Alert.alert('Camera unavailable', 'This camera is not available on your device.');
        return;
      }
      setPosition(nextPosition);
      setFlashEnabled(false);
      setCameraReady(false);
      return;
    }
    if (tool === 'flash') {
      if (!(isVideoMode ? device?.hasTorch : device?.hasFlash)) {
        Alert.alert('Flash unavailable', 'Flash is not available on this camera.');
        return;
      }
      setFlashEnabled(enabled => !enabled);
      return;
    }
    if (tool === 'filters') {
      setShowFilters(value => !value);
      setShowTextInput(false);
    } else if (tool === 'text') {
      setTextInput(overlayText);
      setShowTextInput(value => !value);
      setShowFilters(false);
    } else if (tool === 'draw') {
      setDrawAfterCapture(value => !value);
      setShowFilters(false);
    }
  };

  const toggleVideoMode = async () => {
    if (isVideoMode) {
      setIsVideoMode(false);
      return;
    }
    const granted = hasMicrophonePermission || await requestMicrophonePermission();
    if (!granted) {
      Alert.alert(
        'Microphone permission denied',
        'Allow microphone access in Settings before recording video.',
      );
      return;
    }
    setIsVideoMode(true);
  };

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      {hasPermission && device && !cameraError ? (
        <>
          <CameraView
            cameraRef={cameraRef}
            device={device}
            isActive={isFocused && hasPermission}
            hasMicrophonePermission={hasMicrophonePermission}
            flashEnabled={flashEnabled}
            onInitialized={() => {
              setCameraError(null);
              setCameraReady(true);
            }}
            onError={error => {
              setCameraReady(false);
              setCameraError(error.message);
            }}
          />
          {!cameraReady && (
            <CameraPermissionView
              loading
              message="Starting camera…"
            />
          )}
        </>
      ) : (
        <CameraPermissionView
          message={
            cameraError ??
            (hasPermission
              ? 'No camera is available on this device.'
              : 'Camera permission is required to take a Snap.')
          }
          actionLabel={!hasPermission ? 'Allow camera' : cameraError ? 'Retry camera' : undefined}
          onAction={
            !hasPermission
              ? () => { requestCameraAccess().catch(() => undefined); }
              : cameraError
                ? () => { setCameraError(null); setCameraReady(false); }
                : undefined
          }
        />
      )}

      <View style={[styles.header, { top: insets.top + 12 }]}>
        <Pressable
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Chats');
          }}
          style={styles.roundButton}
          android_ripple={{ color: 'rgba(255,255,255,0.22)', borderless: true }}
        >
          <Icon name="x" size={27} color="#FFFFFF" />
        </Pressable>
      </View>

      {cameraReady && (
        <>
          <View style={[styles.tools, { top: insets.top + 82 }]}>
            {tools.map(tool => {
              const supported = tool.id !== 'flash' ||
                Boolean(isVideoMode ? device?.hasTorch : device?.hasFlash);
              const isSelected =
                (tool.id === 'filters' && showFilters) ||
                (tool.id === 'text' && showTextInput) ||
                (tool.id === 'draw' && drawAfterCapture) ||
                (tool.id === 'flash' && flashEnabled);
              return (
                <Pressable
                  key={tool.id}
                  accessibilityLabel={tool.label}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !supported || isRecording,
                    selected: isSelected,
                  }}
                  disabled={!supported || isRecording}
                  onPress={() => handleToolPress(tool.id)}
                  style={[
                    styles.toolButton,
                    isSelected && styles.selectedToolButton,
                    (!supported || isRecording) && styles.disabledControl,
                  ]}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
                >
                  <Icon
                    name={tool.id === 'flash' && !flashEnabled ? 'zap-off' : tool.icon}
                    size={23}
                    color="#FFFFFF"
                  />
                </Pressable>
              );
            })}
          </View>

          {isRecording && (
            <View style={[styles.recordingIndicator, { top: insets.top + 22 }]}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>
                {`${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`}
              </Text>
            </View>
          )}

          {showFilters && (
            <View style={[styles.filterPanel, { bottom: insets.bottom + 142 }]}>
              <Text style={styles.panelHint}>Filter will be applied in the Snap editor</Text>
              <View style={styles.filterOptions}>
                {snapFilters.map(filter => (
                  <Pressable
                    key={filter.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${filter.label} filter`}
                    accessibilityState={{ selected: selectedFilter === filter.id }}
                    onPress={() => setSelectedFilter(filter.id)}
                    style={[
                      styles.filterOption,
                      selectedFilter === filter.id && styles.selectedFilterOption,
                    ]}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    <View style={[styles.filterSwatch, filterSwatchStyles[filter.id]]} />
                    <Text style={styles.filterLabel}>{filter.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {showTextInput && (
            <View style={[styles.textEditor, { top: insets.top + 18 }]}>
              <TextInput
                accessibilityLabel="Text to add to Snap"
                autoFocus
                maxLength={500}
                onChangeText={setTextInput}
                onSubmitEditing={() => {
                  setOverlayText(textInput.trim());
                  setShowTextInput(false);
                }}
                placeholder="Text for your Snap"
                placeholderTextColor="#C5C5C5"
                returnKeyType="done"
                style={styles.textInput}
                value={textInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply Snap text"
                onPress={() => {
                  setOverlayText(textInput.trim());
                  setShowTextInput(false);
                  Keyboard.dismiss();
                }}
                style={styles.textDone}
              >
                <Icon name="check" size={23} color="#FFEA00" />
              </Pressable>
            </View>
          )}

          {!showTextInput && overlayText.length > 0 && (
            <Text pointerEvents="none" style={styles.liveTextOverlay}>
              {overlayText}
            </Text>
          )}

          <View style={[styles.captureControls, { bottom: Math.max(insets.bottom, 10) + 12 }]}>
            <Pressable
              accessibilityLabel="Open photo and video gallery"
              accessibilityRole="button"
              accessibilityState={{ disabled: isRecording || isCapturing }}
              disabled={isRecording || isCapturing}
              onPress={() => { openGallery().catch(showCaptureError); }}
              style={styles.sideControl}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            >
              <View style={styles.roundButton}>
                <Icon name="image" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.controlLabel}>Gallery</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={
                isVideoMode
                  ? isRecording ? 'Stop video recording' : 'Start video recording'
                  : 'Take photo'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !cameraReady || isCapturing }}
              disabled={!cameraReady || isCapturing}
              onPress={() => {
                if (!isVideoMode) takePhoto().catch(showCaptureError);
                else if (isRecording) stopVideoRecording();
                else startVideoRecording();
              }}
              style={[styles.shutter, isRecording && styles.recordingOuter]}
              android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
            >
              {isVideoMode ? (
                <View style={[styles.videoShutter, isRecording && styles.recordingShutter]} />
              ) : (
                <View style={styles.photoShutter} />
              )}
            </Pressable>

            <Pressable
              accessibilityLabel={isVideoMode ? 'Switch to photo mode' : 'Switch to video mode'}
              accessibilityRole="button"
              accessibilityState={{ disabled: isRecording }}
              disabled={isRecording}
              onPress={() => { toggleVideoMode().catch(showCaptureError); }}
              style={styles.sideControl}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            >
              <View style={styles.roundButton}>
                <Icon name={isVideoMode ? 'camera' : 'video'} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.controlLabel}>
                {isVideoMode ? 'Photo' : 'Video'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

export default CameraScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#080808',
  },
  header: {
    position: 'absolute',
    left: 22,
    zIndex: 2,
  },
  roundButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  tools: {
    position: 'absolute',
    right: 18,
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
  },
  selectedToolButton: {
    borderColor: '#FFEA00',
    backgroundColor: 'rgba(40, 35, 0, 0.78)',
  },
  disabledControl: {
    opacity: 0.42,
  },
  recordingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    zIndex: 2,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  recordingTime: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    paddingTop: 11,
    paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    zIndex: 2,
  },
  panelHint: {
    marginBottom: 7,
    color: '#E7E7E7',
    fontSize: 12,
    textAlign: 'center',
  },
  filterOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterOption: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 54,
    borderRadius: 10,
  },
  selectedFilterOption: {
    backgroundColor: 'rgba(255, 234, 0, 0.18)',
  },
  filterSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  filterLabel: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  textEditor: {
    position: 'absolute',
    left: 76,
    right: 18,
    zIndex: 3,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textDone: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTextOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    maxWidth: '78%',
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    zIndex: 1,
  },
  captureControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 18,
    zIndex: 2,
  },
  sideControl: {
    width: 78,
    alignItems: 'center',
  },
  controlLabel: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  shutter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  photoShutter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  videoShutter: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  recordingShutter: {
    width: 27,
    height: 27,
    borderRadius: 6,
  },
  recordingOuter: {
    borderColor: '#FF3B30',
  },
});
