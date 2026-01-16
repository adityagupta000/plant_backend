const rateLimit = require("express-rate-limit");
const constants = require("../config/constants");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");
const {
  enhancedGuestLimiter,
  cleanup: guestCleanup,
} = require("./guestRateLimiter.middleware");

/**
 * Rate limiter for prediction endpoints
 * 50 requests per 15 minutes per IP/user
 */
const predictionLimiter = rateLimit({
  windowMs: constants.PREDICTION_RATE_WINDOW_MS,
  max: constants.PREDICTION_RATE_MAX,
  message: formatErrorResponse(
    "Too many prediction requests. Please try again later.",
    "RATE_LIMIT_EXCEEDED"
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "development",
  handler: (req, res) => {
    logger.warn("Prediction rate limit exceeded", {
      ip: req.ip,
      userId: req.userId,
    });
    res
      .status(429)
      .json(
        formatErrorResponse(
          "Too many prediction requests. Please try again later.",
          "RATE_LIMIT_EXCEEDED"
        )
      );
  },
});

/**
 * Rate limiter for auth endpoints
 * 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: constants.AUTH_RATE_WINDOW_MS,
  max: constants.AUTH_RATE_MAX,
  message: formatErrorResponse(
    "Too many authentication attempts. Please try again later.",
    "AUTH_RATE_LIMIT_EXCEEDED"
  ),
<<<<<<< Updated upstream
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "development",
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res
      .status(429)
      .json(
        formatErrorResponse(
          "Too many authentication attempts. Please try again later.",
          "AUTH_RATE_LIMIT_EXCEEDED"
        )
      );
=======
  logMessage: "Auth rate limit exceeded",
});

// ============================================================================
// NEW: REFRESH TOKEN LIMITER (5 requests / 1 minute)
// CRITICAL FIX: Prevents token refresh flooding
// ============================================================================

const refreshLimiter = createRateLimiter({
  windowMs: 60000,
  max: 5,
  prefix: "rl:refresh:",
  message: formatErrorResponse(
    "Too many token refresh requests. Please wait before trying again.",
    "REFRESH_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Refresh token rate limit exceeded",
});

// ============================================================================
// NEW: HISTORY LIMITER (100 requests / 1 minute)
// FIX: Prevents session/prediction enumeration attacks
// ============================================================================

const historyLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 100,
  prefix: "rl:history:",
  message: formatErrorResponse(
    "Too many history requests. Please slow down.",
    "HISTORY_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "History rate limit exceeded",
});

// ============================================================================
// NEW: HEALTH CHECK LIMITER (30 requests / 1 minute)
// FIX: Prevents health check DDoS
// ============================================================================

const healthLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 30,
  prefix: "rl:health:",
  message: formatErrorResponse(
    "Too many health check requests.",
    "HEALTH_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Health check rate limit exceeded",
});

// ============================================================================
// NEW: GLOBAL API LIMITER (1000 requests / 15 minutes)
// FIX: Prevents general API abuse
// ============================================================================

const globalLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  max: 1000,
  prefix: "rl:global:",
  message: formatErrorResponse(
    "Too many requests. Please try again later.",
    "GLOBAL_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Global rate limit exceeded",
});

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

const cleanup = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis rate limiter connection closed");
    } catch (error) {
      logger.error("Error closing Redis connection", {
        error: error.message,
      });
    }
  }
};

// ============================================================================
// CRITICAL FIX: IP-based rate limiting for unauthenticated users
// ============================================================================

const guestLimiter = createRateLimiter({
  windowMs: constants.GUEST_RATE_WINDOW_MS, // 1 hour
  max: constants.GUEST_RATE_MAX, // 10 requests
  prefix: "rl:guest:",
  message: formatErrorResponse(
    "Too many prediction requests from this IP. Please try again later.",
    "GUEST_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Guest rate limit exceeded",
  // CRITICAL: Use IP address as key for guests
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
>>>>>>> Stashed changes
  },
});

// ============================================================================
// STATUS AND MONITORING FUNCTIONS (ADD BEFORE module.exports)
// ============================================================================

/**
 * Get Redis connection status for rate limiter
 */
const getRedisStatus = () => {
  return {
    connected: useRedis,
    host: process.env.REDIS_HOST || null,
    port: process.env.REDIS_PORT || null,
    clientReady: redisClient ? redisClient.status === "ready" : false,
    storageType: useRedis ? "redis" : "memory",
  };
};

/**
 * Test Redis connection
 */
const testRedisConnection = async () => {
  if (!redisClient) {
    return {
      success: false,
      message: "Redis client not initialized",
      storageType: "memory",
    };
  }

  try {
    await redisClient.ping();
    return {
      success: true,
      message: "Redis connection successful",
      status: redisClient.status,
      storageType: "redis",
    };
  } catch (error) {
    return {
      success: false,
      message: `Redis connection failed: ${error.message}`,
      storageType: "memory",
    };
  }
};

module.exports = {
  predictionLimiter,
  authLimiter,
<<<<<<< Updated upstream
=======
  refreshLimiter,
  historyLimiter,
  healthLimiter,
  globalLimiter,
  guestLimiter,
  enhancedGuestLimiter,
  cleanup: async () => {
    await cleanup();
    await guestCleanup();
  },
  getRedisStatus,
  testRedisConnection,
>>>>>>> Stashed changes
};
