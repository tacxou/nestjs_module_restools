module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        ignoreCodes: ['TS151001'],
      },
    ],
  },
  collectCoverage: true,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
}
