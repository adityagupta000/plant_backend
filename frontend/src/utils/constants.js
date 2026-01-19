// src/utils/constants.js - FULLY ALIGNED WITH BACKEND
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================================================
// EXACT MATCH: Backend Error Codes from src/config/constants.js
// ============================================================================
export const ERROR_CODES = {
  // Authentication Errors
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  REFRESH_TOKEN_EXPIRED: "REFRESH_TOKEN_EXPIRED",
  TOKEN_REVOKED: "TOKEN_REVOKED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  REFRESH_TOKEN_REQUIRED: "REFRESH_TOKEN_REQUIRED",

  // User Errors
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  EMAIL_EXISTS: "EMAIL_EXISTS",
  USERNAME_EXISTS: "USERNAME_EXISTS",

  // AI Service Errors
  AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_SERVICE_TIMEOUT: "AI_SERVICE_TIMEOUT",
  AI_PREDICTION_FAILED: "AI_PREDICTION_FAILED",
  MODEL_NOT_LOADED: "MODEL_NOT_LOADED",
  AI_OUTPUT_TOO_LARGE: "AI_OUTPUT_TOO_LARGE",

  // File Upload Errors
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  INVALID_FILE_EXTENSION: "INVALID_FILE_EXTENSION",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_REQUIRED: "FILE_REQUIRED",
  INVALID_IMAGE: "INVALID_IMAGE",
  INVALID_FILENAME: "INVALID_FILENAME",
  PATH_TRAVERSAL_ATTEMPT: "PATH_TRAVERSAL_ATTEMPT",

  // Session/History Errors
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  PREDICTION_NOT_FOUND: "PREDICTION_NOT_FOUND",
  INVALID_SESSION_ID: "INVALID_SESSION_ID",
  INVALID_PREDICTION_ID: "INVALID_PREDICTION_ID",

  // Validation Errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  PREDICTION_REQUIRED: "PREDICTION_REQUIRED",

  // Rate Limiting - COMPLETE SET
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  AUTH_RATE_LIMIT_EXCEEDED: "AUTH_RATE_LIMIT_EXCEEDED",
  HEALTH_RATE_LIMIT_EXCEEDED: "HEALTH_RATE_LIMIT_EXCEEDED",
  GUEST_RATE_LIMIT_EXCEEDED: "GUEST_RATE_LIMIT_EXCEEDED",
  GUEST_IP_LIMIT_EXCEEDED: "GUEST_IP_LIMIT_EXCEEDED",
  GUEST_DAILY_LIMIT_EXCEEDED: "GUEST_DAILY_LIMIT_EXCEEDED",
  GUEST_SESSION_LIMIT_EXCEEDED: "GUEST_SESSION_LIMIT_EXCEEDED",
  REFRESH_RATE_LIMIT_EXCEEDED: "REFRESH_RATE_LIMIT_EXCEEDED",
  HISTORY_RATE_LIMIT_EXCEEDED: "HISTORY_RATE_LIMIT_EXCEEDED",

  // Security
  SUSPICIOUS_ACTIVITY_DETECTED: "SUSPICIOUS_ACTIVITY_DETECTED",
  FEATURE_REQUIRES_AUTHENTICATION: "FEATURE_REQUIRES_AUTHENTICATION",

  // Generic
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
};

// ============================================================================
// User-Friendly Error Messages
// ============================================================================
export const ERROR_MESSAGES = {
  [ERROR_CODES.TOKEN_EXPIRED]: "Your session expired. Please log in again.",
  [ERROR_CODES.REFRESH_TOKEN_EXPIRED]: "Session expired. Please log in again.",
  [ERROR_CODES.INVALID_CREDENTIALS]: "Invalid email or password.",
  [ERROR_CODES.EMAIL_EXISTS]: "This email is already registered.",
  [ERROR_CODES.USERNAME_EXISTS]: "Username already taken.",
  [ERROR_CODES.AI_SERVICE_UNAVAILABLE]:
    "AI service temporarily unavailable. Please try again.",
  [ERROR_CODES.AI_PREDICTION_FAILED]:
    "Failed to analyze image. Please try again.",
  [ERROR_CODES.INVALID_FILE_TYPE]: "Invalid file type. Use JPG or PNG images.",
  [ERROR_CODES.FILE_TOO_LARGE]: "File too large. Maximum size is 5MB.",
  [ERROR_CODES.FILE_REQUIRED]: "Please select an image to upload.",
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Too many requests. Please wait a moment.",
  [ERROR_CODES.GUEST_RATE_LIMIT_EXCEEDED]:
    "Free prediction limit reached. Create an account to continue.",
  [ERROR_CODES.AUTH_RATE_LIMIT_EXCEEDED]:
    "Too many login attempts. Please try again later.",
  [ERROR_CODES.PATH_TRAVERSAL_ATTEMPT]: "Invalid file name detected.",
  [ERROR_CODES.INVALID_IMAGE]: "Invalid image file.",
  [ERROR_CODES.SUSPICIOUS_ACTIVITY_DETECTED]:
    "Too many rapid requests. Please slow down or create an account.",
  [ERROR_CODES.FEATURE_REQUIRES_AUTHENTICATION]:
    "This feature requires an account. Sign up for free!",
};

// ============================================================================
// File Upload Configuration (matches backend)
// ============================================================================
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];

// ============================================================================
// Model Information (EXACT match to backend)
// ============================================================================
export const MODEL_NAME = "efficientnet_b2";
export const MODEL_VERSION = "v1.0.0";
export const MODEL_INPUT_SIZE = 224;

export const MODEL_CLASSES = [
  "Healthy",
  "Pest_Fungal",
  "Pest_Bacterial",
  "Pest_Insect",
  "Nutrient_Nitrogen",
  "Nutrient_Potassium",
  "Water_Stress",
  "Not_Plant", // CRITICAL: Added Not_Plant class
];

// ============================================================================
// Confidence Levels (matches backend exactly)
// ============================================================================
export const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.85)
    return { label: "Very High", color: "text-green-700" };
  if (confidence >= 0.7) return { label: "High", color: "text-green-600" };
  if (confidence >= 0.55)
    return { label: "Moderate", color: "text-yellow-600" };
  return { label: "Low", color: "text-red-600" };
};

// ============================================================================
// COMPLETE Disease Information (with Not_Plant support)
// ============================================================================
export const DISEASE_INFO = {
  // CRITICAL: Not_Plant detection
  Not_Plant: {
    title: "Not a Plant",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    description:
      "This image does not appear to be a plant. Please upload a clear photo of a plant's leaves or affected areas.",
    recommendations: [
      "Upload a clear image of plant leaves",
      "Ensure the plant is the main subject",
      "Avoid images of animals, people, or objects",
      "Use good lighting and focus on the plant",
    ],
  },

  Healthy: {
    title: "Healthy Plant",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Your plant is in excellent health!",
    recommendations: [
      "Continue current care routine",
      "Monitor regularly for changes",
      "Maintain proper watering and light",
      "Ensure good air circulation",
    ],
  },

  Pest_Fungal: {
    title: "Fungal Infection",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "Fungal infection detected. Immediate treatment recommended.",
    recommendations: [
      "Apply fungicide immediately (copper-based or organic)",
      "Remove affected leaves and dispose properly",
      "Improve air circulation around plant",
      "Reduce watering frequency and avoid overhead watering",
      "Isolate plant to prevent spread",
    ],
  },

  Pest_Bacterial: {
    title: "Bacterial Infection",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "Bacterial infection detected. Quick action required.",
    recommendations: [
      "Isolate affected plant immediately",
      "Apply copper-based bactericide",
      "Remove and destroy infected parts",
      "Sterilize tools after use",
      "Avoid overhead watering",
    ],
  },

  Pest_Insect: {
    title: "Insect Infestation",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    description: "Insect pests detected on your plant.",
    recommendations: [
      "Identify specific insect pest",
      "Apply appropriate insecticide or use neem oil",
      "Check for eggs under leaves",
      "Remove visible pests manually",
      "Introduce beneficial insects if possible",
    ],
  },

  Nutrient_Nitrogen: {
    title: "Nitrogen Deficiency",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Plant shows signs of nitrogen deficiency.",
    recommendations: [
      "Apply nitrogen-rich fertilizer",
      "Use compost or well-rotted manure",
      "Monitor leaf color changes",
      "Ensure proper soil pH (6.0-7.0)",
      "Consider foliar feeding for quick results",
    ],
  },

  Nutrient_Potassium: {
    title: "Potassium Deficiency",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "Potassium deficiency detected.",
    recommendations: [
      "Apply potassium fertilizer",
      "Use banana peels or wood ash as natural source",
      "Monitor leaf edges for browning",
      "Avoid over-fertilization with nitrogen",
      "Check soil drainage",
    ],
  },

  Water_Stress: {
    title: "Water Stress",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    description: "Plant is experiencing water stress.",
    recommendations: [
      "Adjust watering schedule based on soil moisture",
      "Check soil moisture regularly (finger test)",
      "Ensure proper drainage to prevent waterlogging",
      "Consider mulching to retain moisture",
      "Water deeply but less frequently",
    ],
  },
};

// ============================================================================
// Guest Mode Configuration (matches backend)
// ============================================================================
export const GUEST_LIMITS = {
  IP_LIMIT: 5, // Per hour
  FINGERPRINT_LIMIT: 10, // Per day
  SESSION_LIMIT: 4, // Per session
  PREDICTION_LIMIT: 10, // Daily limit per IP
};

// ============================================================================
// Feature Flags
// ============================================================================
export const FEATURES = {
  GUEST_MODE: true,
  OPTIONAL_LOGIN: true,
  PDF_DOWNLOAD: true,
  HISTORY_TRACKING: true,
  ANALYTICS: false,
};
