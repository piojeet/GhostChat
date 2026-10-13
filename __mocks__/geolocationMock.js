const geolocationMock = {
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(success => success?.()),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
};

module.exports = geolocationMock;
module.exports.default = geolocationMock;
