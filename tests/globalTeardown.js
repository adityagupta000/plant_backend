/**
 * Jest Global Teardown
 * Runs once after all tests
 */

const { sequelize } = require("../src/models");

module.exports = async () => {
  console.log("\n🧹 Cleaning up test environment...\n");

  try {
    // Close database connection
    if (sequelize) {
      await sequelize.close();
      console.log("✅ Database connection closed");
    }

    console.log("\n✨ Cleanup complete\n");
  } catch (error) {
    console.error("❌ Global teardown failed:", error.message);
  }
};
