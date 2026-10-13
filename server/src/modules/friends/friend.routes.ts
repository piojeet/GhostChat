import { Router } from 'express';
import { requireAuth } from '../../middlewares/authMiddleware';
import * as friendController from './friend.controller';

const router = Router();

router.use(requireAuth);
router.get('/suggestions', friendController.getSuggestions);
router.get('/search', friendController.searchUsers);
router.get('/count', friendController.getCount);
router.get('/requests/incoming', friendController.getIncoming);
router.get('/requests/outgoing', friendController.getOutgoing);
router.post('/requests', friendController.sendRequest);
router.patch('/requests/:requestId/accept', friendController.acceptRequest);
router.patch('/requests/:requestId/decline', friendController.declineRequest);
router.delete('/requests/:requestId', friendController.cancelRequest);
router.get('/status/:userId', friendController.getStatus);
router.get('/', friendController.getFriends);
router.delete('/:userId', friendController.removeFriend);

export default router;