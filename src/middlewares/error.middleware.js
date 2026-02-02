const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

/**
 * Global error handling middleware - FIXED
 * Must be the last middleware in the chain
 */
const errorMiddleware = (err, req, res, next) => {
  // Log error
  logger.error("Error occurred", {
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.userId,
  });

  // Default error response
  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";

  // ✅ FIX: Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON format";
    code = "INVALID_JSON";
    return res.status(statusCode).json(formatErrorResponse(message, code));
  }

  // Handle specific error types

  // Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = "Validation error";
    code = "VALIDATION_ERROR";
    const details = err.errors.map((e) => e.message);
    return res
      .status(statusCode)
      .json(formatErrorResponse(message, code, details));
  }

  // Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message = "Resource already exists";
    code = "DUPLICATE_RESOURCE";
    const field = err.errors[0]?.path || "field";
    return res
      .status(statusCode)
      .json(formatErrorResponse(`${field} already exists`, code));
  }

  // Sequelize foreign key constraint errors
  if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message = "Invalid reference";
    code = "INVALID_REFERENCE";
    return res.status(statusCode).json(formatErrorResponse(message, code));
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
    return res.status(statusCode).json(formatErrorResponse(message, code));
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
    return res.status(statusCode).json(formatErrorResponse(message, code));
  }

  // Custom application errors with codes
  if (err.code) {
    code = err.code;
    message = err.message;

    // Map error codes to status codes
    if (code === "USER_NOT_FOUND" || code === "SESSION_NOT_FOUND") {
      statusCode = 404;
    } else if (code === "INVALID_CREDENTIALS" || code === "ACCOUNT_INACTIVE") {
      statusCode = 401;
    } else if (code === "EMAIL_EXISTS" || code === "USERNAME_EXISTS") {
      statusCode = 409;
    } else if (code === "AI_SERVICE_UNAVAILABLE") {
      statusCode = 503;
    } else if (code.includes("INVALID") || code.includes("VALIDATION")) {
      statusCode = 400;
    }
  }

  // Send error response
  const response = formatErrorResponse(message, code);

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorMiddleware;
