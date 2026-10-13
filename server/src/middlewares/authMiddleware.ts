import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { HttpError } from '../utils/httpError';

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.authUserId = payload.sub;
    next();
  } catch (error) {
    next(error);
  }
};