/**
 * Refresh Token Model
 * Manages refresh token lifecycle and revocation
 * Critical component of the dual token authentication system
 */

const { DataTypes, Op } = require("sequelize");
const logger = require("../utils/logger");

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      token_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: "token_id",
        validate: {
          notEmpty: {
            msg: "Token ID cannot be empty",
          },
        },
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        references: {
          model: "users",
          key: "id",
        },
      },

      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
        validate: {
          isDate: true,
          isAfterNow(value) {
            if (new Date(value) <= new Date()) {
              throw new Error("Expiration date must be in the future");
            }
          },
        },
      },

      is_revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_revoked",
      },

      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "revoked_at",
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },

      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_used_at",
      },

      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "user_agent",
      },

      ip_address: {
        type: DataTypes.STRING(45), // IPv6 max length
        allowNull: true,
        field: "ip_address",
      },
    },
    {
      tableName: "refresh_tokens",
      timestamps: false, // We manually manage timestamps

      indexes: [
        {
          unique: true,
          fields: ["token_id"],
        },
        {
          fields: ["user_id"],
        },
        {
          fields: ["expires_at"],
        },
        {
          fields: ["is_revoked"],
        },
      ],
    }
  );

  /**
   * Instance Methods
   */

  // Check if token is valid (not expired and not revoked)
  RefreshToken.prototype.isValid = function () {
    const now = new Date();
    const isNotExpired = new Date(this.expires_at) > now;
    const isNotRevoked = !this.is_revoked;

    const valid = isNotExpired && isNotRevoked;

    logger.debug("Token validity check", {
      tokenId: this.token_id,
      isNotExpired,
      isNotRevoked,
      valid,
    });

    return valid;
  };

  // Revoke this token
  RefreshToken.prototype.revoke = async function () {
    try {
      this.is_revoked = true;
      this.revoked_at = new Date();
      await this.save();

      logger.info("Token revoked", {
        tokenId: this.token_id,
        userId: this.user_id,
      });

      return true;
    } catch (error) {
      logger.error("Error revoking token", {
        error: error.message,
        tokenId: this.token_id,
      });
      throw error;
    }
  };

  // Update last used timestamp
  RefreshToken.prototype.updateLastUsed = async function () {
    try {
      this.last_used_at = new Date();
      await this.save();

      logger.debug("Token last used timestamp updated", {
        tokenId: this.token_id,
      });

      return true;
    } catch (error) {
      logger.error("Error updating last used timestamp", {
        error: error.message,
        tokenId: this.token_id,
      });
      throw error;
    }
  };

  /**
   * Class Methods
   */

  // Find token by token_id
  RefreshToken.findByTokenId = async function (tokenId) {
    try {
      const token = await this.findOne({
        where: { token_id: tokenId },
      });
      return token;
    } catch (error) {
      logger.error("Error finding token by ID", {
        error: error.message,
        tokenId,
      });
      throw error;
    }
  };

  // Find all valid tokens for a user
  RefreshToken.findValidTokensForUser = async function (userId) {
    try {
      const tokens = await this.findAll({
        where: {
          user_id: userId,
          is_revoked: false,
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });
      return tokens;
    } catch (error) {
      logger.error("Error finding valid tokens for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  // Revoke all tokens for a user (logout from all devices)
  RefreshToken.revokeAllForUser = async function (userId) {
    try {
      const result = await this.update(
        {
          is_revoked: true,
          revoked_at: new Date(),
        },
        {
          where: {
            user_id: userId,
            is_revoked: false,
          },
        }
      );

      const revokedCount = result[0];

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
  };

  // Clean up expired tokens (should be run as a cron job)
  RefreshToken.cleanupExpired = async function () {
    try {
      const result = await this.destroy({
        where: {
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      });

      logger.info("Expired tokens cleaned up", {
        deletedCount: result,
      });

      return result;
    } catch (error) {
      logger.error("Error cleaning up expired tokens", {
        error: error.message,
      });
      throw error;
    }
  };

  // Count active sessions for a user
  RefreshToken.countActiveSessionsForUser = async function (userId) {
    try {
      const count = await this.count({
        where: {
          user_id: userId,
          is_revoked: false,
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });
      return count;
    } catch (error) {
      logger.error("Error counting active sessions", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  return RefreshToken;
};
