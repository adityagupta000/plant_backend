/**
 * Prediction Service - FIXED
 * Added better error handling and response validation
 */

const { PredictionSession, Prediction } = require("../models");
const aiService = require("./ai.service");
const storageService = require("./storage.service");
const { generateDefaultSessionTitle } = require("../utils/helpers");
const constants = require("../config/constants");
const logger = require("../utils/logger");

class PredictionService {
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

  async getOrCreateSession(userId, sessionId = null) {
    try {
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
      logger.info("Calling AI service", {
        imagePath: file.path,
        fileExists: require("fs").existsSync(file.path),
      });

      const aiResult = await aiService.predict(file.path);

      logger.info("AI service returned", {
        success: aiResult.success,
        hasData: !!aiResult.data,
        error: aiResult.error,
      });

      const processingTime = Date.now() - startTime;

      let prediction;

      // CRITICAL: Validate AI result structure
      if (!aiResult.success || !aiResult.data) {
        // AI service failed - create failed prediction record
        const errorMsg =
          aiResult.error || "AI service returned invalid response";

        logger.error("AI prediction failed", {
          sessionId: session.id,
          userId,
          error: errorMsg,
          aiResult: JSON.stringify(aiResult).substring(0, 500),
        });

        prediction = await Prediction.create({
          session_id: session.id,
          user_id: userId,
          image_name: imageMetadata.originalName,
          image_url: imageMetadata.path,
          image_size: imageMetadata.size,
          predicted_class: "Error",
          confidence: 0,
          status: constants.PREDICTION_STATUS.FAILED,
          error_message: errorMsg,
          processing_time_ms: processingTime,
        });

        // Cleanup temp file
        await storageService.cleanupTempFile(file.path);

        const error = new Error(errorMsg);
        error.code = "AI_PREDICTION_FAILED";
        throw error;
      }

      // CRITICAL: Validate required fields in AI data
      const aiData = aiResult.data;

      if (!aiData.predicted_class || aiData.confidence === undefined) {
        logger.error("AI data missing required fields", {
          hasClass: !!aiData.predicted_class,
          hasConfidence: aiData.confidence !== undefined,
          aiData: JSON.stringify(aiData).substring(0, 500),
        });

        prediction = await Prediction.create({
          session_id: session.id,
          user_id: userId,
          image_name: imageMetadata.originalName,
          image_url: imageMetadata.path,
          image_size: imageMetadata.size,
          predicted_class: "Error",
          confidence: 0,
          status: constants.PREDICTION_STATUS.FAILED,
          error_message: "AI returned incomplete data",
          processing_time_ms: processingTime,
        });

        await storageService.cleanupTempFile(file.path);

        const error = new Error("AI service returned incomplete data");
        error.code = "AI_PREDICTION_FAILED";
        throw error;
      }

      // AI service succeeded - create successful prediction record
      logger.info("Creating prediction record", {
        predictedClass: aiData.predicted_class,
        confidence: aiData.confidence,
      });

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
        recommendations: aiData.recommendations || [],
        model_version: aiData.model_version || constants.MODEL_VERSION,
        model_name: constants.MODEL_NAME,
        processing_time_ms: aiResult.processingTime || processingTime,
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
        processingTime: aiResult.processingTime || processingTime,
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
        stack: error.stack,
        userId,
        sessionId,
      });

      throw error;
    }
  }

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

  async getSessionPredictions(userId, sessionId, limit = 100, offset = 0) {
    try {
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
