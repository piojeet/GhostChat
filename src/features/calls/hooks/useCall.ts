import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  type MediaStream,
} from 'react-native-webrtc';
import type RTCIceCandidateEvent from 'react-native-webrtc/lib/typescript/RTCIceCandidateEvent';
import type RTCTrackEvent from 'react-native-webrtc/lib/typescript/RTCTrackEvent';
import {
  connectSocket,
  getSocketClient,
} from '../../../services/socket/socketClient';
import { authStore } from '../../../store/authStore';
import {
  getCallIceServers,
  requestCallPermissions,
  setCallMicrophoneMuted,
  setCallSpeakerphone,
  startCallAudio,
  stopCallAudio,
} from '../services/callService';
import type {
  CallCandidatePayload,
  CallErrorPayload,
  CallKind,
  CallOutgoingPayload,
  CallResponse,
} from '../types/call.types';

type CallRole = 'caller' | 'recipient';
type CallUiStatus =
  | 'preparing'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'rejected'
  | 'cancelled'
  | 'missed'
  | 'busy'
  | 'unavailable'
  | 'timeout'
  | 'failed';

type UseCallOptions = {
  userId: string;
  kind: CallKind;
  role: CallRole;
  callId?: string;
};

const getCallId = (payload: CallResponse | CallErrorPayload): string | undefined =>
  'id' in payload ? payload.id : payload.callId;

export const useCall = ({ userId, kind, role, callId: initialCallId }: UseCallOptions) => {
  const [callId, setCallId] = useState(initialCallId);
  const [status, setStatus] = useState<CallUiStatus>(
    role === 'caller' ? 'preparing' : 'ringing',
  );
  const [error, setError] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(kind === 'video');
  const [speakerEnabled, setSpeakerEnabled] = useState(kind === 'video');
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const callIdRef = useRef(initialCallId);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const candidatesRef = useRef<CallCandidatePayload['candidate'][]>([]);
  const pendingLocalCandidatesRef = useRef<CallCandidatePayload['candidate'][]>([]);
  const startedRef = useRef(false);
  const offerStartedRef = useRef(false);
  const offerHandledRef = useRef(false);
  const finishedRef = useRef(false);
  const statusRef = useRef(status);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socket = getSocketClient();
  statusRef.current = status;

  const setActiveCallId = useCallback((id: string) => {
    callIdRef.current = id;
    setCallId(id);
    for (const candidate of pendingLocalCandidatesRef.current) {
      socket.emit('call:ice_candidate', { callId: id, candidate });
    }
    pendingLocalCandidatesRef.current = [];
  }, [socket]);

  const disposeMedia = useCallback(() => {
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    disconnectTimerRef.current = null;
    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
    [localStreamRef.current, remoteStreamRef.current].forEach(stream => {
      stream?.getTracks().forEach(track => track.stop());
      stream?.release();
    });
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingLocalCandidatesRef.current = [];
    stopCallAudio();
  }, []);

  const finishLocally = useCallback((nextStatus: CallUiStatus, message = '') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStatus(nextStatus);
    setError(message);
    setLocalStream(null);
    setRemoteStream(null);
    disposeMedia();
  }, [disposeMedia]);

  const getConnectedSocket = useCallback(async () => {
    await connectSocket();
    if (socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
        reject(new Error('Could not connect to the call service.'));
      }, 12_000);
      const onConnect = () => {
        clearTimeout(timer);
        socket.off('connect_error', onError);
        resolve();
      };
      const onError = () => {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        reject(new Error('Could not authenticate with the call service.'));
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    });
  }, [socket]);

  const createPeer = useCallback(async () => {
    if (peerRef.current) return peerRef.current;
    await requestCallPermissions(kind);
    const [{ iceServers }, stream] = await Promise.all([
      getCallIceServers(),
      mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video'
          ? { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }
          : false,
      }),
    ]);
    if (finishedRef.current) {
      stream.getTracks().forEach(track => track.stop());
      stream.release();
      throw new Error('Call ended before media could start.');
    }
    const peer = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 2,
    });
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.onicecandidate = (event: RTCIceCandidateEvent<'icecandidate'>) => {
      const activeCallId = callIdRef.current;
      if (event.candidate) {
        const candidate = event.candidate.toJSON();
        if (typeof candidate.candidate !== 'string' || !candidate.candidate) return;
        const validCandidate: CallCandidatePayload['candidate'] = {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        };
        if (activeCallId) {
          socket.emit('call:ice_candidate', {
            callId: activeCallId,
            candidate: validCandidate,
          });
        } else {
          pendingLocalCandidatesRef.current.push(validCandidate);
        }
      }
    };
    peer.ontrack = (event: RTCTrackEvent<'track'>) => {
      const streamFromTrack = event.streams[0];
      if (streamFromTrack) {
        remoteStreamRef.current = streamFromTrack;
        setRemoteStream(streamFromTrack);
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
        setStatus('connected');
        setConnectedAt(current => current ?? Date.now());
        const activeCallId = callIdRef.current;
        if (activeCallId) socket.emit('call:connected', { callId: activeCallId });
      } else if (peer.connectionState === 'disconnected') {
        setStatus('reconnecting');
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            const activeCallId = callIdRef.current;
            if (activeCallId && !finishedRef.current) {
              socket.emit('call:failed', {
                callId: activeCallId,
                code: 'CONNECTION_LOST',
                message: 'Call connection was lost.',
              });
              finishLocally('failed', 'Call connection was lost.');
            }
          }, 8_000);
        }
      } else if (peer.connectionState === 'failed') {
        const activeCallId = callIdRef.current;
        if (activeCallId && !finishedRef.current) {
          socket.emit('call:failed', {
            callId: activeCallId,
            code: 'CONNECTION_FAILED',
            message: 'Could not establish the call connection.',
          });
        }
        finishLocally('failed', 'Could not establish the call connection.');
      }
    };
    localStreamRef.current = stream;
    peerRef.current = peer;
    setLocalStream(stream);
    startCallAudio(kind);
    return peer;
  }, [finishLocally, kind, socket]);

  const flushCandidates = useCallback(async (peer: RTCPeerConnection) => {
    if (!peer.remoteDescription) return;
    const queued = candidatesRef.current;
    candidatesRef.current = [];
    for (const candidate of queued) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const makeOffer = useCallback(async () => {
    if (finishedRef.current) return;
    const peer = await createPeer();
    if (finishedRef.current) return;
    const offer = await peer.createOffer();
    if (!offer.sdp) throw new Error('Unable to create a WebRTC offer.');
    await peer.setLocalDescription(offer);
    const activeCallId = callIdRef.current;
    if (!activeCallId) throw new Error('The call session has not been created yet.');
    socket.emit('call:offer', { callId: activeCallId, sdp: offer.sdp });
  }, [createPeer, socket]);

  const receiveOffer = useCallback(async (payload: { callId: string; sdp: string }) => {
    if (
      payload.callId !== callIdRef.current ||
      role !== 'recipient' ||
      offerHandledRef.current ||
      finishedRef.current
    ) return;
    offerHandledRef.current = true;
    try {
      const peer = await createPeer();
      await peer.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
      await flushCandidates(peer);
      const answer = await peer.createAnswer();
      if (!answer.sdp) throw new Error('Unable to create a WebRTC answer.');
      await peer.setLocalDescription(answer);
      socket.emit('call:answer', { callId: payload.callId, sdp: answer.sdp });
    } catch (callError) {
      const message = callError instanceof Error ? callError.message : 'Unable to answer the call.';
      socket.emit('call:failed', {
        callId: payload.callId,
        code: 'NEGOTIATION_FAILED',
        message,
      });
      finishLocally('failed', message);
    }
  }, [createPeer, finishLocally, flushCandidates, role, socket]);

  const finishCall = useCallback(() => {
    const activeCallId = callIdRef.current;
    if (activeCallId && !finishedRef.current) {
      const event =
        statusRef.current === 'ringing'
          ? role === 'caller' ? 'call:cancel' : 'call:reject'
          : 'call:end';
      socket.emit(event, { callId: activeCallId });
    }
    finishLocally('ended');
  }, [finishLocally, role, socket]);

  const acceptCall = useCallback(async () => {
    if (role !== 'recipient' || !callIdRef.current || startedRef.current) return;
    startedRef.current = true;
    try {
      await getConnectedSocket();
      if (finishedRef.current) return;
      await createPeer();
      if (finishedRef.current) return;
      setStatus('connecting');
      socket.emit('call:accept', { callId: callIdRef.current });
    } catch (callError) {
      const message = callError instanceof Error ? callError.message : 'Unable to answer this call.';
      socket.emit('call:reject', { callId: callIdRef.current });
      finishLocally('failed', message);
    }
  }, [createPeer, finishLocally, getConnectedSocket, role, socket]);

  const rejectCall = useCallback(() => {
    const activeCallId = callIdRef.current;
    if (activeCallId) socket.emit('call:reject', { callId: activeCallId });
    finishLocally('rejected');
  }, [finishLocally, socket]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setCallMicrophoneMuted(nextMuted);
    setMuted(nextMuted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const nextEnabled = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach(track => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
  }, [cameraEnabled]);

  const switchCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks()[0]?._switchCamera();
  }, []);

  const toggleSpeaker = useCallback(() => {
    const nextEnabled = !speakerEnabled;
    setCallSpeakerphone(nextEnabled);
    setSpeakerEnabled(nextEnabled);
  }, [speakerEnabled]);

  useEffect(() => {
    const isForThisCall = (payload: CallResponse | CallErrorPayload) => {
      const activeCallId = callIdRef.current;
      if (activeCallId) return getCallId(payload) === activeCallId;
      if ('id' in payload) {
        return (
          role === 'caller' &&
          payload.caller.id === authStore.getState().user?.id &&
          payload.recipient.id === userId
        );
      }
      return role === 'caller' && statusRef.current === 'preparing';
    };

    const onOutgoing = (call: CallResponse) => {
      if (call.caller.id !== authStore.getState().user?.id) return;
      setActiveCallId(call.id);
      setStatus(call.state === 'accepted' ? 'connecting' : call.state);
    };
    const onAccepted = (call: CallResponse) => {
      if (!isForThisCall(call)) return;
      setActiveCallId(call.id);
      setStatus('connecting');
      if (role === 'caller' && !offerStartedRef.current) {
        offerStartedRef.current = true;
        makeOffer().catch(callError => {
          const message = callError instanceof Error ? callError.message : 'Unable to start media.';
          socket.emit('call:failed', {
            callId: call.id,
            code: 'OFFER_FAILED',
            message,
          });
          finishLocally('failed', message);
        });
      }
    };
    const onAnswer = (payload: { callId: string; sdp: string }) => {
      if (payload.callId !== callIdRef.current || role !== 'caller') return;
      const peer = peerRef.current;
      if (!peer) return;
      peer.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
        .then(() => flushCandidates(peer))
        .catch(callError => finishLocally(
          'failed',
          callError instanceof Error ? callError.message : 'Unable to establish the connection.',
        ));
    };
    const onCandidate = (payload: CallCandidatePayload) => {
      if (payload.callId !== callIdRef.current) return;
      const peer = peerRef.current;
      if (!peer?.remoteDescription) {
        candidatesRef.current.push(payload.candidate);
        return;
      }
      peer.addIceCandidate(new RTCIceCandidate(payload.candidate))
        .catch(() => finishLocally('failed', 'Unable to establish a secure media connection.'));
    };
    const onTerminal = (
      payload: CallResponse | CallErrorPayload,
      terminal: CallUiStatus,
      message?: string,
    ) => {
      if (!isForThisCall(payload)) return;
      finishLocally(terminal, message ?? (
        'message' in payload ? payload.message : ''
      ));
    };
    const onConnected = (call: CallResponse) => {
      if (isForThisCall(call)) {
        setActiveCallId(call.id);
        setStatus('connected');
        setConnectedAt(current => current ?? Date.now());
      }
    };
    const onConnect = () => {
      if (statusRef.current === 'reconnecting' && !finishedRef.current) {
        finishLocally('failed', 'The call signaling connection was interrupted.');
      }
    };
    const onDisconnect = () => {
      if (callIdRef.current && !finishedRef.current) setStatus('reconnecting');
    };
    const onCallFailed = (payload: CallResponse | CallErrorPayload) =>
      onTerminal(payload, 'failed');
    const onUnavailable = (payload: CallResponse | CallErrorPayload) =>
      onTerminal(payload, 'unavailable');
    const onEnded = (payload: CallResponse) => onTerminal(payload, 'ended');
    const onRejected = (payload: CallResponse) => onTerminal(payload, 'rejected');
    const onCancelled = (payload: CallResponse) => onTerminal(payload, 'cancelled');
    const onTimeout = (payload: CallResponse) => onTerminal(payload, 'timeout');
    const onBusy = (payload: CallErrorPayload) => onTerminal(payload, 'busy');

    socket.on('call:outgoing', onOutgoing);
    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', receiveOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice_candidate', onCandidate);
    socket.on('call:connected', onConnected);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:timeout', onTimeout);
    socket.on('call:busy', onBusy);
    socket.on('call:unavailable', onUnavailable);
    socket.on('call:failed', onCallFailed);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (role === 'caller' && !startedRef.current) {
      startedRef.current = true;
      (async () => {
        try {
          await getConnectedSocket();
          if (finishedRef.current) return;
          await createPeer();
          if (finishedRef.current) return;
          socket.emit('call:outgoing', {
            recipientId: userId,
            kind,
          } satisfies CallOutgoingPayload);
        } catch (callError) {
          finishLocally(
            'failed',
            callError instanceof Error ? callError.message : 'Unable to start this call.',
          );
        }
      })();
    }

    return () => {
      socket.off('call:outgoing', onOutgoing);
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', receiveOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice_candidate', onCandidate);
      socket.off('call:connected', onConnected);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:timeout', onTimeout);
      socket.off('call:busy', onBusy);
      socket.off('call:unavailable', onUnavailable);
      socket.off('call:failed', onCallFailed);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (!finishedRef.current && callIdRef.current) {
        const event = statusRef.current === 'ringing'
          ? role === 'caller' ? 'call:cancel' : 'call:reject'
          : 'call:end';
        socket.emit(event, { callId: callIdRef.current });
      }
      finishedRef.current = true;
      disposeMedia();
    };
  }, [
    createPeer,
    disposeMedia,
    finishLocally,
    flushCandidates,
    getConnectedSocket,
    kind,
    makeOffer,
    receiveOffer,
    role,
    setActiveCallId,
    socket,
    userId,
  ]);

  return {
    callId,
    status,
    error,
    localStream,
    remoteStream,
    muted,
    cameraEnabled,
    speakerEnabled,
    connectedAt,
    acceptCall,
    rejectCall,
    finishCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    toggleSpeaker,
  };
};