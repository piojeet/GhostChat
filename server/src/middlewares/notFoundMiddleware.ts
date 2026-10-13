import type { RequestHandler } from 'express';
import { HttpError } from '../utils/httpError';

export const notFoundMiddleware: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, `Route ${request.method} ${request.path} not found`, 'NOT_FOUND'));
};