import { parseMapBridgeMessage } from './mapWebViewBridge';

describe('parseMapBridgeMessage', () => {
  it('accepts only known map events with valid fields', () => {
    expect(parseMapBridgeMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(
      parseMapBridgeMessage('{"type":"tileStatus","status":"loaded"}'),
    ).toEqual({ type: 'tileStatus', status: 'loaded' });
    expect(
      parseMapBridgeMessage(
        '{"type":"friendPress","userId":"0123456789abcdef01234567"}',
      ),
    ).toEqual({
      type: 'friendPress',
      userId: '0123456789abcdef01234567',
    });
  });

  it('rejects malformed, oversized, unknown, and invalid marker messages', () => {
    expect(parseMapBridgeMessage('{')).toBeNull();
    expect(parseMapBridgeMessage(' '.repeat(4097))).toBeNull();
    expect(parseMapBridgeMessage('{"type":"setLocation","latitude":0}')).toBeNull();
    expect(
      parseMapBridgeMessage('{"type":"friendPress","userId":"not-a-user-id"}'),
    ).toBeNull();
    expect(
      parseMapBridgeMessage('{"type":"tileStatus","status":"offline"}'),
    ).toBeNull();
  });
});
