/**
 * Prediction Session Model
 * Manages conversation-like sessions (similar to Claude's chat sessions)
 * Each session contains multiple predictions
 */

const { DataTypes, Op } = require("sequelize");
const logger = require("../utils/logger");

module.exports = (sequelize) => {
  const PredictionSession = sequelize.define(
    "PredictionSession",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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

      title: {
        type: DataTypes.STRING(255),
        defaultValue: "New Diagnosis Session",
        validate: {
          len: {
            args: [1, 255],
            msg: "Title must be between 1 and 255 characters",
          },
        },
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },

      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "prediction_sessions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",

      indexes: [
        {
          fields: ["user_id"],
        },
        {
          fields: ["updated_at"],
        },
      ],
    }
  );

  /**
   * Instance Methods
   */

  // Get prediction count for this session
  PredictionSession.prototype.getPredictionCount = async function () {
    try {
      const Prediction = sequelize.models.Prediction;
      const count = await Prediction.count({
        where: { session_id: this.id },
      });
      return count;
    } catch (error) {
      logger.error("Error getting prediction count", {
        error: error.message,
        sessionId: this.id,
      });
      throw error;
    }
  };

  // Get last prediction in this session
  PredictionSession.prototype.getLastPrediction = async function () {
    try {
      const Prediction = sequelize.models.Prediction;
      const prediction = await Prediction.findOne({
        where: { session_id: this.id },
        order: [["created_at", "DESC"]],
      });
      return prediction;
    } catch (error) {
      logger.error("Error getting last prediction", {
        error: error.message,
        sessionId: this.id,
      });
      throw error;
    }
  };

  /**
   * Class Methods
   */

  // Find session by ID and user (ensure user owns the session)
  PredictionSession.findByIdAndUser = async function (sessionId, userId) {
    try {
      const session = await this.findOne({
        where: {
          id: sessionId,
          user_id: userId,
        },
      });
      return session;
    } catch (error) {
      logger.error("Error finding session by ID and user", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  };

  // Get all sessions for a user with pagination
  PredictionSession.findByUser = async function (
    userId,
    limit = 50,
    offset = 0
  ) {
    try {
      const { count, rows } = await this.findAndCountAll({
        where: { user_id: userId },
        order: [["updated_at", "DESC"]],
        limit,
        offset,
        include: [
          {
            model: sequelize.models.Prediction,
            as: "predictions",
            limit: 1,
            order: [["created_at", "DESC"]],
            required: false,
          },
        ],
      });

      return { count, rows };
    } catch (error) {
      logger.error("Error finding sessions for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  // Delete session and all its predictions (cascade)
  PredictionSession.deleteByIdAndUser = async function (sessionId, userId) {
    try {
      const result = await this.destroy({
        where: {
          id: sessionId,
          user_id: userId,
        },
      });

      if (result > 0) {
        logger.info("Session deleted", { sessionId, userId });
      } else {
        logger.warn("Session not found for deletion", { sessionId, userId });
      }

      return result > 0;
    } catch (error) {
      logger.error("Error deleting session", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  };

  // Update session title
  PredictionSession.updateTitle = async function (sessionId, userId, newTitle) {
    try {
      const [affectedRows] = await this.update(
        { title: newTitle },
        {
          where: {
            id: sessionId,
            user_id: userId,
          },
        }
      );

      if (affectedRows > 0) {
        logger.info("Session title updated", {
          sessionId,
          userId,
          newTitle,
        });
        return true;
      } else {
        logger.warn("Session not found for title update", {
          sessionId,
          userId,
        });
        return false;
      }
    } catch (error) {
      logger.error("Error updating session title", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  };

  // Count total sessions for a user
  PredictionSession.countForUser = async function (userId) {
    try {
      const count = await this.count({
        where: { user_id: userId },
      });
      return count;
    } catch (error) {
      logger.error("Error counting sessions for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  return PredictionSession;
};
