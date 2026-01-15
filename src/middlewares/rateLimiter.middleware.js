// ============================================================================
// FILE 1: src/middlewares/rateLimiter.middleware.js
// FIXED: Added all missing rate limiters with Redis support
// ============================================================================

const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");
const constants = require("../config/constants");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

// ============================================================================
// REDIS CLIENT SETUP (for distributed rate limiting)
// ============================================================================

let redisClient = null;
let useRedis = false;

// Initialize Redis if configured
if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
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
// HELPER: Create rate limiter with optional Redis
// ============================================================================

const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    // FIXED: Don't skip in development - test rate limits everywhere
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

  // Use Redis store if available
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
// PREDICTION RATE LIMITER (50 requests / 15 minutes)
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

// ============================================================================
// AUTH RATE LIMITER (10 requests / 15 minutes)
// ============================================================================

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
  },
});

module.exports = {
  predictionLimiter,
  authLimiter,
  refreshLimiter, // NEW
  historyLimiter, // NEW
  healthLimiter, // NEW
  globalLimiter, // NEW
  guestLimiter,
  cleanup,
};
