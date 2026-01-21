/**
 * System Controller - ENHANCED
 * Comprehensive system monitoring and diagnostics
 */

const {
  formatSuccessResponse,
  formatErrorResponse,
} = require("../utils/helpers");
const logger = require("../utils/logger");

class SystemController {
  /**
   * Get Redis status
   * GET /api/system/redis-status
   */
  async getRedisStatus(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");
      const rateLimiterModule = require("../middlewares/rateLimiter.middleware");

      const guestStatus = guestLimiterModule.getRedisStatus();
      const limiterStatus = rateLimiterModule.getRedisStatus();

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
        }),
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
        }),
      );
    } catch (error) {
      logger.error("Error getting guest stats", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Clear guest memory store
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
            "Guest memory store cleared successfully",
          ),
        );
      } else {
        res.json(
          formatSuccessResponse(
            { cleared: false },
            result.message || "Cannot clear Redis store",
          ),
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
   * ENHANCED: Complete system health with all monitoring
   * GET /api/system/health
   */
  async getSystemHealth(req, res, next) {
    try {
      const guestLimiterModule = require("../middlewares/guestRateLimiter.middleware");
      const rateLimiterModule = require("../middlewares/rateLimiter.middleware");
      const aiService = require("../services/ai.service");
      const storageService = require("../services/storage.service");

      // Check Redis
      const guestRedis = guestLimiterModule.getRedisStatus();
      const limiterRedis = rateLimiterModule.getRedisStatus();

      // Check AI Service
      const aiHealthy = await aiService.checkHealth();
      const aiStats = aiService.getStats();

      // Check Database with enhanced monitoring
      const { sequelize } = require("../models");
      const DatabaseMonitor = require("../utils/database.monitor");
      const dbMonitor = new DatabaseMonitor(sequelize);
      const dbHealth = await dbMonitor.checkHealth();

      // Check Storage
      const storageStats = await storageService.getStorageStats();

      const health = {
        status: "operational",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",

        services: {
          database: {
            status: dbHealth.healthy ? "healthy" : "unhealthy",
            connected: dbHealth.connected,
            type: sequelize.options.dialect,
            pool: dbHealth.pool,
            queries: dbHealth.queries,
            connections: dbHealth.connections,
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

          storage: {
            status: "healthy",
            files: storageStats.fileCount,
            total_size: storageStats.totalSizeMB + " MB",
            pending_cleanups: storageStats.pendingCleanups,
          },
        },

        system: {
          memory: {
            used:
              Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
            total:
              Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
            external:
              Math.round(process.memoryUsage().external / 1024 / 1024) + "MB",
          },
          cpu: {
            usage: process.cpuUsage(),
          },
        },
      };

      // Set overall status
      if (!dbHealth.healthy || !aiHealthy) {
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
   * ENHANCEMENT: Get database statistics
   * GET /api/system/database-stats
   */
  async getDatabaseStats(req, res, next) {
    try {
      const { sequelize } = require("../models");
      const DatabaseMonitor = require("../utils/database.monitor");

      const dbMonitor = new DatabaseMonitor(sequelize);
      const stats = dbMonitor.getStats();

      logger.info("Database statistics retrieved");

      res.json(formatSuccessResponse(stats));
    } catch (error) {
      logger.error("Error getting database stats", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * ENHANCEMENT: Get storage statistics
   * GET /api/system/storage-stats
   */
  async getStorageStats(req, res, next) {
    try {
      const storageService = require("../services/storage.service");
      const stats = await storageService.getStorageStats();

      logger.info("Storage statistics retrieved", stats);

      res.json(formatSuccessResponse(stats));
    } catch (error) {
      logger.error("Error getting storage stats", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * ENHANCEMENT: Get CSP violation statistics
   * GET /api/system/csp-stats
   */
  async getCspStats(req, res, next) {
    try {
      const { violationStats } = require("../middlewares/cspReport.middleware");
      const stats = violationStats.getStats();

      logger.info("CSP statistics retrieved");

      res.json(formatSuccessResponse(stats));
    } catch (error) {
      logger.error("Error getting CSP stats", {
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Test guest limits
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
        }),
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
