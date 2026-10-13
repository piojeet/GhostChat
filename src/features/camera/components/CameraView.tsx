import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  type CameraDevice,
  type CameraRuntimeError,
} from 'react-native-vision-camera';

type Props = {
  cameraRef: React.Ref<Camera>;
  device: CameraDevice;
  isActive: boolean;
  hasMicrophonePermission: boolean;
  flashEnabled: boolean;
  onInitialized: () => void;
  onError: (error: CameraRuntimeError) => void;
};

const CameraView = ({
  cameraRef,
  device,
  isActive,
  hasMicrophonePermission,
  flashEnabled,
  onInitialized,
  onError,
}: Props) => (
  <Camera
    ref={cameraRef}
    device={device}
    isActive={isActive}
    onInitialized={onInitialized}
    onError={onError}
    photo
    video
    audio={hasMicrophonePermission}
    torch={flashEnabled && device.hasTorch ? 'on' : 'off'}
    style={StyleSheet.absoluteFill}
  />
);

export default CameraView;
