/**
 * JWT Configuration
 * Centralized configuration for Access and Refresh tokens
 * WITH SECURITY VALIDATION
 */

const logger = require("../utils/logger");

// ============================================================================
// CRITICAL: Validate JWT secrets exist and meet security requirements
// ============================================================================
const validateJWTSecrets = () => {
  const minLength = parseInt(process.env.MIN_JWT_SECRET_LENGTH) || 32;

  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error(
      "CRITICAL: ACCESS_TOKEN_SECRET not set in environment variables. " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }

  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
      "CRITICAL: REFRESH_TOKEN_SECRET not set in environment variables. " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }

  if (process.env.ACCESS_TOKEN_SECRET.length < minLength) {
    throw new Error(
      `CRITICAL: ACCESS_TOKEN_SECRET is too short (${process.env.ACCESS_TOKEN_SECRET.length} chars). ` +
        `Minimum required: ${minLength} characters for security.`
    );
  }

  if (process.env.REFRESH_TOKEN_SECRET.length < minLength) {
    throw new Error(
      `CRITICAL: REFRESH_TOKEN_SECRET is too short (${process.env.REFRESH_TOKEN_SECRET.length} chars). ` +
        `Minimum required: ${minLength} characters for security.`
    );
  }

  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
      "CRITICAL: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different!"
    );
  }

  logger.info("JWT secrets validated successfully");
};

// Validate on module load
validateJWTSecrets();

module.exports = {
  // Access Token Configuration (Short-lived)
  access: {
    secret: process.env.ACCESS_TOKEN_SECRET,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE || "15m",
    algorithm: "HS256",
  },

  // Refresh Token Configuration (Long-lived)
  refresh: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d",
    algorithm: "HS256",
  },

  // Cookie Configuration for Refresh Token
  cookie: {
    name: process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
