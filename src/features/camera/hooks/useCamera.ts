import { useRef, useState } from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';

export const useCamera = () => {
  const cameraRef = useRef<Camera | null>(null);
  const [position, setPosition] = useState<'back' | 'front'>('back');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const device = position === 'back' ? backDevice : frontDevice;
  const cameraPermission = useCameraPermission();
  const microphonePermission = useMicrophonePermission();

  return {
    cameraRef,
    device,
    position,
    hasBackCamera: Boolean(backDevice),
    hasFrontCamera: Boolean(frontDevice),
    setPosition,
    flashEnabled,
    setFlashEnabled,
    ...cameraPermission,
    hasMicrophonePermission: microphonePermission.hasPermission,
    requestMicrophonePermission: microphonePermission.requestPermission,
  };
};