import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { RTCView } from 'react-native-webrtc';
import type { CallKind } from '../types/call.types';
import type { useCall } from '../hooks/useCall';

type CallSession = ReturnType<typeof useCall>;

type Props = {
  name: string;
  avatar?: string | null;
  kind: CallKind;
  session: CallSession;
  incoming?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onEnd: () => void;
};

const statusLabel: Record<CallSession['status'], string> = {
  preparing: 'Preparing call…',
  ringing: 'Ringing…',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  ended: 'Call ended',
  rejected: 'Call declined',
  cancelled: 'Call cancelled',
  missed: 'Call missed',
  busy: 'User is busy',
  unavailable: 'User is unavailable',
  timeout: 'No answer',
  failed: 'Call failed',
};

const statusHint: Partial<Record<CallSession['status'], string>> = {
  unavailable: 'Ask them to open SnapApp and keep it in the foreground. Calls do not ring when the app is closed.',
  busy: 'They are already on another call.',
};

const CallSessionView = ({
  name,
  avatar,
  kind,
  session,
  incoming = false,
  onAccept,
  onReject,
  onEnd,
}: Props) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!session.connectedAt) {
      setElapsedSeconds(0);
      return undefined;
    }
    const update = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - session.connectedAt!) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session.connectedAt]);

  const showIncomingActions = incoming && session.status === 'ringing';
  const isTerminal = [
    'ended',
    'rejected',
    'cancelled',
    'missed',
    'busy',
    'unavailable',
    'timeout',
    'failed',
  ].includes(session.status);
  const hasVideo = kind === 'video';
  const displayTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(
    elapsedSeconds % 60,
  ).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      {hasVideo && session.remoteStream ? (
        <RTCView
          objectFit="cover"
          streamURL={session.remoteStream.toURL()}
          style={styles.remoteVideo}
        />
      ) : (
        <View style={styles.audioBackground} />
      )}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.identity}>
          {!hasVideo || !session.remoteStream ? (
            avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )
          ) : null}
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
          <Text style={styles.status}>
            {session.status === 'connected' ? displayTime : statusLabel[session.status]}
          </Text>
          {statusHint[session.status] ? (
            <Text style={styles.statusHint}>{statusHint[session.status]}</Text>
          ) : null}
          {session.error ? (
            <Text numberOfLines={3} style={styles.error}>{session.error}</Text>
          ) : null}
        </View>

        {hasVideo && session.localStream && session.cameraEnabled ? (
          <RTCView
            mirror
            objectFit="cover"
            streamURL={session.localStream.toURL()}
            style={styles.localVideo}
          />
        ) : null}

        {showIncomingActions ? (
          <View style={styles.incomingActions}>
            <CallAction icon="phone-off" label="Decline" color="#E94242" onPress={onReject ?? onEnd} />
            <CallAction icon="phone" label="Accept" color="#31C46C" onPress={onAccept ?? onEnd} />
          </View>
        ) : isTerminal ? (
          <View style={styles.incomingActions}>
            <CallAction icon="x" label="Done" onPress={onEnd} />
          </View>
        ) : (
          <View style={styles.controls}>
            <CallAction
              icon={session.muted ? 'mic-off' : 'mic'}
              label={session.muted ? 'Unmute' : 'Mute'}
              selected={session.muted}
              onPress={session.toggleMute}
            />
            <CallAction
              icon={session.speakerEnabled ? 'volume-2' : 'volume-x'}
              label="Speaker"
              selected={session.speakerEnabled}
              onPress={session.toggleSpeaker}
            />
            {hasVideo ? (
              <>
                <CallAction
                  icon={session.cameraEnabled ? 'video' : 'video-off'}
                  label={session.cameraEnabled ? 'Camera off' : 'Camera on'}
                  selected={!session.cameraEnabled}
                  onPress={session.toggleCamera}
                />
                <CallAction
                  icon="refresh-cw"
                  label="Switch camera"
                  onPress={session.switchCamera}
                />
              </>
            ) : null}
            <CallAction icon="phone-off" label="End call" color="#E94242" onPress={onEnd} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const CallAction = ({
  icon,
  label,
  color = '#35383C',
  selected = false,
  onPress,
}: {
  icon: string;
  label: string;
  color?: string;
  selected?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={styles.control}
  >
    <View
      style={[
        styles.controlButton,
        color === '#E94242'
          ? styles.controlButtonDanger
          : color === '#31C46C'
            ? styles.controlButtonAccept
            : styles.controlButtonDefault,
        selected && styles.controlButtonSelected,
      ]}
    >
      <Icon name={icon} size={23} color="#FFFFFF" />
    </View>
    <Text style={styles.controlLabel}>{label}</Text>
  </Pressable>
);

export default CallSessionView;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFill,
  },
  audioBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#11120B',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(0,0,0,0.27)',
  },
  identity: {
    alignItems: 'center',
    marginTop: 64,
  },
  avatar: {
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252525',
    borderWidth: 2,
    borderColor: '#FFEA00',
  },
  avatarInitial: {
    color: '#FFEA00',
    fontSize: 52,
    fontWeight: '700',
  },
  name: {
    maxWidth: '90%',
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  status: {
    marginTop: 9,
    color: '#D0D0D0',
    fontSize: 15,
  },
  statusHint: {
    maxWidth: 290,
    marginTop: 10,
    color: '#A8A8A8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  error: {
    maxWidth: 300,
    marginTop: 8,
    color: '#FFB4B4',
    fontSize: 13,
    textAlign: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 54,
    right: 18,
    width: 110,
    height: 164,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 18,
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(10,10,10,0.68)',
  },
  incomingActions: {
    width: '70%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 30,
  },
  control: {
    width: 80,
    alignItems: 'center',
  },
  controlButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  controlButtonDefault: {
    backgroundColor: '#35383C',
  },
  controlButtonDanger: {
    backgroundColor: '#E94242',
  },
  controlButtonAccept: {
    backgroundColor: '#31C46C',
  },
  controlButtonSelected: {
    backgroundColor: '#655E12',
  },
  controlLabel: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
});
