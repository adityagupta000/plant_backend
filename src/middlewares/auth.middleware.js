/**
 * Authentication Middleware
 * Protects routes and validates access tokens
 */

const tokenService = require("../services/token.service");
const authService = require("../services/auth.service");
const { formatErrorResponse } = require("../utils/helpers");
const constants = require("../config/constants");
const logger = require("../utils/logger");

/**
 * Authenticate access token middleware
 * Extracts and validates JWT access token from Authorization header
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    // Check if token exists
    if (!token) {
      logger.warn("Access attempt without token", {
        path: req.path,
        method: req.method,
      });
      return res
        .status(401)
        .json(formatErrorResponse("Access token required", "TOKEN_REQUIRED"));
    }

    // Verify token signature and expiration
    let decoded;
    try {
      decoded = await tokenService.validateAccessToken(token);
    } catch (error) {
      // Handle token expiration specifically
      if (error.code === constants.ERROR_CODES.TOKEN_EXPIRED) {
        logger.debug("Expired access token", {
          path: req.path,
        });
        return res
          .status(401)
          .json(
            formatErrorResponse(
              "Access token expired",
              constants.ERROR_CODES.TOKEN_EXPIRED,
              "Your session has expired. Please refresh your token."
            )
          );
      }

      // Invalid token
      logger.warn("Invalid access token", {
        error: error.message,
        path: req.path,
      });
      return res
        .status(401)
        .json(formatErrorResponse("Invalid access token", "INVALID_TOKEN"));
    }

    // Verify user still exists and is active
    const userExists = await authService.verifyUser(decoded.userId);

    if (!userExists) {
      logger.warn("Token valid but user not found or inactive", {
        userId: decoded.userId,
      });
      return res
        .status(401)
        .json(
          formatErrorResponse("User not found or inactive", "USER_NOT_FOUND")
        );
    }

    // Attach user info to request
    req.userId = decoded.userId;
    req.username = decoded.username;

    logger.debug("Authentication successful", {
      userId: decoded.userId,
      path: req.path,
    });

    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    logger.error("Error in authentication middleware", {
      error: error.message,
      path: req.path,
    });
    return res
      .status(500)
      .json(formatErrorResponse("Authentication error", "AUTH_ERROR"));
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if valid token is provided, but doesn't fail if missing
 * Useful for public endpoints that work better with authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    try {
      const decoded = await tokenService.validateAccessToken(token);

      // Verify user exists
      const userExists = await authService.verifyUser(decoded.userId);

      if (userExists) {
        req.userId = decoded.userId;
        req.username = decoded.username;
        req.authenticated = true;
      }
    } catch (error) {
      // Silently fail - token invalid or expired
      logger.debug("Optional auth token validation failed", {
        error: error.message,
      });
    }

    next();
  } catch (error) {
    logger.error("Error in optional auth middleware", {
      error: error.message,
    });
    next(); // Continue without authentication
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
