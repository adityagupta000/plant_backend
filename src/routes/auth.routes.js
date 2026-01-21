/**
 * Authentication Routes - ENHANCED
 * Added rate limiting for token refresh
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validation.middleware");
const {
  authLimiter,
  refreshLimiter, // ENHANCEMENT: Import refresh limiter
} = require("../middlewares/rateLimiter.middleware");

// Public routes (no authentication required)

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  "/register",
  validate("register"),
  authLimiter,
  authController.register,
);

/**
 * @route POST /api/auth/login
 * @desc Login user and return access token + refresh token (cookie)
 * @access Public
 */
router.post("/login", validate("login"), authLimiter, authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token from cookie
 * @access Public (requires refresh token in cookie)
 * ENHANCEMENT: Added rate limiting to prevent token refresh abuse
 */
router.post("/refresh", refreshLimiter, authController.refreshToken);

// Protected routes (authentication required)

/**
 * @route POST /api/auth/logout
 * @desc Logout user and revoke refresh token
 * @access Private
 */
router.post("/logout", authenticateToken, authController.logout);

/**
 * @route POST /api/auth/logout-all
 * @desc Logout from all devices (revoke all refresh tokens)
 * @access Private
 */
router.post("/logout-all", authenticateToken, authController.logoutAll);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get("/profile", authenticateToken, authController.getProfile);

/**
 * ENHANCEMENT: Get all active sessions
 * @route GET /api/auth/sessions
 * @desc Get all active sessions for current user
 * @access Private
 */
router.get("/sessions", authenticateToken, authController.getSessions);

/**
 * ENHANCEMENT: Revoke specific session
 * @route DELETE /api/auth/sessions/:sessionId
 * @desc Revoke a specific session by ID
 * @access Private
 */
router.delete(
  "/sessions/:sessionId",
  authenticateToken,
  authController.revokeSession,
);

module.exports = router;
