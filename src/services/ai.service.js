/**
 * AI Service - Worker Pool Implementation
 * Delegates to ai.service.pool.js for actual worker management
 */

const aiWorkerPool = require("./ai.service.pool");
const logger = require("../utils/logger");

class AIService {
  constructor() {
    this.workerPool = aiWorkerPool;
    this.initialized = false;
  }

  /**
   * Initialize AI worker pool
   */
  async initialize() {
    try {
      if (this.initialized) {
        logger.warn("AI service already initialized");
        return true;
      }

      logger.info("Initializing AI worker pool...");
      await this.workerPool.initialize();
      this.initialized = true;

      logger.info("AI worker pool initialized successfully");
      return true;
    } catch (error) {
      logger.error("Failed to initialize AI worker pool", {
        error: error.message,
        stack: error.stack,
      });
      // Don't throw - allow server to start without AI
      return false;
    }
  }

  /**
   * Check if AI service is healthy
   */
  async checkHealth() {
    try {
      if (!this.initialized) {
        return false;
      }
      return await this.workerPool.checkHealth();
    } catch (error) {
      logger.error("AI health check failed", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Make prediction using worker pool
   * @param {String} imagePath - Path to image file
   * @param {Number} retryCount - Current retry attempt
   * @returns {Object} Prediction result
   */
  async predict(imagePath, retryCount = 0) {
    try {
      if (!this.initialized) {
        throw new Error("AI service not initialized");
      }

      const result = await this.workerPool.predict(imagePath, retryCount);

      // Result from pool is already in correct format:
      // { success: true/false, data: {...} or error: "..." }
      return result;
    } catch (error) {
      logger.error("Prediction failed in AI service", {
        error: error.message,
        imagePath,
        retryCount,
      });

      return {
        success: false,
        error: error.message,
        errorCode: "AI_PREDICTION_FAILED",
      };
    }
  }

  /**
   * Get worker pool statistics
   */
  getStats() {
    if (!this.initialized) {
      return {
        initialized: false,
        poolSize: 0,
        activeWorkers: 0,
        totalPredictions: 0,
        successfulPredictions: 0,
        failedPredictions: 0,
      };
    }
    return this.workerPool.getStats();
  }

  /**
   * Get model information
   */
  getModelInfo() {
    if (!this.initialized) {
      return {
        initialized: false,
        poolSize: 0,
        activeWorkers: 0,
      };
    }

    const stats = this.workerPool.getStats();
    return {
      initialized: true,
      poolSize: stats.poolSize,
      activeWorkers: stats.activeWorkers,
      busyWorkers: stats.busyWorkers,
      availableWorkers: stats.availableWorkers,
      totalPredictions: stats.totalPredictions,
      successfulPredictions: stats.successfulPredictions,
      failedPredictions: stats.failedPredictions,
      successRate:
        stats.totalPredictions > 0
          ? (
              (stats.successfulPredictions / stats.totalPredictions) *
              100
            ).toFixed(2) + "%"
          : "N/A",
      averageWaitTime: stats.averageWaitTime
        ? `${stats.averageWaitTime.toFixed(0)}ms`
        : "N/A",
    };
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup() {
    try {
      if (this.initialized) {
        await this.workerPool.cleanup();
        this.initialized = false;
      }
      logger.info("AI service cleanup complete");
    } catch (error) {
      logger.error("Error during AI service cleanup", {
        error: error.message,
      });
    }
  }
}

module.exports = new AIService();
