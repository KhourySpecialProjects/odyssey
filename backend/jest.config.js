module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.tmp/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.tmp/'],
  // Booting a real Strapi instance (TS compile + schema sync) is slow.
  testTimeout: 120000,
};
