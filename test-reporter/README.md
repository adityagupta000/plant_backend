# Test Reporter - Automated Excel Report Generation

Automatically generates professional Excel reports with detailed test cases and bug reports after each test run.

## Features

✅ **Executive Summary** - High-level overview of test execution results
✅ **Test Cases Sheet** - Detailed test cases with ID, name, module, priority, and status
✅ **Bug Reports Sheet** - Professional bug reports with severity, priority, and environment details
✅ **Color-Coded Status** - Visual indicators for passed (green), failed (red), and skipped (yellow) tests
✅ **Severity Levels** - Color-coded bugs by severity (Critical=Red, High=Orange-Red, Major=Orange, Minor=Yellow)
✅ **Auto-Generation** - Runs automatically after tests complete
✅ **Filterable Columns** - Easy data filtering and sorting
✅ **Professional Format** - Business-ready report format

## Output Format

### Executive Summary Sheet

- Report generation timestamp
- Total test count and pass rate
- Bug summary by severity level

### Test Cases Sheet

```
Test Case ID | Test Case Name | Module | Priority | Status | Duration | Error/Notes
TC_001       | Login test     | Auth   | High     | PASSED | 125ms    | -
TC_002       | Upload test    | Upload | High     | FAILED | 250ms    | Timeout error
```

### Bug Reports Sheet

```
Bug ID          | Title              | Severity | Priority | Status | Date       | Description
BUG-2026-001    | Login failed       | Critical | High     | New    | 02/02/2026 | Test failed...
BUG-2026-002    | Console warning    | Minor    | Low      | New    | 02/02/2026 | Console.log found...
```

## Installation

Already included! Just ensure `exceljs` is installed:

```bash
npm install exceljs
```

## Usage

### Option 1: Automatic (Recommended)

Tests automatically generate reports using:

```bash
# Run all tests and generate report
npm run test:report

# Run unit tests only
npm run test:unit:report

# Run integration tests only
npm run test:integration:report

# Run e2e tests only
npm run test:e2e:report
```

### Option 2: Manual CLI

Generate a report for any test type manually:

```bash
# Generate report for all tests
node test-reporter/cli.js all

# Generate report for unit tests only
node test-reporter/cli.js unit

# Generate report for integration tests only
node test-reporter/cli.js integration

# Generate report for e2e tests only
node test-reporter/cli.js e2e
```

### Option 3: Direct Import

Use the reporter in your own code:

```javascript
const TestReporter = require("./test-reporter/testReporter");

const reporter = new TestReporter();
reporter.parseTestResults();
reporter.scanForBugs();
await reporter.generateExcelReport();
```

## Output Location

Reports are saved to: `test-reports/TestReport-{timestamp}.xlsx`

Latest report is accessible at: `test-reports/latest-report.xlsx`

## Report Details

### Severity Levels

| Level    | Color      | Meaning                   |
| -------- | ---------- | ------------------------- |
| Critical | Red        | Must fix immediately      |
| High     | Orange-Red | Should fix soon           |
| Major    | Orange     | Fix in normal workflow    |
| Minor    | Yellow     | Nice to have improvements |

### Test Status Colors

| Status  | Color  | Meaning                    |
| ------- | ------ | -------------------------- |
| PASSED  | Green  | Test executed successfully |
| FAILED  | Red    | Test execution failed      |
| SKIPPED | Yellow | Test was skipped           |

### Bug Detection

The reporter identifies:

**Test Failures**:

- Failed test cases with error messages
- Execution duration and timing issues

**Code Quality Issues**:

- TODO/FIXME comments
- Console.log/warn/error statements
- Empty catch blocks
- Loose equality checks

**Security Issues**:

- Hardcoded passwords/secrets
- Hardcoded API keys
- Command injection risks

## Module Mapping

The reporter automatically maps test suites to modules:

- `auth` → Authentication
- `prediction` → Prediction Engine
- `guest` → Guest Features
- `history` → History Management
- `upload` → File Upload
- `middleware` → Middleware

## Configuration

To customize the reporter, edit `test-reporter/testReporter.js`:

```javascript
// Add new issue patterns
const issuePatterns = [
  { pattern: /YOUR_PATTERN/g, type: "Issue Type", severity: "Level" },
];

// Add new security patterns
const securityPatterns = [
  { pattern: /YOUR_PATTERN/gi, type: "Security Issue", severity: "Severity" },
];
```

## Integration with CI/CD

Add to GitHub Actions:

```yaml
- name: Generate Test Report
  run: npm run test:report

- name: Upload Report Artifact
  uses: actions/upload-artifact@v2
  with:
    name: test-reports
    path: test-reports/
```

## Example Report Structure

```
TestReport-2026-02-02-18-30-00.xlsx
├── Executive Summary
│   ├── Report Generated: 02/02/2026 18:30:00
│   ├── Total Tests: 101
│   ├── Passed: 96
│   ├── Failed: 5
│   ├── Pass Rate: 95%
│   └── Total Bugs: 12
├── Test Cases
│   ├── TC_001 - Login test (PASSED)
│   ├── TC_002 - Upload test (FAILED)
│   └── ... more test cases
└── Bug Reports
    ├── BUG-2026-001 - Test failed (Critical)
    ├── BUG-2026-002 - Console warning (Minor)
    └── ... more bug reports
```

## Troubleshooting

**Report not generating?**

- Check that `test-reports/` directory is created
- Ensure Jest test results are properly formatted
- Check console for error messages

**Excel file is corrupt?**

- Make sure exceljs is properly installed
- Try deleting test-reports folder and regenerating
- Check for file permissions

**Missing test results?**

- Verify tests are actually running
- Check Jest output for failures
- Ensure `tests/test-results.json` is being created

## Performance

Report generation typically takes 1-3 seconds depending on:

- Number of test files
- Codebase size
- Number of issues found

Reports are lightweight (usually 50-200 KB).

## Files

- `testReporter.js` - Main report generation logic
- `jestReporter.js` - Jest reporter integration
- `cli.js` - Command-line interface
- `README.md` - This file

## Future Enhancements

Potential additions:

- Historical trend tracking (compare reports over time)
- Dashboard visualization
- PDF export
- Email notifications
- Performance metrics
- Mutation testing integration
- Coverage trend analysis
- Screenshots attachment
