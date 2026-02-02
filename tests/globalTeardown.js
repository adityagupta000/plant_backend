const fs = require("fs");
const path = require("path");
const { sequelize } = require("../src/models");

module.exports = async () => {
  console.log("\n🧹 Cleaning up test environment...\n");

  try {
    // Close DB connection
    if (sequelize) {
      await sequelize.close();
      console.log("✅ Database connection closed");
    }

    // Remove test database file
    const dbPath = path.resolve("tests/test.sqlite");
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log("✅ Test database file removed");
    }

    console.log("\n✅ Cleanup complete\n");
  } catch (error) {
    console.error("❌ Global teardown failed:", error.message);
  }
};
