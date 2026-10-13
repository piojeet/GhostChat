import type { Server } from 'socket.io';
import { messageRepository } from '../messages/message.repository';
import {
  type ClientToServerEvents,
  type InterServerEvents,
  type MessageResponse,
  type ServerToClientEvents,
  type SocketData,
  userRoom,
} from '../../sockets/socketEvents';

type ChatSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const publishMessage = async (
  io: ChatSocketServer,
  chatId: string,
  message: MessageResponse,
): Promise<MessageResponse> => {
  const recipientId = message.receipts[0]?.recipientId;
  if (!recipientId) {
    io.to(userRoom(message.senderId)).emit('message:new', { chatId, message });
    return message;
  }

  let recipientIsConnected = false;
  let deliveredAt: Date | null = null;
  try {
    const recipientSockets = await io.in(userRoom(recipientId)).fetchSockets();
    recipientIsConnected = recipientSockets.some(
      socket => socket.data.userId === recipientId,
    );
    if (recipientIsConnected) {
      const now = new Date();
      const updated = await messageRepository.markDelivered(
        message.id,
        chatId,
        recipientId,
        now,
      );
      if (updated) deliveredAt = now;
    }
  } catch {
    console.error('Unable to update chat delivery state', {
      chatId,
      messageId: message.id,
    });
  }

  const publishedMessage = deliveredAt
    ? {
        ...message,
        receipts: message.receipts.map(receipt =>
          receipt.recipientId === recipientId
            ? { ...receipt, deliveredAt }
            : receipt,
        ),
      }
    : message;
  io.to(userRoom(message.senderId)).emit('message:new', {
    chatId,
    message: publishedMessage,
  });
  if (recipientIsConnected) {
    io.to(userRoom(recipientId)).emit('message:new', {
      chatId,
      message: publishedMessage,
    });
  }
  if (deliveredAt) {
    io.to(userRoom(message.senderId)).emit('message:read_receipt', {
      chatId,
      messageId: message.id,
      recipientId,
      status: 'delivered',
      at: deliveredAt,
    });
  }
  return publishedMessage;
};

export const publishReadReceipts = (
  io: ChatSocketServer,
  chatId: string,
  recipientId: string,
  receipts: { messageId: string; senderId: string }[],
  readAt: Date,
): void => {
  receipts.forEach(receipt => {
    io.to(userRoom(receipt.senderId)).emit('message:read_receipt', {
      chatId,
      messageId: receipt.messageId,
      recipientId,
      status: 'read',
      at: readAt,
    });
  });
};
