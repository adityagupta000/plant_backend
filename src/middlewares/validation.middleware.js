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
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[#@$!%*?&])[A-Za-z\\d@#$!%*?&]{8,}$"
        )
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
  // LOGIN (NO STRONG VALIDATION – CORRECT PRACTICE)
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
  // PDF DOWNLOAD VALIDATION - FIXED PLACEMENT
  // --------------------------------------------------------------------------
  downloadPDF: Joi.object({
    prediction: Joi.object({
      predicted_class: Joi.string().required(),
      confidence: Joi.number().min(0).max(1).required(),
      confidence_percentage: Joi.number().min(0).max(100).required(),
      confidence_level: Joi.string().required(),
      category: Joi.string().allow(null),
      subtype: Joi.string().allow(null),
      explanation: Joi.string().required(),
      all_predictions: Joi.array()
        .items(
          Joi.object({
            class: Joi.string().required(),
            confidence: Joi.number().required(),
            confidence_percentage: Joi.number().required(),
          })
        )
        .required(),
      image_name: Joi.string().allow(null),
      model_version: Joi.string().allow(null),
      model_name: Joi.string().allow(null),
      processing_time_ms: Joi.number().allow(null),
      created_at: Joi.string().allow(null),
    })
      .required()
      .messages({
        "any.required": "Prediction data is required",
        "object.base": "Prediction must be a valid object",
      }),
  }),
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
        .json(formatErrorResponse("Internal validation error"));
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // return all validation errors
      stripUnknown: true, // remove unexpected fields
    });

    if (error) {
      const details = error.details.map((detail) => detail.message);

      logger.warn("Validation failed", {
        schema: schemaName,
        errors: details,
      });

      return res
        .status(400)
        .json(
          formatErrorResponse("Validation failed", "VALIDATION_ERROR", details)
        );
    }

    req.body = value;
    next();
  };
};

module.exports = { validate };
