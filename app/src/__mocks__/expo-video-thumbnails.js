module.exports = {
  getThumbnailAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/thumbnail.jpg',
    width: 100,
    height: 100,
  }),
};
