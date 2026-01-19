/**
 * Database Migration: Add role column to users table
 * Run this ONCE to add the role column to existing database
 */

require("dotenv").config();
const { sequelize, testConnection, closeConnection } = require("../models");
const logger = require("../utils/logger");

async function addRoleColumn() {
  try {
    await testConnection();
    console.log("✅ Database connected");

    const queryInterface = sequelize.getQueryInterface();
    const tableName = "users";

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable(tableName);

    if (tableDescription.role) {
      console.log("ℹ️  Role column already exists");
      await closeConnection();
      process.exit(0);
    }

    // Add role column
    console.log("📝 Adding role column to users table...");

    await queryInterface.addColumn(tableName, "role", {
      type: sequelize.Sequelize.ENUM("user", "admin"),
      defaultValue: "user",
      allowNull: false,
      after: "is_active", // SQLite: this will be ignored
    });

    console.log("✅ Role column added successfully");
    console.log("\n📋 Next steps:");
    console.log(
      "1. Run: node src/scripts/create-admin.js promote your@email.com",
    );
    console.log("2. Restart your server");

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    logger.error("Migration error", { error: error.message });
    process.exit(1);
  }
}

addRoleColumn();
