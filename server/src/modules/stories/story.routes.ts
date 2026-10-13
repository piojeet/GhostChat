import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { requireAuth } from '../../middlewares/authMiddleware';
import { HttpError } from '../../utils/httpError';
import * as storyController from './story.controller';

const router = Router();
const multipartUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new HttpError(400, 'Story media must be a supported image or video', 'INVALID_STORY_MEDIA'));
      return;
    }
    callback(null, true);
  },
}).single('media');

const uploadStoryMedia: RequestHandler = (request, response, next) => {
  multipartUpload(request, response, error => {
    if (error instanceof MulterError) {
      next(
        new HttpError(
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Story media must be 50 MB or smaller'
            : 'Invalid story media upload',
          'INVALID_STORY_MEDIA',
        ),
      );
      return;
    }
    next(error);
  });
};

router.use(requireAuth);
router.post('/', uploadStoryMedia, storyController.createStory);
router.get('/me', storyController.getMyStories);
router.get('/feed', storyController.getFeed);
router.get('/user/:userId', storyController.getUserStories);
router.get('/:storyId/viewers', storyController.getViewers);
router.post('/:storyId/view', storyController.viewStory);
router.delete('/:storyId', storyController.deleteStory);
router.get('/:storyId', storyController.getStory);

export default router;