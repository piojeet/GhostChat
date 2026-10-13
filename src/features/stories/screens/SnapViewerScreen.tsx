import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useRef, useState } from 'react';
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
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { openSnap, replaySnap } from '../../snaps/services/snapService';
import type { OpenedSnap } from '../../snaps/types/snap.types';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'SnapViewer'>;

const SnapViewerScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [reply, setReply] = useState('');
  const [snap, setSnap] = useState<OpenedSnap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const openRequest = useRef<{
    snapId: string;
    mode: 'open' | 'replay';
    promise: Promise<OpenedSnap>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const mode = route.params.mode ?? 'open';
    setSnap(null);
    setLoading(true);
    setError('');
    const loadSnap = async () => {
      try {
        if (
          openRequest.current?.snapId !== route.params.snapId ||
          openRequest.current.mode !== mode
        ) {
          openRequest.current = {
            snapId: route.params.snapId,
            mode,
            promise:
              mode === 'replay'
                ? replaySnap(route.params.snapId)
                : openSnap(route.params.snapId),
          };
        }
        const pendingOpen = openRequest.current.promise;
        const opened = await pendingOpen;
        if (active) setSnap(opened);
      } catch (openError) {
        if (!active) return;
        setError(openError instanceof ApiError && openError.code === 'SNAP_REPLAY_USED'
          ? 'This snap has already been replayed.'
          : openError instanceof ApiError && openError.status === 410
          ? 'This snap has already been opened or has expired.'
          : openError instanceof ApiError ? openError.message : 'Unable to open snap.');
      } finally {
        if (
          openRequest.current?.snapId === route.params.snapId &&
          openRequest.current.mode === mode
        ) {
          openRequest.current = null;
        }
        if (active) setLoading(false);
      }
    };
    loadSnap();
    return () => { active = false; };
  }, [route.params.mode, route.params.snapId]);

  const sendReply = () => {
    if (!reply.trim()) {
      return;
    }

    const message = reply.trim();
    setReply('');
    navigation.navigate('Chat', {
      userId: snap?.sender.id ?? route.params.userId,
      name: snap?.sender.displayName ?? route.params.name,
      initialMessage: message,
    });
  };

  if (loading) return <View style={styles.screen}><ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /></View>;
  if (error || !snap) return <View style={styles.screen}><Text style={styles.userName}>{error || 'Snap unavailable.'}</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.userName}>Close</Text></Pressable></View>;

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      {snap.mediaType === 'video' ? (
        <Video
          source={{ uri: snap.media }}
          controls
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <ImageBackground
          source={{ uri: snap.media }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View pointerEvents="none" style={styles.imageShade} />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 9,
            paddingBottom: Math.max(insets.bottom, 12) + 10,
          },
        ]}
      >
        <View style={styles.headerArea}>
          <View style={styles.progressRow}>
            {[0].map(segment => (
              <View key={segment} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressValue,
                    styles.progressCurrent,
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.header}>
            {snap.sender.avatar ? <Image source={{ uri: snap.sender.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]} />}
            <View style={styles.userDetails}>
              <Text numberOfLines={1} style={styles.userName}>
                {snap.sender.displayName}
              </Text>
              <Text style={styles.snapTime}>{new Date(snap.createdAt).toLocaleString()}</Text>
            </View>
            <Pressable
              accessibilityLabel="Snap options"
              accessibilityRole="button"
              onPress={() =>
                Alert.alert('Snap options', 'More snap actions will be available soon.')
              }
              style={styles.moreButton}
            >
              <Icon name="more-vertical" size={26} color={adaptThemeColor('#FFFFFF', 'color')} />
            </Pressable>
            <Pressable
              accessibilityLabel="Close snap"
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Icon name="x" size={26} color={adaptThemeColor('#FFFFFF', 'color')} />
            </Pressable>
          </View>
        </View>

        {snap.caption.length > 0 && (
          <Text style={styles.caption}>{snap.caption}</Text>
        )}

        <View style={styles.footer}>
          <Pressable
            accessibilityLabel="Open camera to reply with a snap"
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Camera' })
            }
            style={styles.cameraButton}
          >
            <Icon name="camera" size={25} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <View style={styles.replyBar}>
            <TextInput
              accessibilityLabel="Reply to snap"
              onChangeText={setReply}
              onSubmitEditing={sendReply}
              placeholder="Reply..."
              placeholderTextColor={adaptThemeColor('#D0D0D0', 'color')}
              returnKeyType="send"
              style={styles.replyInput}
              value={reply}
            />
            {reply.trim().length > 0 && (
              <Pressable
                accessibilityLabel="Send reply"
                accessibilityRole="button"
                onPress={sendReply}
                style={styles.sendButton}
              >
                <Icon name="send" size={19} color={adaptThemeColor('#FFFFFF', 'color')} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityLabel="Snap reactions unavailable"
            accessibilityRole="button"
            onPress={() => Alert.alert('Reaction unavailable', 'Snap reactions are not supported by the current backend.')}
            style={styles.reactionButton}
          >
            <Text style={styles.reactionEmoji}>😍</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default SnapViewerScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#090B12',
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.13)',
  },
  snapTapZones: {
    position: 'absolute',
    top: 104,
    bottom: 104,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  snapTapZone: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerArea: {
    gap: 12,
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
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  progressValue: {
    width: 0,
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  progressCurrent: {
    width: '72%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#FFEA00',
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
    fontSize: 17,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  snapTime: {
    marginTop: 4,
    color: '#D4D4D8',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  caption: {
    alignSelf: 'center',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  moreButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  cameraButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(15,15,15,0.52)',
  },
  replyBar: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.58)',
    backgroundColor: 'rgba(15,15,15,0.44)',
  },
  replyInput: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 16,
  },
  sendButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(15,15,15,0.48)',
  },
  reactionSelected: {
    borderColor: '#FFEA00',
    backgroundColor: 'rgba(255,234,0,0.14)',
  },
  reactionEmoji: {
    fontSize: 29,
  },
});
