import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import blockRoutes from './modules/blocks/block.routes';
import chatRoutes from './modules/chat/chat.routes';
import callRoutes from './modules/calls/call.routes';
import friendRoutes from './modules/friends/friend.routes';
import locationRoutes from './modules/locations/location.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import snapRoutes from './modules/snaps/snap.routes';
import storyRoutes from './modules/stories/story.routes';
import userRoutes from './modules/users/user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/blocks', blockRoutes);
router.use('/chats', chatRoutes);
router.use('/calls', callRoutes);
router.use('/friends', friendRoutes);
router.use('/locations', locationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/snaps', snapRoutes);
router.use('/stories', storyRoutes);
router.use('/users', userRoutes);

export default router;