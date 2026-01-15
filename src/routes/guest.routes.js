// src/routes/guest.routes.js
const express = require("express");
const router = express.Router();
const guestController = require("../controllers/guest.controller");
const {
  predictionLimiter,
  guestLimiter, // ADD THIS - specifically for guest requests
} = require("../middlewares/rateLimiter.middleware");
const { upload, handleMulterError } = require("../utils/upload");
const { validate } = require("../middlewares/validation.middleware");

/**
 * @route POST /api/guest/predict
 * @desc Make plant health prediction (no auth required)
 * @access Public
 * @body image: file
 */
router.post(
  "/predict",
  guestLimiter, // ✅ FIXED - Use guest-specific rate limiter
  upload.single("image"),
  handleMulterError,
  guestController.predict
);

/**
 * @route POST /api/guest/predict/download-pdf
 * @desc Generate and download PDF report for a prediction
 * @access Public
 * @body prediction: object (prediction data)
 */
router.post(
  "/predict/download-pdf",
  guestLimiter,
  validate("downloadPDF"),
  guestController.downloadPDF
);

module.exports = router;
