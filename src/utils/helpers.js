/**
 * Helper Utility Functions
 * Common utility functions used throughout the application
 */

const path = require("path");
const constants = require("../config/constants");

/**
 * Sanitize filename to prevent path traversal attacks
 * @param {String} filename - Original filename
 * @returns {String} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  // Remove any path components
  const basename = path.basename(filename);

  // Replace any suspicious characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, "_");
};

/**
 * Generate unique filename with timestamp
 * @param {String} originalName - Original filename
 * @returns {String} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000000);
  const ext = path.extname(originalName);
  const sanitized = sanitizeFilename(path.basename(originalName, ext));

  return `${timestamp}-${randomNum}-${sanitized}${ext}`;
};

/**
 * Get confidence level based on confidence score
 * @param {Number} confidence - Confidence score (0-1)
 * @returns {String} Confidence level label
 */
const getConfidenceLevel = (confidence) => {
  const levels = constants.CONFIDENCE_LEVELS;

  if (confidence >= levels.VERY_HIGH.min) {
    return levels.VERY_HIGH.label;
  } else if (confidence >= levels.HIGH.min) {
    return levels.HIGH.label;
  } else if (confidence >= levels.MODERATE.min) {
    return levels.MODERATE.label;
  } else {
    return levels.LOW.label;
  }
};

/**
 * Parse category and subtype from predicted class
 * UPDATED: Added Not_Plant support
 * @param {String} predictedClass - Class name (e.g., "Pest_Fungal", "Not_Plant")
 * @returns {Object} { category, subtype }
 */
const parsePredictedClass = (predictedClass) => {
  // Handle Healthy case
  if (predictedClass === "Healthy") {
    return {
      category: "Healthy",
      subtype: null,
    };
  }

  // Handle Not_Plant case (NEW)
  if (predictedClass === "Not_Plant") {
    return {
      category: "Invalid Input",
      subtype: null,
    };
  }

  // Handle other cases with underscore splitting
  const parts = predictedClass.split("_");
  return {
    category: parts[0] || null,
    subtype: parts[1] || null,
  };
};

/**
 * Format date to ISO 8601 string
 * @param {Date} date - Date object
 * @returns {String} ISO 8601 formatted date
 */
const formatDate = (date) => {
  return date ? new Date(date).toISOString() : null;
};

/**
 * Generate default session title with date
 * @returns {String} Default session title
 */
const generateDefaultSessionTitle = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Diagnosis - ${dateStr}`;
};

/**
 * Calculate pagination metadata
 * @param {Number} total - Total count of items
 * @param {Number} limit - Items per page
 * @param {Number} offset - Current offset
 * @returns {Object} Pagination metadata
 */
const getPaginationMetadata = (total, limit, offset) => {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    currentPage: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Validate file extension
 * @param {String} filename - File name
 * @param {Array} allowedExtensions - Allowed extensions
 * @returns {Boolean} True if valid
 */
const isValidExtension = (
  filename,
  allowedExtensions = constants.ALLOWED_EXTENSIONS
) => {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  return allowedExtensions.includes(ext);
};

/**
 * Validate file MIME type
 * @param {String} mimetype - File MIME type
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {Boolean} True if valid
 */
const isValidMimeType = (
  mimetype,
  allowedTypes = constants.ALLOWED_FILE_TYPES
) => {
  return allowedTypes.includes(mimetype);
};

/**
 * Format error response
 * @param {String} message - Error message
 * @param {String} code - Error code
 * @param {Array} details - Additional error details
 * @returns {Object} Formatted error object
 */
const formatErrorResponse = (message, code = null, details = null) => {
  const error = { error: message };

  if (code) {
    error.code = code;
  }

  if (details) {
    error.details = details;
  }

  return error;
};

/**
 * Format success response
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @returns {Object} Formatted success object
 */
const formatSuccessResponse = (data, message = null) => {
  const response = { success: true };

  if (message) {
    response.message = message;
  }

  return { ...response, ...data };
};

/**
 * Sleep/delay function
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Extract IP address from request
 * @param {Object} req - Express request object
 * @returns {String} IP address
 */
const getClientIp = (req) => {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    "unknown"
  );
};

/**
 * Extract user agent from request
 * @param {Object} req - Express request object
 * @returns {String} User agent string
 */
const getUserAgent = (req) => {
  return req.headers["user-agent"] || "unknown";
};

module.exports = {
  sanitizeFilename,
  generateUniqueFilename,
  getConfidenceLevel,
  parsePredictedClass,
  formatDate,
  generateDefaultSessionTitle,
  getPaginationMetadata,
  isValidExtension,
  isValidMimeType,
  formatErrorResponse,
  formatSuccessResponse,
  sleep,
  getClientIp,
  getUserAgent,
};