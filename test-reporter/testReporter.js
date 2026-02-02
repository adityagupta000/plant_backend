/**
 * Test Reporter - Generates Excel Reports with Detailed Test Cases and Bug Reports
 * Automatically runs after tests complete
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

class TestReporter {
  constructor() {
    this.reportPath = path.join(__dirname, "../test-reports");
    this.timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("-")
      .slice(0, -1)
      .join("-");
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      suites: {},
    };
    this.bugs = [];
    this.coverage = {};

    // Ensure report directory exists
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }
  }

  /**
   * Parse Jest test results from coverage and logs
   */
  parseTestResults() {
    try {
      const coveragePath = path.join(
        __dirname,
        "../tests/coverage/coverage-final.json",
      );
      const logPath = path.join(__dirname, "../tests/test-results.json");

      // Try to read coverage data
      if (fs.existsSync(coveragePath)) {
        this.coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
      }

      // Try to read test results from Jest JSON reporter
      if (fs.existsSync(logPath)) {
        const results = JSON.parse(fs.readFileSync(logPath, "utf8"));
        this.parseJestResults(results);
      }
    } catch (error) {
      console.error("Error parsing test results:", error.message);
    }
  }

  /**
   * Parse Jest JSON results
   */
  parseJestResults(results) {
    results.testResults?.forEach((suite, suiteIndex) => {
      // Use testFilePath if available, otherwise name
      const suiteFile =
        suite.testFilePath || suite.name || `Suite ${suiteIndex}`;
      const suiteName = path.relative(process.cwd(), suiteFile);

      this.testResults.suites[suiteName] = {
        passed: suite.numPassingTests || 0,
        failed: suite.numFailingTests || 0,
        skipped: suite.numPendingTests || 0,
        tests: [],
      };

      // Use testResults array instead of assertionResults
      const testsArray = suite.testResults || suite.assertionResults || [];
      testsArray.forEach((test, testIndex) => {
        const testItem = {
          id: `TC_${String(suiteIndex + 1).padStart(2, "0")}_${String(testIndex + 1).padStart(2, "0")}`,
          name: test.title || "Unnamed test",
          status: test.status,
          duration: test.duration,
          suite: suiteName,
          error: test.failureMessages?.[0] || null,
          fullName: test.fullName || test.title,
        };

        this.testResults.tests.push(testItem);
        this.testResults.suites[suiteName].tests.push(testItem);

        if (test.status === "passed") this.testResults.passed++;
        if (test.status === "failed") this.testResults.failed++;
        if (test.status === "pending") this.testResults.skipped++;

        // Create bug report for failed tests
        if (test.status === "failed") {
          this.bugs.push({
            id: `BUG-${new Date().getFullYear()}-${String(this.bugs.length + 1).padStart(3, "0")}`,
            title: test.title,
            testCaseId: testItem.id,
            severity: "High",
            priority: "High",
            status: "New",
            environment: this.getEnvironmentInfo(),
            description: test.failureMessages?.[0] || "Test failed",
            steps: this.extractStepsFromTest(test.fullName),
            expectedResult: "Test should pass",
            actualResult: test.failureMessages?.[0] || "Test execution failed",
            workaround: "Re-run test or check codebase",
            reportedDate: new Date().toLocaleDateString(),
          });
        }
      });
    });
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      os: process.platform,
      nodeVersion: process.version,
      testFramework: "Jest",
      timestamp: new Date().toLocaleString(),
    };
  }

  /**
   * Extract test steps from test name
   */
  extractStepsFromTest(fullName) {
    const steps = [];
    const parts = fullName.split(" ");

    // Create meaningful steps from test name
    steps.push({
      number: 1,
      action: "Execute test: " + fullName.substring(0, 50),
      expectedResult: "Test should execute without errors",
    });

    return steps;
  }

  /**
   * Scan codebase for potential bugs and issues
   */
  scanForBugs() {
    const srcDir = path.join(__dirname, "../src");
    const issues = [];

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith(".js")) {
          const content = fs.readFileSync(fullPath, "utf8");
          const relativePath = path.relative(process.cwd(), fullPath);

          // Check for common issues
          const issuePatterns = [
            {
              pattern: /TODO|FIXME|BUG|HACK/g,
              type: "TODO/FIXME",
              severity: "Minor",
            },
            {
              pattern: /console\.(log|warn|error)/g,
              type: "Console Statement",
              severity: "Minor",
            },
            {
              pattern: /try\s*{[^}]*}\s*catch\s*\(\s*\)\s*{}/g,
              type: "Empty Catch Block",
              severity: "Major",
            },
            {
              pattern: /=== undefined|== null/g,
              type: "Loose Equality",
              severity: "Major",
            },
            { pattern: /eval\s*\(/g, type: "Eval Usage", severity: "Critical" },
            {
              pattern: /require\s*\(['"]\$\{/g,
              type: "Dynamic Require",
              severity: "Major",
            },
          ];

          issuePatterns.forEach(({ pattern, type, severity }) => {
            let match;
            const regex = new RegExp(pattern);
            while ((match = regex.exec(content)) !== null) {
              const line = content.substring(0, match.index).split("\n").length;
              issues.push({
                file: relativePath,
                line,
                type,
                severity,
                code: content.substring(match.index, match.index + 50).trim(),
              });
            }
          });

          // Check for security issues
          this.checkSecurityIssues(content, relativePath, issues);
        }
      });
    };

    scanDir(srcDir);

    // Convert code issues to bug reports
    issues.forEach((issue, index) => {
      if (!this.bugs.find((b) => b.title === issue.type)) {
        this.bugs.push({
          id: `BUG-${new Date().getFullYear()}-${String(this.bugs.length + 1).padStart(3, "0")}`,
          title: `${issue.type} found in ${path.basename(issue.file)}`,
          severity: issue.severity,
          priority: this.getPriorityFromSeverity(issue.severity),
          status: "New",
          environment: { file: issue.file, line: issue.line },
          description: `${issue.type} detected at line ${issue.line}`,
          steps: [
            {
              number: 1,
              action: `Review code at ${issue.file}:${issue.line}`,
              expectedResult: "Issue should be fixed",
            },
          ],
          expectedResult: "Code should follow best practices",
          actualResult: `Issue found: ${issue.code}`,
          workaround: "Manual code review required",
          reportedDate: new Date().toLocaleDateString(),
        });
      }
    });
  }

  /**
   * Check for security vulnerabilities
   */
  checkSecurityIssues(content, filePath, issues) {
    const securityPatterns = [
      {
        pattern: /password\s*[:=]\s*['"][^'"]*['"]/gi,
        type: "Hardcoded Password",
        severity: "Critical",
      },
      {
        pattern: /secret\s*[:=]\s*['"][^'"]*['"]/gi,
        type: "Hardcoded Secret",
        severity: "Critical",
      },
      {
        pattern: /api[_-]?key\s*[:=]\s*['"][^'"]*['"]/gi,
        type: "Hardcoded API Key",
        severity: "Critical",
      },
    ];

    securityPatterns.forEach(({ pattern, type, severity }) => {
      if (pattern.test(content)) {
        issues.push({
          file: filePath,
          line: 0,
          type,
          severity,
          code: "Security issue detected",
        });
      }
    });
  }

  /**
   * Get priority from severity
   */
  getPriorityFromSeverity(severity) {
    const priorityMap = {
      Critical: "High",
      High: "High",
      Major: "Medium",
      Medium: "Medium",
      Minor: "Low",
      Low: "Low",
    };
    return priorityMap[severity] || "Medium";
  }

  /**
   * Generate comprehensive Excel report
   */
  async generateExcelReport() {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = "Test Reporter";
    workbook.title = "Test Execution Report";
    workbook.lastModifiedBy = "Test Reporter";

    // Add Summary Sheet
    this.addSummarySheet(workbook);

    // Add Test Cases Sheet
    this.addTestCasesSheet(workbook);

    // Add Bug Reports Sheet
    this.addBugReportsSheet(workbook);

    // Save the workbook
    const fileName = `TestReport-${this.timestamp}.xlsx`;
    const filePath = path.join(this.reportPath, fileName);
    await workbook.xlsx.writeFile(filePath);

    console.log(`✅ Test report generated: ${filePath}`);
    return filePath;
  }

  /**
   * Add Summary Sheet
   */
  addSummarySheet(workbook) {
    const sheet = workbook.addWorksheet("Executive Summary", {
      state: "visible",
    });
    sheet.pageSetup = { paperSize: 9, orientation: "portrait" };

    // Header styling
    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    const headerFont = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };

    sheet.columns = [{ width: 35 }, { width: 25 }];

    // Title
    let row = sheet.addRow(["TEST EXECUTION SUMMARY REPORT", ""]);
    row.getCell(1).font = headerFont;
    row.getCell(1).fill = headerFill;
    row.getCell(1).alignment = { horizontal: "left", vertical: "center" };

    // Timestamp
    sheet.addRow(["Report Generated", new Date().toLocaleString()]);
    sheet.addRow([""]);

    // Statistics
    const total =
      this.testResults.passed +
      this.testResults.failed +
      this.testResults.skipped;
    const passRate =
      total > 0 ? ((this.testResults.passed / total) * 100).toFixed(2) : 0;

    const stats = [
      ["Total Test Cases", total],
      ["Passed", this.testResults.passed],
      ["Failed", this.testResults.failed],
      ["Skipped", this.testResults.skipped],
      ["Pass Rate", `${passRate}%`],
      [""],
      ["Total Bugs Found", this.bugs.length],
      [
        "Critical Bugs",
        this.bugs.filter((b) => b.severity === "Critical").length,
      ],
      [
        "High Priority Bugs",
        this.bugs.filter((b) => b.priority === "High").length,
      ],
    ];

    stats.forEach(([label, value]) => {
      const row = sheet.addRow([label, value]);
      if (label === "") {
        row.height = 5;
      } else {
        row.getCell(1).font = { bold: true };
      }
    });
  }

  /**
   * Add Test Cases Sheet
   */
  addTestCasesSheet(workbook) {
    const sheet = workbook.addWorksheet("Test Cases", { state: "visible" });
    sheet.pageSetup = { paperSize: 9, orientation: "landscape" };

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    const headerFont = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    const border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    sheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 20 },
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Test Case ID",
      "Test Case Name",
      "Module",
      "Priority",
      "Status",
      "Duration (ms)",
      "Error/Notes",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      };
      cell.border = border;
    });

    // Add test cases
    if (
      this.testResults.tests &&
      Array.isArray(this.testResults.tests) &&
      this.testResults.tests.length > 0
    ) {
      this.testResults.tests.forEach((test, index) => {
        const row = sheet.addRow([
          test.id,
          test.name,
          this.getModuleFromSuite(test.suite),
          "High",
          (test.status || "unknown").toUpperCase(),
          test.duration || 0,
          test.error ? test.error.substring(0, 100) : "N/A",
        ]);

        // Color code status
        const statusCell = row.getCell(5);
        if (test.status === "passed") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE2EFDA" },
          };
          statusCell.font = { color: { argb: "FF00B050" }, bold: true };
        } else if (test.status === "failed") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFCF3F3" },
          };
          statusCell.font = { color: { argb: "FFFF0000" }, bold: true };
        } else {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF2CC" },
          };
          statusCell.font = { color: { argb: "FF997300" }, bold: true };
        }

        row.eachCell((cell) => {
          cell.border = border;
          cell.alignment = {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          };
        });
      });
    }

    // Apply filters - safely
    try {
      const rowCount = sheet.rowCount;
      if (rowCount && rowCount > 1 && sheet && sheet.autoFilter) {
        sheet.autoFilter.from = "A1";
        sheet.autoFilter.to = `G${rowCount}`;
      }
    } catch (filterError) {
      // Silently skip if filter application fails
    }
  }

  addBugReportsSheet(workbook) {
    const sheet = workbook.addWorksheet("Bug Reports", { state: "visible" });
    if (!sheet) return;

    sheet.pageSetup = { paperSize: 9, orientation: "landscape" };

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    const headerFont = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    const border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    sheet.columns = [
      { width: 12 },
      { width: 35 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 30 },
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Bug ID",
      "Title",
      "Severity",
      "Priority",
      "Status",
      "Reported Date",
      "Description",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      };
      cell.border = border;
    });

    // Add bugs
    if (this.bugs && Array.isArray(this.bugs) && this.bugs.length > 0) {
      this.bugs.forEach((bug) => {
        const row = sheet.addRow([
          bug.id,
          bug.title,
          bug.severity,
          bug.priority,
          bug.status,
          bug.reportedDate || new Date().toLocaleDateString(),
          bug.description ? bug.description.substring(0, 100) : "N/A",
        ]);

        // Color code by severity
        const severityCell = row.getCell(3);
        let severityColor = { argb: "FFFFEAA7" }; // Yellow
        if (bug.severity === "Critical") {
          severityColor = { argb: "FFFF0000" };
          severityCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        } else if (bug.severity === "High") {
          severityColor = { argb: "FFFF9999" };
          severityCell.font = { bold: true };
        } else if (bug.severity === "Major") {
          severityColor = { argb: "FFFFE699" };
          severityCell.font = { bold: true };
        }
        severityCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: severityColor,
        };

        row.eachCell((cell) => {
          cell.border = border;
          cell.alignment = {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          };
        });
      });
    }

    // Apply filters - safely
    try {
      const rowCount = sheet.rowCount;
      if (rowCount && rowCount > 1 && sheet && sheet.autoFilter) {
        sheet.autoFilter.from = "A1";
        sheet.autoFilter.to = `G${rowCount}`;
      }
    } catch (filterError) {
      // Silently skip if filter application fails
    }
  }

  /**
   * Get module name from test suite
   */
  getModuleFromSuite(suite) {
    const moduleMap = {
      auth: "Authentication",
      prediction: "Prediction Engine",
      guest: "Guest Features",
      history: "History Management",
      upload: "File Upload",
      middleware: "Middleware",
    };

    for (const [key, value] of Object.entries(moduleMap)) {
      if (suite.includes(key)) return value;
    }

    return "General";
  }

  /**
   * Main run method
   */
  async run() {
    console.log("\n📊 Generating Test Report...\n");

    this.parseTestResults();
    this.scanForBugs();

    await this.generateExcelReport();

    console.log("\n✅ Test Report Generation Complete!\n");
    console.log(`📈 Summary:`);
    console.log(`   - Passed: ${this.testResults.passed}`);
    console.log(`   - Failed: ${this.testResults.failed}`);
    console.log(`   - Skipped: ${this.testResults.skipped}`);
    console.log(`   - Bugs Found: ${this.bugs.length}\n`);
  }
}

module.exports = TestReporter;
