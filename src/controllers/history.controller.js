/**
 * History Controller
 * Handles HTTP requests for history/session management endpoints
 */

const predictionService = require("../services/prediction.service");
const { Prediction } = require("../models");
const {
  formatSuccessResponse,
  formatErrorResponse,
  getPaginationMetadata,
} = require("../utils/helpers");
const logger = require("../utils/logger");

class HistoryController {
  /**
   * Get all sessions for user (conversation list)
   * GET /api/history/sessions
   */
  async getSessions(req, res, next) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Get user sessions
      const { count, rows } = await predictionService.getUserSessions(
        userId,
        limit,
        offset
      );

      // Format sessions with last prediction
      const sessions = rows.map((session) => {
        const sessionData = session.toJSON();

        // Get last prediction if exists
        const lastPrediction =
          sessionData.predictions && sessionData.predictions.length > 0
            ? {
                id: sessionData.predictions[0].id,
                predicted_class: sessionData.predictions[0].predicted_class,
                confidence: sessionData.predictions[0].confidence,
                created_at: sessionData.predictions[0].created_at,
              }
            : null;

        return {
          id: sessionData.id,
          title: sessionData.title,
          created_at: sessionData.created_at,
          updated_at: sessionData.updated_at,
          last_prediction: lastPrediction,
        };
      });

      logger.debug("Retrieved sessions for user", {
        userId,
        count,
        returned: sessions.length,
      });

      res.status(200).json(
        formatSuccessResponse({
          total: count,
          sessions,
          pagination: getPaginationMetadata(count, limit, offset),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get predictions for a session (messages in conversation)
   * GET /api/history/sessions/:sessionId/predictions
   */
  async getSessionPredictions(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = parseInt(req.params.sessionId);
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      // Validate sessionId
      if (isNaN(sessionId)) {
        return res
          .status(400)
          .json(
            formatErrorResponse("Invalid session ID", "INVALID_SESSION_ID")
          );
      }

      // Get predictions
      const { count, rows } = await predictionService.getSessionPredictions(
        userId,
        sessionId,
        limit,
        offset
      );

      // Format predictions
      const predictions = rows.map((prediction) => {
        const predData = prediction.toJSON();
        return {
          id: predData.id,
          image_name: predData.image_name,
          image_url: predData.image_url,
          predicted_class: predData.predicted_class,
          category: predData.category,
          subtype: predData.subtype,
          confidence: predData.confidence,
          confidence_percentage: predData.confidence_percentage,
          confidence_level: predData.confidence_level,
          explanation: predData.explanation,
          all_predictions: predData.all_predictions,
          processing_time_ms: predData.processing_time_ms,
          status: predData.status,
          error_message: predData.error_message,
          created_at: predData.created_at,
        };
      });

      logger.debug("Retrieved predictions for session", {
        userId,
        sessionId,
        count,
        returned: predictions.length,
      });

      res.status(200).json(
        formatSuccessResponse({
          session_id: sessionId,
          total: count,
          predictions,
          pagination: getPaginationMetadata(count, limit, offset),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update session title (rename conversation)
   * PATCH /api/history/sessions/:sessionId
   */
  async updateSessionTitle(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = parseInt(req.params.sessionId);
      const { title } = req.body;

      // Validate sessionId
      if (isNaN(sessionId)) {
        return res
          .status(400)
          .json(
            formatErrorResponse("Invalid session ID", "INVALID_SESSION_ID")
          );
      }

      // Update session
      const session = await predictionService.updateSessionTitle(
        userId,
        sessionId,
        title
      );

      logger.info("Session title updated", {
        sessionId,
        userId,
        newTitle: title,
      });

      res.status(200).json(
        formatSuccessResponse(
          {
            session,
          },
          "Session title updated successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete session (delete conversation)
   * DELETE /api/history/sessions/:sessionId
   */
  async deleteSession(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = parseInt(req.params.sessionId);

      // Validate sessionId
      if (isNaN(sessionId)) {
        return res
          .status(400)
          .json(
            formatErrorResponse("Invalid session ID", "INVALID_SESSION_ID")
          );
      }

      // Delete session
      await predictionService.deleteSession(userId, sessionId);

      logger.info("Session deleted", {
        sessionId,
        userId,
      });

      res
        .status(200)
        .json(formatSuccessResponse({}, "Session deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single prediction details
   * GET /api/history/predictions/:predictionId
   */
  async getPredictionDetails(req, res, next) {
    try {
      const userId = req.userId;
      const predictionId = parseInt(req.params.predictionId);

      // Validate predictionId
      if (isNaN(predictionId)) {
        return res
          .status(400)
          .json(
            formatErrorResponse(
              "Invalid prediction ID",
              "INVALID_PREDICTION_ID"
            )
          );
      }

      // Get prediction
      const prediction = await Prediction.findByIdAndUser(predictionId, userId);

      if (!prediction) {
        return res
          .status(404)
          .json(
            formatErrorResponse("Prediction not found", "PREDICTION_NOT_FOUND")
          );
      }

      logger.debug("Retrieved prediction details", {
        predictionId,
        userId,
      });

      res.status(200).json(
        formatSuccessResponse({
          prediction: prediction.toJSON(),
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HistoryController();
