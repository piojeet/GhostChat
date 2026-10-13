import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middlewares/corsMiddleware';
import { errorMiddleware } from './middlewares/errorMiddleware';
import { notFoundMiddleware } from './middlewares/notFoundMiddleware';
import { apiRateLimiter } from './middlewares/rateLimitMiddleware';
import routes from './routes';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '16kb' }));
app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
app.use('/api', apiRateLimiter, routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;