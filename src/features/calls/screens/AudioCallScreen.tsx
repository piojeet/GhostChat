import React, { useCallback, useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../../types/navigation';
import CallSessionView from '../components/CallSessionView';
import { useCall } from '../hooks/useCall';

type Props = NativeStackScreenProps<MainStackParamList, 'AudioCall'>;

const AudioCallScreen = ({ navigation, route }: Props) => {
  const { userId, name, avatar, callId } = route.params;
  const session = useCall({ callId, userId, kind: 'audio', role: 'caller' });
  const { finishCall } = session;
  const endCall = useCallback(() => {
    finishCall();
    navigation.goBack();
  }, [finishCall, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', finishCall);
    return unsubscribe;
  }, [finishCall, navigation]);

  return (
    <CallSessionView
      name={name}
      avatar={avatar}
      kind="audio"
      session={session}
      onEnd={endCall}
    />
  );
};

export default AudioCallScreen;
