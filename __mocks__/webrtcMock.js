const React = require('react');
const { View } = require('react-native');

class RTCIceCandidateMock {}
class RTCPeerConnectionMock {}

module.exports = {
  RTCView: props => React.createElement(View, props, props.children),
  RTCIceCandidate: RTCIceCandidateMock,
  RTCPeerConnection: RTCPeerConnectionMock,
  mediaDevices: {
    getUserMedia: jest.fn(async () => ({})),
    enumerateDevices: jest.fn(async () => []),
  },
};
