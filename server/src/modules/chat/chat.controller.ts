import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import { messageService } from '../messages/message.service';
import { getSocketServer } from '../../config/socket';
import { publishReadReceipts } from './chat.realtime';
import { chatService } from './chat.service';
import {
  chatIdParamsSchema,
  chatListQuerySchema,
  createChatBodySchema,
} from './chat.validation';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const chatId = (request: Parameters<RequestHandler>[0]): string =>
  chatIdParamsSchema.parse(request.params).chatId;

export const listChats: RequestHandler = asyncHandler(async (request, response) => {
  const query = chatListQuerySchema.parse(request.query);
  response.status(200).json(
    await chatService.list(authenticatedUserId(request), query.page, query.limit),
  );
});

export const createChat: RequestHandler = asyncHandler(async (request, response) => {
  const body = createChatBodySchema.parse(request.body);
  const result = await chatService.createOrGet(authenticatedUserId(request), body.userId);
  response.status(200).json(result);
});

export const markChatRead: RequestHandler = asyncHandler(async (request, response) => {
  const chatIdValue = chatId(request);
  const userId = authenticatedUserId(request);
  const { receipts, readAt, updatedCount } = await messageService.markConversationReadWithReceipts(
    chatIdValue,
    userId,
  );
  publishReadReceipts(
    getSocketServer(),
    chatIdValue,
    userId,
    receipts,
    readAt,
  );
  response.status(200).json({ updatedCount });
});