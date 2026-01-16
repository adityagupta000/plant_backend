/**
 * System Routes
 * Monitoring and diagnostic endpoints
 */

const express = require("express");
const router = express.Router();
const systemController = require("../controllers/system.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// Public health check
router.get("/health", systemController.getSystemHealth);

// Redis status (public for now, secure in production)
router.get("/redis-status", systemController.getRedisStatus);

// Guest statistics
router.get("/guest-stats", systemController.getGuestStats);

// Test guest limits (public for testing)
router.post("/test-guest-limit", systemController.testGuestLimit);

// Protected routes (require authentication)
router.post(
  "/clear-guest-store",
  authenticateToken,
  systemController.clearGuestStore
);

module.exports = router;
