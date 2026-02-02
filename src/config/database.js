/**
 * Database Configuration
 * Supports SQLite for development and PostgreSQL for production
 */

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

  test: {
    dialect: "sqlite",
    storage: process.env.DB_PATH || "tests/test.sqlite",
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  },

  production: {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  },
};

const env =
  process.env.NODE_ENV === "production" && process.env.DB_DIALECT === "sqlite"
    ? "development"
    : process.env.NODE_ENV || "development";

module.exports = config[env];
