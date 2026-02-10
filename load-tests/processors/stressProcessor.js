/**
 * Stress Processor
 * Handles setup and response processing for stress load tests
 * Focuses on finding system breaking points
 * CRITICAL: Converts base64 image data to binary for multipart form-data
 */

const fs = require("fs");
const path = require("path");

// Base64-encoded 1px white PNG for testing
const VALID_BASE64_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

module.exports = {
  setup(context, ee, next) {
    console.log("Stress test setup started");
    // Create temp directory for test files
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    context.tempDir = tempDir;
    context.stressMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      responseTimes: [],
      statusCodes: {},
    };
    next();
  },

  beforeRequest(requestParams, context, ee, next) {
    const timestamp = Date.now();
    
    // Add custom headers
    requestParams.headers = requestParams.headers || {};
    requestParams.headers["X-Load-Test"] = "stress";
    requestParams.headers["X-Stress-Test"] = "true";

    // Handle guest prediction endpoint - convert to multipart form-data with binary file
    if (requestParams.url && requestParams.url.includes("/api/guest/predict")) {
      try {
        // Convert base64 image to Buffer and create temp file
        const imageBuffer = Buffer.from(VALID_BASE64_IMAGE, "base64");
        const tempImagePath = path.join(context.tempDir, `test_${timestamp}_${Math.random().toString(36).substr(2, 9)}.png`);
        fs.writeFileSync(tempImagePath, imageBuffer);
        
        // Convert to formData with file upload
        requestParams.formData = {
          image: fs.createReadStream(tempImagePath)
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
        confirmPassword: "TestPassword123!"
      };
    }

    context.stressMetrics.totalRequests++;
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

    // Track response times
    context.stressMetrics.responseTimes.push(response.responseTime);

    // Track status codes
    const statusCode = response.statusCode;
    if (!context.stressMetrics.statusCodes[statusCode]) {
      context.stressMetrics.statusCodes[statusCode] = 0;
    }
    context.stressMetrics.statusCodes[statusCode]++;

    // Track request results
    if (statusCode >= 200 && statusCode < 300) {
      context.stressMetrics.successfulRequests++;
    } else if (statusCode >= 400) {
      if (response.responseTime > 30000) {
        context.stressMetrics.timeoutRequests++;
      } else {
        context.stressMetrics.failedRequests++;
      }
      console.error(
        `Error during stress test: ${statusCode} on ${requestParams.url} (${response.responseTime}ms)`,
      );
    }

    next();
  },

  teardown(context, ee, next) {
    // Cleanup temp directory
    if (context.tempDir && fs.existsSync(context.tempDir)) {
      try {
        const files = fs.readdirSync(context.tempDir);
        files.forEach(file => {
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

    // Calculate statistics
    const avgResponseTime =
      context.stressMetrics.responseTimes.length > 0
        ? context.stressMetrics.responseTimes.reduce((a, b) => a + b, 0) /
          context.stressMetrics.responseTimes.length
        : 0;

    const maxResponseTime = Math.max(...context.stressMetrics.responseTimes, 0);
    const minResponseTime = Math.min(...context.stressMetrics.responseTimes, 0);

    const successRate =
      context.stressMetrics.totalRequests > 0
        ? (
            (context.stressMetrics.successfulRequests /
              context.stressMetrics.totalRequests) *
            100
          ).toFixed(2)
        : 0;

    console.log("\n=== Stress Test Analysis ===");
    console.log(`Total Requests: ${context.stressMetrics.totalRequests}`);
    console.log(`Successful: ${context.stressMetrics.successfulRequests}`);
    console.log(`Failed: ${context.stressMetrics.failedRequests}`);
    console.log(`Timeouts: ${context.stressMetrics.timeoutRequests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`\nResponse Times:`);
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min: ${minResponseTime}ms`);
    console.log(`  Max: ${maxResponseTime}ms`);
    console.log(`\nStatus Codes Distribution:`);
    Object.keys(context.stressMetrics.statusCodes)
      .sort()
      .forEach((code) => {
        const count = context.stressMetrics.statusCodes[code];
        const percentage = (
          (count / context.stressMetrics.totalRequests) *
          100
        ).toFixed(2);
        console.log(`  ${code}: ${count} (${percentage}%)`);
      });

    next();
  },
};
