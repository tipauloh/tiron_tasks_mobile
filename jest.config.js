/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '__tests__/utils/date.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Bloquear módulos nativos do Expo que não funcionam em ambiente Node/Jest
    '^expo/src/winter/(.*)$': '<rootDir>/__tests__/__mocks__/empty.js',
    '^expo/build/winter/(.*)$': '<rootDir>/__tests__/__mocks__/empty.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@testing-library|zustand|@tanstack))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  collectCoverageFrom: [
    'src/store/auth-store.ts',
    'src/store/filter-store.ts',
    'src/lib/updates.ts',
    'src/lib/secure-storage.ts',
    'src/infrastructure/api/client.ts',
    'src/hooks/api/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      functions: 80,
      branches: 70,
      statements: 80,
      lines: 80,
    },
  },
  globals: {
    __DEV__: true,
  },
};
