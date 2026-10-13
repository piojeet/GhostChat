import { PermissionsAndroid, Platform } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { api } from '../../../services/api/apiClient';
import type {
  CallKind,
  IceServerResponse,
} from '../types/call.types';

export const getCallIceServers = () =>
  api.request<IceServerResponse>('/calls/ice-servers');

export const requestCallPermissions = async (kind: CallKind): Promise<void> => {
  if (Platform.OS !== 'android') return;
  const permissions = kind === 'video'
    ? [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ] as const
    : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] as const;
  const results = await PermissionsAndroid.requestMultiple([...permissions]);
  const denied = permissions.some(
    permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied) throw new Error('Camera and microphone permission are required for calls.');
};

export const startCallAudio = (kind: CallKind): void => {
  InCallManager.start({ media: kind });
  InCallManager.setForceSpeakerphoneOn(kind === 'video');
};

export const setCallSpeakerphone = (enabled: boolean): void => {
  InCallManager.setForceSpeakerphoneOn(enabled);
  InCallManager.setSpeakerphoneOn(enabled);
};

export const setCallMicrophoneMuted = (muted: boolean): void => {
  InCallManager.setMicrophoneMute(muted);
};

export const stopCallAudio = (): void => {
  InCallManager.stop();
};