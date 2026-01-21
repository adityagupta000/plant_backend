// ============================================================================
// FILE: src/routes/guest.routes.js
// FIXED: Removed invalid validation reference
// ============================================================================

const express = require("express");
const router = express.Router();
const guestController = require("../controllers/guest.controller");
const {
  enhancedGuestLimiter,
} = require("../middlewares/guestRateLimiter.middleware");
const { upload, handleMulterError } = require("../utils/upload");

/**
 * @route POST /api/guest/predict
 * @desc Make plant health prediction (no auth required)
 * @access Public
 * @body image: file
 *
 * Rate limits:
 * - 5 predictions per hour per IP
 * - 10 predictions per day per browser
 * - 4 predictions per session
 */
router.post(
  "/predict",
  enhancedGuestLimiter,
  upload.single("image"),
  handleMulterError,
  guestController.predict,
);

/**
 * @route POST /api/guest/predict/download-pdf
 * @desc Generate and download PDF report for a prediction
 * @access Blocked for guests
 * @body prediction: object (prediction data)
 *
 * NOTE: This endpoint is blocked for guest users.
 * PDF downloads require authentication.
 */
router.post(
  "/predict/download-pdf",
  enhancedGuestLimiter,
  guestController.downloadPDF, // Returns 403 with login prompt
);

module.exports = router;
