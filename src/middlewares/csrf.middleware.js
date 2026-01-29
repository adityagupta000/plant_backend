/**
 * CSRF Protection Middleware - DISABLED
 * Note: CSRF protection removed - relying on SameSite cookies + CORS
 */

const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

/**
 * CSRF error handler (no-op)
 */
const csrfErrorHandler = (err, req, res, next) => {
  // Pass through - no CSRF validation
  next(err);
};

/**
 * Attach CSRF token to response (no-op)
 */
const attachCsrfToken = (req, res, next) => {
  // No-op
  next();
};

/**
 * CSRF protection for specific routes (no-op)
 */
const protectRoute = [attachCsrfToken];

/**
 * Skip CSRF for certain routes (no-op)
 */
const skipCsrf = (req, res, next) => {
  next();
};

module.exports = {
  csrfProtection: (req, res, next) => next(), // No-op
  csrfErrorHandler,
  attachCsrfToken,
  protectRoute,
  skipCsrf,
};