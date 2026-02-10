/**
 * Spike Processor
 * Handles setup and response processing for spike load tests
 * Monitors system recovery after sudden traffic spikes
 * CRITICAL: Converts base64 image data to binary for multipart form-data
 */

const fs = require("fs");
const path = require("path");

// Base64-encoded 1px white PNG for testing
const VALID_BASE64_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

module.exports = {
  setup(context, ee, next) {
    console.log("Spike test setup started");
    // Create temp directory for test files
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    context.tempDir = tempDir;
    context.spikeMetrics = {
      totalRequests: 0,
      failedRequests: 0,
      slowResponses: 0,
      peakResponseTime: 0,
    };
    next();
  },

  beforeRequest(requestParams, context, ee, next) {
    const timestamp = Date.now();

    // Add custom headers
    requestParams.headers = requestParams.headers || {};
    requestParams.headers["X-Load-Test"] = "spike";
    requestParams.headers["X-Test-Type"] = "traffic-spike";

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

    context.spikeMetrics.totalRequests++;
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

    // Track failures during spikes
    if (response.statusCode >= 400) {
      context.spikeMetrics.failedRequests++;
      console.warn(
        `Failed request during spike: ${requestParams.url} - ${response.statusCode}`,
      );
    }

    // Track slow responses
    if (response.responseTime > 3000) {
      context.spikeMetrics.slowResponses++;
      console.warn(
        `Slow response during spike: ${response.responseTime}ms on ${requestParams.url}`,
      );
    }

    // Track peak response time
    if (response.responseTime > context.spikeMetrics.peakResponseTime) {
      context.spikeMetrics.peakResponseTime = response.responseTime;
    }

    next();
  },

  teardown(context, ee, next) {
    console.log("\n=== Spike Test Metrics ===");
    console.log(`Total Requests: ${context.spikeMetrics.totalRequests}`);
    console.log(`Failed Requests: ${context.spikeMetrics.failedRequests}`);
    console.log(`Slow Responses (>3s): ${context.spikeMetrics.slowResponses}`);
    console.log(
      `Peak Response Time: ${context.spikeMetrics.peakResponseTime}ms`,
    );
    console.log(
      `Failure Rate: ${((context.spikeMetrics.failedRequests / context.spikeMetrics.totalRequests) * 100).toFixed(2)}%`,
    );
    next();
  },
};
