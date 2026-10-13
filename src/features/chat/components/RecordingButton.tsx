import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Sound from 'react-native-nitro-sound';
import type { MessageMediaUpload } from '../services/messageService';

type Props = {
  disabled: boolean;
  onRecorded: (media: MessageMediaUpload) => Promise<void>;
};

type PendingVoiceRecording = MessageMediaUpload & {
  localPath: string;
};

const formatDuration = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const RecordingButton = ({ disabled, onRecorded }: Props) => {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [pendingRecording, setPendingRecording] = useState<PendingVoiceRecording | null>(null);
  const recordingRef = useRef(false);
  const durationRef = useRef(0);
  const recordingStartedAt = useRef(0);

  useEffect(() => () => {
    Sound.removeRecordBackListener();
    if (recordingRef.current) {
      Sound.stopRecorder().catch(error => {
        console.error('Unable to stop voice recording after leaving chat', error);
      });
    }
  }, []);

  const resetPendingRecording = () => {
    setPendingRecording(null);
    setDurationSeconds(0);
    durationRef.current = 0;
    recordingStartedAt.current = 0;
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const current = await PermissionsAndroid.check(permission);
    if (current) return true;
    const result = await PermissionsAndroid.request(permission, {
      title: 'Microphone permission',
      message: 'Allow SnapApp to record a voice message.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startRecording = async () => {
    if (pendingRecording) {
      resetPendingRecording();
    }
    setBusy(true);
    try {
      if (!(await requestMicrophonePermission())) {
        Alert.alert('Microphone permission required', 'Allow microphone access to record a voice message.');
        return;
      }
      await Sound.startRecorder(undefined, {
        AudioQuality: 'medium',
        AudioChannels: 1,
      });
      recordingStartedAt.current = Date.now();
      durationRef.current = 0;
      setDurationSeconds(0);
      Sound.addRecordBackListener(event => {
        const seconds = Math.floor(event.currentPosition / 1000);
        durationRef.current = seconds;
        setDurationSeconds(seconds);
      });
      recordingRef.current = true;
      setRecording(true);
    } catch (error) {
      Alert.alert(
        'Unable to record voice message',
        error instanceof Error ? error.message : 'Please check microphone permission and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      const path = await Sound.stopRecorder();
      Sound.removeRecordBackListener();
      recordingRef.current = false;
      setRecording(false);
      const duration = Math.max(
        durationRef.current,
        Math.floor((Date.now() - recordingStartedAt.current) / 1000),
      );
      if (duration < 1 || !path) {
        Alert.alert('Voice message too short', 'Record for at least one second before sending.');
        resetPendingRecording();
        return;
      }
      const uri = path.startsWith('file://') ? path : `file://${path}`;
      const fileName = path.split(/[\\/]/).pop() || `voice-${Date.now()}.m4a`;
      setPendingRecording({
        uri,
        fileName,
        mimeType: 'audio/mp4',
        mediaType: 'voice',
        durationSeconds: duration,
        localPath: path,
      });
      setDurationSeconds(duration);
    } catch (error) {
      Alert.alert(
        'Unable to record voice message',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const sendPendingRecording = async () => {
    if (!pendingRecording) return;
    setBusy(true);
    try {
      const media: MessageMediaUpload = {
        uri: pendingRecording.uri,
        fileName: pendingRecording.fileName,
        mimeType: pendingRecording.mimeType,
        mediaType: pendingRecording.mediaType,
        durationSeconds: pendingRecording.durationSeconds,
      };
      setPendingRecording(null);
      await onRecorded(media);
    } catch (error) {
      Alert.alert(
        'Unable to send voice message',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePress = () => {
    if (pendingRecording) {
      return;
    }
    if (recording) {
      stopRecording().catch(error => {
        console.error('Unable to finish voice recording', error);
      });
      return;
    }
    startRecording().catch(error => {
      console.error('Unable to start voice recording', error);
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          busy
            ? 'Preparing voice message'
            : recording
              ? `Stop recording, ${formatDuration(durationSeconds)}`
              : pendingRecording
                ? 'Voice message ready to send'
                : 'Record voice message'
        }
        accessibilityState={{ disabled: disabled || busy || !!pendingRecording }}
        disabled={disabled || busy || !!pendingRecording}
        onPress={handlePress}
        style={[styles.button, (disabled || busy || !!pendingRecording) && styles.disabled]}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#FFEA00" />
        ) : recording ? (
          <>
            <Icon name="square" size={15} color="#FF526A" />
            <Text style={styles.timer}>{formatDuration(durationSeconds)}</Text>
          </>
        ) : pendingRecording ? (
          <Text style={styles.readyLabel}>Send</Text>
        ) : (
          <Icon name="mic" size={21} color="#D4D7DA" />
        )}
      </Pressable>
      {pendingRecording ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send recorded voice message"
            onPress={() => {
              sendPendingRecording().catch(error => {
                console.error('Unable to send recorded voice message', error);
              });
            }}
            style={[styles.actionButton, styles.actionPrimary]}
          >
            <Text style={styles.actionText}>Send</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete recorded voice message"
            onPress={() => {
              resetPendingRecording();
            }}
            style={[styles.actionButton, styles.actionSecondary]}
          >
            <Text style={styles.actionText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
};

export default RecordingButton;

const styles = createAdaptiveStyles({
  button: {
    minWidth: 39,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  timer: {
    color: '#FF526A',
    fontSize: 12,
    fontWeight: '700',
  },
  readyLabel: {
    color: '#FFEA00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  actionRow: {
    position: 'absolute',
    right: 10,
    bottom: 66,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#111214',
    borderWidth: 1,
    borderColor: '#2A2D30',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 8,
    elevation: 6,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: '#FFEA00',
  },
  actionSecondary: {
    backgroundColor: '#1E2022',
    borderWidth: 1,
    borderColor: '#363A3F',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});