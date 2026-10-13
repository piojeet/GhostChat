const mock = {
  start: jest.fn(),
  stop: jest.fn(),
  setForceSpeakerphoneOn: jest.fn(),
  setSpeakerphoneOn: jest.fn(),
  setMicrophoneMute: jest.fn(),
};

module.exports = mock;
module.exports.default = mock;
