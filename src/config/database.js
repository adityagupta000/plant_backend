require("dotenv").config();

const logger = require("../utils/logger");

// Validate required environment variables for production
const validateProductionConfig = () => {
  const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(", ")}`
    );
  }
};

const config = {
  development: {
    dialect: "sqlite",
    storage: process.env.DB_PATH || "./database.sqlite",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  },

  production: {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 100,
      min: parseInt(process.env.DB_POOL_MIN) || 10,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
    // SSL configuration for production
    dialectOptions:
      process.env.DB_SSL === "true"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
  },

  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  },
};

const environment = process.env.NODE_ENV || "development";

if (environment === "production") {
  try {
    validateProductionConfig();
  } catch (error) {
    logger.error("Database configuration error", {
      error: error.message,
    });
    throw error;
  }
}

module.exports = config[environment];
