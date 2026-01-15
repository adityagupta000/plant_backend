// FIXED: Properly handle AI worker pool response structure
// File: src/services/ai.service.js

const aiWorkerPool = require("./ai.service.pool");
const logger = require("../utils/logger");

class AIService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the AI service (start worker pool)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      await aiWorkerPool.initialize();
      this.initialized = true;
      logger.info("AI service initialized with worker pool");
    } catch (error) {
      logger.error("Failed to initialize AI service", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check health
   */
  async checkHealth() {
    try {
      return await aiWorkerPool.checkHealth();
    } catch (error) {
      logger.error("AI service health check failed", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Make prediction (now uses worker pool)
   * CRITICAL FIX: Return structure exactly as Python sends it
   */
  async predict(imagePath) {
    try {
      // Ensure service is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Use worker pool for prediction
      // This returns: {success: true, data: {...}} OR {success: false, error: "..."}
      const result = await aiWorkerPool.predict(imagePath);

      logger.info("AI worker pool returned result", {
        success: result.success,
        hasData: !!result.data,
        hasError: !!result.error,
      });

      // Return exactly what Python sent
      return result;
      
    } catch (error) {
      logger.error("Prediction error", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        errorCode: "AI_PREDICTION_FAILED",
      };
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return aiWorkerPool.getStats();
  }

  /**
   * Cleanup (shutdown worker pool)
   */
  async cleanup() {
    logger.info("Cleaning up AI service");
    await aiWorkerPool.cleanup();
    this.initialized = false;
  }
}

module.exports = new AIService();