/**
 * Jest Global Setup
 * Runs once before all tests (separate process)
 */

const { sequelize } = require("../src/models");

module.exports = async () => {
  console.log("\n🔧 Setting up test environment...\n");

  try {
    await sequelize.authenticate();
    console.log(" Database connection established");

    console.log("\nGlobal setup complete\n");
  } catch (error) {
    console.error("❌ Global setup failed:", error.message);
    process.exit(1);
  }
};
