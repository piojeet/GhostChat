module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/__mocks__/styleMock.js',
    '^react-native-vector-icons/.*$': '<rootDir>/__mocks__/vectorIconsMock.js',
    '^react-native-webview$': '<rootDir>/__mocks__/webViewMock.js',
    '^@react-native-community/geolocation$': '<rootDir>/__mocks__/geolocationMock.js',
    '^react-native-config$': '<rootDir>/__mocks__/reactNativeConfigMock.js',
    '^@react-native-firebase/app$': '<rootDir>/__mocks__/firebaseAppMock.js',
    '^@react-native-firebase/messaging$': '<rootDir>/__mocks__/firebaseMessagingMock.js',
    '^@notifee/react-native$': '<rootDir>/__mocks__/notifeeMock.js',
    '^react-native-image-picker$': '<rootDir>/__mocks__/imagePickerMock.js',
    '^react-native-vision-camera$': '<rootDir>/__mocks__/visionCameraMock.js',
    '^react-native-nitro-sound$': '<rootDir>/__mocks__/nitroSoundMock.js',
    '^react-native-sound$': '<rootDir>/__mocks__/reactNativeSoundMock.js',
    '^react-native-webrtc$': '<rootDir>/__mocks__/webrtcMock.js',
    '^react-native-webrtc/.*$': '<rootDir>/__mocks__/webrtcMock.js',
    '^react-native-incall-manager$': '<rootDir>/__mocks__/incallManagerMock.js',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/server/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|nativewind|react-native-css-interop|react-native-safe-area-context|react-native-screens|react-native-worklets|react-native-webview)/)',
  ],
};
