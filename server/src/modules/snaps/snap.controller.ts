import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import { paginationQuerySchema, snapIdParamsSchema, createSnapFieldsSchema, parseRecipients } from './snap.validation';
import { snapService } from './snap.service';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const getSnapId = (request: Parameters<RequestHandler>[0]): string =>
  snapIdParamsSchema.parse(request.params).snapId;

export const sendSnap: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.file) {
    throw new HttpError(400, 'Snap media is required', 'INVALID_SNAP_MEDIA');
  }
  const input = createSnapFieldsSchema.parse({
    ...request.body,
    recipients: parseRecipients(request.body.recipients),
  });
  response.status(201).json({
    snap: await snapService.sendSnap(authenticatedUserId(request), request.file, input),
  });
});

export const getInbox: RequestHandler = asyncHandler(async (request, response) => {
  const { page, limit } = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await snapService.getInbox(authenticatedUserId(request), page, limit),
  );
});

export const getSent: RequestHandler = asyncHandler(async (request, response) => {
  const { page, limit } = paginationQuerySchema.parse(request.query);
  response.status(200).json(
    await snapService.getSent(authenticatedUserId(request), page, limit),
  );
});

export const openSnap: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await snapService.openSnap(authenticatedUserId(request), getSnapId(request)),
  );
});

export const replaySnap: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await snapService.replaySnap(authenticatedUserId(request), getSnapId(request)),
  );
});

export const getSnap: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(
    await snapService.getSnap(authenticatedUserId(request), getSnapId(request)),
  );
});

export const getCount: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    count: await snapService.countActiveSent(authenticatedUserId(request)),
  });
});