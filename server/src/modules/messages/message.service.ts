import { Types } from 'mongoose';
import { HttpError } from '../../utils/httpError';
import { chatRepository } from '../chat/chat.repository';
import { chatService } from '../chat/chat.service';
import { notificationService } from '../notifications/notification.service';
import { messageRepository } from './message.repository';
import type { SendMessageInput, SendMessageMediaInput } from './message.types';
import type { CallState } from '../calls/call.types';
import {
  deleteMessageMedia,
  uploadMessageMedia,
} from './messageMedia';

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  hasNextPage: page * limit < total,
});

const safeMessage = (message: {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  type?: 'text' | 'image' | 'voice' | 'call';
  text: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaSizeBytes?: number | null;
  callId?: Types.ObjectId | null;
  callKind?: 'audio' | 'video' | null;
  callStatus?: CallState | null;
  durationSeconds?: number | null;
  replyTo?: Types.ObjectId | null;
  sentAt: Date;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  receipts: {
    recipient: Types.ObjectId;
    deliveredAt?: Date | null;
    readAt?: Date | null;
  }[];
}) => ({
  id: message._id.toString(),
  senderId: message.sender.toString(),
  type: message.type ?? 'text',
  text: message.deletedAt ? null : message.text,
  mediaUrl: message.deletedAt ? null : message.mediaUrl ?? null,
  mediaMimeType: message.mediaMimeType ?? null,
  mediaSizeBytes: message.mediaSizeBytes ?? null,
  callId: message.callId?.toString() ?? null,
  callKind: message.callKind ?? null,
  callStatus: message.callStatus ?? null,
  durationSeconds: message.durationSeconds ?? null,
  replyToId: message.replyTo?.toString() ?? null,
  sentAt: message.sentAt,
  editedAt: message.editedAt ?? null,
  deletedAt: message.deletedAt ?? null,
  receipts: message.receipts.map(receipt => ({
    recipientId: receipt.recipient.toString(),
    deliveredAt: receipt.deliveredAt ?? null,
    readAt: receipt.readAt ?? null,
  })),
});

const updateSentMessageSideEffects = async (
  chatId: string,
  senderId: string,
  recipientId: string,
  messageId: Types.ObjectId,
  sentAt: Date,
  preview: string,
): Promise<boolean> => {
  try {
    await chatRepository.updateLastMessage(chatId, senderId, {
      messageId,
      sender: new Types.ObjectId(senderId),
      text: preview.slice(0, 200),
      sentAt,
    });
  } catch {
    console.error('Persisted chat message preview update failed', {
      chatId,
      messageId: messageId.toString(),
    });
  }
  try {
    return await notificationService.create({
      recipientId,
      actorId: senderId,
      type: 'MESSAGE_RECEIVED',
      entityType: 'chat',
      entityId: chatId,
      eventKey: `message_received:${messageId.toString()}`,
      messagePreview: preview,
    });
  } catch {
    console.error('Persisted message notification creation failed', {
      messageId: messageId.toString(),
    });
    return false;
  }
};

export const messageService = {
  async list(chatId: string, userId: string, page: number, limit: number) {
    await chatService.assertAccess(chatId, userId);
    const [messages, total] = await messageRepository.findPage(
      chatId,
      (page - 1) * limit,
      limit,
    );
    return {
      items: messages.map(message => safeMessage(message)),
      pagination: pagination(page, limit, total),
    };
  },

  async send(chatId: string, senderId: string, input: SendMessageInput) {
    const { otherUserId } = await chatService.assertAccess(chatId, senderId);
    if (input.replyToId && !(await messageRepository.findReply(input.replyToId, chatId))) {
      throw new HttpError(404, 'Reply message not found', 'MESSAGE_NOT_FOUND');
    }
    const message = await messageRepository.create({
      conversationId: chatId,
      senderId,
      recipientId: otherUserId,
      text: input.text,
      replyToId: input.replyToId,
    });
    const notificationCreated = await updateSentMessageSideEffects(
      chatId,
      senderId,
      otherUserId,
      message._id,
      message.sentAt,
      input.text,
    );
    return { message: safeMessage(message.toObject()), notificationCreated };
  },

  async sendMedia(
    chatId: string,
    senderId: string,
    input: SendMessageMediaInput,
    file: Express.Multer.File,
  ) {
    const { otherUserId } = await chatService.assertAccess(chatId, senderId);
    const uploaded = await uploadMessageMedia(file, input.mediaType);
    let message;
    try {
      message = await messageRepository.createMedia({
        conversationId: chatId,
        senderId,
        recipientId: otherUserId,
        mediaType: input.mediaType,
        mediaUrl: uploaded.url,
        mediaMimeType: file.mimetype,
        mediaPublicId: uploaded.publicId,
        mediaResourceType: uploaded.resourceType,
        mediaSizeBytes: file.size,
        durationSeconds: input.mediaType === 'voice' ? input.durationSeconds ?? null : null,
      });
    } catch (error) {
      try {
        await deleteMessageMedia(uploaded.publicId, uploaded.resourceType);
      } catch (cleanupError) {
        console.error('Unable to clean up chat media after message persistence failed', {
          publicId: uploaded.publicId,
          error: cleanupError,
        });
      }
      throw error;
    }
    const notificationCreated = await updateSentMessageSideEffects(
      chatId,
      senderId,
      otherUserId,
      message._id,
      message.sentAt,
      message.text,
    );
    return { message: safeMessage(message.toObject()), notificationCreated };
  },

  async upsertCallActivity(input: {
    callId: string;
    callerId: string;
    recipientId: string;
    kind: 'audio' | 'video';
    status: CallState;
    durationSeconds: number | null;
    sentAt: Date;
  }) {
    const { chat } = await chatService.createOrGet(input.callerId, input.recipientId);
    const kindLabel = input.kind === 'video' ? 'Video' : 'Audio';
    const preview = input.status === 'missed' ||
      input.status === 'timeout' ||
      input.status === 'unavailable'
      ? `Missed ${kindLabel.toLowerCase()} call`
      : input.status === 'rejected'
        ? `Declined ${kindLabel.toLowerCase()} call`
        : input.status === 'cancelled'
          ? `Cancelled ${kindLabel.toLowerCase()} call`
          : input.status === 'failed'
            ? `${kindLabel} call failed`
            : input.status === 'busy'
              ? `${kindLabel} call · Busy`
              : `${kindLabel} call`;
    const message = await messageRepository.upsertCallActivity({
      callId: input.callId,
      conversationId: chat.id,
      senderId: input.callerId,
      kind: input.kind,
      status: input.status,
      durationSeconds: input.durationSeconds,
      preview,
      sentAt: input.sentAt,
    });
    if (!message) {
      throw new HttpError(500, 'Unable to record call in chat', 'CALL_ACTIVITY_FAILED');
    }
    if (message.sentAt) {
      await chatRepository.updateLastMessage(chat.id, input.callerId, {
        messageId: message._id,
        sender: message.sender,
        text: preview,
        sentAt: message.sentAt,
      });
      await messageRepository.updateCallActivityPreview(chat.id, message._id, preview);
    }
    return {
      chatId: chat.id,
      message: safeMessage(message),
    };
  },

  async markConversationRead(chatId: string, userId: string) {
    await chatService.assertAccess(chatId, userId);
    const result = await messageRepository.markReceivedRead(chatId, userId, new Date());
    return result.modifiedCount;
  },

  async markConversationReadWithReceipts(chatId: string, userId: string) {
    await chatService.assertAccess(chatId, userId);
    const readAt = new Date();
    const result = await messageRepository.markReceivedRead(chatId, userId, readAt);
    return {
      receipts: result.messages,
      readAt,
      updatedCount: result.modifiedCount,
    };
  },

  async delete(chatId: string, messageId: string, userId: string) {
    await chatService.assertAccess(chatId, userId);
    const existing = await messageRepository.findInConversation(messageId, chatId);
    if (!existing) {
      throw new HttpError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
    }
    if (existing.type !== 'text') {
      throw new HttpError(403, 'Call history cannot be deleted', 'NOT_AUTHORIZED');
    }
    if (existing.sender.toString() !== userId) {
      throw new HttpError(403, 'You can only delete your own messages', 'NOT_AUTHORIZED');
    }
    if (existing.deletedAt) {
      return { success: true };
    }

    const deletedAt = new Date();
    const deleted = await messageRepository.softDelete(
      messageId,
      chatId,
      userId,
      deletedAt,
    );
    if (!deleted) {
      const current = await messageRepository.findInConversation(messageId, chatId);
      if (!current || current.sender.toString() !== userId || !current.deletedAt) {
        throw new HttpError(409, 'Message could not be deleted', 'MESSAGE_DELETE_CONFLICT');
      }
    }
    await chatRepository.replaceDeletedLastMessagePreview(chatId, messageId);
    return { success: true };
  },
};