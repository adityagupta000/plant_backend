/**
 * Guest Controller
 * Handles predictions without authentication (privacy-first)
 */

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

class GuestController {
  /**
   * Make prediction without authentication
   * POST /api/guest/predict
   */
  async predict(req, res, next) {
    const startTime = Date.now();

    try {
      const file = req.file;

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
      });

      // Save image metadata (temporary)
      const imageMetadata = storageService.saveImageMetadata(file);

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

      // Validate AI result
      if (!aiResult.success || !aiResult.data) {
        const errorMsg =
          aiResult.error || "AI service returned invalid response";

        logger.error("AI prediction failed", {
          error: errorMsg,
          aiResult: JSON.stringify(aiResult).substring(0, 500),
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
        logger.error("AI data missing required fields", {
          hasClass: !!aiData.predicted_class,
          hasConfidence: aiData.confidence !== undefined,
          aiData: JSON.stringify(aiData).substring(0, 500),
        });

        await storageService.cleanupTempFile(file.path);

        const error = new Error("AI service returned incomplete data");
        error.code = "AI_PREDICTION_FAILED";
        throw error;
      }

      // Build response (NO DATABASE STORAGE)
      const prediction = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
        image_name: imageMetadata.originalName,
        predicted_class: aiData.predicted_class,
        category: aiData.category,
        subtype: aiData.subtype,
        confidence: aiData.confidence,
        confidence_percentage: aiData.confidence_percentage,
        confidence_level: aiData.confidence_level,
        explanation: aiData.explanation,
        recommendations: aiData.recommendations || [],
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
      });

      // Cleanup temp file immediately (stateless - no storage)
      await storageService.cleanupTempFile(file.path);

      res.status(200).json(
        formatSuccessResponse(
          {
            prediction,
            message: "Prediction successful. Data not saved (privacy mode).",
            can_download_pdf: true,
          },
          "Prediction successful"
        )
      );
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
   */
  async downloadPDF(req, res, next) {
    try {
      const { prediction } = req.body;

      if (!prediction) {
        return res
          .status(400)
          .json(
            formatErrorResponse(
              "Prediction data is required",
              "PREDICTION_REQUIRED"
            )
          );
      }

      logger.info("Generating PDF report for guest prediction", {
        predictedClass: prediction.predicted_class,
      });

      // Generate PDF
      const pdfDir = path.join(__dirname, "../../temp_pdfs");
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const pdfFilename = `plant_diagnosis_${Date.now()}.pdf`;
      const pdfPath = path.join(pdfDir, pdfFilename);

      await pdfGenerator.generateReport(prediction, pdfPath);

      // Send PDF file
      res.download(pdfPath, pdfFilename, (err) => {
        if (err) {
          logger.error("Error sending PDF", { error: err.message });
        }

        // Cleanup PDF after sending
        setTimeout(() => {
          try {
            if (fs.existsSync(pdfPath)) {
              fs.unlinkSync(pdfPath);
              logger.debug("Temporary PDF cleaned up", { pdfPath });
            }
          } catch (cleanupErr) {
            logger.error("Error cleaning up PDF", {
              error: cleanupErr.message,
            });
          }
        }, 5000); // 5 seconds delay
      });

      logger.info("PDF report generated and sent", {
        pdfFilename,
      });
    } catch (error) {
      logger.error("Error generating PDF", {
        error: error.message,
        stack: error.stack,
      });

      next(error);
    }
  }
}

module.exports = new GuestController();
