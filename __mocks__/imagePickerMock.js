module.exports = {
  launchCamera: jest.fn(async () => ({ didCancel: true, assets: [] })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true, assets: [] })),
};
