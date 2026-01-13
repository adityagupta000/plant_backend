const rateLimit = require("express-rate-limit");
const constants = require("../config/constants");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

/**
 * Rate limiter for prediction endpoints
 * 50 requests per 15 minutes per IP/user
 */
const predictionLimiter = rateLimit({
  windowMs: constants.PREDICTION_RATE_WINDOW_MS,
  max: constants.PREDICTION_RATE_MAX,
  message: formatErrorResponse(
    "Too many prediction requests. Please try again later.",
    "RATE_LIMIT_EXCEEDED"
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "development",
  handler: (req, res) => {
    logger.warn("Prediction rate limit exceeded", {
      ip: req.ip,
      userId: req.userId,
    });
    res
      .status(429)
      .json(
        formatErrorResponse(
          "Too many prediction requests. Please try again later.",
          "RATE_LIMIT_EXCEEDED"
        )
      );
  },
});

/**
 * Rate limiter for auth endpoints
 * 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: constants.AUTH_RATE_WINDOW_MS,
  max: constants.AUTH_RATE_MAX,
  message: formatErrorResponse(
    "Too many authentication attempts. Please try again later.",
    "AUTH_RATE_LIMIT_EXCEEDED"
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "development",
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res
      .status(429)
      .json(
        formatErrorResponse(
          "Too many authentication attempts. Please try again later.",
          "AUTH_RATE_LIMIT_EXCEEDED"
        )
      );
  },
});

module.exports = {
  predictionLimiter,
  authLimiter,
};
