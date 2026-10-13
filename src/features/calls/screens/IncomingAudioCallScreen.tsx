import React, { useCallback, useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../../types/navigation';
import CallSessionView from '../components/CallSessionView';
import { useCall } from '../hooks/useCall';

type Props = NativeStackScreenProps<MainStackParamList, 'IncomingAudioCall'>;

const IncomingAudioCallScreen = ({ navigation, route }: Props) => {
  const { callId, userId, name, avatar, kind } = route.params;
  const session = useCall({
    callId,
    userId,
    kind,
    role: 'recipient',
  });
  const { acceptCall, finishCall, rejectCall, status } = session;
  const accept = useCallback(() => {
    acceptCall().catch(error => {
      console.error('Unable to accept incoming call', error);
    });
  }, [acceptCall]);
  const reject = useCallback(() => {
    rejectCall();
    navigation.goBack();
  }, [navigation, rejectCall]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (status === 'ringing') rejectCall();
      else if (status === 'connected' || status === 'connecting') {
        finishCall();
      }
    });
    return unsubscribe;
  }, [finishCall, navigation, rejectCall, status]);

  return (
    <CallSessionView
      name={name}
      avatar={avatar}
      kind={kind}
      session={session}
      incoming
      onAccept={accept}
      onReject={reject}
      onEnd={() => {
        finishCall();
        navigation.goBack();
      }}
    />
  );
};

export default IncomingAudioCallScreen;
