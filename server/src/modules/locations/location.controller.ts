import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import {
  updateLocationPreferencesSchema,
  updateLocationSchema,
} from './location.validation';
import { locationService } from './location.service';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

export const getPreferences: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    preferences: await locationService.getPreferences(authenticatedUserId(request)),
  });
});

export const updatePreferences: RequestHandler = asyncHandler(async (request, response) => {
  const input = updateLocationPreferencesSchema.parse(request.body);
  response.status(200).json({
    preferences: await locationService.updatePreferences(
      authenticatedUserId(request),
      input.sharingEnabled,
      input.ghostMode,
    ),
  });
});

export const updateLocation: RequestHandler = asyncHandler(async (request, response) => {
  const input = updateLocationSchema.parse(request.body);
  response.status(200).json(
    await locationService.updateLocation(
      authenticatedUserId(request),
      input.latitude,
      input.longitude,
    ),
  );
});

export const getFriendLocations: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await locationService.getFriendLocations(authenticatedUserId(request)),
  );
});
