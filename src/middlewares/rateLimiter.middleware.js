/**
 * Rate Limiter Middleware
 * Comprehensive rate limiting with Redis support
 */

const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");
const constants = require("../config/constants");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

// ============================================================================
// REDIS CLIENT SETUP
// ============================================================================

let redisClient = null;
let useRedis = false;

if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    redisClient.on("connect", () => {
      logger.info("Redis connected for rate limiting");
      useRedis = true;
    });

    redisClient.on("error", (err) => {
      logger.error("Redis error (falling back to memory store)", {
        error: err.message,
      });
      useRedis = false;
    });
  } catch (error) {
    logger.warn("Failed to initialize Redis, using memory store", {
      error: error.message,
    });
  }
}

// ============================================================================
// HELPER: Create rate limiter
// ============================================================================

const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => false,
    handler: (req, res) => {
      logger.warn(options.logMessage || "Rate limit exceeded", {
        ip: req.ip,
        userId: req.userId,
        path: req.path,
      });
      res.status(429).json(options.message);
    },
  };

  if (useRedis && redisClient) {
    config.store = new RedisStore({
      client: redisClient,
      prefix: options.prefix || "rl:",
      sendCommand: (...args) => redisClient.call(...args),
    });
    logger.info(`Rate limiter created with Redis store: ${options.prefix}`);
  } else {
    logger.info(`Rate limiter created with memory store: ${options.prefix}`);
  }

  return rateLimit(config);
};

// ============================================================================
// RATE LIMITERS
// ============================================================================

const predictionLimiter = createRateLimiter({
  windowMs: constants.PREDICTION_RATE_WINDOW_MS,
  max: constants.PREDICTION_RATE_MAX,
  prefix: "rl:predict:",
  message: formatErrorResponse(
    "Too many prediction requests. Please try again later.",
    "RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Prediction rate limit exceeded",
});

const authLimiter = createRateLimiter({
  windowMs: constants.AUTH_RATE_WINDOW_MS,
  max: constants.AUTH_RATE_MAX,
  prefix: "rl:auth:",
  message: formatErrorResponse(
    "Too many authentication attempts. Please try again later.",
    "AUTH_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Auth rate limit exceeded",
});

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

const historyLimiter = createRateLimiter({
  windowMs: 60000,
  max: 100,
  prefix: "rl:history:",
  message: formatErrorResponse(
    "Too many history requests. Please slow down.",
    "HISTORY_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "History rate limit exceeded",
});

const healthLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30,
  prefix: "rl:health:",
  message: formatErrorResponse(
    "Too many health check requests.",
    "HEALTH_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Health check rate limit exceeded",
});

const globalLimiter = createRateLimiter({
  windowMs: 900000,
  max: 1000,
  prefix: "rl:global:",
  message: formatErrorResponse(
    "Too many requests. Please try again later.",
    "GLOBAL_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Global rate limit exceeded",
});

const guestLimiter = createRateLimiter({
  windowMs: 3600000,
  max: 10,
  prefix: "rl:guest:",
  message: formatErrorResponse(
    "Too many prediction requests from this IP. Please try again later.",
    "GUEST_RATE_LIMIT_EXCEEDED"
  ),
  logMessage: "Guest rate limit exceeded",
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || "unknown",
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
// STATUS AND MONITORING FUNCTIONS
// ============================================================================

const getRedisStatus = () => {
  return {
    connected: useRedis,
    host: process.env.REDIS_HOST || null,
    port: process.env.REDIS_PORT || null,
    clientReady: redisClient ? redisClient.status === "ready" : false,
    storageType: useRedis ? "redis" : "memory",
  };
};

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
  refreshLimiter,
  historyLimiter,
  healthLimiter,
  globalLimiter,
  guestLimiter,
  cleanup,
  getRedisStatus,
  testRedisConnection,
};
