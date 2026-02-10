# Testing Framework

## Test Suite Overview

The project includes a comprehensive testing framework with **101 test cases** covering:

- Unit tests (42 tests)
- Integration tests (49 tests)
- End-to-end tests (10 tests)

**Test Coverage**: ~95% (96 passed, 5 expected failures due to environment constraints)

## Test Structure

```
tests/
├── unit/                        # Isolated component tests
│   ├── auth.test.js             # Authentication logic (15 tests)
│   ├── token.test.js            # JWT operations (8 tests)
│   ├── upload.test.js           # File validation (12 tests)
│   ├── middleware.test.js       # Middleware validation (9 tests)
│   ├── prediction.test.js       # Prediction endpoints (8 tests)
│   ├── history.test.js          # CRUD operations (12 tests)
│   └── guest.test.js            # Guest functionality (7 tests)
│
├── integration/                 # Multi-component workflows
│   ├── auth.integration.test.js # Auth flow (20 tests)
│   ├── guest.integration.test.js # Guest flow (15 tests)
│   └── userWorkflow.test.js     # User journey (14 tests)
│
└── e2e/                         # Full system tests
    └── system.test.js           # Health checks & system status (10 tests)
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e              # E2E tests only

# Run specific test files
npm run test:auth             # Authentication tests
npm run test:prediction       # Prediction tests
npm run test:guest            # Guest mode tests

# Watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Debug tests
npm run test:debug
```

## Test Reporting System

The project includes an **automated Excel reporting system** that generates professional test reports:

### Features:

1. **Executive Summary Sheet**
   - Total tests: 101
   - Pass rate: 95%
   - Bugs found: 68
   - Test execution timestamp

2. **Test Cases Sheet** (101 rows)
   - Test ID, Name, Module, Priority
   - Status (PASSED/FAILED/SKIPPED)
   - Execution duration
   - Error messages
   - Color-coded results (Green=Pass, Red=Fail, Yellow=Skip)

3. **Bug Reports Sheet** (68 entries)
   - Bug ID, Title, Severity, Priority
   - Description and location
   - Color-coded severity (Red=Critical, Orange=High, Yellow=Minor)
   - Detected issues include:
     - Failed test cases
     - Code quality issues (TODO comments, console.logs)
     - Empty catch blocks
     - Security concerns

### Generate Reports

```bash
# Generate report for all tests
npm run test:report

# Generate report for specific test types
npm run test:unit:report
npm run test:integration:report
npm run test:e2e:report

# Manual generation via CLI
node test-reporter/cli.js all
node test-reporter/cli.js unit
```

### Report Output Location

```
test-reports/
├── test-report-YYYYMMDD-HHMMSS.xlsx
├── test-report-unit-YYYYMMDD-HHMMSS.xlsx
├── test-report-integration-YYYYMMDD-HHMMSS.xlsx
└── test-report-e2e-YYYYMMDD-HHMMSS.xlsx
```

## Jest Configuration

```javascript
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupAfterEnv.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
  coverageDirectory: "tests/coverage",
  reporters: ["default", "<rootDir>/test-reporter/jestReporter.js"],
};
```

## Test Helpers

```javascript
// tests/helpers/testHelpers.js
module.exports = {
  createTestUser, // Create test user
  loginTestUser, // Get auth tokens
  createTestPrediction, // Create prediction record
  cleanupTestData, // Clean up test database
  generateTestImage, // Create test image file
  waitForCondition, // Async wait helper
};
```

## Testing Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Cleanup**: Tests clean up after themselves (database, files)
3. **Mocking**: External services are mocked (AI service, file system)
4. **Coverage**: Aim for 80%+ code coverage
5. **Performance**: Tests run in under 30 seconds
6. **CI/CD Ready**: Tests can run in CI environments
