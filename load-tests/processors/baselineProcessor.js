/**
 * Baseline Processor
 * Handles setup and response processing for baseline load tests
 * CRITICAL: Converts base64 image data to binary for multipart form-data
 */

const fs = require("fs");
const path = require("path");

// Base64-encoded 1px white PNG for testing
const VALID_BASE64_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

module.exports = {
  // Called before the test starts
  setup(context, ee, next) {
    console.log("Baseline test setup started");
    // Create temp directory for test files
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    context.tempDir = tempDir;
    next();
  },

  // Called for each request before it's sent
  beforeRequest(requestParams, context, ee, next) {
    const timestamp = Date.now();

    // Add custom headers
    requestParams.headers = requestParams.headers || {};
    requestParams.headers["X-Load-Test"] = "baseline";
    requestParams.headers["User-Agent"] = "Artillery-LoadTest/1.0";

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

    next();
  },

  // Called after each response
  afterResponse(requestParams, response, context, ee, next) {
    // Cleanup temp files
    if (context.lastTempFile && fs.existsSync(context.lastTempFile)) {
      try {
        fs.unlinkSync(context.lastTempFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    // Log slow responses
    if (response.statusCode >= 500) {
      console.error(
        `Server error on ${requestParams.url}: ${response.statusCode}`,
      );
    }

    if (response.responseTime > 5000) {
      console.warn(
        `Slow response on ${requestParams.url}: ${response.responseTime}ms`,
      );
    }

    next();
  },

  // Called at the end of the test
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
    console.log("Baseline test completed");
    next();
  },
};
