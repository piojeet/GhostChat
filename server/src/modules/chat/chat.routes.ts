import { Router } from 'express';
import { requireAuth } from '../../middlewares/authMiddleware';
import messageRoutes from '../messages/message.routes';
import * as chatController from './chat.controller';

const router = Router();

router.use(requireAuth);
router.get('/', chatController.listChats);
router.post('/', chatController.createChat);
router.use('/:chatId/messages', messageRoutes);
router.patch('/:chatId/read', chatController.markChatRead);

export default router;