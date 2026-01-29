const Joi = require("joi");
const { formatErrorResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const schemas = {
  // --------------------------------------------------------------------------
  // REGISTER (STRONG PASSWORD VALIDATION)
  // --------------------------------------------------------------------------
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      "string.alphanum": "Username must only contain alphanumeric characters",
      "string.min": "Username must be at least 3 characters long",
      "string.max": "Username cannot exceed 30 characters",
      "any.required": "Username is required",
    }),

    email: Joi.string().email().required().messages({
      "string.email": "Must be a valid email address",
      "any.required": "Email is required",
    }),

    password: Joi.string()
      .min(8)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[#@$!%*?&])[A-Za-z\\d@#$!%*?&]{8,}$",
        ),
      )
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "Password is required",
      }),
  }),

  // --------------------------------------------------------------------------
  // LOGIN (INTENTIONALLY NO STRONG VALIDATION)
  // --------------------------------------------------------------------------
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Must be a valid email address",
      "any.required": "Email is required",
    }),

    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),

  // --------------------------------------------------------------------------
  // CREATE SESSION
  // --------------------------------------------------------------------------
  createSession: Joi.object({
    title: Joi.string().max(255).optional().messages({
      "string.max": "Title cannot exceed 255 characters",
    }),
  }),

  // --------------------------------------------------------------------------
  // UPDATE SESSION
  // --------------------------------------------------------------------------
  updateSession: Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      "string.min": "Title cannot be empty",
      "string.max": "Title cannot exceed 255 characters",
      "any.required": "Title is required",
    }),
  }),

  // --------------------------------------------------------------------------
  // DOWNLOAD PDF - FIXED: Added missing schema
  // --------------------------------------------------------------------------
  downloadPDF: Joi.object({
    prediction: Joi.object().required().messages({
      "any.required": "Prediction data is required",
      "object.base": "Prediction must be an object",
    }),
  }).unknown(true), // Allow additional fields
};

// ============================================================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================================================
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      logger.error("Validation schema not found", { schemaName });
      return res
        .status(500)
        .json(
          formatErrorResponse("Internal validation error", "INTERNAL_ERROR"),
        );
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // return all validation errors
      stripUnknown: true, // remove unexpected fields
    });

    if (error) {
      const details = error.details.map((detail) => detail.message);

      // CRITICAL FIX: Create comprehensive error message
      const errorMessage = details.join("; ");

      logger.warn("Validation failed", {
        schema: schemaName,
        errors: details,
      });

      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        message: errorMessage, // Add this for backward compatibility
        details: details,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = { validate };
