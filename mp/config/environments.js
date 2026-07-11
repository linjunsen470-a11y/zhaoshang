const ENVIRONMENTS = {
  develop: {
    apiUrl: 'http://127.0.0.1:3000/api',
    useLocalMock: true,
    allowDevOpenId: true
  },
  trial: {
    apiUrl: '',
    useLocalMock: false,
    allowDevOpenId: false
  },
  release: {
    apiUrl: '',
    useLocalMock: false,
    allowDevOpenId: false
  }
};

module.exports = ENVIRONMENTS;
