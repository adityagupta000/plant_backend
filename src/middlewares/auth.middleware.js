/**
 * Authentication Middleware
 * Updated to support optional authentication for privacy-first approach
 */

const tokenService = require("../services/token.service");
const authService = require("../services/auth.service");
const { formatErrorResponse } = require("../utils/helpers");
const constants = require("../config/constants");
const logger = require("../utils/logger");

/**
 * Authenticate access token middleware (REQUIRED)
 * Extracts and validates JWT access token from Authorization header
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      logger.warn("Access attempt without token", {
        path: req.path,
        method: req.method,
      });
      return res
        .status(401)
        .json(formatErrorResponse("Access token required", "TOKEN_REQUIRED"));
    }

    let decoded;
    try {
      decoded = await tokenService.validateAccessToken(token);
    } catch (error) {
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

      logger.warn("Invalid access token", {
        error: error.message,
        path: req.path,
      });
      return res
        .status(401)
        .json(formatErrorResponse("Invalid access token", "INVALID_TOKEN"));
    }

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

    req.userId = decoded.userId;
    req.username = decoded.username;
    req.isAuthenticated = true; // NEW: Flag for authenticated requests

    logger.debug("Authentication successful", {
      userId: decoded.userId,
      path: req.path,
    });

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
 * Optional authentication middleware (NEW)
 * Attaches user info if valid token is provided, but doesn't fail if missing
 * Useful for endpoints that work both authenticated and unauthenticated
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // No token provided, continue as guest
      req.isAuthenticated = false;
      req.userId = null;
      req.username = null;
      return next();
    }

    try {
      const decoded = await tokenService.validateAccessToken(token);
      const userExists = await authService.verifyUser(decoded.userId);

      if (userExists) {
        req.userId = decoded.userId;
        req.username = decoded.username;
        req.isAuthenticated = true;
        logger.debug("Optional auth: User authenticated", {
          userId: decoded.userId,
        });
      } else {
        req.isAuthenticated = false;
        req.userId = null;
        req.username = null;
      }
    } catch (error) {
      // Token invalid or expired - continue as guest
      logger.debug("Optional auth: Token validation failed", {
        error: error.message,
      });
      req.isAuthenticated = false;
      req.userId = null;
      req.username = null;
    }

    next();
  } catch (error) {
    logger.error("Error in optional auth middleware", {
      error: error.message,
    });
    // On error, continue as guest
    req.isAuthenticated = false;
    req.userId = null;
    req.username = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
