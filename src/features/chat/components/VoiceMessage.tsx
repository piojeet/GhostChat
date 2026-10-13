import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { createSound } from 'react-native-nitro-sound';

type Props = {
  uri: string;
  durationSeconds: number;
};

const formatDuration = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const VoiceMessage = ({ uri, durationSeconds }: Props) => {
  const [player] = useState(createSound);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const normalizedUri = useMemo(() => {
    const trimmedUri = uri?.trim();
    if (!trimmedUri) return '';
    if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://') || trimmedUri.startsWith('file://')) {
      return trimmedUri;
    }
    if (trimmedUri.startsWith('/')) {
      return `file://${trimmedUri}`;
    }
    return trimmedUri;
  }, [uri]);

  useEffect(() => {
    const onPlaybackEnd = () => {
      playingRef.current = false;
      pausedRef.current = false;
      setPlaying(false);
    };
    player.addPlaybackEndListener(onPlaybackEnd);
    return () => {
      player.removePlaybackEndListener();
      if (playingRef.current || pausedRef.current) {
        player.stopPlayer().catch(error => {
          console.error('Unable to stop voice playback after leaving chat', error);
        });
      }
    };
  }, [player]);

  const stopPlayback = async () => {
    try {
      await player.stopPlayer();
    } catch {
      // Ignore cleanup failures; the next playback attempt can recover.
    } finally {
      playingRef.current = false;
      pausedRef.current = false;
      setPlaying(false);
    }
  };

  const togglePlayback = async () => {
    try {
      if (!normalizedUri) {
        Alert.alert('Voice message unavailable', 'This voice message could not be loaded.');
        return;
      }
      if (playingRef.current) {
        await player.pausePlayer();
        playingRef.current = false;
        pausedRef.current = true;
        setPlaying(false);
        return;
      }
      if (pausedRef.current) {
        await player.resumePlayer();
        pausedRef.current = false;
      } else {
        await stopPlayback();
        await player.startPlayer(normalizedUri);
      }
      playingRef.current = true;
      setPlaying(true);
    } catch (error) {
      Alert.alert(
        'Unable to play voice message',
        error instanceof Error ? error.message : 'Please try again.',
      );
      setPlaying(false);
      playingRef.current = false;
      pausedRef.current = false;
    }
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice message' : 'Play voice message'}
        onPress={() => togglePlayback().catch(error => {
          console.error('Voice message playback failed', error);
        })}
        style={styles.playButton}
      >
        <Icon name={playing ? 'pause' : 'play'} size={18} color="#FFEA00" />
      </Pressable>
      <View style={styles.details}>
        <Text style={styles.label}>Voice message</Text>
        <Text style={styles.duration}>{formatDuration(durationSeconds)}</Text>
      </View>
    </View>
  );
};

export default VoiceMessage;

const styles = createAdaptiveStyles({
  row: {
    minWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#17181A',
  },
  details: {
    flex: 1,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    marginTop: 2,
    color: '#B7BBC0',
    fontSize: 12,
  },
});
