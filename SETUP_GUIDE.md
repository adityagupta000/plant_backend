# 🎯 Jest + Supertest Migration - Complete Setup Guide

## 📋 What Was Changed

This migration replaces Mocha/Chai with Jest/Supertest for a modern, faster, and more feature-rich testing experience.

### Files Created/Modified

```
backend/
├── jest.config.js                  # NEW - Jest configuration
├── quick-start-tests.sh            # NEW - Quick setup script
├── MIGRATION_GUIDE.md              # NEW - Migration documentation
│
└── tests/
    ├── package.json                # NEW - Test dependencies
    ├── setup.js                    # NEW - Jest setup
    ├── globalSetup.js              # NEW - Pre-test initialization
    ├── globalTeardown.js           # NEW - Post-test cleanup
    ├── .gitignore                  # NEW - Test gitignore
    ├── README.md                   # NEW - Comprehensive docs
    │
    ├── helpers/
    │   └── testHelpers.js          # NEW - Reusable test utilities
    │
    ├── unit/
    │   ├── auth.test.js            # MIGRATED - 15 tests
    │   ├── prediction.test.js      # MIGRATED - 8 tests
    │   ├── guest.test.js           # MIGRATED - 7 tests
    │   └── history.test.js         # MIGRATED - 12 tests
    │
    ├── integration/
    │   └── userWorkflow.test.js    # MIGRATED - 3 tests
    │
    └── e2e/
        └── system.test.js          # MIGRATED - 10 tests
```

---

## 🚀 Installation Steps

### Method 1: Quick Start (Recommended)

```bash
# Make script executable
chmod +x quick-start-tests.sh

# Run setup script
./quick-start-tests.sh
```

This script will:
1. ✅ Install backend dependencies
2. ✅ Install test dependencies
3. ✅ Check for test image
4. ✅ Verify backend is running
5. ✅ Run all tests

### Method 2: Manual Installation

```bash
# 1. Install backend dependencies
npm install

# 2. Install test dependencies
cd tests
npm install

# 3. Create test data directory
cd ..
mkdir -p test-data

# 4. Add test image (optional but recommended)
# Copy a plant image to: test-data/test-plant.jpg

# 5. Start backend (in another terminal)
npm start

# 6. Run tests
cd tests
npm test
```

---

## 📦 New Dependencies

### Production Dependencies (None Added)
No changes to production dependencies.

### Development Dependencies (In tests/package.json)

```json
{
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "jest-extended": "^4.0.2",
    "jest-html-reporter": "^3.10.2"
  }
}
```

**Install with:**
```bash
cd tests
npm install
```

---

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

Located in backend root directory:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'tests/coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
};
```

### Environment Variables

Optional `.env` in tests directory:

```bash
TEST_API_URL=http://localhost:5000
TEST_IMAGE=../test-data/test-plant.jpg
NODE_ENV=test
```

---

## 🧪 Running Tests

### All Tests
```bash
cd tests
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Suites
```bash
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # E2E tests only
npm run test:auth          # Auth tests only
npm run test:prediction    # Prediction tests only
npm run test:guest         # Guest tests only
npm run test:history       # History tests only
```

### Debug Mode
```bash
npm run test:debug
```

### CI/CD Mode
```bash
npm run test:ci
```

---

## 📊 Test Coverage

### View Coverage Report

After running `npm run test:coverage`:

```bash
# Open HTML report
open tests/coverage/lcov-report/index.html

# Or on Linux
xdg-open tests/coverage/lcov-report/index.html

# Or on Windows
start tests/coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThresholds: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

---

## 🎯 Test Summary

### Total Tests: 55

#### Unit Tests (42 tests)
- ✅ auth.test.js - 15 tests
- ✅ prediction.test.js - 8 tests
- ✅ guest.test.js - 7 tests
- ✅ history.test.js - 12 tests

#### Integration Tests (3 tests)
- ✅ userWorkflow.test.js - 3 tests

#### E2E Tests (10 tests)
- ✅ system.test.js - 10 tests

---

## 🐛 Troubleshooting

### Issue: Tests fail with "Cannot find module"

**Solution:**
```bash
cd tests
npm install
```

### Issue: "ECONNREFUSED" error

**Solution:**
Backend is not running. Start it:
```bash
npm start
```

### Issue: "Test image not found"

**Solution:**
Some prediction tests will be skipped. To add test image:
```bash
mkdir -p test-data
cp /path/to/your/plant/image.jpg test-data/test-plant.jpg
```

### Issue: Tests timeout

**Solution:**
Increase timeout in specific test:
```javascript
it('slow test', async () => {
  // test code
}, 60000); // 60 seconds
```

Or globally in `jest.config.js`:
```javascript
testTimeout: 60000
```

### Issue: Port already in use

**Solution:**
Change test port in `tests/setup.js`:
```javascript
process.env.PORT = '5002'; // Different port
```

### Issue: Database locked

**Solution:**
Stop all running instances:
```bash
pkill -f "node.*server.js"
npm start
```

---

## ✨ New Features Available

### 1. Snapshot Testing
```javascript
it('should match snapshot', () => {
  expect(data).toMatchSnapshot();
});
```

### 2. Mocking
```javascript
jest.mock('../../src/services/ai.service');
```

### 3. Test Each
```javascript
test.each([
  ['email1@test.com', 'Pass1'],
  ['email2@test.com', 'Pass2'],
])('should login %s', async (email, pass) => {
  // test code
});
```

### 4. Better Async
```javascript
it('async test', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

---

## 📚 Documentation

- **README.md** - Complete testing guide
- **MIGRATION_GUIDE.md** - Migration from Mocha/Chai
- **This file** - Setup and installation

---

## 🎉 Benefits of Jest + Supertest

### Compared to Mocha/Chai:

✅ **Faster** - Up to 2x faster test execution
✅ **Simpler** - One framework instead of three (Mocha + Chai + NYC)
✅ **Better DX** - Superior error messages and debugging
✅ **Built-in Coverage** - No need for NYC
✅ **Built-in Mocking** - No need for Sinon
✅ **More Features** - Snapshots, parallel tests, watch mode
✅ **Industry Standard** - Used by React, Vue, Angular
✅ **Active Development** - Regular updates and improvements

---

## 🚀 Next Steps

1. **Run tests** - `cd tests && npm test`
2. **Check coverage** - `npm run test:coverage`
3. **Read README** - `cat tests/README.md`
4. **Add more tests** - Follow existing patterns
5. **Integrate CI/CD** - Use `npm run test:ci`

---

## 🤝 Contributing

When adding new tests:

1. ✅ Use appropriate test directory (unit/integration/e2e)
2. ✅ Follow existing naming conventions (*.test.js)
3. ✅ Use test helpers from `testHelpers.js`
4. ✅ Add descriptive test names
5. ✅ Ensure tests are independent
6. ✅ Run all tests before committing
7. ✅ Update documentation if needed

---

## 📞 Support

If you encounter issues:

1. Check the error message carefully
2. Review this guide and README.md
3. Check existing tests for examples
4. Ensure backend is running
5. Verify all dependencies installed

---

**Happy Testing! 🧪**

Your test suite is now powered by Jest + Supertest!