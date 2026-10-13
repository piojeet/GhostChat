import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocketClient } from '../../../services/socket/socketClient';
import type { ChatTypingEvent } from '../types/chat.types';

export const useTyping = (
  chatId: string | null,
  participantId: string,
  joined: boolean,
) => {
  const socket = getSocketClient();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTyping = useRef(false);

  const stopTyping = useCallback(() => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = null;
    if (localTyping.current && joined && chatId) {
      socket.emit('typing:stop', { chatId });
    }
    localTyping.current = false;
  }, [chatId, joined, socket]);

  const notifyTyping = useCallback(() => {
    if (!chatId || !joined || !socket.connected) return;
    if (!localTyping.current) {
      localTyping.current = true;
      socket.emit('typing:start', { chatId });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, 900);
  }, [chatId, joined, socket, stopTyping]);

  useEffect(() => {
    const onTypingStart = (event: ChatTypingEvent) => {
      if (event.chatId === chatId && event.userId === participantId) setIsTyping(true);
    };
    const onTypingStop = (event: ChatTypingEvent) => {
      if (event.chatId === chatId && event.userId === participantId) setIsTyping(false);
    };
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      stopTyping();
      setIsTyping(false);
    };
  }, [chatId, participantId, socket, stopTyping]);

  return { isTyping, notifyTyping, stopTyping };
};