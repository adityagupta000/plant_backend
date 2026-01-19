/**
 * Prediction Service
 * Core business logic for predictions and history
 */

const { PredictionSession, Prediction } = require("../models");
const aiService = require("./ai.service");
const storageService = require("./storage.service");
const { generateDefaultSessionTitle } = require("../utils/helpers");
const constants = require("../config/constants");
const logger = require("../utils/logger");

class PredictionService {
  /**
   * Create new session
   * @param {Number} userId - User ID
   * @param {String} title - Session title (optional)
   * @returns {Object} Session object
   */
  async createSession(userId, title = null) {
    try {
      const sessionTitle = title || generateDefaultSessionTitle();

      const session = await PredictionSession.create({
        user_id: userId,
        title: sessionTitle,
      });

      logger.info("Session created", {
        sessionId: session.id,
        userId,
        title: sessionTitle,
      });

      return session;
    } catch (error) {
      logger.error("Error creating session", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get or create session
   * @param {Number} userId - User ID
   * @param {Number} sessionId - Session ID (optional)
   * @returns {Object} Session object
   */
  async getOrCreateSession(userId, sessionId = null) {
    try {
      // If sessionId provided, find existing session
      if (sessionId) {
        const session = await PredictionSession.findByIdAndUser(
          sessionId,
          userId
        );

        if (session) {
          logger.debug("Found existing session", { sessionId, userId });
          return session;
        }

        logger.warn("Session not found, creating new one", {
          sessionId,
          userId,
        });
      }

      // Create new session
      return await this.createSession(userId);
    } catch (error) {
      logger.error("Error getting or creating session", {
        error: error.message,
        userId,
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Process prediction
   * @param {Number} userId - User ID
   * @param {Number} sessionId - Session ID (optional)
   * @param {Object} file - Uploaded file
   * @returns {Object} { success, session, prediction }
   */
  async processPrediction(userId, sessionId, file) {
    const startTime = Date.now();

    try {
      // Get or create session
      const session = await this.getOrCreateSession(userId, sessionId);

      // Save image metadata
      const imageMetadata = storageService.saveImageMetadata(file);

      logger.info("Processing prediction", {
        sessionId: session.id,
        userId,
        fileName: imageMetadata.originalName,
        fileSize: imageMetadata.size,
      });

      // Call AI service for prediction
      const aiResult = await aiService.predict(file.path);

      const processingTime = Date.now() - startTime;

      // Create prediction record
      let prediction;

      if (!aiResult.success) {
        // AI service failed - create failed prediction record
        prediction = await Prediction.create({
          session_id: session.id,
          user_id: userId,
          image_name: imageMetadata.originalName,
          image_url: imageMetadata.path,
          image_size: imageMetadata.size,
          predicted_class: "N/A",
          confidence: 0,
          status: constants.PREDICTION_STATUS.FAILED,
          error_message: aiResult.error,
          processing_time_ms: processingTime,
        });

        logger.error("Prediction failed", {
          sessionId: session.id,
          userId,
          error: aiResult.error,
          processingTime,
        });

        // Cleanup temp file
        await storageService.cleanupTempFile(file.path);

        const error = new Error(aiResult.error);
        error.code = "AI_PREDICTION_FAILED";
        throw error;
      }

      // AI service succeeded - create successful prediction record
      const aiData = aiResult.data;

      prediction = await Prediction.create({
        session_id: session.id,
        user_id: userId,
        image_name: imageMetadata.originalName,
        image_url: imageMetadata.path,
        image_size: imageMetadata.size,
        predicted_class: aiData.predicted_class,
        category: aiData.category,
        subtype: aiData.subtype,
        confidence: aiData.confidence,
        confidence_percentage: aiData.confidence_percentage,
        all_predictions: aiData.all_probabilities,
        confidence_level: aiData.confidence_level,
        explanation: aiData.explanation,
        model_version: aiData.model_version || constants.MODEL_VERSION,
        model_name: constants.MODEL_NAME,
        processing_time_ms: aiResult.processingTime,
        status: constants.PREDICTION_STATUS.SUCCESS,
      });

      // Update session timestamp
      session.changed("updated_at", true);
      await session.save();

      logger.info("Prediction created successfully", {
        predictionId: prediction.id,
        sessionId: session.id,
        userId,
        predictedClass: prediction.predicted_class,
        confidence: prediction.confidence,
        processingTime: aiResult.processingTime,
      });

      // Cleanup temp file (async)
      await storageService.cleanupTempFile(file.path);

      return {
        success: true,
        session: session.toJSON(),
        prediction: prediction.toJSON(),
      };
    } catch (error) {
      // Ensure temp file is cleaned up even on error
      if (file && file.path) {
        await storageService.cleanupTempFile(file.path);
      }

      logger.error("Error processing prediction", {
        error: error.message,
        userId,
        sessionId,
      });

      throw error;
    }
  }

  /**
   * Get user sessions
   * @param {Number} userId - User ID
   * @param {Number} limit - Results per page
   * @param {Number} offset - Pagination offset
   * @returns {Object} { count, rows }
   */
  async getUserSessions(userId, limit = 50, offset = 0) {
    try {
      const result = await PredictionSession.findByUser(userId, limit, offset);

      logger.debug("Retrieved user sessions", {
        userId,
        count: result.count,
        returned: result.rows.length,
      });

      return result;
    } catch (error) {
      logger.error("Error getting user sessions", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get session predictions
   * @param {Number} userId - User ID
   * @param {Number} sessionId - Session ID
   * @param {Number} limit - Results per page
   * @param {Number} offset - Pagination offset
   * @returns {Object} { count, rows }
   */
  async getSessionPredictions(userId, sessionId, limit = 100, offset = 0) {
    try {
      // Verify session belongs to user
      const session = await PredictionSession.findByIdAndUser(
        sessionId,
        userId
      );

      if (!session) {
        const error = new Error("Session not found");
        error.code = "SESSION_NOT_FOUND";
        throw error;
      }

      const result = await Prediction.findBySession(
        sessionId,
        userId,
        limit,
        offset
      );

      logger.debug("Retrieved session predictions", {
        sessionId,
        userId,
        count: result.count,
        returned: result.rows.length,
      });

      return result;
    } catch (error) {
      logger.error("Error getting session predictions", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update session title
   * @param {Number} userId - User ID
   * @param {Number} sessionId - Session ID
   * @param {String} title - New title
   * @returns {Object} Updated session
   */
  async updateSessionTitle(userId, sessionId, title) {
    try {
      const success = await PredictionSession.updateTitle(
        sessionId,
        userId,
        title
      );

      if (!success) {
        const error = new Error("Session not found");
        error.code = "SESSION_NOT_FOUND";
        throw error;
      }

      const session = await PredictionSession.findByIdAndUser(
        sessionId,
        userId
      );

      logger.info("Session title updated", {
        sessionId,
        userId,
        newTitle: title,
      });

      return session;
    } catch (error) {
      logger.error("Error updating session title", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete session
   * @param {Number} userId - User ID
   * @param {Number} sessionId - Session ID
   * @returns {Boolean} Success status
   */
  async deleteSession(userId, sessionId) {
    try {
      const success = await PredictionSession.deleteByIdAndUser(
        sessionId,
        userId
      );

      if (!success) {
        const error = new Error("Session not found");
        error.code = "SESSION_NOT_FOUND";
        throw error;
      }

      logger.info("Session deleted", {
        sessionId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error("Error deleting session", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get prediction by ID
   * @param {Number} userId - User ID
   * @param {Number} predictionId - Prediction ID
   * @returns {Object} Prediction object
   */
  async getPredictionById(userId, predictionId) {
    try {
      const prediction = await Prediction.findByIdAndUser(predictionId, userId);

      if (!prediction) {
        const error = new Error("Prediction not found");
        error.code = "PREDICTION_NOT_FOUND";
        throw error;
      }

      return prediction;
    } catch (error) {
      logger.error("Error getting prediction by ID", {
        error: error.message,
        predictionId,
        userId,
      });
      throw error;
    }
  }
}

module.exports = new PredictionService();
