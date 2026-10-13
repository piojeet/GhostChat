import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { requireAuth } from '../../middlewares/authMiddleware';
import { HttpError } from '../../utils/httpError';
import * as userController from './user.controller';

const router = Router();
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      callback(new HttpError(400, 'Avatar must be a JPEG, PNG, WebP, or GIF image', 'INVALID_AVATAR'));
      return;
    }
    callback(null, true);
  },
}).single('avatar');

const uploadAvatar: RequestHandler = (request, response, next) => {
  multerUpload(request, response, error => {
    if (error instanceof MulterError) {
      next(
        new HttpError(
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Avatar image must be 5 MB or smaller'
            : 'Invalid avatar upload',
          'INVALID_AVATAR',
        ),
      );
      return;
    }
    next(error);
  });
};

router.get('/me', requireAuth, userController.getMyProfile);
router.patch('/me', requireAuth, userController.updateMyProfile);
router.post('/me/avatar', requireAuth, uploadAvatar, userController.updateMyAvatar);
router.get('/me/stats', requireAuth, userController.getMyStats);
router.get('/me/snaps', requireAuth, userController.getMySnaps);
router.get('/me/stories', requireAuth, userController.getMyStories);
router.get('/:username', userController.getPublicProfile);

export default router;