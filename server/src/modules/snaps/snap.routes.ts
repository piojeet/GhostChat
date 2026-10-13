import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { requireAuth } from '../../middlewares/authMiddleware';
import { HttpError } from '../../utils/httpError';
import * as snapController from './snap.controller';

const router = Router();
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      callback(new HttpError(400, 'Snap media must be a supported image or video', 'INVALID_SNAP_MEDIA'));
      return;
    }
    callback(null, true);
  },
}).single('media');

const uploadSnapMedia: RequestHandler = (request, response, next) => {
  mediaUpload(request, response, error => {
    if (error instanceof MulterError) {
      next(
        new HttpError(
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Snap media must be 50 MB or smaller'
            : 'Invalid snap media upload',
          'INVALID_SNAP_MEDIA',
        ),
      );
      return;
    }
    next(error);
  });
};

router.use(requireAuth);
router.post('/', uploadSnapMedia, snapController.sendSnap);
router.get('/inbox', snapController.getInbox);
router.get('/sent', snapController.getSent);
router.get('/count', snapController.getCount);
router.post('/:snapId/replay', snapController.replaySnap);
router.post('/:snapId/open', snapController.openSnap);
router.get('/:snapId', snapController.getSnap);

export default router;