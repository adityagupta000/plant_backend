/**
 * Database Connection Pool Monitoring - FIXED
 * SQLite-compatible version
 */

const logger = require("../utils/logger");

class DatabaseMonitor {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.stats = {
      queries: 0,
      errors: 0,
      slowQueries: 0,
      connectionAcquisitions: 0,
      connectionReleases: 0,
      connectionFailures: 0,
    };

    this.queryTimes = [];
    this.maxQueryTimes = 100;
    this.slowQueryThreshold = 1000;

    this.setupMonitoring();
  }

  setupMonitoring() {
    if (!this.sequelize) {
      logger.warn("Database monitor: No sequelize instance provided");
      return;
    }

    // Log queries in development
    if (process.env.NODE_ENV === "development") {
      this.sequelize.options.logging = (sql, timing) => {
        logger.debug("Database Query", {
          sql: sql.substring(0, 200),
          timing,
        });
      };
    }

    // Track query performance
    this.sequelize.addHook("beforeQuery", (options) => {
      options.startTime = Date.now();
    });

    this.sequelize.addHook("afterQuery", (options, query) => {
      this.stats.queries++;

      if (options.startTime) {
        const duration = Date.now() - options.startTime;

        this.queryTimes.push(duration);
        if (this.queryTimes.length > this.maxQueryTimes) {
          this.queryTimes.shift();
        }

        if (duration > this.slowQueryThreshold) {
          this.stats.slowQueries++;

          logger.warn("Slow Query Detected", {
            duration: `${duration}ms`,
            sql: query.sql?.substring(0, 200),
            model: options.model?.name,
          });
        }
      }
    });

    // CRITICAL FIX: Only setup pool monitoring for PostgreSQL
    const dialect = this.sequelize.options.dialect;

    if (dialect === "postgres" && this.sequelize.connectionManager?.pool) {
      const pool = this.sequelize.connectionManager.pool;

      // Check if pool has event emitter methods
      if (typeof pool.on === "function") {
        pool.on("acquire", (connection) => {
          this.stats.connectionAcquisitions++;
          logger.debug("Connection acquired from pool", {
            totalConnections: pool.size,
            availableConnections: pool.available,
            pendingRequests: pool.pending,
          });
        });

        pool.on("release", (connection) => {
          this.stats.connectionReleases++;
          logger.debug("Connection released to pool");
        });

        pool.on("createError", (error) => {
          this.stats.connectionFailures++;
          logger.error("Connection creation failed", {
            error: error.message,
          });
        });

        pool.on("destroyError", (error) => {
          logger.error("Connection destruction failed", {
            error: error.message,
          });
        });
      }
    } else if (dialect === "sqlite") {
      logger.debug("SQLite detected - pool monitoring not applicable");
    }

    logger.info("Database monitoring initialized");
  }

  getPoolStats() {
    const dialect = this.sequelize.options.dialect;

    // CRITICAL FIX: SQLite doesn't have a connection pool
    if (dialect === "sqlite") {
      return {
        dialect: "sqlite",
        message: "SQLite uses a single connection - no pool",
        available: true,
      };
    }

    if (!this.sequelize.connectionManager?.pool) {
      return {
        available: false,
        message: "Connection pool not available",
      };
    }

    const pool = this.sequelize.connectionManager.pool;

    return {
      size: pool.size || 0,
      available: pool.available || 0,
      using: (pool.size || 0) - (pool.available || 0),
      pending: pool.pending || 0,
      max: pool.max || 0,
      min: pool.min || 0,
    };
  }

  getQueryStats() {
    const avgQueryTime =
      this.queryTimes.length > 0
        ? Math.round(
            this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length,
          )
        : 0;

    const maxQueryTime =
      this.queryTimes.length > 0 ? Math.max(...this.queryTimes) : 0;

    const minQueryTime =
      this.queryTimes.length > 0 ? Math.min(...this.queryTimes) : 0;

    return {
      totalQueries: this.stats.queries,
      slowQueries: this.stats.slowQueries,
      slowQueryThreshold: `${this.slowQueryThreshold}ms`,
      averageQueryTime: `${avgQueryTime}ms`,
      maxQueryTime: `${maxQueryTime}ms`,
      minQueryTime: `${minQueryTime}ms`,
      recentQueries: this.queryTimes.length,
    };
  }

  getConnectionStats() {
    return {
      acquisitions: this.stats.connectionAcquisitions,
      releases: this.stats.connectionReleases,
      failures: this.stats.connectionFailures,
      errors: this.stats.errors,
    };
  }

  getStats() {
    return {
      pool: this.getPoolStats(),
      queries: this.getQueryStats(),
      connections: this.getConnectionStats(),
      timestamp: new Date().toISOString(),
    };
  }

  async checkHealth() {
    try {
      await this.sequelize.authenticate();

      const poolStats = this.getPoolStats();
      const dialect = this.sequelize.options.dialect;

      // CRITICAL FIX: Different health checks for different dialects
      if (
        dialect === "postgres" &&
        poolStats.available !== false &&
        !poolStats.message
      ) {
        const utilizationPercent = (poolStats.using / poolStats.max) * 100;

        if (utilizationPercent > 80) {
          logger.warn("Database pool utilization high", {
            utilization: `${utilizationPercent.toFixed(2)}%`,
            using: poolStats.using,
            max: poolStats.max,
          });
        }

        if (poolStats.pending > 0) {
          logger.warn("Database connections pending", {
            pending: poolStats.pending,
          });
        }
      }

      return {
        healthy: true,
        connected: true,
        ...this.getStats(),
      };
    } catch (error) {
      logger.error("Database health check failed", {
        error: error.message,
      });

      return {
        healthy: false,
        connected: false,
        error: error.message,
      };
    }
  }

  resetStats() {
    this.stats = {
      queries: 0,
      errors: 0,
      slowQueries: 0,
      connectionAcquisitions: 0,
      connectionReleases: 0,
      connectionFailures: 0,
    };

    this.queryTimes = [];

    logger.info("Database statistics reset");
  }

  startPeriodicMonitoring(intervalMs = 60000) {
    this.monitoringInterval = setInterval(() => {
      const stats = this.getStats();

      logger.info("Database Monitoring Report", stats);

      const dialect = this.sequelize.options.dialect;

      // Only check pool utilization for PostgreSQL
      if (
        dialect === "postgres" &&
        stats.pool.available !== false &&
        !stats.pool.message
      ) {
        const utilization = (stats.pool.using / stats.pool.max) * 100;

        if (utilization > 80) {
          logger.warn("High database pool utilization", {
            utilization: `${utilization.toFixed(2)}%`,
          });
        }
      }

      if (stats.queries.slowQueries > 10) {
        logger.warn("Multiple slow queries detected", {
          count: stats.queries.slowQueries,
          threshold: stats.queries.slowQueryThreshold,
        });
      }
    }, intervalMs);

    logger.info("Periodic database monitoring started", {
      interval: `${intervalMs}ms`,
    });
  }

  stopPeriodicMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("Periodic database monitoring stopped");
    }
  }
}

module.exports = DatabaseMonitor;
