/**
 * JWT Configuration with Security Validation
 * Centralized configuration for Access and Refresh tokens
 */

const logger = require('../utils/logger');

// Validate JWT secrets on startup
function validateJWTSecrets() {
  const errors = [];

  if (!process.env.ACCESS_TOKEN_SECRET) {
    errors.push('ACCESS_TOKEN_SECRET is not set');
  } else if (process.env.ACCESS_TOKEN_SECRET.length < 32) {
    errors.push('ACCESS_TOKEN_SECRET must be at least 32 characters');
  }

  if (!process.env.REFRESH_TOKEN_SECRET) {
    errors.push('REFRESH_TOKEN_SECRET is not set');
  } else if (process.env.REFRESH_TOKEN_SECRET.length < 32) {
    errors.push('REFRESH_TOKEN_SECRET must be at least 32 characters');
  }

  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    errors.push('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different');
  }

  if (errors.length > 0) {
    logger.error('JWT Configuration Errors:', { errors });
    throw new Error(`JWT Configuration Invalid:\n${errors.join('\n')}`);
  }

  // Warn about default/weak secrets
  const weakSecrets = ['secret', 'password', '12345678', 'your-secret-key'];
  if (weakSecrets.some(weak => 
    process.env.ACCESS_TOKEN_SECRET.toLowerCase().includes(weak) ||
    process.env.REFRESH_TOKEN_SECRET.toLowerCase().includes(weak)
  )) {
    logger.warn('JWT secrets appear to be weak or default values. Use strong, random secrets in production!');
  }

  logger.info('JWT secrets validated successfully');
}

// Validate on module load
validateJWTSecrets();

module.exports = {
  // Access Token Configuration (Short-lived)
  access: {
    secret: process.env.ACCESS_TOKEN_SECRET,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m',
    algorithm: 'HS256'
  },

  // Refresh Token Configuration (Long-lived)
  refresh: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d',
    algorithm: 'HS256'
  },

  // Cookie Configuration for Refresh Token
  cookie: {
    name: process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Force HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};