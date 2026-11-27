const cloudApi = {
  apiUrl: 'https://api.jinyifangchan.com/api',
  useLocalMock: false,
  allowDevOpenId: false
};

module.exports = {
  develop: { ...cloudApi },
  trial: { ...cloudApi },
  release: { ...cloudApi }
};
