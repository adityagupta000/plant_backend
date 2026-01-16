/**
 * System Controller
 * Handles system monitoring and diagnostics
 */

const {
  formatSuccessResponse,
  formatErrorResponse,
} = require("../utils/helpers");
const logger = require("../utils/logger");

class SystemController {
  /**
   * Get comprehensive Redis status
   * GET /api/system/redis-status
   */
  async getRedisStatus(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");
      const rateLimiterModule = require("../middlewares/rateLimiter.middleware");

      const guestStatus = guestLimiterModule.getRedisStatus();
      const limiterStatus = rateLimiterModule.getRedisStatus();

      // Test actual connections
      const guestTest = await guestLimiterModule.testRedisConnection();
      const limiterTest = await rateLimiterModule.testRedisConnection();

      const overallStatus =
        guestStatus.connected && limiterStatus.connected
          ? "connected"
          : "fallback";

      logger.info("Redis status checked", {
        guestConnected: guestStatus.connected,
        limiterConnected: limiterStatus.connected,
      });

      res.json(
        formatSuccessResponse({
          redis: {
            overall_status: overallStatus,
            message:
              overallStatus === "connected"
                ? "Redis is connected and operational"
                : "Running with in-memory fallback store",
            guest_limiter: {
              ...guestStatus,
              test_result: guestTest,
            },
            rate_limiter: {
              ...limiterStatus,
              test_result: limiterTest,
            },
          },
        })
      );
    } catch (error) {
      logger.error("Error checking Redis status", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Get guest statistics
   * GET /api/system/guest-stats
   */
  async getGuestStats(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");

      const redisStatus = guestLimiterModule.getRedisStatus();
      const memoryStats = guestLimiterModule.getMemoryStoreStats();

      res.json(
        formatSuccessResponse({
          storage_type: redisStatus.storageType,
          redis_connected: redisStatus.connected,
          memory_store_stats: memoryStats,
          note:
            redisStatus.storageType === "redis"
              ? "Using Redis for distributed storage"
              : "Using in-memory storage (data will be lost on restart)",
        })
      );
    } catch (error) {
      logger.error("Error getting guest stats", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Clear guest memory store (for testing)
   * POST /api/system/clear-guest-store
   */
  async clearGuestStore(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");

      const result = guestLimiterModule.clearMemoryStore();

      if (result.success) {
        logger.info("Guest memory store cleared");
        res.json(
          formatSuccessResponse(
            { cleared: true },
            "Guest memory store cleared successfully"
          )
        );
      } else {
        res.json(
          formatSuccessResponse(
            { cleared: false },
            result.message || "Cannot clear Redis store"
          )
        );
      }
    } catch (error) {
      logger.error("Error clearing guest store", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Get complete system health
   * GET /api/system/health
   */
  async getSystemHealth(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");
      const rateLimiterModule = require("../middlewares/rateLimiter.middleware");
      const aiService = require("../services/ai.service");

      // Check Redis
      const guestRedis = guestLimiterModule.getRedisStatus();
      const limiterRedis = rateLimiterModule.getRedisStatus();

      // Check AI Service
      const aiHealthy = await aiService.checkHealth();
      const aiStats = aiService.getStats();

      // Check Database
      const { sequelize } = require("../models");
      let dbHealthy = false;
      try {
        await sequelize.authenticate();
        dbHealthy = true;
      } catch (error) {
        logger.error("Database health check failed", {
          error: error.message,
        });
      }

      const health = {
        status: "operational",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        services: {
          database: {
            status: dbHealthy ? "healthy" : "unhealthy",
            type: sequelize.options.dialect,
          },
          redis: {
            status:
              guestRedis.connected && limiterRedis.connected
                ? "connected"
                : "fallback",
            guest_limiter: guestRedis.storageType,
            rate_limiter: limiterRedis.storageType,
          },
          ai_service: {
            status: aiHealthy ? "healthy" : "unhealthy",
            workers: aiStats.activeWorkers,
            total_predictions: aiStats.totalPredictions,
            success_rate:
              aiStats.totalPredictions > 0
                ? (
                    (aiStats.successfulPredictions / aiStats.totalPredictions) *
                    100
                  ).toFixed(2) + "%"
                : "N/A",
          },
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          total:
            Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        },
      };

      // Set overall status
      if (!dbHealthy || !aiHealthy) {
        health.status = "degraded";
      }

      res.json(formatSuccessResponse(health));
    } catch (error) {
      logger.error("Error checking system health", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Test guest rate limiting
   * POST /api/system/test-guest-limit
   */
  async testGuestLimit(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");

      const ip = req.ip || "test-ip";
      const metadata = req.guestMetadata || {};

      res.json(
        formatSuccessResponse({
          test: "guest_rate_limit",
          your_ip: ip,
          metadata: metadata,
          redis_status: guestLimiterModule.getRedisStatus(),
          note: "Make actual predictions to test rate limits",
        })
      );
    } catch (error) {
      logger.error("Error testing guest limit", {
        error: error.message,
      });
      next(error);
    }
  }
}

module.exports = new SystemController();
