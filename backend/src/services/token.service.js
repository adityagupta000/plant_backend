/**
 * Token Service - FIXED
 * Handles expired token revocation properly
 */

const { RefreshToken } = require("../models");
const {
  generateTokenId,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken, // CRITICAL: Import decode for expired tokens
  getExpirationSeconds,
} = require("../utils/tokens");
const jwtConfig = require("../config/jwt");
const logger = require("../utils/logger");

class TokenService {
  /**
   * Generate both access and refresh tokens for a user
   */
  async generateTokenPair(user, userAgent = null, ipAddress = null) {
    try {
      const tokenId = generateTokenId();

      const accessToken = generateAccessToken({
        userId: user.id,
        username: user.username,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        tokenId: tokenId,
      });

      const refreshExpiresIn = getExpirationSeconds(
        jwtConfig.refresh.expiresIn,
      );
      const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

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

      return {
        accessToken,
        refreshToken,
        expiresIn: getExpirationSeconds(jwtConfig.access.expiresIn),
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
   * Validate refresh token
   */
  async validateRefreshToken(token) {
    try {
      const decoded = verifyRefreshToken(token);

      const tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      if (!tokenRecord) {
        logger.warn("Refresh token not found in database", {
          tokenId: decoded.tokenId,
        });
        const error = new Error("Invalid refresh token");
        error.code = "INVALID_TOKEN";
        throw error;
      }

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
   * Refresh access token
   */
  async refreshAccessToken(refreshToken, userAgent = null, ipAddress = null) {
    try {
      const { decoded, tokenRecord } =
        await this.validateRefreshToken(refreshToken);

      await tokenRecord.updateLastUsed();

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
        expiresIn: getExpirationSeconds(jwtConfig.access.expiresIn),
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
   * CRITICAL FIX: Revoke refresh token (handles expired tokens)
   */
  async revokeRefreshToken(token) {
    try {
      let decoded;
      let tokenRecord;

      // CRITICAL FIX: Try to verify token first
      try {
        decoded = verifyRefreshToken(token);
      } catch (error) {
        // If verification fails, try to decode without verification
        // This allows us to revoke expired tokens
        logger.warn(
          "Token verification failed during revocation, attempting decode",
          {
            error: error.message,
            code: error.code,
          },
        );

        decoded = decodeToken(token);

        if (!decoded || !decoded.tokenId) {
          logger.warn("Cannot decode token for revocation", {
            error: error.message,
          });
          return false;
        }
      }

      // Find token in database
      tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      if (!tokenRecord) {
        logger.warn("Token not found for revocation", {
          tokenId: decoded.tokenId,
        });
        return false;
      }

      // Check if already revoked
      if (tokenRecord.is_revoked) {
        logger.info("Token already revoked", {
          tokenId: decoded.tokenId,
          userId: decoded.userId,
        });
        return true; // Consider this success
      }

      // Revoke token
      await tokenRecord.revoke();

      logger.info("Refresh token revoked", {
        tokenId: decoded.tokenId,
        userId: decoded.userId,
        wasExpired: new Date() > new Date(tokenRecord.expires_at),
      });

      return true;
    } catch (error) {
      logger.error("Error revoking refresh token", {
        error: error.message,
        stack: error.stack,
      });
      // Return false instead of throwing to allow graceful degradation
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user
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
   * Clean up expired tokens
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
   * Get active session count
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

  /**
   * ENHANCEMENT: Get all active sessions with details
   */
  async getActiveSessions(userId) {
    try {
      const sessions = await RefreshToken.findValidTokensForUser(userId);

      return sessions.map((session) => ({
        id: session.id,
        createdAt: session.created_at,
        lastUsedAt: session.last_used_at,
        expiresAt: session.expires_at,
        userAgent: session.user_agent,
        ipAddress: session.ip_address,
        isCurrent: false, // Can be set by comparing with current token
      }));
    } catch (error) {
      logger.error("Error getting active sessions", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * ENHANCEMENT: Revoke specific session by ID
   */
  async revokeSessionById(userId, sessionId) {
    try {
      const tokenRecord = await RefreshToken.findOne({
        where: {
          id: sessionId,
          user_id: userId,
        },
      });

      if (!tokenRecord) {
        const error = new Error("Session not found");
        error.code = "SESSION_NOT_FOUND";
        throw error;
      }

      await tokenRecord.revoke();

      logger.info("Session revoked by ID", {
        sessionId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error("Error revoking session by ID", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  }
}

module.exports = new TokenService();
