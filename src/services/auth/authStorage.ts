import * as Keychain from 'react-native-keychain';
import type { AuthTokens } from '../../services/api/apiTypes';

const SERVICE = 'com.snapapp.auth';

export const authStorage = {
  async getTokens(): Promise<AuthTokens | null> {
    const credentials = await Keychain.getGenericPassword({ service: SERVICE });
    if (!credentials) {
      return null;
    }

    try {
      const tokens: unknown = JSON.parse(credentials.password);
      if (
        typeof tokens === 'object' &&
        tokens !== null &&
        'accessToken' in tokens &&
        'refreshToken' in tokens &&
        typeof tokens.accessToken === 'string' &&
        typeof tokens.refreshToken === 'string'
      ) {
        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
    } catch {
      await Keychain.resetGenericPassword({ service: SERVICE });
      return null;
    }

    await Keychain.resetGenericPassword({ service: SERVICE });
    return null;
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await Keychain.setGenericPassword('snapapp', JSON.stringify(tokens), {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};