const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validation.middleware");
const {
  authLimiter,
  refreshLimiter, // NEW
} = require("../middlewares/rateLimiter.middleware");

// Public routes

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  "/register",
  validate("register"),
  authLimiter,
  authController.register
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
 * FIXED: Added refreshLimiter
 */
router.post("/refresh", refreshLimiter, authController.refreshToken);

// Protected routes

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

module.exports = router;
