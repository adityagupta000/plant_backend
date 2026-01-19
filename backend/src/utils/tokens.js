/**
 * Token Utility Functions
 * Helper functions for JWT token generation and validation
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const jwtConfig = require('../config/jwt');
const logger = require('./logger');

/**
 * Generate a unique token ID (UUID)
 * Used for tracking refresh tokens in the database
 */
const generateTokenId = () => {
  return uuidv4();
};

/**
 * Generate Access Token (Short-lived)
 * @param {Object} payload - Token payload (userId, username)
 * @returns {String} Signed JWT token
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        userId: payload.userId,
        username: payload.username,
        tokenType: 'access'
      },
      jwtConfig.access.secret,
      {
        expiresIn: jwtConfig.access.expiresIn,
        algorithm: jwtConfig.access.algorithm
      }
    );
    
    logger.debug('Access token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Error generating access token', { error: error.message });
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate Refresh Token (Long-lived)
 * @param {Object} payload - Token payload (userId, tokenId)
 * @returns {String} Signed JWT token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        userId: payload.userId,
        tokenId: payload.tokenId,
        tokenType: 'refresh'
      },
      jwtConfig.refresh.secret,
      {
        expiresIn: jwtConfig.refresh.expiresIn,
        algorithm: jwtConfig.refresh.algorithm
      }
    );
    
    logger.debug('Refresh token generated', { userId: payload.userId, tokenId: payload.tokenId });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token', { error: error.message });
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify Access Token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.access.secret);
    
    // Verify token type
    if (decoded.tokenType !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Access token expired');
      const expiredError = new Error('Access token expired');
      expiredError.code = 'TOKEN_EXPIRED';
      throw expiredError;
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token', { error: error.message });
      throw new Error('Invalid access token');
    } else {
      logger.error('Error verifying access token', { error: error.message });
      throw error;
    }
  }
};

/**
 * Verify Refresh Token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refresh.secret);
    
    // Verify token type
    if (decoded.tokenType !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Refresh token expired');
      const expiredError = new Error('Refresh token expired');
      expiredError.code = 'REFRESH_TOKEN_EXPIRED';
      throw expiredError;
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid refresh token', { error: error.message });
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Error verifying refresh token', { error: error.message });
      throw error;
    }
  }
};

/**
 * Decode token without verification (for expired tokens)
 * Useful for extracting userId from expired tokens
 * @param {String} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token', { error: error.message });
    return null;
  }
};

/**
 * Get token expiration time in seconds
 * @param {String} expiresIn - Expiration string (e.g., '15m', '7d')
 * @returns {Number} Expiration time in seconds
 */
const getExpirationSeconds = (expiresIn) => {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };
  
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid expiration format');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return value * units[unit];
};

module.exports = {
  generateTokenId,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getExpirationSeconds
};