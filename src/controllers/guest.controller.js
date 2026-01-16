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
 * Generate login prompt based on usage
 */
const _getLoginPrompt = (usageCount, remaining) => {
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
      "Sign up to unlock unlimited daily predictions and save your history.",
    urgency: "low",
  };
};

/**
 * Get guest features based on usage
 */
const _getGuestFeatures = (usageCount) => {
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
 */
const _getAuthenticatedFeatures = () => {
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
      const guestMetadata = req.guestMetadata; // From enhanced limiter middleware

      // Validate file upload
      if (!file) {
        logger.warn("Guest prediction request without file");
        return res
          .status(400)
          .json(formatErrorResponse("Image file is required", "FILE_REQUIRED"));
      }

      logger.info("Processing guest prediction", {
        fileName: file.originalname,
        fileSize: file.size,
        ip: req.ip,
        metadata: guestMetadata,
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

      const isFirstPrediction = guestMetadata?.sessionUsage === 1;
      const isSecondPrediction = guestMetadata?.sessionUsage === 2;
      const sessionRemaining = guestMetadata?.limits?.sessionRemaining || 0;

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
        sessionUsage: guestMetadata?.sessionUsage,
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
          predictions_used: guestMetadata?.sessionUsage || 1,
          session_remaining: sessionRemaining,
          daily_remaining: guestMetadata?.limits?.dailyRemaining || 9,
        },

        // Progressive login prompt (using standalone function)
        login_prompt: _getLoginPrompt(
          guestMetadata?.sessionUsage || 1,
          sessionRemaining
        ),

        // Feature comparison (using standalone functions)
        features: {
          current_access: _getGuestFeatures(guestMetadata?.sessionUsage || 1),
          with_account: _getAuthenticatedFeatures(),
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
      });

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
      logger.warn("Guest attempted PDF download - blocked", {
        ip: req.ip,
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
              "Download unlimited PDF reports",
              "Save prediction history",
              "Access reports from any device",
            ],
          }
        )
      );
    } catch (error) {
      logger.error("Error in PDF download handler", {
        error: error.message,
      });

      next(error);
    }
  }
}

module.exports = new GuestController();
