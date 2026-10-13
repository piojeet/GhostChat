const React = require('react');
const { View } = require('react-native');

module.exports = {
  Camera: props => React.createElement(View, props, props.children),
  useCameraDevice: jest.fn(() => null),
  useCameraPermission: jest.fn(() => ({
    hasPermission: false,
    requestPermission: jest.fn(async () => false),
  })),
  useMicrophonePermission: jest.fn(() => ({
    hasPermission: false,
    requestPermission: jest.fn(async () => false),
  })),
};
