import type { ChatConversation } from '../features/chat/types/chat.types';
import type { ChatMessage } from '../features/chat/types/message.types';

type ChatState = {
  conversations: ChatConversation[];
};

let state: ChatState = { conversations: [] };
const listeners = new Set<() => void>();

const update = (conversations: ChatConversation[]): void => {
  state = { conversations };
  listeners.forEach(listener => listener());
};

export const chatStore = {
  getState: (): ChatState => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setConversations: (conversations: ChatConversation[]): void => update(conversations),
  upsertMessage: (
    chatId: string,
    message: ChatMessage,
    currentUserId: string | undefined,
  ): void => {
    const conversations = state.conversations.map(conversation => {
      if (conversation.id !== chatId) return conversation;
      return {
        ...conversation,
        lastMessage: message.text === null
          ? conversation.lastMessage
          : {
              id: message.id,
              senderId: message.senderId,
              text: message.text,
              sentAt: message.sentAt,
            },
        unreadCount:
          message.senderId !== currentUserId && message.receipts[0]?.readAt === null
            ? conversation.unreadCount + 1
            : conversation.unreadCount,
      };
    });
    update(conversations.sort((a, b) =>
      new Date(b.lastMessage?.sentAt ?? b.createdAt).getTime() -
      new Date(a.lastMessage?.sentAt ?? a.createdAt).getTime(),
    ));
  },
  markRead: (chatId: string): void => {
    update(state.conversations.map(conversation =>
      conversation.id === chatId ? { ...conversation, unreadCount: 0 } : conversation,
    ));
  },
};