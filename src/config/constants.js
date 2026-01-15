/**
 * Application Constants
 * UPDATED: Added guest mode and privacy configuration
 */

module.exports = {
  // ============================================================================
  // FILE UPLOAD CONFIGURATION
  // ============================================================================

  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB

  ALLOWED_FILE_TYPES: (
    process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg'
  ).split(','),

  ALLOWED_EXTENSIONS: (
    process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png'
  ).split(','),

  // ============================================================================
  // MODEL INFORMATION - CRITICAL FIX: MATCHES YOUR TRAINING EXACTLY
  // ============================================================================

  MODEL_NAME: process.env.MODEL_NAME || 'efficientnet_b2',
  MODEL_VERSION: process.env.MODEL_VERSION || 'v1.0.0',
  MODEL_INPUT_SIZE: parseInt(process.env.MODEL_INPUT_SIZE) || 224,

  // Class order from config.yaml (EXACT ORDER MATTERS!)
  MODEL_CLASSES: (
    process.env.MODEL_CLASSES ||
    'Healthy,Pest_Fungal,Pest_Bacterial,Pest_Insect,Nutrient_Nitrogen,Nutrient_Potassium,Water_Stress'
  ).split(','),

  // ============================================================================
  // AI SERVICE CONFIGURATION
  // ============================================================================

  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_SERVICE_TIMEOUT: parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000,
  AI_SERVICE_MAX_RETRIES: parseInt(process.env.AI_SERVICE_MAX_RETRIES) || 3,
  AI_SERVICE_RETRY_DELAY: parseInt(process.env.AI_SERVICE_RETRY_DELAY) || 1000,

  // SECURITY: Maximum output size from Python (prevent DoS)
  AI_MAX_OUTPUT_SIZE: parseInt(process.env.AI_MAX_OUTPUT_SIZE) || 1048576, // 1MB

  // ============================================================================
  // GUEST MODE CONFIGURATION (NEW)
  // ============================================================================

  GUEST_MODE_ENABLED: process.env.GUEST_MODE_ENABLED !== 'false', // Default: enabled
  GUEST_PREDICTION_LIMIT: parseInt(process.env.GUEST_PREDICTION_LIMIT) || 10, // Per IP per day
  TEMP_PDF_CLEANUP_DELAY: parseInt(process.env.TEMP_PDF_CLEANUP_DELAY) || 300000, // 5 minutes

  // ============================================================================
  // PRIVACY SETTINGS (NEW)
  // ============================================================================

  DEFAULT_STATELESS_MODE: process.env.DEFAULT_STATELESS_MODE !== 'false', // Default: true
  ALLOW_OPTIONAL_LOGIN: process.env.ALLOW_OPTIONAL_LOGIN !== 'false', // Default: true
  DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS) || 90, // For logged-in users

  // ============================================================================
  // RATE LIMITING CONFIGURATION
  // ============================================================================

  // Prediction Rate Limit
  PREDICTION_RATE_WINDOW_MS: parseInt(process.env.PREDICTION_RATE_WINDOW_MS) || 900000,
  PREDICTION_RATE_MAX: parseInt(process.env.PREDICTION_RATE_MAX) || 50,

  // Auth Rate Limit
  AUTH_RATE_WINDOW_MS: parseInt(process.env.AUTH_RATE_WINDOW_MS) || 900000,
  AUTH_RATE_MAX: parseInt(process.env.AUTH_RATE_MAX) || 10,

  // Health endpoint rate limit
  HEALTH_RATE_WINDOW_MS: parseInt(process.env.HEALTH_RATE_WINDOW_MS) || 60000,
  HEALTH_RATE_MAX: parseInt(process.env.HEALTH_RATE_MAX) || 10,

  // Guest rate limit (NEW)
  GUEST_RATE_WINDOW_MS: parseInt(process.env.GUEST_RATE_WINDOW_MS) || 3600000, // 1 hour
  GUEST_RATE_MAX: parseInt(process.env.GUEST_RATE_MAX) || 10,

  // ============================================================================
  // SECURITY CONFIGURATION
  // ============================================================================

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  LOCKOUT_DURATION_MS: parseInt(process.env.LOCKOUT_DURATION_MS) || 900000,

  // JWT secret minimum length validation
  MIN_JWT_SECRET_LENGTH: parseInt(process.env.MIN_JWT_SECRET_LENGTH) || 32,

  // ============================================================================
  // STORAGE CONFIGURATION
  // ============================================================================

  STORAGE_TYPE: process.env.STORAGE_TYPE || 'local',
  TEMP_FILE_CLEANUP: process.env.TEMP_FILE_CLEANUP !== 'false',
  CLEANUP_DELAY_MS: parseInt(process.env.CLEANUP_DELAY_MS) || 10000, // 10 seconds

  // ============================================================================
  // CONFIDENCE LEVELS - Matches training thresholds
  // ============================================================================

  CONFIDENCE_LEVELS: {
    VERY_HIGH: { 
      min: 0.85,
      label: 'Very High',
      description: 'Highly confident prediction'
    },
    HIGH: { 
      min: 0.70,
      label: 'High',
      description: 'Confident prediction'
    },
    MODERATE: { 
      min: 0.55,
      label: 'Moderate',
      description: 'Moderately confident prediction'
    },
    LOW: { 
      min: 0, 
      label: 'Low',
      description: 'Low confidence - manual inspection recommended'
    }
  },

  // ============================================================================
  // PREDICTION STATUS
  // ============================================================================

  PREDICTION_STATUS: {
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending'
  },

  // ============================================================================
  // ERROR CODES
  // ============================================================================

  ERROR_CODES: {
    // Authentication Errors
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
    TOKEN_REVOKED: 'TOKEN_REVOKED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_REQUIRED: 'TOKEN_REQUIRED',
    REFRESH_TOKEN_REQUIRED: 'REFRESH_TOKEN_REQUIRED',

    // User Errors
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
    EMAIL_EXISTS: 'EMAIL_EXISTS',
    USERNAME_EXISTS: 'USERNAME_EXISTS',

    // AI Service Errors
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    AI_SERVICE_TIMEOUT: 'AI_SERVICE_TIMEOUT',
    AI_PREDICTION_FAILED: 'AI_PREDICTION_FAILED',
    MODEL_NOT_LOADED: 'MODEL_NOT_LOADED',
    AI_OUTPUT_TOO_LARGE: 'AI_OUTPUT_TOO_LARGE',

    // File Upload Errors
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    INVALID_FILE_EXTENSION: 'INVALID_FILE_EXTENSION',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    FILE_REQUIRED: 'FILE_REQUIRED',
    INVALID_IMAGE: 'INVALID_IMAGE',
    INVALID_FILENAME: 'INVALID_FILENAME',
    PATH_TRAVERSAL_ATTEMPT: 'PATH_TRAVERSAL_ATTEMPT',

    // Session/History Errors
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    PREDICTION_NOT_FOUND: 'PREDICTION_NOT_FOUND',
    INVALID_SESSION_ID: 'INVALID_SESSION_ID',
    INVALID_PREDICTION_ID: 'INVALID_PREDICTION_ID',

    // Validation Errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    PREDICTION_REQUIRED: 'PREDICTION_REQUIRED', // NEW

    // Rate Limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    AUTH_RATE_LIMIT_EXCEEDED: 'AUTH_RATE_LIMIT_EXCEEDED',
    HEALTH_RATE_LIMIT_EXCEEDED: 'HEALTH_RATE_LIMIT_EXCEEDED',
    GUEST_RATE_LIMIT_EXCEEDED: 'GUEST_RATE_LIMIT_EXCEEDED', // NEW

    // Generic
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHORIZED: 'UNAUTHORIZED'
  },

  // ============================================================================
  // HTTP STATUS CODES
  // ============================================================================

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    UNSUPPORTED_MEDIA_TYPE: 415,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // ============================================================================
  // PAGINATION DEFAULTS
  // ============================================================================

  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
    DEFAULT_OFFSET: 0
  },

  // ============================================================================
  // SESSION DEFAULTS
  // ============================================================================

  SESSION: {
    DEFAULT_TITLE_PREFIX: 'Diagnosis',
    MAX_TITLE_LENGTH: 255,
    MAX_PREDICTIONS_PER_SESSION: 1000
  },

  // ============================================================================
  // LOGGING CONFIGURATION
  // ============================================================================

  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },

  // ============================================================================
  // ENVIRONMENT
  // ============================================================================

  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',

  // ============================================================================
  // TIMEOUTS (in milliseconds)
  // ============================================================================

  TIMEOUTS: {
    REQUEST_TIMEOUT: 30000,
    DB_QUERY_TIMEOUT: 10000,
    FILE_UPLOAD_TIMEOUT: 60000,
    AI_HEALTH_CHECK_TIMEOUT: 5000,
    PDF_GENERATION_TIMEOUT: 15000 // NEW
  },

  // ============================================================================
  // REGEX PATTERNS
  // ============================================================================

  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
    PASSWORD_MIN_LENGTH: 6,
    IMAGE_FILENAME: /\.(jpg|jpeg|png)$/i,
    // Path traversal detection
    PATH_TRAVERSAL: /\.\.|\/\.\.|\\|%2e|%2f|%5c/i
  },

  // ============================================================================
  // PDF CONFIGURATION (NEW)
  // ============================================================================

  PDF: {
    PAGE_SIZE: 'A4',
    MARGIN: 50,
    TITLE_FONT_SIZE: 24,
    HEADER_FONT_SIZE: 14,
    BODY_FONT_SIZE: 11,
    FOOTER_FONT_SIZE: 8,
    TABLE_ROW_HEIGHT: 25,
    TEMP_DIR: './temp_pdfs',
    MAX_FILE_AGE_MS: 300000, // 5 minutes
    COLORS: {
      PRIMARY: '#3498db',
      SUCCESS: '#27ae60',
      WARNING: '#f39c12',
      DANGER: '#e74c3c',
      DARK: '#2c3e50',
      LIGHT: '#ecf0f1',
      GRAY: '#7f8c8d'
    }
  },

  // ============================================================================
  // FEATURES FLAGS (NEW)
  // ============================================================================

  FEATURES: {
    GUEST_MODE: process.env.GUEST_MODE_ENABLED !== 'false',
    OPTIONAL_LOGIN: process.env.ALLOW_OPTIONAL_LOGIN !== 'false',
    PDF_DOWNLOAD: process.env.PDF_DOWNLOAD_ENABLED !== 'false',
    HISTORY_TRACKING: process.env.HISTORY_TRACKING_ENABLED !== 'false',
    EMAIL_NOTIFICATIONS: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true', // Default: disabled
    CLOUD_STORAGE: process.env.CLOUD_STORAGE_ENABLED === 'true', // Default: disabled
    ANALYTICS: process.env.ANALYTICS_ENABLED === 'true' // Default: disabled
  }
};