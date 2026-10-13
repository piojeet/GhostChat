import { Router } from 'express';
import { requireAuth } from '../../middlewares/authMiddleware';
import * as blockController from './block.controller';

const router = Router();

router.use(requireAuth);
router.post('/:userId', blockController.blockUser);
router.delete('/:userId', blockController.unblockUser);

export default router;