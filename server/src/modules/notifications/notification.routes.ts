import { Router } from 'express';
import { requireAuth } from '../../middlewares/authMiddleware';
import * as notificationController from './notification.controller';

const router = Router();

router.use(requireAuth);
router.put('/devices', notificationController.registerPushDevice);
router.delete('/devices', notificationController.removePushDevice);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:notificationId/read', notificationController.markRead);
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;