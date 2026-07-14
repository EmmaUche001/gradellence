module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.service.ts',
    '**/*.guard.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: '../coverage',
};