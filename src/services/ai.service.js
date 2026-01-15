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
   */
  async predict(imagePath) {
    try {
      // Ensure service is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Use worker pool for prediction
      const result = await aiWorkerPool.predict(imagePath);

      return result;
    } catch (error) {
      logger.error("Prediction error", {
        error: error.message,
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
