import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/authMiddleware';
import * as locationController from './location.controller';

const router = Router();
const locationWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.use(requireAuth);
router.get('/friends', locationController.getFriendLocations);
router.get('/me/preferences', locationController.getPreferences);
router.patch('/me/preferences', locationWriteLimiter, locationController.updatePreferences);
router.put('/me', locationWriteLimiter, locationController.updateLocation);

export default router;
