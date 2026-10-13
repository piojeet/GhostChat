import {
  adaptThemeColor,
  createAdaptiveStyles,
} from '../../../theme/systemTheme';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Feather';
import type { SnapMedia } from '../types/media';
import { snapFilter, type SnapFilter } from '../types/filters';
import { getFriendStatus } from '../../friends/services/friendService';
import { sendSnap } from '../../snaps/services/snapService';
import { ApiError } from '../../../services/api/apiError';

type Props = {
  media?: SnapMedia;
  recipientId?: string;
  recipientName?: string;
  selectedFilter?: SnapFilter;
  initialText?: string;
  initialTool?: 'text' | 'draw';
  onClose: () => void;
  onContinue: (
    media: SnapMedia,
    selectedFilter?: SnapFilter,
    initialText?: string,
    initialTool?: 'text' | 'draw',
  ) => void;
  onSent: () => void;
};

const CameraMediaPreview = ({
  media,
  recipientId,
  recipientName,
  selectedFilter,
  initialText = '',
  initialTool,
  onClose,
  onContinue,
  onSent,
}: Props) => {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const activeFilter = snapFilter(selectedFilter);

  const returnToCamera = onClose;
  const openEditor = () => {
    if (!media) {
      Alert.alert(
        'Media required',
        'Capture or select media before continuing.',
      );
      return;
    }
    onContinue(media, selectedFilter, initialText, initialTool);
  };
  const handleBookmark = () => {
    setIsSaved(value => !value);
    Alert.alert(
      isSaved ? 'Removed from saved' : 'Saved',
      isSaved
        ? 'This media was removed from saved items.'
        : 'This media was saved for later.',
    );
  };
  const handleDirectSend = async () => {
    if (sendingRef.current || !media || !recipientId) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const status = await getFriendStatus(recipientId);
      if (status !== 'friends') {
        Alert.alert(
          'Friend unavailable',
          'You can only send snaps to friends. Go back and choose a current friend.',
        );
        return;
      }
      await sendSnap(media, media.type === 'video' ? 'video' : 'image', [
        recipientId,
      ]);
      Alert.alert(
        'Snap sent',
        `Your snap was sent to ${recipientName ?? 'your friend'}.`,
        [{ text: 'OK', onPress: onSent }],
        { cancelable: false },
      );
    } catch (error) {
      Alert.alert(
        'Unable to send snap',
        error instanceof ApiError
          ? error.message
          : 'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  const duration =
    media?.duration == null
      ? ''
      : ` · ${Math.floor(media.duration / 60)}:${String(
          Math.floor(media.duration % 60),
        ).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      {media?.type === 'video' ? (
        <Video
          source={{ uri: media.uri }}
          paused={!isPlaying}
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
        <View style={[StyleSheet.absoluteFill, styles.emptyMedia]}>
          <Text style={styles.emptyText}>No media selected.</Text>
        </View>
      )}
      {activeFilter.tint !== 'transparent' && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: activeFilter.tint }]}
        />
      )}
      {initialText.length > 0 && (
        <Text pointerEvents="none" style={styles.overlayText}>
          {initialText}
        </Text>
      )}
      <View pointerEvents="none" style={styles.imageShade} />

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Close preview"
          accessibilityRole="button"
          onPress={returnToCamera}
          style={styles.topButton}
        >
          <Icon
            name="x"
            size={29}
            color={adaptThemeColor('#FFFFFF', 'color')}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark media'}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          onPress={handleBookmark}
          style={styles.topButton}
        >
          <Icon
            name="bookmark"
            size={25}
            color={adaptThemeColor('#FFFFFF', 'color')}
          />
        </Pressable>
      </View>

      {media?.type === 'video' && (
        <Pressable
          accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
          accessibilityRole="button"
          onPress={() => setIsPlaying(value => !value)}
          style={styles.playButton}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={41}
            color={adaptThemeColor('#FFFFFF', 'color')}
            style={!isPlaying && styles.playIcon}
          />
        </Pressable>
      )}

      <View
        style={[
          styles.bottomPanel,
          { paddingBottom: Math.max(insets.bottom, 12) + 10 },
        ]}
      >
        <View style={styles.mediaDetails}>
          <Icon
            name={media?.type === 'video' ? 'video' : 'image'}
            size={22}
            color={adaptThemeColor('#FFFFFF', 'color')}
          />
          <Text style={styles.mediaLabel}>
            {media
              ? `${media.type === 'video' ? 'Video' : 'Photo'}${duration}`
              : ''}
          </Text>
        </View>

        {!recipientId && (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={returnToCamera}
              style={styles.retakeButton}
            >
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!media}
              onPress={openEditor}
              style={styles.nextButton}
            >
              <Text style={styles.nextText}>Next</Text>
              <Icon
                name="chevron-right"
                size={24}
                color={adaptThemeColor('#080808', 'color')}
              />
            </Pressable>
          </View>
        )}
        {recipientId && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              sending
                ? `Sending snap to ${recipientName ?? 'friend'}`
                : `Send snap directly to ${recipientName ?? 'friend'}`
            }
            disabled={!media || sending}
            onPress={handleDirectSend}
            style={styles.directSendRow}
          >
            <View style={styles.directSendRecipient}>
              <Text numberOfLines={1} style={styles.directSendName}>
                {recipientName ?? 'Selected friend'}
              </Text>
              <Text style={styles.directSendHint}>
                {sending ? 'Uploading and sending...' : 'Send snap directly'}
              </Text>
            </View>
            <View style={styles.directSendButton}>
              {sending ? (
                <ActivityIndicator
                  color={adaptThemeColor('#080808', 'color')}
                />
              ) : (
                <Icon
                  name="send"
                  size={23}
                  color={adaptThemeColor('#080808', 'color')}
                />
              )}
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default CameraMediaPreview;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#070707',
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  overlayText: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    maxWidth: '80%',
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    zIndex: 1,
  },
  emptyMedia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  playButton: {
    position: 'absolute',
    top: '43%',
    alignSelf: 'center',
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  playIcon: {
    marginLeft: 5,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: 'rgba(5,5,5,0.96)',
  },
  mediaDetails: {
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  mediaLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  directSendRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: '#17191C',
  },
  directSendRecipient: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  directSendName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  directSendHint: {
    marginTop: 3,
    color: '#A0A0A0',
    fontSize: 13,
  },
  directSendButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: '#FFEA00',
  },
  retakeButton: {
    flex: 1,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#131313',
  },
  retakeText: {
    color: '#F5F5F5',
    fontSize: 17,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 25,
    backgroundColor: '#FFEA00',
  },
  nextText: {
    color: '#080808',
    fontSize: 18,
    fontWeight: '800',
  },
});
