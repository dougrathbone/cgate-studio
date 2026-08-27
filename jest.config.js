module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js}',
    // Pure type declarations — no executable code to cover.
    '!src/shared/types.ts',
    // Thin process entry points (Electron app bootstrap / React DOM mount):
    // pure framework wiring, exercised by launch rather than unit tests.
    '!src/main/index.ts',
    '!src/renderer/main.tsx',
    '!src/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
