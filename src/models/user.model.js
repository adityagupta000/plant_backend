/**
 * User Model
 * Manages user authentication data with password hashing
 */

const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const constants = require("../config/constants");
const logger = require("../utils/logger");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          msg: "Username already exists",
        },
        validate: {
          notEmpty: {
            msg: "Username cannot be empty",
          },
          len: {
            args: [3, 255],
            msg: "Username must be between 3 and 255 characters",
          },
          isAlphanumeric: {
            msg: "Username must contain only letters and numbers",
          },
        },
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          msg: "Email already exists",
        },
        validate: {
          notEmpty: {
            msg: "Email cannot be empty",
          },
          isEmail: {
            msg: "Must be a valid email address",
          },
        },
      },

      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },

      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",

      indexes: [
        {
          unique: true,
          fields: ["email"],
        },
        {
          unique: true,
          fields: ["username"],
        },
      ],

      hooks: {
        // Hash password before creating user
        beforeCreate: async (user) => {
          if (user.password_hash) {
            try {
              const salt = await bcrypt.genSalt(constants.BCRYPT_ROUNDS);
              user.password_hash = await bcrypt.hash(user.password_hash, salt);
              logger.debug("Password hashed for new user", {
                username: user.username,
              });
            } catch (error) {
              logger.error("Error hashing password on create", {
                error: error.message,
              });
              throw new Error("Failed to hash password");
            }
          }
        },

        // Hash password before updating user (if password changed)
        beforeUpdate: async (user) => {
          if (user.changed("password_hash")) {
            try {
              const salt = await bcrypt.genSalt(constants.BCRYPT_ROUNDS);
              user.password_hash = await bcrypt.hash(user.password_hash, salt);
              logger.debug("Password hashed for user update", {
                username: user.username,
              });
            } catch (error) {
              logger.error("Error hashing password on update", {
                error: error.message,
              });
              throw new Error("Failed to hash password");
            }
          }
        },
      },
    }
  );

  /**
   * Instance Methods
   */

  // Validate password against hash
  User.prototype.validatePassword = async function (plainPassword) {
    try {
      const isValid = await bcrypt.compare(plainPassword, this.password_hash);
      logger.debug("Password validation", {
        username: this.username,
        valid: isValid,
      });
      return isValid;
    } catch (error) {
      logger.error("Error validating password", {
        error: error.message,
        username: this.username,
      });
      throw new Error("Password validation failed");
    }
  };

  // Return user object without sensitive data
  User.prototype.toSafeObject = function () {
    const { password_hash, ...safeUser } = this.toJSON();
    return safeUser;
  };

  // Return minimal user info for token payload
  User.prototype.toTokenPayload = function () {
    return {
      userId: this.id,
      username: this.username,
      email: this.email,
    };
  };

  /**
   * Class Methods
   */

  // Find user by email
  User.findByEmail = async function (email) {
    try {
      const user = await this.findOne({ where: { email } });
      return user;
    } catch (error) {
      logger.error("Error finding user by email", { error: error.message });
      throw error;
    }
  };

  // Find user by username
  User.findByUsername = async function (username) {
    try {
      const user = await this.findOne({ where: { username } });
      return user;
    } catch (error) {
      logger.error("Error finding user by username", { error: error.message });
      throw error;
    }
  };

  // Check if email exists
  User.emailExists = async function (email) {
    try {
      const count = await this.count({ where: { email } });
      return count > 0;
    } catch (error) {
      logger.error("Error checking email existence", { error: error.message });
      throw error;
    }
  };

  // Check if username exists
  User.usernameExists = async function (username) {
    try {
      const count = await this.count({ where: { username } });
      return count > 0;
    } catch (error) {
      logger.error("Error checking username existence", {
        error: error.message,
      });
      throw error;
    }
  };

  return User;
};
