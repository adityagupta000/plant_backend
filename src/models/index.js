/**
 * Models Registry
 * Initialize Sequelize, load all models, and set up relationships
 */

const { Sequelize } = require("sequelize");
const dbConfig = require("../config/database");
const logger = require("../utils/logger");

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established successfully", {
      dialect: dbConfig.dialect,
      storage:
        dbConfig.storage ||
        `${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
    });
    return true;
  } catch (error) {
    logger.error("Unable to connect to the database", {
      error: error.message,
      dialect: dbConfig.dialect,
    });
    throw error;
  }
};

// Import models
const User = require("./user.model")(sequelize);
const RefreshToken = require("./refreshToken.model")(sequelize);
const PredictionSession = require("./session.model")(sequelize);
const Prediction = require("./prediction.model")(sequelize);

/**
 * Define Model Relationships
 */

// User has many RefreshTokens
User.hasMany(RefreshToken, {
  foreignKey: "user_id",
  as: "refreshTokens",
  onDelete: "CASCADE",
});

RefreshToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// User has many PredictionSessions
User.hasMany(PredictionSession, {
  foreignKey: "user_id",
  as: "sessions",
  onDelete: "CASCADE",
});

PredictionSession.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// User has many Predictions
User.hasMany(Prediction, {
  foreignKey: "user_id",
  as: "predictions",
  onDelete: "CASCADE",
});

Prediction.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// PredictionSession has many Predictions
PredictionSession.hasMany(Prediction, {
  foreignKey: "session_id",
  as: "predictions",
  onDelete: "CASCADE",
});

Prediction.belongsTo(PredictionSession, {
  foreignKey: "session_id",
  as: "session",
});

/**
 * Sync Database
 * Create tables if they don't exist
 * FIXED: Proper options handling
 */
const syncDatabase = async (options = {}) => {
  try {
    // Default options
    const syncOptions = {
      force: options.force || false,
      alter: options.alter || false,
    };

    logger.info("Synchronizing database with options", syncOptions);

    await sequelize.sync(syncOptions);

    logger.info("Database synchronized successfully");
    return true;
  } catch (error) {
    logger.error("Error synchronizing database", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info("Database connection closed");
    return true;
  } catch (error) {
    logger.error("Error closing database connection", {
      error: error.message,
    });
    throw error;
  }
};

// Export sequelize instance and models
module.exports = {
  sequelize,
  Sequelize,

  // Models
  User,
  RefreshToken,
  PredictionSession,
  Prediction,

  // Utility functions
  testConnection,
  syncDatabase,
  closeConnection,
};
