import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError } from '../../utils/httpError';
import { validateMessageMedia } from './messageMedia';
import { sendMessageMediaBodySchema } from './message.validation';

const file = (
  mimetype: string,
  contents: number[],
): Express.Multer.File => ({
  buffer: Buffer.from(contents),
  size: contents.length,
  mimetype,
} as Express.Multer.File);

test('accepts supported photo signatures for image messages', () => {
  assert.doesNotThrow(() => validateMessageMedia(file('image/jpeg', [0xff, 0xd8, 0xff]), 'image'));
  assert.doesNotThrow(() =>
    validateMessageMedia(
      file('image/png', [137, 80, 78, 71, 13, 10, 26, 10]),
      'image',
    ),
  );
});

test('accepts recorded MP4 audio for voice messages', () => {
  assert.doesNotThrow(() =>
    validateMessageMedia(
      file('audio/mp4', [0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]),
      'voice',
    ),
  );
});

test('rejects mismatched media types and oversized attachments', () => {
  assert.throws(
    () => validateMessageMedia(file('image/png', [0, 0, 0, 0]), 'image'),
    (error: unknown) => error instanceof HttpError && error.statusCode === 400,
  );
  const oversized = file('image/jpeg', [0xff, 0xd8, 0xff]);
  oversized.size = 15 * 1024 * 1024 + 1;
  assert.throws(
    () => validateMessageMedia(oversized, 'image'),
    (error: unknown) => error instanceof HttpError && error.statusCode === 413,
  );
});

test('requires a positive duration for voice messages and rejects it for images', () => {
  assert.equal(
    sendMessageMediaBodySchema.safeParse({ mediaType: 'voice', durationSeconds: '12' }).success,
    true,
  );
  assert.equal(
    sendMessageMediaBodySchema.safeParse({ mediaType: 'voice' }).success,
    false,
  );
  assert.equal(
    sendMessageMediaBodySchema.safeParse({
      mediaType: 'image',
      durationSeconds: '12',
    }).success,
    false,
  );
});
