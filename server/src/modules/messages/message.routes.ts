import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { HttpError } from '../../utils/httpError';
import * as messageController from './message.controller';

const router = Router({ mergeParams: true });
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/aac',
      'audio/3gpp',
      'audio/m4a',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'audio/x-m4a',
      'audio/x-wav',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      callback(new HttpError(400, 'Chat attachment must be a supported image or audio file', 'INVALID_MESSAGE_MEDIA'));
      return;
    }
    callback(null, true);
  },
}).single('media');

const uploadMedia: RequestHandler = (request, response, next) => {
  mediaUpload(request, response, error => {
    if (error instanceof MulterError) {
      next(
        new HttpError(
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Chat attachments must be 15 MB or smaller'
            : 'Invalid chat attachment upload',
          'INVALID_MESSAGE_MEDIA',
        ),
      );
      return;
    }
    next(error);
  });
};

router.get('/', messageController.listMessages);
router.post('/', messageController.sendMessage);
router.post('/media', uploadMedia, messageController.sendMediaMessage);
router.delete('/:messageId', messageController.deleteMessage);

export default router;