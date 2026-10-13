import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import { blockUserParamsSchema } from './block.validation';
import { blockService } from './block.service';

const getAuthenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const getTargetUserId = (request: Parameters<RequestHandler>[0]): string => {
  const parsed = blockUserParamsSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid user ID', 'INVALID_USER_ID');
  }
  return parsed.data.userId;
};

export const blockUser: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await blockService.blockUser(
      getAuthenticatedUserId(request),
      getTargetUserId(request),
    ),
  );
});

export const unblockUser: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await blockService.unblockUser(
      getAuthenticatedUserId(request),
      getTargetUserId(request),
    ),
  );
});