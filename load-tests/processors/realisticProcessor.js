/**
 * Realistic Processor
 * Handles setup and response processing for realistic scenario load tests
 * Simulates real-world user behavior patterns
 * CRITICAL: Converts base64 image data to binary for multipart form-data
 */

const fs = require("fs");
const path = require("path");

// Base64-encoded 1px white PNG for testing
const VALID_BASE64_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

module.exports = {
  setup(context, ee, next) {
    console.log("Realistic scenario test setup started");
    // Create temp directory for test files
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    context.tempDir = tempDir;
    context.realisticMetrics = {
      totalRequests: 0,
      requestsByEndpoint: {},
      responseTimesByEndpoint: {},
      errorsByEndpoint: {},
      userSessions: 0,
    };
    next();
  },

  beforeRequest(requestParams, context, ee, next) {
    const timestamp = Date.now();

    requestParams.headers = requestParams.headers || {};
    requestParams.headers["X-Load-Test"] = "realistic";
    requestParams.headers["X-Scenario"] = "user-behavior";

    // Simulate user agent diversity
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6) Safari/604.1",
      "Mozilla/5.0 (Linux; Android 11) Chrome/91.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36",
    ];
    requestParams.headers["User-Agent"] =
      userAgents[Math.floor(Math.random() * userAgents.length)];

    // Handle guest prediction endpoint - convert to multipart form-data with binary file
    if (requestParams.url && requestParams.url.includes("/api/guest/predict")) {
      try {
        // Convert base64 image to Buffer and create temp file
        const imageBuffer = Buffer.from(VALID_BASE64_IMAGE, "base64");
        const tempImagePath = path.join(
          context.tempDir,
          `test_${timestamp}_${Math.random().toString(36).substr(2, 9)}.png`,
        );
        fs.writeFileSync(tempImagePath, imageBuffer);

        // Convert to formData with file upload
        requestParams.formData = {
          image: fs.createReadStream(tempImagePath),
        };

        // Remove json property if it exists
        delete requestParams.json;

        // Store path for cleanup after response
        context.lastTempFile = tempImagePath;
      } catch (err) {
        console.error("Error preparing image for upload:", err.message);
      }
    }

    // Handle auth registration - generate unique alphanumeric username with timestamp
    if (requestParams.url && requestParams.url.includes("/api/auth/register")) {
      const randomNum = Math.floor(Math.random() * 100000);
      const uniqueId = `test${timestamp}${randomNum}`.substr(0, 20); // Ensure alphanumeric

      requestParams.json = {
        username: uniqueId,
        email: `${uniqueId}@loadtest.example.com`,
        password: "TestPassword123!",
        confirmPassword: "TestPassword123!",
      };
    }

    context.realisticMetrics.totalRequests++;
    next();
  },

  afterResponse(requestParams, response, context, ee, next) {
    // Cleanup temp files
    if (context.lastTempFile && fs.existsSync(context.lastTempFile)) {
      try {
        fs.unlinkSync(context.lastTempFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    const endpoint = requestParams.url.split("?")[0]; // Remove query params

    // Track by endpoint
    if (!context.realisticMetrics.requestsByEndpoint[endpoint]) {
      context.realisticMetrics.requestsByEndpoint[endpoint] = 0;
      context.realisticMetrics.responseTimesByEndpoint[endpoint] = [];
      context.realisticMetrics.errorsByEndpoint[endpoint] = 0;
    }

    context.realisticMetrics.requestsByEndpoint[endpoint]++;
    context.realisticMetrics.responseTimesByEndpoint[endpoint].push(
      response.responseTime,
    );

    // Track errors
    if (response.statusCode >= 400) {
      context.realisticMetrics.errorsByEndpoint[endpoint]++;
    }

    // Log notable events
    if (response.statusCode >= 500) {
      console.error(
        `Server error: ${requestParams.url} - ${response.statusCode}`,
      );
    }

    if (response.responseTime > 5000) {
      console.warn(
        `Slow response: ${endpoint} took ${response.responseTime}ms`,
      );
    }

    next();
  },

  teardown(context, ee, next) {
    // Cleanup temp directory
    if (context.tempDir && fs.existsSync(context.tempDir)) {
      try {
        const files = fs.readdirSync(context.tempDir);
        files.forEach((file) => {
          try {
            fs.unlinkSync(path.join(context.tempDir, file));
          } catch (err) {
            // Ignore individual file cleanup errors
          }
        });
        fs.rmdirSync(context.tempDir);
      } catch (err) {
        // Ignore directory cleanup errors
      }
    }

    console.log("\n=== Realistic Scenario Analysis ===");
    console.log(`Total Requests: ${context.realisticMetrics.totalRequests}`);

    console.log("\nEndpoint Breakdown:");
    Object.keys(context.realisticMetrics.requestsByEndpoint).forEach(
      (endpoint) => {
        const count = context.realisticMetrics.requestsByEndpoint[endpoint];
        const times =
          context.realisticMetrics.responseTimesByEndpoint[endpoint];
        const errors = context.realisticMetrics.errorsByEndpoint[endpoint];

        const avgTime =
          times.length > 0
            ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)
            : 0;

        const maxTime = Math.max(...times, 0);
        const errorRate = ((errors / count) * 100).toFixed(2);

        console.log(`\n  ${endpoint}`);
        console.log(`    Requests: ${count}`);
        console.log(`    Avg Response: ${avgTime}ms`);
        console.log(`    Max Response: ${maxTime}ms`);
        console.log(`    Errors: ${errors} (${errorRate}%)`);
      },
    );

    next();
  },
};
