/**
 * Prediction Controller
 * Handles HTTP requests for prediction endpoints
 */

const predictionService = require("../services/prediction.service");
const aiService = require("../services/ai.service");
const {
  formatSuccessResponse,
  formatErrorResponse,
} = require("../utils/helpers");
const logger = require("../utils/logger");

class PredictionController {
  /**
   * Check AI service health
   * GET /api/predict/health
   */
  async checkAIServiceHealth(req, res, next) {
    try {
      const isHealthy = await aiService.checkHealth();

      res.status(200).json({
        aiService: isHealthy ? "healthy" : "unavailable",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new prediction session
   * POST /api/predict/session
   */
  async createSession(req, res, next) {
    try {
      const userId = req.userId;
      const { title } = req.body;

      // Create session
      const session = await predictionService.createSession(userId, title);

      logger.info("Session created via API", {
        sessionId: session.id,
        userId,
        title: session.title,
      });

      res.status(201).json(
        formatSuccessResponse(
          {
            session,
          },
          "Session created successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Make prediction
   * POST /api/predict
   */
  async predict(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.body.session_id
        ? parseInt(req.body.session_id)
        : null;
      const file = req.file;

      // Validate file upload
      if (!file) {
        logger.warn("Prediction request without file", { userId });
        return res
          .status(400)
          .json(formatErrorResponse("Image file is required", "FILE_REQUIRED"));
      }

      logger.info("Processing prediction request", {
        userId,
        sessionId,
        fileName: file.originalname,
        fileSize: file.size,
      });

      // Process prediction
      const result = await predictionService.processPrediction(
        userId,
        sessionId,
        file
      );

      logger.info("Prediction completed", {
        userId,
        sessionId: result.session.id,
        predictionId: result.prediction.id,
        predictedClass: result.prediction.predicted_class,
        confidence: result.prediction.confidence,
      });

      res.status(200).json(
        formatSuccessResponse(
          {
            session_id: result.session.id,
            prediction: {
              id: result.prediction.id,
              class: result.prediction.predicted_class,
              category: result.prediction.category,
              subtype: result.prediction.subtype,
              confidence: result.prediction.confidence,
              confidence_percentage: result.prediction.confidence_percentage,
              confidence_level: result.prediction.confidence_level,
              explanation: result.prediction.explanation,
              all_predictions: result.prediction.all_predictions,
              model_version: result.prediction.model_version,
              model_name: result.prediction.model_name,
              processing_time_ms: result.prediction.processing_time_ms,
              created_at: result.prediction.created_at,
            },
          },
          "Prediction successful"
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PredictionController();
