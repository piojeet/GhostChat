import assert from 'node:assert/strict';
import test from 'node:test';
import {
  incomingCallSoundForKind,
  notificationSoundForType,
  notificationSoundRoutes,
} from './notification.sound';

test('routes incoming message, Snap, and friend-request sounds', () => {
  assert.deepEqual(notificationSoundForType('MESSAGE_RECEIVED'), notificationSoundRoutes.MESSAGE_RECEIVED);
  assert.deepEqual(notificationSoundForType('SNAP_RECEIVED'), notificationSoundRoutes.SNAP_RECEIVED);
  assert.deepEqual(notificationSoundForType('FRIEND_REQUEST'), notificationSoundRoutes.FRIEND_REQUEST);
});

test('routes calls by their actual audio/video kind', () => {
  assert.deepEqual(incomingCallSoundForKind('audio'), notificationSoundRoutes.INCOMING_AUDIO_CALL);
  assert.deepEqual(incomingCallSoundForKind('video'), notificationSoundRoutes.INCOMING_VIDEO_CALL);
});

test('uses the default sound for remaining notification types', () => {
  assert.deepEqual(notificationSoundForType('SYSTEM'), notificationSoundRoutes.SYSTEM);
  assert.deepEqual(notificationSoundForType('STORY_LIKED'), notificationSoundRoutes.SYSTEM);
  assert.equal(notificationSoundRoutes.FRIEND_SUGGESTION.sound, 'friend_suggestion');
});
