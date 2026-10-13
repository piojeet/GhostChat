module.exports = {
  deleteToken: jest.fn(async () => undefined),
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'test-token'),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  registerDeviceForRemoteMessages: jest.fn(async () => undefined),
  setBackgroundMessageHandler: jest.fn(),
};
