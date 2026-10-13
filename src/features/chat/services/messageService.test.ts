import { apiRequest } from '../../../services/api/apiClient';
import { sendMediaMessage } from './messageService';

jest.mock('../../../services/api/apiClient', () => ({
  apiRequest: jest.fn(),
}));

class FormDataStub {
  readonly fields: [string, unknown][] = [];

  append(name: string, value: unknown) {
    this.fields.push([name, value]);
  }
}

describe('sendMediaMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis, 'FormData', {
      configurable: true,
      value: FormDataStub,
    });
  });

  it('posts an image attachment as multipart media', async () => {
    await sendMediaMessage('chat-123', {
      uri: 'file:///photo.jpg',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'image',
    });

    const [path, options] = (apiRequest as jest.Mock).mock.calls[0];
    expect(path).toBe('/chats/chat-123/messages/media');
    expect(options.method).toBe('POST');
    expect(options.timeoutMs).toBe(120_000);
    expect(options.body).toBeInstanceOf(FormDataStub);
    expect((options.body as FormDataStub).fields.map(([name]) => name)).toEqual([
      'media',
      'mediaType',
    ]);
  });

  it('includes the duration for voice attachments', async () => {
    await sendMediaMessage('chat-123', {
      uri: 'file:///voice.m4a',
      fileName: 'voice.m4a',
      mimeType: 'audio/mp4',
      mediaType: 'voice',
      durationSeconds: 8,
    });

    const [, options] = (apiRequest as jest.Mock).mock.calls[0];
    expect((options.body as FormDataStub).fields.map(([name, value]) => [name, value])).toEqual([
      ['media', expect.any(Object)],
      ['mediaType', 'voice'],
      ['durationSeconds', '8'],
    ]);
  });
});
