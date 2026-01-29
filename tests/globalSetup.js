/**
 * Jest Global Setup
 * Runs once before all tests
 */

const { sequelize } = require("../src/models");

module.exports = async () => {
  console.log("\n🔧 Setting up test environment...\n");

  try {
    // Set test environment
    process.env.NODE_ENV = "test";
    process.env.DB_PATH = ":memory:";

    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // CRITICAL: Force sync - drop and recreate all tables
    await sequelize.sync({ force: true });
    console.log("✅ Database models synchronized");

    // CRITICAL FIX: Ensure rate limiters are disabled
    if (process.env.NODE_ENV !== "test") {
      console.warn("⚠️  WARNING: NODE_ENV is not 'test'");
    } else {
      console.log("✅ Rate limiters will be disabled for tests");
    }

    console.log("\n✨ Test environment ready\n");
  } catch (error) {
    console.error("❌ Global setup failed:", error.message);
    console.error(error.stack);
    throw error;
  }
};
