module.exports = {
  roots: ['<rootDir>/src/'],
  preset: 'ts-jest/presets/js-with-ts',
  globals: {
    'ts-jest': {
      tsConfig: {
        esModuleInterop: true,
      },
    },
  },
  setupFiles: ['<rootDir>/__mocks__/setupTests.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest',
  },
  // transformIgnorePatterns: ['^.+\\.js$'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.(ts|tsx)',
    '<rootDir>/**/*.test.(ts|tsx)',
  ],
};
