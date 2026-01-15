const express = require("express");
const router = express.Router();
const predictionController = require("../controllers/prediction.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validation.middleware");
const {
  predictionLimiter,
  healthLimiter, // NEW
} = require("../middlewares/rateLimiter.middleware");
const { upload, handleMulterError } = require("../utils/upload");

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/predict/health
 * @desc Check AI service health status
 * @access Private
 * FIXED: Added healthLimiter
 */
router.get("/health", healthLimiter, predictionController.checkAIServiceHealth);

/**
 * @route POST /api/predict/session
 * @desc Create new prediction session
 * @access Private
 */
router.post(
  "/session",
  validate("createSession"),
  predictionController.createSession
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
  upload.single("image"),
  handleMulterError,
  predictionController.predict
);

module.exports = router;
