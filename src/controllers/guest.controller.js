// ============================================================================
// FILE: src/controllers/guest.controller.js
// UPDATED: Enhanced guest controller with usage tracking and login prompts
// FIXED: Resolved 'this' context issue with helper functions
// ============================================================================

const aiService = require("../services/ai.service");
const storageService = require("../services/storage.service");
const pdfGenerator = require("../utils/pdfGenerator");
const {
  formatSuccessResponse,
  formatErrorResponse,
} = require("../utils/helpers");
const constants = require("../config/constants");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

// ============================================================================
// HELPER FUNCTIONS (extracted from class to avoid 'this' context issues)
// ============================================================================

/**
 * Validate guest metadata from middleware
 * @param {Object} metadata - Guest metadata object
 * @returns {boolean} True if valid, false otherwise
 */
const validateGuestMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const required = ["ip", "fingerprint", "sessionId", "sessionUsage"];
  for (const field of required) {
    if (!(field in metadata)) {
      return false;
    }
  }

  // Validate types and ranges
  if (
    typeof metadata.sessionUsage !== "number" ||
    metadata.sessionUsage < 0 ||
    metadata.sessionUsage > 100
  ) {
    return false;
  }

  return true;
};

/**
 * Generate login prompt based on usage
 * @param {number} usageCount - Current session usage count
 * @param {number} remaining - Remaining predictions in session
 * @returns {Object} Login prompt configuration
 */
const getLoginPrompt = (usageCount, remaining) => {
  if (usageCount === 1) {
    return {
      show: false,
      title: null,
      message: null,
    };
  }

  if (usageCount === 2) {
    return {
      show: true,
      title: "You've used 2/2 free predictions",
      message:
        "Sign up now to continue analyzing plants. It's free and takes 30 seconds!",
      urgency: "medium",
    };
  }

  if (remaining <= 0) {
    return {
      show: true,
      title: "Limit reached",
      message:
        "Create a free account to get 50 predictions per day with full detailed analysis.",
      urgency: "high",
    };
  }

  return {
    show: true,
    title: `${remaining} predictions remaining`,
    message:
      "Sign up to unlock daily predictions and save your history.",
    urgency: "low",
  };
};

/**
 * Get guest features based on usage
 * @param {number} usageCount - Current session usage count
 * @returns {Array<string>} Array of available features
 */
const getGuestFeatures = (usageCount) => {
  const baseFeatures = [
    "Basic plant health diagnosis",
    "Confidence score",
    "Disease classification",
  ];

  if (usageCount === 1) {
    return [
      ...baseFeatures,
      "Full explanation (first prediction only)",
      "Limited recommendations",
    ];
  }

  return [
    ...baseFeatures,
    "No detailed explanations",
    "No recommendations",
    "No history tracking",
    "No PDF downloads",
  ];
};

/**
 * Get authenticated user features
 * @returns {Array<string>} Array of premium features
 */
const getAuthenticatedFeatures = () => {
  return [
    "50 predictions per day",
    "Full detailed analysis for every prediction",
    "Complete treatment recommendations",
    "Prediction history tracking",
    "PDF report downloads",
    "Priority processing",
    "No rate limits",
    "Access across all devices",
  ];
};

// ============================================================================
// GUEST CONTROLLER CLASS
// ============================================================================

class GuestController {
  /**
   * Make prediction without authentication
   * POST /api/guest/predict
   */
  async predict(req, res, next) {
    const startTime = Date.now();

    try {
      const file = req.file;
      const guestMetadata = req.guestMetadata;

      // Validate file upload
      if (!file) {
        logger.warn("Guest prediction request without file");
        return res
          .status(400)
          .json(formatErrorResponse("Image file is required", "FILE_REQUIRED"));
      }

      // Validate guest metadata
      if (!validateGuestMetadata(guestMetadata)) {
        logger.error("Invalid guest metadata", { metadata: guestMetadata });
        return res
          .status(500)
          .json(
            formatErrorResponse(
              "Internal server error - invalid request metadata",
              "INVALID_METADATA",
            ),
          );
      }

      logger.info("Processing guest prediction", {
        fileName: file.originalname,
        fileSize: file.size,
        ip: req.ip,
        sessionId: guestMetadata.sessionId,
        sessionUsage: guestMetadata.sessionUsage,
      });

      // Save image metadata (temporary)
      const imageMetadata = storageService.saveImageMetadata(file);

      // Call AI service for prediction
      const aiResult = await aiService.predict(file.path);

      logger.info("AI service returned", {
        success: aiResult.success,
        hasData: !!aiResult.data,
        error: aiResult.error,
      });

      const processingTime = Date.now() - startTime;

      // Validate AI result
      if (!aiResult.success || !aiResult.data) {
        const errorMsg =
          aiResult.error || "AI service returned invalid response";

        logger.error("AI prediction failed", {
          error: errorMsg,
        });

        // Cleanup temp file
        await storageService.cleanupTempFile(file.path);

        const error = new Error(errorMsg);
        error.code = "AI_PREDICTION_FAILED";
        throw error;
      }

      // Validate required fields
      const aiData = aiResult.data;

      if (!aiData.predicted_class || aiData.confidence === undefined) {
        logger.error("AI data missing required fields");
        await storageService.cleanupTempFile(file.path);

        const error = new Error("AI service returned incomplete data");
        error.code = "AI_PREDICTION_FAILED";
        throw error;
      }

      // ======================================================================
      // FEATURE GATING: Limit guest features based on usage
      // ======================================================================

      const isFirstPrediction = guestMetadata.sessionUsage === 1;
      const isSecondPrediction = guestMetadata.sessionUsage === 2;
      const sessionRemaining = guestMetadata.limits?.sessionRemaining || 0;

      // Build response with progressive feature restrictions
      const prediction = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        image_name: imageMetadata.originalName,
        predicted_class: aiData.predicted_class,
        category: aiData.category,
        subtype: aiData.subtype,
        confidence: aiData.confidence,
        confidence_percentage: aiData.confidence_percentage,
        confidence_level: aiData.confidence_level,

        // FEATURE GATE: Full explanation only for first prediction
        explanation: isFirstPrediction
          ? aiData.explanation
          : "Sign up to see detailed analysis and recommendations",

        // FEATURE GATE: Recommendations only for authenticated users
        recommendations: isFirstPrediction
          ? (aiData.recommendations || []).slice(0, 2) // Show only 2
          : [],

        all_predictions: aiData.all_probabilities,
        model_version: aiData.model_version || constants.MODEL_VERSION,
        model_name: constants.MODEL_NAME,
        processing_time_ms: aiResult.processingTime || processingTime,
        created_at: new Date().toISOString(),
      };

      logger.info("Guest prediction completed", {
        predictedClass: prediction.predicted_class,
        confidence: prediction.confidence,
        processingTime: aiResult.processingTime || processingTime,
        sessionUsage: guestMetadata.sessionUsage,
      });

      // Cleanup temp file immediately
      await storageService.cleanupTempFile(file.path);

      // ======================================================================
      // BUILD RESPONSE WITH LOGIN PROMPT
      // ======================================================================

      const response = {
        prediction,
        message: "Prediction successful. Data not saved (privacy mode).",

        // Guest usage tracking
        usage: {
          predictions_used: guestMetadata.sessionUsage,
          session_remaining: sessionRemaining,
          daily_remaining: guestMetadata.limits?.dailyRemaining || 9,
        },

        // Progressive login prompt (using standalone function)
        login_prompt: getLoginPrompt(
          guestMetadata.sessionUsage,
          sessionRemaining,
        ),

        // Feature comparison (using standalone functions)
        features: {
          current_access: getGuestFeatures(guestMetadata.sessionUsage),
          with_account: getAuthenticatedFeatures(),
        },

        // PDF download availability
        can_download_pdf: false, // Guests cannot download PDF
      };

      res
        .status(200)
        .json(formatSuccessResponse(response, "Prediction successful"));
    } catch (error) {
      // Ensure temp file is cleaned up even on error
      if (req.file && req.file.path) {
        await storageService.cleanupTempFile(req.file.path);
      }

      logger.error("Error processing guest prediction", {
        error: error.message,
        stack: error.stack,
        code: error.code || "UNKNOWN_ERROR",
      });

      // Handle specific error codes
      if (error.code === "AI_PREDICTION_FAILED") {
        return res
          .status(503)
          .json(
            formatErrorResponse(
              "Unable to process image at this time. Please try again later.",
              "AI_SERVICE_UNAVAILABLE",
            ),
          );
      }

      next(error);
    }
  }

  /**
   * Generate and download PDF report
   * POST /api/guest/predict/download-pdf
   *
   * UPDATED: Block PDF downloads for guests
   */
  async downloadPDF(req, res, next) {
    try {
      const guestMetadata = req.guestMetadata;

      logger.warn("Guest attempted PDF download - blocked", {
        ip: req.ip,
        sessionId: guestMetadata?.sessionId,
        sessionUsage: guestMetadata?.sessionUsage,
      });

      return res.status(403).json(
        formatErrorResponse(
          "PDF downloads are only available for registered users",
          "FEATURE_REQUIRES_AUTHENTICATION",
          {
            feature: "PDF downloads",
            suggestion:
              "Create a free account to download detailed PDF reports",
            benefits: [
              "Download PDF reports",
              "Save prediction history",
              "Access reports from any device",
            ],
            login_prompt: getLoginPrompt(
              guestMetadata?.sessionUsage || 1,
              guestMetadata?.limits?.sessionRemaining || 0,
            ),
          },
        ),
      );
    } catch (error) {
      logger.error("Error in PDF download handler", {
        error: error.message,
        stack: error.stack,
      });

      next(error);
    }
  }
}

module.exports = new GuestController();
