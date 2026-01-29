/**
 * Jest Configuration for Plant Health Backend Tests
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

  // Module resolution - use root node_modules
  moduleDirectories: ["node_modules"],
  modulePaths: ["<rootDir>"],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,

  // Run tests serially to avoid DB conflicts
  maxWorkers: 1,

  // Coverage (optional)
  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!src/**/*.test.js"],
  coverageDirectory: "tests/coverage",
  coverageReporters: ["text", "lcov", "html"],
};
