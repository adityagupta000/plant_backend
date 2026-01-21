/**
 * Admin Authorization Middleware
 * Restricts routes to admin users only
 */

const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

/**
 * Require admin role
 * Must be used AFTER authenticateToken middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be set by authenticateToken)
    if (!req.userId) {
      logger.warn("Admin middleware called without authentication");
      return res
        .status(401)
        .json(formatErrorResponse("Authentication required", "UNAUTHORIZED"));
    }

    // Get user from database to check role
    const { User } = require("../models");
    const user = await User.findByPk(req.userId);

    if (!user) {
      logger.warn("Admin check: User not found", { userId: req.userId });
      return res
        .status(401)
        .json(formatErrorResponse("User not found", "USER_NOT_FOUND"));
    }

    if (user.role !== "admin") {
      logger.warn("Non-admin user attempted to access admin route", {
        userId: req.userId,
        username: user.username,
        role: user.role,
        path: req.path,
      });
      return res
        .status(403)
        .json(
          formatErrorResponse(
            "Admin access required",
            "FORBIDDEN",
            "This endpoint requires administrator privileges"
          )
        );
    }

    // User is admin, attach role to request
    req.userRole = user.role;
    next();
  } catch (error) {
    logger.error("Error in admin middleware", {
      error: error.message,
      userId: req.userId,
    });
    return res
      .status(500)
      .json(formatErrorResponse("Authorization error", "AUTH_ERROR"));
  }
};

module.exports = {
  requireAdmin,
};