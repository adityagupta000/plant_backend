/**
 * Jest Reporter - Custom Reporter to capture test results
 * Automatically called by Jest during test runs
 */

const fs = require("fs");
const path = require("path");

class CustomTestReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
  }

  /**
   * Called when all tests finish
   */
  onRunComplete(contexts, results) {
    // Save test results to JSON file
    const resultsPath = path.join(process.cwd(), "tests", "test-results.json");
    const testsDir = path.dirname(resultsPath);

    // Ensure directory exists
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    // Write results file
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Now trigger the test reporter
    try {
      const TestReporter = require("./testReporter");
      const reporter = new TestReporter();
      reporter.run().catch((err) => {
        console.error("Error generating test report:", err);
      });
    } catch (error) {
      console.error("Failed to generate test report:", error.message);
    }
  }
}

module.exports = CustomTestReporter;
