const cloudApi = {
  apiUrl: 'https://api.cqwushi.com/api',
  useLocalMock: false,
  allowDevOpenId: false
};

module.exports = {
  develop: { ...cloudApi },
  trial: { ...cloudApi },
  release: { ...cloudApi }
};
