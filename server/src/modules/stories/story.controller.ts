import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import {
  createStoryFieldsSchema,
  paginationQuerySchema,
  storyIdParamsSchema,
  userIdParamsSchema,
  viewersPaginationQuerySchema,
} from './story.validation';
import { storyService } from './story.service';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const getStoryId = (request: Parameters<RequestHandler>[0]): string =>
  storyIdParamsSchema.parse(request.params).storyId;

export const createStory: RequestHandler = asyncHandler(async (request, response) => {
  const input = createStoryFieldsSchema.parse(request.body);
  if (!request.file) {
    throw new HttpError(400, 'Story media is required', 'INVALID_STORY_MEDIA');
  }
  response.status(201).json({
    story: await storyService.createStory(
      authenticatedUserId(request),
      request.file,
      input,
    ),
  });
});

export const getMyStories: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await storyService.getMyStories(authenticatedUserId(request), pagination),
  );
});

export const getFeed: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await storyService.getFeed(authenticatedUserId(request), pagination),
  );
});

export const getUserStories: RequestHandler = asyncHandler(async (request, response) => {
  const { userId } = userIdParamsSchema.parse(request.params);
  const pagination = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await storyService.getUserStories(
      authenticatedUserId(request),
      userId,
      pagination,
    ),
  );
});

export const getStory: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    story: await storyService.getStory(authenticatedUserId(request), getStoryId(request)),
  });
});

export const viewStory: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await storyService.viewStory(authenticatedUserId(request), getStoryId(request)),
  );
});

export const getViewers: RequestHandler = asyncHandler(async (request, response) => {
  const pagination = viewersPaginationQuerySchema.parse(request.query);
  response.status(200).json(
    await storyService.getViewers(
      authenticatedUserId(request),
      getStoryId(request),
      pagination,
    ),
  );
});

export const deleteStory: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await storyService.deleteStory(authenticatedUserId(request), getStoryId(request)),
  );
});