import { Router } from 'express';
import { requireAuth } from '../../middlewares/authMiddleware';
import * as callController from './call.controller';

const router = Router();

router.use(requireAuth);
router.get('/ice-servers', callController.getIceServers);
router.get('/history', callController.getHistory);
router.post('/', callController.start);
router.post('/:callId/accept', callController.accept);
router.post('/:callId/reject', callController.reject);
router.post('/:callId/cancel', callController.cancel);
router.post('/:callId/end', callController.end);
router.post('/:callId/failed', callController.fail);

export default router;