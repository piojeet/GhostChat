import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import {
  paginationQuerySchema,
  updateProfileSchema,
  usernameParamsSchema,
} from './user.validation';
import { userService } from './user.service';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

export const getMyProfile: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    user: await userService.getMyProfile(authenticatedUserId(request)),
  });
});

export const getPublicProfile: RequestHandler = asyncHandler(async (request, response) => {
  const parsedUsername = usernameParamsSchema.safeParse(request.params);
  if (!parsedUsername.success) {
    throw new HttpError(400, 'Invalid username', 'INVALID_USERNAME');
  }
  response.status(200).json({
    user: await userService.getPublicProfile(parsedUsername.data.username),
  });
});

export const updateMyProfile: RequestHandler = asyncHandler(async (request, response) => {
  const parsedChanges = updateProfileSchema.safeParse(request.body);
  if (!parsedChanges.success) {
    throw new HttpError(400, 'Invalid profile data', 'INVALID_PROFILE_DATA');
  }
  response.status(200).json({
    user: await userService.updateMyProfile(
      authenticatedUserId(request),
      parsedChanges.data,
    ),
  });
});

export const updateMyAvatar: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.file) {
    throw new HttpError(400, 'An image file is required', 'INVALID_AVATAR');
  }
  response.status(200).json({
    user: await userService.updateAvatar(authenticatedUserId(request), request.file),
  });
});

export const getMyStats: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    stats: await userService.getMyStats(authenticatedUserId(request)),
  });
});

export const getMySnaps: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await userService.getMySnaps(authenticatedUserId(request), pagination),
  );
});

export const getMyStories: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await userService.getMyStories(authenticatedUserId(request), pagination),
  );
});