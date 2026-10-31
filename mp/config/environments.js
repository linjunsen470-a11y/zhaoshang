const ENVIRONMENTS = {
  develop: {
    apiUrl: 'https://api.cqwushi.com/api',
    useLocalMock: false,
    allowDevOpenId: false
  },
  trial: {
    // Planned: https://api.jinyifangchan.com/api. Enable only after deployment and domain approval.
    apiUrl: '',
    useLocalMock: false,
    allowDevOpenId: false
  },
  release: {
    // Planned: https://api.jinyifangchan.com/api. Keep empty until the production backend is ready.
    apiUrl: '',
    useLocalMock: false,
    allowDevOpenId: false
  }
};

module.exports = ENVIRONMENTS;
