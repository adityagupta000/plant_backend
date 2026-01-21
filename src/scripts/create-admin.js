/**
 * Admin User Creation Script
 * Promotes an existing user to admin role
 * Usage: node src/scripts/create-admin.js user@example.com
 */

require("dotenv").config();
const { User, testConnection, closeConnection } = require("../models");
const logger = require("../utils/logger");

async function promoteToAdmin(email) {
  try {
    // Test database connection
    await testConnection();

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Check if already admin
    if (user.role === "admin") {
      console.log(`ℹ️  ${email} is already an admin`);
      process.exit(0);
    }

    // Promote to admin
    user.role = "admin";
    await user.save();

    console.log(`✅ Successfully promoted ${email} to admin`);
    console.log(`User ID: ${user.id}`);
    console.log(`Username: ${user.username}`);

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    logger.error("Error promoting user to admin", {
      error: error.message,
      email,
    });
    process.exit(1);
  }
}

async function demoteFromAdmin(email) {
  try {
    await testConnection();

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.role !== "admin") {
      console.log(`ℹ️  ${email} is not an admin`);
      process.exit(0);
    }

    user.role = "user";
    await user.save();

    console.log(`✅ Successfully demoted ${email} to regular user`);

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function listAdmins() {
  try {
    await testConnection();

    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["id", "username", "email", "created_at"],
    });

    console.log(`\n📋 Admin Users (${admins.length}):`);
    console.log("─".repeat(80));

    if (admins.length === 0) {
      console.log("No admin users found");
    } else {
      admins.forEach((admin) => {
        console.log(
          `ID: ${admin.id} | ${admin.username} (${admin.email}) | Created: ${admin.created_at}`,
        );
      });
    }

    console.log("─".repeat(80));

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

if (command === "promote" && email) {
  promoteToAdmin(email);
} else if (command === "demote" && email) {
  demoteFromAdmin(email);
} else if (command === "list") {
  listAdmins();
} else {
  console.log("Admin User Management");
  console.log("─".repeat(80));
  console.log("\nUsage:");
  console.log(
    "  Promote user:  node src/scripts/create-admin.js promote user@example.com",
  );
  console.log(
    "  Demote user:   node src/scripts/create-admin.js demote user@example.com",
  );
  console.log("  List admins:   node src/scripts/create-admin.js list");
  console.log("\nExamples:");
  console.log("  node src/scripts/create-admin.js promote admin@mycompany.com");
  console.log("  node src/scripts/create-admin.js list");
  process.exit(1);
}
