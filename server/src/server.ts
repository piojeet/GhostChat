import { createServer } from 'node:http';
import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { initializeSocketServer } from './config/socket';
import { startSnapExpiryJob } from './jobs/snapExpiry.job';
import { startStoryExpiryJob } from './jobs/storyExpiry.job';
import { callService } from './modules/calls/call.service';

const start = async (): Promise<void> => {
  await connectDatabase();
  const expiredCalls = await callService.expireCallsOnServerStart();
  if (expiredCalls > 0) {
    console.info(`Marked ${expiredCalls} abandoned call session(s) as finished`);
  }
  startStoryExpiryJob();
  startSnapExpiryJob();
  const server = createServer(app);
  initializeSocketServer(server);
  server.listen(env.PORT, '0.0.0.0', () => {
    console.info(`SnapApp API listening on port ${env.PORT}`);
  });
};

start().catch(error => {
  console.error('Failed to start SnapApp API', error);
  process.exitCode = 1;
});