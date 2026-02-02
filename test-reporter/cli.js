#!/usr/bin/env node

/**
 * Test Reporter CLI - Standalone script to generate test reports
 * Usage: node test-reporter/cli.js [type]
 * Examples:
 *   node test-reporter/cli.js unit
 *   node test-reporter/cli.js integration
 *   node test-reporter/cli.js e2e
 *   node test-reporter/cli.js all
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const TestReporter = require("./testReporter");

class TestReporterCLI {
  constructor() {
    this.testType = process.argv[2] || "all";
    this.testCommand = this.getTestCommand();
  }

  /**
   * Get Jest test command based on type
   */
  getTestCommand() {
    const commands = {
      unit: "test:unit",
      integration: "test:integration",
      e2e: "test:e2e",
      all: "test",
    };

    return commands[this.testType] || commands.all;
  }

  /**
   * Run tests via npm
   */
  runTests() {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === "win32";
      const cmd = isWindows ? "npm.cmd" : "npm";
      const args = ["run", this.testCommand];

      console.log(`🧪 Running ${this.testType} tests...\n`);

      const testProcess = spawn(cmd, args, {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
      });

      testProcess.on("close", (code) => {
        if (code !== 0) {
          console.warn(`⚠️  Tests exited with code ${code}`);
        }
        resolve(code);
      });

      testProcess.on("error", (error) => {
        console.error("Error running tests:", error);
        reject(error);
      });
    });
  }

  /**
   * Generate report after tests complete
   */
  async generateReport() {
    console.log("\n📊 Generating Excel Report...\n");

    try {
      const reporter = new TestReporter();
      await reporter.run();

      // Create symbolic link to latest report
      this.createLatestLink();
    } catch (error) {
      console.error("Error generating report:", error);
    }
  }

  /**
   * Create a symbolic link to the latest report
   */
  createLatestLink() {
    const reportsDir = path.join(process.cwd(), "test-reports");
    const latestLink = path.join(reportsDir, "latest-report.xlsx");

    try {
      const files = fs
        .readdirSync(reportsDir)
        .filter((f) => f.startsWith("test-report-") && f.endsWith(".xlsx"))
        .sort()
        .reverse();

      if (files.length > 0) {
        const latestFile = files[0];
        const latestPath = path.join(reportsDir, latestFile);

        // Remove old link if exists
        if (fs.existsSync(latestLink)) {
          fs.unlinkSync(latestLink);
        }

        // Create relative path for cross-platform compatibility
        const relPath = `./${latestFile}`;
        try {
          fs.symlinkSync(relPath, latestLink);
          console.log(`✅ Latest report link: ${latestLink}`);
        } catch (err) {
          // Symlink might not work on Windows, just copy instead
          fs.copyFileSync(latestPath, latestLink);
          console.log(`✅ Latest report copied: ${latestLink}`);
        }
      }
    } catch (error) {
      console.error("Error creating latest link:", error.message);
    }
  }

  /**
   * Main run method
   */
  async run() {
    console.log("🚀 Test Reporter CLI");
    console.log(`📝 Test Type: ${this.testType}`);
    console.log(`🏃 Command: npm run ${this.testCommand}\n`);

    try {
      // Run tests
      await this.runTests();

      // Generate report
      await this.generateReport();

      console.log(
        "\n✨ All done! Check test-reports folder for Excel files.\n",
      );
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  }
}

// Run CLI
const cli = new TestReporterCLI();
cli.run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
