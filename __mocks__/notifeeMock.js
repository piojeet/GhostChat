const notifee = {
  createChannels: jest.fn(async () => undefined),
  requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
  displayNotification: jest.fn(async () => undefined),
  deleteChannel: jest.fn(async () => undefined),
  createChannel: jest.fn(async () => undefined),
  onForegroundEvent: jest.fn(() => jest.fn()),
  onBackgroundEvent: jest.fn(),
};

module.exports = notifee;
module.exports.default = notifee;
module.exports.AndroidImportance = { HIGH: 4, DEFAULT: 3 };
module.exports.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
