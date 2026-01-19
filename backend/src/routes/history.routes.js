/**
 * History Routes
 * Define all history/session management endpoints
 */

const express = require("express");
const router = express.Router();
const historyController = require("../controllers/history.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validation.middleware");

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/history/sessions
 * @desc    Get all prediction sessions for user (conversation list)
 * @access  Private
 * @query   limit: number, offset: number
 */
router.get("/sessions", historyController.getSessions);

/**
 * @route   GET /api/history/sessions/:sessionId/predictions
 * @desc    Get all predictions in a session (messages in conversation)
 * @access  Private
 * @query   limit: number, offset: number
 */
router.get(
  "/sessions/:sessionId/predictions",
  historyController.getSessionPredictions
);

/**
 * @route   PATCH /api/history/sessions/:sessionId
 * @desc    Update session title (rename conversation)
 * @access  Private
 * @body    title: string
 */
router.patch(
  "/sessions/:sessionId",
  validate("updateSession"),
  historyController.updateSessionTitle
);

/**
 * @route   DELETE /api/history/sessions/:sessionId
 * @desc    Delete session and all its predictions (delete conversation)
 * @access  Private
 */
router.delete("/sessions/:sessionId", historyController.deleteSession);

/**
 * @route   GET /api/history/predictions/:predictionId
 * @desc    Get single prediction details
 * @access  Private
 */
router.get(
  "/predictions/:predictionId",
  historyController.getPredictionDetails
);

module.exports = router;
