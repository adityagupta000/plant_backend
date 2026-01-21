/**
 * Request ID Middleware
 * Generates unique ID for each request for better debugging and tracing
 */

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

/**
 * Generate and attach request ID
 */
const requestIdMiddleware = (req, res, next) => {
  // Check if request ID already exists (from load balancer, etc.)
  const existingRequestId =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    req.headers["x-trace-id"];

  // Generate new ID if not provided
  const requestId = existingRequestId || uuidv4();

  // Attach to request object
  req.requestId = requestId;

  // Attach to response headers
  res.setHeader("X-Request-ID", requestId);

  // Log request start with ID
  logger.info("Request started", {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Track request timing
  const startTime = Date.now();

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || null,
    });

    return originalJson(body);
  };

  // Override res.send to log response
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || null,
    });

    return originalSend(body);
  };

  next();
};

/**
 * Enhanced logger that includes request ID
 */
const createRequestLogger = (req) => {
  return {
    info: (message, meta = {}) => {
      logger.info(message, { ...meta, requestId: req.requestId });
    },
    error: (message, meta = {}) => {
      logger.error(message, { ...meta, requestId: req.requestId });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { ...meta, requestId: req.requestId });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, { ...meta, requestId: req.requestId });
    },
  };
};

/**
 * Helper to get request ID from request
 */
const getRequestId = (req) => {
  return req.requestId || "unknown";
};

module.exports = {
  requestIdMiddleware,
  createRequestLogger,
  getRequestId,
};
