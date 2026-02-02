// ============================================================================
// FILE: guestRateLimiter.middleware.js - FIXED
// CRITICAL FIX: Correct sessionRemaining calculation
// ============================================================================

const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");
const crypto = require("crypto");
const constants = require("../config/constants");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

// ============================================================================
// CONSTANTS - CRITICAL FIX
// ============================================================================

const SESSION_LIMIT = 4; // Maximum predictions per session
const IP_LIMIT = 5; // Maximum predictions per hour per IP
const FINGERPRINT_LIMIT = 10; // Maximum predictions per day per fingerprint
const IS_TEST = process.env.NODE_ENV === "test";

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
      logger.info("Redis connected for enhanced guest limiting");
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
// IN-MEMORY FALLBACK STORE
// ============================================================================

class InMemoryGuestStore {
  constructor() {
    this.fingerprints = new Map();
    this.ips = new Map();
    this.sessions = new Map();
    this.cleanupInterval = null; // STORE INTERVAL ID

    // ONLY start cleanup in non-test environments
    if (process.env.NODE_ENV !== "test") {
      this.startCleanup();
    }
  }

  startCleanup() {
    if (this.cleanupInterval) return; // Already started

    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  cleanup() {
    const now = Date.now();

    for (const [key, data] of this.fingerprints.entries()) {
      if (
        now - data.resetTime >
        GUEST_FINGERPRINT_WINDOW_HOURS * 60 * 60 * 1000
      ) {
        this.fingerprints.delete(key);
      }
    }

    for (const [key, data] of this.ips.entries()) {
      if (now - data.resetTime > GUEST_IP_WINDOW_HOURS * 60 * 60 * 1000) {
        this.ips.delete(key);
      }
    }
  }

  async incrementFingerprint(fingerprint) {
    const now = Date.now();
    const key = `fp:${fingerprint}`;

    if (!this.fingerprints.has(key)) {
      this.fingerprints.set(key, {
        count: 1,
        resetAt: now + 24 * 60 * 60 * 1000,
        attempts: [now],
      });
      return { count: 1, resetAt: this.fingerprints.get(key).resetAt };
    }

    const data = this.fingerprints.get(key);

    if (now > data.resetAt) {
      data.count = 1;
      data.resetAt = now + 24 * 60 * 60 * 1000;
      data.attempts = [now];
    } else {
      data.count++;
      data.attempts.push(now);
    }

    return { count: data.count, resetAt: data.resetAt };
  }

  async incrementSession(sessionId) {
    const now = Date.now();
    const key = `session:${sessionId}`;

    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        count: 1,
        firstUse: now,
      });
      return { count: 1 };
    }

    const data = this.sessions.get(key);
    data.count++;

    return { count: data.count };
  }

  async incrementIp(ip) {
    const now = Date.now();
    const key = `ip:${ip}`;

    if (!this.ips.has(key)) {
      this.ips.set(key, {
        count: 1,
        resetAt: now + 60 * 60 * 1000, // 1 hour
      });
      return { count: 1, resetAt: this.ips.get(key).resetAt };
    }

    const data = this.ips.get(key);

    if (now > data.resetAt) {
      data.count = 1;
      data.resetAt = now + 60 * 60 * 1000;
    } else {
      data.count++;
    }

    return { count: data.count, resetAt: data.resetAt };
  }

  async getAttemptPattern(fingerprint) {
    const key = `fp:${fingerprint}`;
    const data = this.fingerprints.get(key);

    if (!data || !data.attempts) return { suspicious: false };

    const recentAttempts = data.attempts.filter(
      (time) => Date.now() - time < 60 * 1000,
    );

    return {
      suspicious: recentAttempts.length > 5,
      recentCount: recentAttempts.length,
    };
  }

  cleanup() {
    const now = Date.now();

    for (const [key, data] of this.fingerprints.entries()) {
      if (now > data.resetAt + 24 * 60 * 60 * 1000) {
        this.fingerprints.delete(key);
      }
    }

    for (const [key, data] of this.sessions.entries()) {
      if (now - data.firstUse > 60 * 60 * 1000) {
        this.sessions.delete(key);
      }
    }

    for (const [key, data] of this.ips.entries()) {
      if (now > data.resetAt + 60 * 60 * 1000) {
        this.ips.delete(key);
      }
    }

    logger.debug("In-memory guest store cleaned up", {
      fingerprints: this.fingerprints.size,
      sessions: this.sessions.size,
      ips: this.ips.size,
    });
  }
}

const memoryStore = new InMemoryGuestStore();

// ============================================================================
// BROWSER FINGERPRINTING
// ============================================================================

function generateBrowserFingerprint(req) {
  const components = [
    req.headers["user-agent"] || "",
    req.headers["accept-language"] || "",
    req.headers["accept-encoding"] || "",
    req.headers["accept"] || "",
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(components)
    .digest("hex")
    .substring(0, 32);
}

function generateSessionId(req) {
  const components = [
    req.headers["user-agent"] || "",
    req.ip || "",
    Math.floor(Date.now() / (60 * 60 * 1000)),
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(components)
    .digest("hex")
    .substring(0, 16);
}

// ============================================================================
// REDIS HELPER FUNCTIONS
// ============================================================================

async function incrementRedisKey(key, ttl) {
  if (!useRedis || !redisClient) return null;

  try {
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, ttl);
    }

    const ttlRemaining = await redisClient.ttl(key);

    return { count, ttlRemaining };
  } catch (error) {
    logger.error("Redis operation failed", { error: error.message });
    return null;
  }
}

async function setRedisValue(key, value, ttl) {
  if (!useRedis || !redisClient) return;

  try {
    await redisClient.setex(key, ttl, value);
  } catch (error) {
    logger.error("Redis set failed", { error: error.message });
  }
}

async function appendRedisLog(key, value, maxLength = 100) {
  if (!useRedis || !redisClient) return;

  try {
    await redisClient.lpush(key, value);
    await redisClient.ltrim(key, 0, maxLength - 1);
    await redisClient.expire(key, 3600);
  } catch (error) {
    logger.error("Redis log failed", { error: error.message });
  }
}

// ============================================================================
// ENHANCED GUEST RATE LIMITER MIDDLEWARE - FIXED
// ============================================================================

const enhancedGuestLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const fingerprint = generateBrowserFingerprint(req);
    const sessionId = generateSessionId(req);

    logger.debug("Guest request received", { ip, fingerprint, sessionId });

    // ========================================================================
    // LAYER 1: IP-BASED RATE LIMIT (5 per hour)
    // ========================================================================

    const ipKey = `guest:ip:${ip}`;
    let ipResult;

    if (useRedis) {
      ipResult = await incrementRedisKey(ipKey, 3600);
    } else {
      ipResult = await memoryStore.incrementIp(ip);
    }

    if (!ipResult) {
      ipResult = { count: 1 };
    }

    if (ipResult.count > IP_LIMIT) {
      logger.warn("Guest IP rate limit exceeded", {
        ip,
        count: ipResult.count,
      });

      return res.status(429).json(
        formatErrorResponse(
          "Too many requests from this network. Please try again in 1 hour or sign up for unlimited access.",
          "GUEST_IP_LIMIT_EXCEEDED",
          {
            limit: IP_LIMIT,
            period: "hour",
            suggestion: "Create a free account for 50 predictions per day",
          },
        ),
      );
    }

    // ========================================================================
    // LAYER 2: BROWSER FINGERPRINT LIMIT (10 per day)
    // ========================================================================

    const fpKey = `guest:fp:${fingerprint}`;
    let fpResult;

    if (useRedis) {
      fpResult = await incrementRedisKey(fpKey, 86400);

      const attemptKey = `guest:fp:attempts:${fingerprint}`;
      await appendRedisLog(attemptKey, Date.now());

      const attempts = await redisClient.lrange(attemptKey, 0, -1);
      const recentAttempts = attempts.filter(
        (time) => Date.now() - parseInt(time) < 60000,
      );

      if (recentAttempts.length > 5) {
        logger.warn("Suspicious activity detected", {
          fingerprint,
          recentAttempts: recentAttempts.length,
        });

        const blockKey = `guest:block:${fingerprint}`;
        await setRedisValue(blockKey, "1", 900);

        return res.status(429).json(
          formatErrorResponse(
            "Too many rapid requests detected. Please wait 15 minutes or sign up for immediate access.",
            "SUSPICIOUS_ACTIVITY_DETECTED",
            {
              blockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              suggestion: "Create an account to avoid these restrictions",
            },
          ),
        );
      }
    } else {
      fpResult = await memoryStore.incrementFingerprint(fingerprint);
      const pattern = await memoryStore.getAttemptPattern(fingerprint);

      if (pattern.suspicious) {
        return res
          .status(429)
          .json(
            formatErrorResponse(
              "Too many rapid requests. Please slow down or create an account.",
              "SUSPICIOUS_ACTIVITY_DETECTED",
            ),
          );
      }
    }

    if (fpResult && fpResult.count > FINGERPRINT_LIMIT) {
      logger.warn("Guest fingerprint limit exceeded", {
        fingerprint,
        count: fpResult.count,
      });

      const hoursUntilReset = fpResult.resetAt
        ? Math.ceil((fpResult.resetAt - Date.now()) / (1000 * 60 * 60))
        : 24;

      return res.status(429).json(
        formatErrorResponse(
          `Daily limit reached (${FINGERPRINT_LIMIT} predictions per day). Reset in ${hoursUntilReset} hours or sign up for more.`,
          "GUEST_DAILY_LIMIT_EXCEEDED",
          {
            limit: FINGERPRINT_LIMIT,
            period: "day",
            resetIn: `${hoursUntilReset} hours`,
            suggestion:
              "Registered users get 50 predictions per day with full features",
          },
        ),
      );
    }

    // ========================================================================
    // LAYER 3: SESSION LIMIT (4 per session) - CRITICAL FIX
    // ========================================================================

    const sessionKey = `guest:session:${sessionId}`;
    let sessionResult;

    // CRITICAL FIX: Always increment before checking limit
    if (useRedis) {
      sessionResult = await incrementRedisKey(sessionKey, 3600);
    } else {
      sessionResult = await memoryStore.incrementSession(sessionId);
    }

    if (!sessionResult) {
      sessionResult = { count: 1 };
    }

    // Log the incremented value for debugging
    logger.debug("Session counter incremented", {
      sessionId,
      count: sessionResult.count,
    });

    if (sessionResult.count > SESSION_LIMIT) {
      logger.warn("Guest session limit exceeded", {
        sessionId,
        count: sessionResult.count,
      });

      return res.status(429).json(
        formatErrorResponse(
          `Session limit reached (${SESSION_LIMIT} predictions per session). Sign up to continue analyzing plants.`,
          "GUEST_SESSION_LIMIT_EXCEEDED",
          {
            limit: SESSION_LIMIT,
            suggestion: "Create a free account to analyze 50+ plants per day",
            features: {
              guest: ["Limited predictions", "Basic results", "No history"],
              authenticated: [
                "50 predictions/day",
                "Detailed analysis",
                "History tracking",
                "PDF downloads",
                "Priority processing",
              ],
            },
          },
        ),
      );
    }

    // ========================================================================
    // ATTACH METADATA TO REQUEST - CRITICAL FIX
    // ========================================================================

    req.guestMetadata = {
      ip,
      fingerprint,
      sessionId,
      ipUsage: ipResult?.count || 1,
      fingerprintUsage: fpResult?.count || 1,
      sessionUsage: sessionResult?.count || 1,
      limits: {
        ipRemaining: Math.max(0, IP_LIMIT - (ipResult?.count || 1)),
        dailyRemaining: Math.max(0, FINGERPRINT_LIMIT - (fpResult?.count || 1)),
        // CRITICAL FIX: Correct calculation
        sessionRemaining: Math.max(
          0,
          SESSION_LIMIT - (sessionResult?.count || 1),
        ),
      },
    };

    logger.info("Guest request authorized", req.guestMetadata);

    next();
  } catch (error) {
    logger.error("Error in enhanced guest limiter", {
      error: error.message,
      stack: error.stack,
    });

    // Fail open (allow request) rather than fail closed
    next();
  }
};

// ============================================================================
// CLEANUP AND MONITORING
// ============================================================================

const cleanup = async () => {
  logger.info("Cleaning up guest rate limiter...");

  // CRITICAL: Stop the cleanup interval
  memoryStore.stopCleanup();

  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis client disconnected");
    } catch (error) {
      logger.error("Error disconnecting Redis:", error);
    }
  }
};

const getRedisStatus = () => {
  return {
    connected: useRedis,
    host: process.env.REDIS_HOST || null,
    port: process.env.REDIS_PORT || null,
    clientReady: redisClient ? redisClient.status === "ready" : false,
    storageType: useRedis ? "redis" : "memory",
  };
};

const getMemoryStoreStats = () => {
  if (useRedis) {
    return { message: "Using Redis - memory store not active" };
  }

  return {
    fingerprints: memoryStore.fingerprints.size,
    ips: memoryStore.ips.size,
    sessions: memoryStore.sessions.size,
    storageType: "memory",
  };
};

const clearMemoryStore = () => {
  if (!useRedis) {
    memoryStore.fingerprints.clear();
    memoryStore.ips.clear();
    memoryStore.sessions.clear();
    logger.info("Memory store cleared");
    return { success: true, cleared: true };
  }
  return { success: false, message: "Using Redis - cannot clear memory store" };
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
  enhancedGuestLimiter,
  cleanup,
  getRedisStatus,
  getMemoryStoreStats,
  clearMemoryStore,
  testRedisConnection,
};
