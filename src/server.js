require("dotenv").config();

const app = require("./app");
const { testConnection, syncDatabase, closeConnection } = require("./models");
const aiService = require("./services/ai.service");
const storageService = require("./services/storage.service");
const logger = require("./utils/logger");
const fs = require("fs").promises;
const path = require("path");

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost";
const NODE_ENV = process.env.NODE_ENV || "development";

if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error("FATAL ERROR: JWT secrets not configured!");
  process.exit(1);
}

let server;
let isShuttingDown = false;
let isSyncingDatabase = false;

/**
 * Database sync with atomic lock file protection
 */
const syncDatabaseWithLock = async (options = {}) => {
  const lockFile = path.join(__dirname, "../.db-sync.lock");
  let lockFd = null;

  try {
    try {
      lockFd = await fs.open(lockFile, "wx");
      await lockFd.writeFile(
        JSON.stringify({
          pid: process.pid,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      if (error.code === "EEXIST") {
        const lockStats = await fs.stat(lockFile);
        const lockAge = Date.now() - lockStats.mtimeMs;

        if (lockAge < 30000) {
          logger.warn("Database sync already in progress, waiting...");

          for (let i = 0; i < 60; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            try {
              await fs.access(lockFile);
            } catch {
              return await syncDatabaseWithLock(options);
            }
          }

          throw new Error("Database sync timeout - lock not released");
        } else {
          logger.warn("Stale lock file detected, removing...");
          await fs.unlink(lockFile);
          return await syncDatabaseWithLock(options);
        }
      }
      throw error;
    }

    isSyncingDatabase = true;
    await syncDatabase(options);

    logger.info("Database synchronized successfully");
    return true;
  } finally {
    isSyncingDatabase = false;

    if (lockFd) {
      try {
        await lockFd.close();
      } catch (e) {
        logger.error("Error closing lock file", { error: e.message });
      }
    }

    try {
      await fs.unlink(lockFile);
    } catch (e) {
      if (e.code !== "ENOENT") {
        logger.error("Error removing lock file", { error: e.message });
      }
    }
  }
};

/**
 * Start the server
 */
const startServer = async () => {
  try {
    if (server) {
      logger.warn("Server already running, skipping start");
      return;
    }

    // Test database connection
    logger.info("Testing database connection...");
    await testConnection();

    // Sync database
    logger.info("Synchronizing database models...");
    await syncDatabaseWithLock({
      force: false,
      alter: NODE_ENV === "development",
    });

    // Initialize AI service
    logger.info("Initializing AI worker pool...");
    try {
      await aiService.initialize();
      logger.info("AI worker pool ready");
    } catch (error) {
      logger.error("Failed to initialize AI service", {
        error: error.message,
      });
      logger.warn("Server will start but AI predictions will fail");
    }

    // Start HTTP server
    server = app.listen(PORT, HOST, () => {
      logger.info("Server started successfully", {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
      });

      console.log("=".repeat(60));
      console.log("Plant Health Detection Backend");
      console.log("=".repeat(60));
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Server: http://${HOST}:${PORT}`);
      console.log(`Health: http://${HOST}:${PORT}/health`);
      console.log(`API: http://${HOST}:${PORT}/api`);
      console.log("=".repeat(60));
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error("Server error", { error: error.message });
        throw error;
      }
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

/**
 * CRITICAL FIX: Enhanced graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress");
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} signal received: closing server gracefully`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        // CRITICAL FIX: Cleanup storage service timeouts
        logger.info("Cleaning up storage service...");
        await storageService.cleanup();

        // Cleanup AI worker pool
        logger.info("Cleaning up AI worker pool...");
        await aiService.cleanup();

        // Close database connection
        await closeConnection();
        logger.info("Database connection closed");

        // Clean up lock file
        if (isSyncingDatabase) {
          try {
            const lockFile = path.join(__dirname, "../.db-sync.lock");
            await fs.unlink(lockFile);
            logger.info("Removed database sync lock");
          } catch {}
        }

        // Cleanup rate limiter Redis connection
        const rateLimiter = require("./middlewares/rateLimiter.middleware");
        if (rateLimiter.cleanup) {
          await rateLimiter.cleanup();
        }

        // Cleanup guest limiter Redis connection
        const guestLimiter = require("./middlewares/guestRateLimiter.middleware");
        if (guestLimiter.cleanup) {
          await guestLimiter.cleanup();
        }

        // ENHANCEMENT: Log final statistics
        const storageStats = await storageService.getStorageStats();
        logger.info("Final storage statistics", storageStats);

        logger.info("Graceful shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown", {
          error: error.message,
        });
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

/**
 * Handle uncaught exceptions
 */
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

/**
 * Handle unhandled promise rejections
 */
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason,
    promise: promise,
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

/**
 * Handle process termination signals
 */
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ENHANCEMENT: Periodic cleanup of old files (every 6 hours)
if (NODE_ENV === "production") {
  setInterval(
    async () => {
      try {
        logger.info("Running periodic file cleanup...");
        const deleted = await storageService.cleanupOldFiles(
          24 * 60 * 60 * 1000,
        ); // 24 hours
        logger.info(`Periodic cleanup completed: ${deleted} files deleted`);
      } catch (error) {
        logger.error("Periodic cleanup failed", { error: error.message });
      }
    },
    6 * 60 * 60 * 1000,
  ); // Every 6 hours
}

// Start the server
startServer();
