import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import {
  friendRequestBodySchema,
  paginationQuerySchema,
  requestIdParamsSchema,
  searchQuerySchema,
  userIdParamsSchema,
} from './friend.validation';
import { friendService } from './friend.service';

const getAuthenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const getRequestId = (request: Parameters<RequestHandler>[0]): string =>
  requestIdParamsSchema.parse(request.params).requestId;

const getUserId = (request: Parameters<RequestHandler>[0]): string =>
  userIdParamsSchema.parse(request.params).userId;

export const sendRequest: RequestHandler = asyncHandler(async (request, response) => {
  const { userId } = friendRequestBodySchema.parse(request.body);
  response.status(201).json({
    friendRequest: await friendService.sendRequest(
      getAuthenticatedUserId(request),
      userId,
    ),
  });
});

export const cancelRequest: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await friendService.cancelRequest(
      getAuthenticatedUserId(request),
      getRequestId(request),
    ),
  );
});

export const acceptRequest: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    friendship: await friendService.acceptRequest(
      getAuthenticatedUserId(request),
      getRequestId(request),
    ),
  });
});

export const declineRequest: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await friendService.declineRequest(
      getAuthenticatedUserId(request),
      getRequestId(request),
    ),
  );
});

export const getIncoming: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await friendService.getIncoming(
      getAuthenticatedUserId(request),
      pagination.page,
      pagination.limit,
    ),
  );
});

export const getOutgoing: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await friendService.getOutgoing(
      getAuthenticatedUserId(request),
      pagination.page,
      pagination.limit,
    ),
  );
});

export const getFriends: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await friendService.getFriends(
      getAuthenticatedUserId(request),
      pagination.page,
      pagination.limit,
    ),
  );
});

export const removeFriend: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await friendService.removeFriend(
      getAuthenticatedUserId(request),
      getUserId(request),
    ),
  );
});

export const getStatus: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await friendService.getStatus(
      getAuthenticatedUserId(request),
      getUserId(request),
    ),
  );
});

export const searchUsers: RequestHandler = asyncHandler(async (request, response) => {
  const query = searchQuerySchema.parse(request.query);
  response.status(200).json(
    await friendService.searchUsers(
      getAuthenticatedUserId(request),
      query.q,
      query.page,
      query.limit,
    ),
  );
});

export const getSuggestions: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await friendService.getSuggestions(
      getAuthenticatedUserId(request),
      pagination.page,
      pagination.limit,
    ),
  );
});

export const getCount: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    count: await friendService.getFriendCount(getAuthenticatedUserId(request)),
  });
});