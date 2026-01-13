/**
 * Prediction Model
 * Stores individual plant health predictions (like messages in a chat)
 */

const { DataTypes, Op } = require("sequelize");
const logger = require("../utils/logger");

module.exports = (sequelize) => {
  const Prediction = sequelize.define(
    "Prediction",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "session_id",
        references: {
          model: "prediction_sessions",
          key: "id",
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

      // Image Information
      image_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "image_name",
      },

      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "image_url",
      },

      image_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "image_size",
      },

      // AI Model Prediction Results
      predicted_class: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "predicted_class",
      },

      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "category",
      },

      subtype: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "subtype",
      },

      confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: "confidence",
        validate: {
          min: 0.0,
          max: 1.0,
        },
      },

      confidence_percentage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: "confidence_percentage",
        validate: {
          min: 0,
          max: 100,
        },
      },

      // Additional Prediction Data
      all_predictions: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "all_predictions",
        get() {
          const rawValue = this.getDataValue("all_predictions");
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue(
            "all_predictions",
            value ? JSON.stringify(value) : null
          );
        },
      },

      confidence_level: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "confidence_level",
      },

      explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "explanation",
      },

      // Metadata
      model_version: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "model_version",
      },

      model_name: {
        type: DataTypes.STRING(100),
        defaultValue: "efficientnetv2_b2",
        field: "model_name",
      },

      processing_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "processing_time_ms",
      },

      status: {
        type: DataTypes.STRING(50),
        defaultValue: "success",
        field: "status",
        validate: {
          isIn: [["success", "failed"]],
        },
      },

      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "error_message",
      },

      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
    },
    {
      tableName: "predictions",
      timestamps: false, // We only need created_at

      indexes: [
        {
          fields: ["session_id"],
        },
        {
          fields: ["user_id"],
        },
        {
          fields: ["created_at"],
        },
        {
          fields: ["status"],
        },
      ],

      hooks: {
        beforeCreate: (prediction) => {
          // Ensure created_at is set
          if (!prediction.created_at) {
            prediction.created_at = new Date();
          }

          // Calculate confidence_percentage if not set
          if (prediction.confidence && !prediction.confidence_percentage) {
            prediction.confidence_percentage = prediction.confidence * 100;
          }
        },
      },
    }
  );

  /**
   * Instance Methods
   */

  // Get formatted prediction data for API response
  Prediction.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    // Parse all_predictions if it's a string
    if (typeof values.all_predictions === "string") {
      try {
        values.all_predictions = JSON.parse(values.all_predictions);
      } catch (error) {
        logger.error("Error parsing all_predictions JSON", {
          error: error.message,
          predictionId: this.id,
        });
        values.all_predictions = null;
      }
    }

    return values;
  };

  /**
   * Class Methods
   */

  // Find prediction by ID and user
  Prediction.findByIdAndUser = async function (predictionId, userId) {
    try {
      const prediction = await this.findOne({
        where: {
          id: predictionId,
          user_id: userId,
        },
      });
      return prediction;
    } catch (error) {
      logger.error("Error finding prediction by ID and user", {
        error: error.message,
        predictionId,
        userId,
      });
      throw error;
    }
  };

  // Get all predictions for a session with pagination
  Prediction.findBySession = async function (
    sessionId,
    userId,
    limit = 100,
    offset = 0
  ) {
    try {
      const { count, rows } = await this.findAndCountAll({
        where: {
          session_id: sessionId,
          user_id: userId,
        },
        order: [["created_at", "ASC"]], // Chronological order (oldest first)
        limit,
        offset,
      });

      return { count, rows };
    } catch (error) {
      logger.error("Error finding predictions for session", {
        error: error.message,
        sessionId,
        userId,
      });
      throw error;
    }
  };

  // Get recent predictions for a user
  Prediction.findRecentForUser = async function (userId, limit = 10) {
    try {
      const predictions = await this.findAll({
        where: { user_id: userId },
        order: [["created_at", "DESC"]],
        limit,
      });
      return predictions;
    } catch (error) {
      logger.error("Error finding recent predictions for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  // Count predictions for a session
  Prediction.countForSession = async function (sessionId) {
    try {
      const count = await this.count({
        where: { session_id: sessionId },
      });
      return count;
    } catch (error) {
      logger.error("Error counting predictions for session", {
        error: error.message,
        sessionId,
      });
      throw error;
    }
  };

  // Count total predictions for a user
  Prediction.countForUser = async function (userId) {
    try {
      const count = await this.count({
        where: { user_id: userId },
      });
      return count;
    } catch (error) {
      logger.error("Error counting predictions for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  // Get prediction statistics for a user
  Prediction.getStatsForUser = async function (userId) {
    try {
      const total = await this.countForUser(userId);
      const successful = await this.count({
        where: {
          user_id: userId,
          status: "success",
        },
      });
      const failed = await this.count({
        where: {
          user_id: userId,
          status: "failed",
        },
      });

      return {
        total,
        successful,
        failed,
      };
    } catch (error) {
      logger.error("Error getting prediction stats for user", {
        error: error.message,
        userId,
      });
      throw error;
    }
  };

  return Prediction;
};
