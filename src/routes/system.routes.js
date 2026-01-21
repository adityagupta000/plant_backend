/**
 * System Routes - ENHANCED
 * Comprehensive monitoring and diagnostic endpoints
 */

const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middlewares/admin.middleware");
const systemController = require("../controllers/system.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { cspReportHandler } = require("../middlewares/cspReport.middleware");

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * @route GET /api/system/health
 * @desc Get complete system health status
 * @access Public
 */
router.get("/health", systemController.getSystemHealth);

/**
 * @route GET /api/system/redis-status
 * @desc Get Redis connection status
 * @access Public
 */
router.get("/redis-status", systemController.getRedisStatus);

/**
 * @route GET /api/system/guest-stats
 * @desc Get guest rate limiting statistics
 * @access Public
 */
router.get("/guest-stats", systemController.getGuestStats);

/**
 * @route POST /api/system/test-guest-limit
 * @desc Test guest rate limiting
 * @access Public
 */
router.post("/test-guest-limit", systemController.testGuestLimit);

/**
 * ENHANCEMENT: CSP Report Endpoint
 * @route POST /api/system/csp-report
 * @desc Receive CSP violation reports
 * @access Public
 */
router.use("/csp-report", cspReportHandler);

// ============================================================================
// PROTECTED ENDPOINTS (require admin authentication)
// ============================================================================

/**
 * @route POST /api/system/clear-guest-store
 * @desc Clear guest memory store (admin only)
 * @access Admin
 */
router.post(
  "/clear-guest-store",
  authenticateToken,
  requireAdmin, // ADD THIS
  systemController.clearGuestStore,
);

/**
 * ENHANCEMENT: Database Statistics
 * @route GET /api/system/database-stats
 * @desc Get detailed database pool statistics
 * @access Admin
 */
router.get(
  "/database-stats",
  authenticateToken,
  requireAdmin, // ADD THIS
  systemController.getDatabaseStats,
);

/**
 * ENHANCEMENT: Storage Statistics
 * @route GET /api/system/storage-stats
 * @desc Get file storage statistics
 * @access Admin
 */
router.get(
  "/storage-stats",
  authenticateToken,
  requireAdmin, // ADD THIS
  systemController.getStorageStats,
);

/**
 * ENHANCEMENT: CSP Statistics
 * @route GET /api/system/csp-stats
 * @desc Get CSP violation statistics
 * @access Admin
 */
router.get(
  "/csp-stats",
  authenticateToken,
  requireAdmin,
  systemController.getCspStats,
);
module.exports = router;
