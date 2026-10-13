import assert from 'node:assert/strict';
import test from 'node:test';
import {
  updateLocationPreferencesSchema,
  updateLocationSchema,
} from './location.validation';
import { locationRepository } from './location.repository';
import { locationService } from './location.service';
import { friendService } from '../friends/friend.service';

const stubMethod = (
  target: object,
  method: string,
  implementation: (...args: unknown[]) => unknown,
): (() => void) => {
  const original = Object.getOwnPropertyDescriptor(target, method);
  Object.defineProperty(target, method, {
    configurable: true,
    value: implementation,
  });
  return () => {
    if (original) Object.defineProperty(target, method, original);
    else Reflect.deleteProperty(target, method);
  };
};

test('accepts valid location coordinates and privacy preferences', () => {
  assert.equal(
    updateLocationSchema.safeParse({ latitude: 37.7749, longitude: -122.4194 }).success,
    true,
  );
  assert.equal(
    updateLocationPreferencesSchema.safeParse({
      sharingEnabled: false,
      ghostMode: true,
    }).success,
    true,
  );
});

test('rejects out-of-range, non-finite, and extra location data', () => {
  assert.equal(
    updateLocationSchema.safeParse({ latitude: 91, longitude: 0 }).success,
    false,
  );
  assert.equal(
    updateLocationSchema.safeParse({ latitude: 0, longitude: Number.NaN }).success,
    false,
  );
  assert.equal(
    updateLocationSchema.safeParse({
      latitude: 0,
      longitude: 0,
      userId: 'unauthorized',
    }).success,
    false,
  );
  assert.equal(
    updateLocationPreferencesSchema.safeParse({
      sharingEnabled: true,
      ghostMode: true,
    }).success,
    true,
  );
});

test('disabling sharing and enabling Ghost Mode delete the saved location', async () => {
  for (const preferences of [
    { sharingEnabled: false, ghostMode: false },
    { sharingEnabled: true, ghostMode: true },
  ]) {
    let deleted = false;
    const savedUpdates: {
      sharingEnabled: boolean;
      ghostMode: boolean;
      sessionId: string | null;
    }[] = [];
    const restorePreferences = stubMethod(
      locationRepository,
      'updatePreferences',
      async (_userId, sharingEnabled, ghostMode, sessionId) => {
        if (
          typeof sharingEnabled !== 'boolean' ||
          typeof ghostMode !== 'boolean' ||
          (typeof sessionId !== 'string' && sessionId !== null)
        ) {
          throw new Error('Unexpected preference update arguments');
        }
        savedUpdates.push({ sharingEnabled, ghostMode, sessionId });
        return { locationSharingEnabled: sharingEnabled, ghostMode };
      },
    );
    const restoreDelete = stubMethod(
      locationRepository,
      'deleteLocation',
      async () => {
        deleted = true;
      },
    );
    const restoreTimestamp = stubMethod(
      locationRepository,
      'findLocationTimestamp',
      async () => null,
    );

    try {
      const result = await locationService.updatePreferences(
        '0123456789abcdef01234567',
        preferences.sharingEnabled,
        preferences.ghostMode,
      );
      assert.equal(deleted, true);
      assert.equal(savedUpdates[0]?.sharingEnabled, false);
      assert.equal(savedUpdates[0]?.sessionId, null);
      assert.equal(result.sharingEnabled, false);
      assert.equal(result.ghostMode, preferences.ghostMode);
    } finally {
      restoreTimestamp();
      restoreDelete();
      restorePreferences();
    }
  }
});

test('location writes are rejected unless sharing is enabled outside Ghost Mode', async () => {
  const restorePreferences = stubMethod(
    locationRepository,
    'findPreferences',
    async () => ({
      locationSharingEnabled: false,
      ghostMode: true,
      locationSharingSessionId: null,
    }),
  );
  let saved = false;
  const restoreUpdate = stubMethod(
    locationRepository,
    'updateLocation',
    async () => {
      saved = true;
      return { updatedAt: new Date() };
    },
  );
  try {
    await assert.rejects(
      locationService.updateLocation(
        '0123456789abcdef01234567',
        37.7749,
        -122.4194,
      ),
      { code: 'LOCATION_SHARING_DISABLED' },
    );
    assert.equal(saved, false);
  } finally {
    restoreUpdate();
    restorePreferences();
  }
});

test('users without accepted friends receive no locations', async () => {
  const restoreFriends = stubMethod(
    friendService,
    'getFriendIds',
    async () => [],
  );
  let queriedLocations = false;
  const restoreLocations = stubMethod(
    locationRepository,
    'findFriendLocations',
    async () => {
      queriedLocations = true;
      return [];
    },
  );
  try {
    assert.deepEqual(
      await locationService.getFriendLocations('1123456789abcdef01234567'),
      { items: [] },
    );
    assert.equal(queriedLocations, false);
  } finally {
    restoreLocations();
    restoreFriends();
  }
});

test('a location update racing with a sharing preference change is rejected', async () => {
  let preferenceReads = 0;
  const restorePreferences = stubMethod(
    locationRepository,
    'findPreferences',
    async () => {
      preferenceReads += 1;
      return {
        locationSharingEnabled: true,
        ghostMode: false,
        locationSharingSessionId: preferenceReads === 1 ? 'old-session' : 'new-session',
      };
    },
  );
  const restoreUpdate = stubMethod(
    locationRepository,
    'updateLocation',
    async () => ({ updatedAt: new Date() }),
  );
  try {
    await assert.rejects(
      locationService.updateLocation(
        '0123456789abcdef01234567',
        37.7749,
        -122.4194,
      ),
      { code: 'LOCATION_SHARING_DISABLED' },
    );
    assert.equal(preferenceReads, 2);
  } finally {
    restoreUpdate();
    restorePreferences();
  }
});
