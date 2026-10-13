const player = {
  addPlaybackEndListener: jest.fn(),
  removePlaybackEndListener: jest.fn(),
  stopPlayer: jest.fn(async () => undefined),
  pausePlayer: jest.fn(async () => undefined),
  resumePlayer: jest.fn(async () => undefined),
  startPlayer: jest.fn(async () => undefined),
  addRecordListener: jest.fn(),
  removeRecordListener: jest.fn(),
  startRecorder: jest.fn(async () => ''),
  stopRecorder: jest.fn(async () => ''),
};

module.exports = {
  createSound: jest.fn(() => player),
  createRecorder: jest.fn(() => player),
  default: player,
};
