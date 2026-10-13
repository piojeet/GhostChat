export type MapBridgeMessage =
  | { type: 'ready' }
  | { type: 'tileStatus'; status: 'loaded' | 'error' }
  | { type: 'friendPress'; userId: string };

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const parseMapBridgeMessage = (raw: string): MapBridgeMessage | null => {
  if (raw.length > 4096) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;

  if (message.type === 'ready') return { type: 'ready' };
  if (
    message.type === 'tileStatus' &&
    (message.status === 'loaded' || message.status === 'error')
  ) {
    return { type: 'tileStatus', status: message.status };
  }
  if (
    message.type === 'friendPress' &&
    typeof message.userId === 'string' &&
    OBJECT_ID_PATTERN.test(message.userId)
  ) {
    return { type: 'friendPress', userId: message.userId };
  }

  return null;
};
