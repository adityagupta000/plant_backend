/**
 * Guest Prediction Testing Script
 * Tests rate limiting and feature gating
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:5000";
const TEST_IMAGE = process.env.TEST_IMAGE || "./test-images/sample.jpg";

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkSystemHealth() {
  log("\n=== Checking System Health ===", "cyan");
  try {
    const response = await axios.get(`${API_URL}/api/system/health`);
    const health = response.data;

    log(
      `Status: ${health.status}`,
      health.status === "operational" ? "green" : "yellow"
    );
    log(`Database: ${health.services.database.status}`);
    log(`Redis: ${health.services.redis.status}`);
    log(`AI Service: ${health.services.ai_service.status}`);
    log(`AI Workers: ${health.services.ai_service.workers}`);

    return health;
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    return null;
  }
}

async function checkRedisStatus() {
  log("\n=== Checking Redis Status ===", "cyan");
  try {
    const response = await axios.get(`${API_URL}/api/system/redis-status`);
    const status = response.data.redis;

    log(
      `Overall Status: ${status.overall_status}`,
      status.overall_status === "connected" ? "green" : "yellow"
    );
    log(`Guest Limiter: ${status.guest_limiter.storageType}`);
    log(`Rate Limiter: ${status.rate_limiter.storageType}`);

    if (status.guest_limiter.test_result) {
      log(`Guest Limiter Test: ${status.guest_limiter.test_result.message}`);
    }

    return status;
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    return null;
  }
}

async function checkGuestStats() {
  log("\n=== Checking Guest Statistics ===", "cyan");
  try {
    const response = await axios.get(`${API_URL}/api/system/guest-stats`);
    const stats = response.data;

    log(`Storage Type: ${stats.storage_type}`);
    log(`Redis Connected: ${stats.redis_connected}`);

    if (stats.memory_store_stats) {
      log("\nMemory Store Stats:");
      log(`  Fingerprints: ${stats.memory_store_stats.fingerprints || 0}`);
      log(`  IPs: ${stats.memory_store_stats.ips || 0}`);
      log(`  Sessions: ${stats.memory_store_stats.sessions || 0}`);
    }

    return stats;
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    return null;
  }
}

async function makeGuestPrediction(attemptNumber) {
  log(`\n--- Guest Prediction Attempt #${attemptNumber} ---`, "blue");

  if (!fs.existsSync(TEST_IMAGE)) {
    log(`Test image not found: ${TEST_IMAGE}`, "red");
    return null;
  }

  try {
    const form = new FormData();
    form.append("image", fs.createReadStream(TEST_IMAGE));

    const response = await axios.post(`${API_URL}/api/guest/predict`, form, {
      headers: form.getHeaders(),
    });

    const result = response.data;

    log(`✓ Prediction successful`, "green");
    log(`Predicted Class: ${result.prediction.predicted_class}`);
    log(`Confidence: ${result.prediction.confidence_percentage.toFixed(2)}%`);
    log(`Confidence Level: ${result.prediction.confidence_level}`);

    // Usage tracking
    if (result.usage) {
      log("\nUsage Tracking:");
      log(`  Predictions Used: ${result.usage.predictions_used}`);
      log(`  Session Remaining: ${result.usage.session_remaining}`);
      log(`  Daily Remaining: ${result.usage.daily_remaining}`);
    }

    // Login prompt
    if (result.login_prompt && result.login_prompt.show) {
      log("\nLogin Prompt:", "yellow");
      log(`  ${result.login_prompt.title}`);
      log(`  ${result.login_prompt.message}`);
    }

    // Features
    if (result.features) {
      log("\nFeatures:");
      log(
        `  Current Access: ${result.features.current_access.length} features`
      );
      log(`  With Account: ${result.features.with_account.length} features`);
    }

    return result;
  } catch (error) {
    if (error.response) {
      log(`✗ Rate limit or error`, "red");
      log(`Status: ${error.response.status}`);
      log(`Error: ${error.response.data.error || error.response.data.message}`);
      log(`Code: ${error.response.data.code}`);

      if (error.response.data.details) {
        log(`Details: ${JSON.stringify(error.response.data.details, null, 2)}`);
      }
    } else {
      log(`✗ Request failed: ${error.message}`, "red");
    }
    return null;
  }
}

async function runTests() {
  log("\n╔════════════════════════════════════════════╗", "cyan");
  log("║   Guest Prediction Testing Suite          ║", "cyan");
  log("╚════════════════════════════════════════════╝", "cyan");

  // Step 1: Check system health
  const health = await checkSystemHealth();
  if (!health) {
    log("\n✗ System health check failed. Aborting tests.", "red");
    return;
  }

  // Step 2: Check Redis status
  const redisStatus = await checkRedisStatus();

  // Step 3: Check guest stats
  await checkGuestStats();

  // Step 4: Make multiple predictions to test rate limiting
  log("\n=== Testing Guest Predictions ===", "cyan");
  log("Making 5 prediction attempts to test rate limiting...\n");

  for (let i = 1; i <= 5; i++) {
    await makeGuestPrediction(i);

    // Small delay between requests
    if (i < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Step 5: Check stats after predictions
  log("\n=== Guest Statistics After Testing ===", "cyan");
  await checkGuestStats();

  log("\n=== Test Summary ===", "cyan");
  log("✓ All tests completed", "green");
  log(`Redis Status: ${redisStatus ? redisStatus.overall_status : "unknown"}`);
  log(`\nTo clear guest store (requires auth):`);
  log(`  POST ${API_URL}/api/system/clear-guest-store`);
}

// Run tests
runTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  process.exit(1);
});
