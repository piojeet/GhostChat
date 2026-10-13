import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import { messageService } from './message.service';
import { getSocketServer } from '../../config/socket';
import { publishMessage } from '../chat/chat.realtime';
import { userRoom } from '../../sockets/socketEvents';
import {
  messageIdParamsSchema,
  messagesQuerySchema,
  sendMessageMediaBodySchema,
  sendMessageBodySchema,
} from './message.validation';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const emitMessage = async (
  chatId: string,
  result: Awaited<ReturnType<typeof messageService.send>>,
) => {
  const message = await publishMessage(getSocketServer(), chatId, result.message);
  if (result.notificationCreated) {
    const recipientId = result.message.receipts[0]?.recipientId;
    if (recipientId) {
      getSocketServer().to(userRoom(recipientId)).emit('notification:new', {
        category: 'chats',
        entityId: chatId,
      });
    }
  }
  return message;
};

export const listMessages: RequestHandler = asyncHandler(async (request, response) => {
  const params = messageIdParamsSchema.pick({ chatId: true }).parse(request.params);
  const query = messagesQuerySchema.parse(request.query);
  response.status(200).json(
    await messageService.list(
      params.chatId,
      authenticatedUserId(request),
      query.page,
      query.limit,
    ),
  );
});

export const sendMessage: RequestHandler = asyncHandler(async (request, response) => {
  const params = messageIdParamsSchema.pick({ chatId: true }).parse(request.params);
  const body = sendMessageBodySchema.parse(request.body);
  const result = await messageService.send(params.chatId, authenticatedUserId(request), body);
  const message = await emitMessage(params.chatId, result);
  response.status(201).json({ message });
});

export const sendMediaMessage: RequestHandler = asyncHandler(async (request, response) => {
  const params = messageIdParamsSchema.pick({ chatId: true }).parse(request.params);
  const body = sendMessageMediaBodySchema.parse(request.body);
  if (!request.file) {
    throw new HttpError(400, 'Chat attachment is required', 'INVALID_MESSAGE_MEDIA');
  }
  const result = await messageService.sendMedia(
    params.chatId,
    authenticatedUserId(request),
    body,
    request.file,
  );
  const message = await emitMessage(params.chatId, result);
  response.status(201).json({ message });
});

export const deleteMessage: RequestHandler = asyncHandler(async (request, response) => {
  const params = messageIdParamsSchema.parse(request.params);
  response.status(200).json(
    await messageService.delete(
      params.chatId,
      params.messageId,
      authenticatedUserId(request),
    ),
  );
});