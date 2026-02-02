/**
 * Prediction Routes - UPDATED
 * Added PDF download endpoint
 */

const express = require("express");
const router = express.Router();
const predictionController = require("../controllers/prediction.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validation.middleware");
const { predictionLimiter } = require("../middlewares/rateLimiter.middleware");
const {
  upload,
  uploadWithSignatureValidation,
  handleMulterError,
} = require("../utils/upload");
const pdfGenerator = require("../utils/pdfGenerator");
const {
  formatSuccessResponse,
  formatErrorResponse,
} = require("../utils/helpers");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs").promises;

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/predict/health
 * @desc Check AI service health status
 * @access Private
 */
router.get("/health", predictionController.checkAIServiceHealth);

/**
 * @route POST /api/predict/session
 * @desc Create new prediction session
 * @access Private
 */
router.post(
  "/session",
  validate("createSession"),
  predictionController.createSession,
);

/**
 * @route POST /api/predict
 * @desc Make plant health prediction
 * @access Private
 * @body image: file, session_id: number (optional)
 */
router.post(
  "/",
  predictionLimiter,
  ...uploadWithSignatureValidation,
  predictionController.predict,
);

/**
 * @route POST /api/predict/download-pdf
 * @desc Generate and download PDF report
 * @access Private
 * @body prediction: object (prediction data)
 */
router.post(
  "/download-pdf",
  validate("downloadPDF"),
  async (req, res, next) => {
    try {
      const { prediction } = req.body;

      logger.info("Generating PDF report", {
        userId: req.userId,
        predictedClass: prediction.predicted_class || prediction.class,
      });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `plant-health-report-${timestamp}.pdf`;
      const outputPath = path.join(__dirname, "../../temp_pdfs", filename);

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, "../../temp_pdfs");
      await fs.mkdir(tempDir, { recursive: true });

      // Generate PDF
      await pdfGenerator.generateReport(prediction, outputPath);

      logger.info("PDF generated successfully", {
        userId: req.userId,
        filename,
      });

      // Send PDF file
      res.download(outputPath, filename, async (err) => {
        if (err) {
          logger.error("Error sending PDF", {
            error: err.message,
            filename,
          });
        }

        // Delete temp file after sending (or after 5 minutes)
        setTimeout(
          async () => {
            try {
              await fs.unlink(outputPath);
              logger.debug("Temp PDF deleted", { filename });
            } catch (error) {
              logger.error("Error deleting temp PDF", {
                error: error.message,
                filename,
              });
            }
          },
          5 * 60 * 1000,
        );
      });
    } catch (error) {
      logger.error("Error generating PDF report", {
        error: error.message,
        userId: req.userId,
      });
      next(error);
    }
  },
);

module.exports = router;
