import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import {
  notificationIdParamsSchema,
  notificationsQuerySchema,
} from './notification.validation';
import { notificationService } from './notification.service';
import { pushDeviceSchema } from './notification.validation';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const notificationId = (request: Parameters<RequestHandler>[0]): string =>
  notificationIdParamsSchema.parse(request.params).notificationId;

export const getNotifications: RequestHandler = asyncHandler(async (request, response) => {
  const { page, limit, category } = notificationsQuerySchema.parse(request.query);
  response.status(200).json(
    await notificationService.getNotifications(
      authenticatedUserId(request),
      page,
      limit,
      category,
    ),
  );
});

export const getUnreadCount: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    count: await notificationService.getUnreadCount(authenticatedUserId(request)),
  });
});

export const markRead: RequestHandler = asyncHandler(async (request, response) => {
  await notificationService.markRead(
    notificationId(request),
    authenticatedUserId(request),
  );
  response.status(200).json({ success: true });
});

export const markAllRead: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    updated: await notificationService.markAllRead(authenticatedUserId(request)),
  });
});

export const deleteNotification: RequestHandler = asyncHandler(async (request, response) => {
  await notificationService.deleteNotification(
    notificationId(request),
    authenticatedUserId(request),
  );
  response.status(200).json({ success: true });
});

export const registerPushDevice: RequestHandler = asyncHandler(async (request, response) => {
  const device = pushDeviceSchema.parse(request.body);
  await notificationService.registerPushDevice(
    authenticatedUserId(request),
    device.token,
    device.platform,
  );
  response.status(200).json({ success: true });
});

export const removePushDevice: RequestHandler = asyncHandler(async (request, response) => {
  const { token } = pushDeviceSchema.pick({ token: true }).parse(request.body);
  await notificationService.removePushDevice(authenticatedUserId(request), token);
  response.status(200).json({ success: true });
});