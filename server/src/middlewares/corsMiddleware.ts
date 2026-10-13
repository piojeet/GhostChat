import cors from 'cors';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || origin === env.CLIENT_URL) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, 'Origin is not allowed by CORS', 'CORS_ORIGIN_DENIED'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600,
});