/**
 * Jest Configuration for Plant Health Backend Tests - FIXED
 */

module.exports = {
  // Test environment
  testEnvironment: "node",

  // Test file patterns
  testMatch: ["**/tests/**/*.test.js"],

  // Setup files - IMPORTANT ORDER
  setupFiles: ["<rootDir>/tests/setup.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupAfterEnv.js"],

  // Global setup/teardown - CRITICAL FOR DB
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",

  // Timeout
  testTimeout: 30000,

  // ✅ IMPROVED: Better module resolution
  moduleDirectories: ["node_modules", "<rootDir>"],
  modulePaths: ["<rootDir>"],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  verbose: true,

  detectOpenHandles: true,
  forceExit: true,

  maxWorkers: 1,

  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!src/**/*.test.js"],
  coverageDirectory: "tests/coverage",
  coverageReporters: ["text", "lcov", "html", "json"],

  // Custom reporter for test reports
  reporters: ["default", "<rootDir>/test-reporter/jestReporter.js"],

  transformIgnorePatterns: ["node_modules/(?!(supertest)/)"],
};
