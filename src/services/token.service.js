/**
 * Token Service
 * Manages the complete lifecycle of access and refresh tokens
 * Core component of the dual token authentication system
 */

const { RefreshToken } = require("../models");
const {
  generateTokenId,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getExpirationSeconds,
} = require("../utils/tokens");
const jwtConfig = require("../config/jwt");
const logger = require("../utils/logger");

class TokenService {
  /**
   * Generate both access and refresh tokens for a user
   * @param {Object} user - User object
   * @param {String} userAgent - User agent string
   * @param {String} ipAddress - Client IP address
   * @returns {Object} { accessToken, refreshToken, expiresIn }
   */
  async generateTokenPair(user, userAgent = null, ipAddress = null) {
    try {
      // Generate unique token ID for refresh token
      const tokenId = generateTokenId();

      // Generate access token
      const accessToken = generateAccessToken({
        userId: user.id,
        username: user.username,
      });

      // Generate refresh token
      const refreshToken = generateRefreshToken({
        userId: user.id,
        tokenId: tokenId,
      });

      // Calculate expiration date for refresh token
      const refreshExpiresIn = getExpirationSeconds(
        jwtConfig.refresh.expiresIn
      );
      const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

      // Store refresh token metadata in database
      await RefreshToken.create({
        token_id: tokenId,
        user_id: user.id,
        expires_at: expiresAt,
        user_agent: userAgent,
        ip_address: ipAddress,
        last_used_at: new Date(),
      });

      logger.info("Token pair generated", {
        userId: user.id,
        tokenId,
        expiresAt,
      });

      // Return both tokens
      return {
        accessToken,
        refreshToken,
        expiresIn: getExpirationSeconds(jwtConfig.access.expiresIn), // seconds
      };
    } catch (error) {
      logger.error("Error generating token pair", {
        error: error.message,
        userId: user.id,
      });
      throw new Error("Failed to generate authentication tokens");
    }
  }

  /**
   * Validate access token
   * @param {String} token - Access token to validate
   * @returns {Object} Decoded token payload
   */
  async validateAccessToken(token) {
    try {
      const decoded = verifyAccessToken(token);

      logger.debug("Access token validated", {
        userId: decoded.userId,
      });

      return decoded;
    } catch (error) {
      logger.warn("Access token validation failed", {
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Validate refresh token (checks JWT signature AND database revocation status)
   * @param {String} token - Refresh token to validate
   * @returns {Object} { valid, decoded, tokenRecord }
   */
  async validateRefreshToken(token) {
    try {
      // Verify JWT signature and expiration
      const decoded = verifyRefreshToken(token);

      // Check if token exists in database and is not revoked
      const tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      if (!tokenRecord) {
        logger.warn("Refresh token not found in database", {
          tokenId: decoded.tokenId,
        });
        const error = new Error("Invalid refresh token");
        error.code = "INVALID_TOKEN";
        throw error;
      }

      // Check if token is valid (not expired and not revoked)
      if (!tokenRecord.isValid()) {
        if (tokenRecord.is_revoked) {
          logger.warn("Refresh token is revoked", {
            tokenId: decoded.tokenId,
            userId: decoded.userId,
          });
          const error = new Error("Token has been revoked");
          error.code = "TOKEN_REVOKED";
          throw error;
        } else {
          logger.warn("Refresh token is expired", {
            tokenId: decoded.tokenId,
            userId: decoded.userId,
          });
          const error = new Error("Refresh token expired");
          error.code = "REFRESH_TOKEN_EXPIRED";
          throw error;
        }
      }

      logger.debug("Refresh token validated", {
        tokenId: decoded.tokenId,
        userId: decoded.userId,
      });

      return {
        valid: true,
        decoded,
        tokenRecord,
      };
    } catch (error) {
      logger.warn("Refresh token validation failed", {
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - Refresh token
   * @param {String} userAgent - User agent string
   * @param {String} ipAddress - Client IP address
   * @returns {Object} { accessToken, expiresIn }
   */
  async refreshAccessToken(refreshToken, userAgent = null, ipAddress = null) {
    try {
      // Validate refresh token
      const { decoded, tokenRecord } = await this.validateRefreshToken(
        refreshToken
      );

      // Update last used timestamp
      await tokenRecord.updateLastUsed();

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: decoded.userId,
        username: decoded.username || tokenRecord.user?.username,
      });

      logger.info("Access token refreshed", {
        userId: decoded.userId,
        tokenId: decoded.tokenId,
      });

      return {
        accessToken,
        expiresIn: getExpirationSeconds(jwtConfig.access.expiresIn), // seconds
      };
    } catch (error) {
      logger.error("Error refreshing access token", {
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Revoke a specific refresh token
   * @param {String} token - Refresh token to revoke
   * @returns {Boolean} Success status
   */
  async revokeRefreshToken(token) {
    try {
      // Decode token to get token ID (don't verify, as it might be expired)
      const decoded = verifyRefreshToken(token);

      // Find token in database
      const tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      if (!tokenRecord) {
        logger.warn("Token not found for revocation", {
          tokenId: decoded.tokenId,
        });
        return false;
      }

      // Revoke token
      await tokenRecord.revoke();

      logger.info("Refresh token revoked", {
        tokenId: decoded.tokenId,
        userId: decoded.userId,
      });

      return true;
    } catch (error) {
      // If token is invalid or expired, try to find and revoke anyway
      logger.warn("Error revoking refresh token, attempting fallback", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * @param {Number} userId - User ID
   * @returns {Number} Count of revoked tokens
   */
  async revokeAllUserTokens(userId) {
    try {
      const revokedCount = await RefreshToken.revokeAllForUser(userId);

      logger.info("All tokens revoked for user", {
        userId,
        revokedCount,
      });

      return revokedCount;
    } catch (error) {
      logger.error("Error revoking all tokens for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   * @returns {Number} Count of deleted tokens
   */
  async cleanupExpiredTokens() {
    try {
      const deletedCount = await RefreshToken.cleanupExpired();

      logger.info("Expired tokens cleaned up", {
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error("Error cleaning up expired tokens", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active session count for a user
   * @param {Number} userId - User ID
   * @returns {Number} Count of active sessions
   */
  async getActiveSessionCount(userId) {
    try {
      const count = await RefreshToken.countActiveSessionsForUser(userId);
      return count;
    } catch (error) {
      logger.error("Error getting active session count", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

module.exports = new TokenService();
