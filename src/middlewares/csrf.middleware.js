/**
 * CSRF Protection Middleware
 * Protects cookie-based authentication from CSRF attacks
 */

const csrf = require("csurf");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

// Create CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  },
});

/**
 * CSRF error handler
 */
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn("CSRF token validation failed", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return res
      .status(403)
      .json(
        formatErrorResponse(
          "Invalid CSRF token",
          "INVALID_CSRF_TOKEN",
          "This request appears to be a cross-site request forgery. Please refresh the page and try again.",
        ),
      );
  }

  next(err);
};

/**
 * Attach CSRF token to response
 */
const attachCsrfToken = (req, res, next) => {
  // Add CSRF token to response headers
  res.set("X-CSRF-Token", req.csrfToken());
  next();
};

/**
 * CSRF protection for specific routes
 * Use this for state-changing operations (POST, PUT, PATCH, DELETE)
 */
const protectRoute = [csrfProtection, attachCsrfToken];

/**
 * Skip CSRF for certain routes (like health checks)
 */
const skipCsrf = (req, res, next) => {
  const skipPaths = [
    "/health",
    "/api/system/health",
    "/api/guest/predict", // Guest predictions don't use cookies
  ];

  if (skipPaths.includes(req.path)) {
    return next();
  }

  return csrfProtection(req, res, next);
};

module.exports = {
  csrfProtection,
  csrfErrorHandler,
  attachCsrfToken,
  protectRoute,
  skipCsrf,
};
