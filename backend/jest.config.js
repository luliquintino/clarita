module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/env.js'],
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
  testTimeout: 30000,
};
