class SoundMock {
  static MAIN_BUNDLE = 'MAIN_BUNDLE';

  static setCategory = jest.fn();

  release = jest.fn();

  setVolume = jest.fn(() => this);

  play = jest.fn(callback => callback?.(true));
}

module.exports = SoundMock;
module.exports.default = SoundMock;
