/**
 * Authentication Service
 * Handles user authentication business logic
 */

const { User } = require("../models");
const tokenService = require("./token.service");
const logger = require("../utils/logger");

class AuthService {
  /**
   * Register a new user
   * @param {String} username - Username
   * @param {String} email - Email address
   * @param {String} password - Plain text password (will be hashed)
   * @returns {Object} User object (without password)
   */
  async register(username, email, password) {
    try {
      // Check if email already exists
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        const error = new Error("Email already registered");
        error.code = "EMAIL_EXISTS";
        throw error;
      }

      // Check if username already exists
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        const error = new Error("Username already taken");
        error.code = "USERNAME_EXISTS";
        throw error;
      }

      // Create user (password will be hashed automatically by model hook)
      const user = await User.create({
        username,
        email,
        password_hash: password, // Will be hashed by beforeCreate hook
      });

      logger.info("User registered successfully", {
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      // Return user without password
      return user.toSafeObject();
    } catch (error) {
      logger.error("Error during registration", {
        error: error.message,
        email,
        username,
      });
      throw error;
    }
  }

  /**
   * Login user
   * @param {String} email - Email address
   * @param {String} password - Plain text password
   * @param {String} userAgent - User agent string
   * @param {String} ipAddress - Client IP address
   * @returns {Object} { accessToken, refreshToken, user, expiresIn }
   */
  async login(email, password, userAgent = null, ipAddress = null) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);

      if (!user) {
        logger.warn("Login attempt with non-existent email", { email });
        const error = new Error("Invalid email or password");
        error.code = "INVALID_CREDENTIALS";
        throw error;
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn("Login attempt for inactive user", {
          userId: user.id,
          email,
        });
        const error = new Error("Account is inactive");
        error.code = "ACCOUNT_INACTIVE";
        throw error;
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        logger.warn("Login attempt with invalid password", {
          userId: user.id,
          email,
        });
        const error = new Error("Invalid email or password");
        error.code = "INVALID_CREDENTIALS";
        throw error;
      }

      // Generate token pair
      const { accessToken, refreshToken, expiresIn } =
        await tokenService.generateTokenPair(user, userAgent, ipAddress);

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
        ipAddress,
      });

      return {
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
        expiresIn,
      };
    } catch (error) {
      logger.error("Error during login", {
        error: error.message,
        email,
      });
      throw error;
    }
  }

  /**
   * Logout user (revoke refresh token)
   * @param {String} refreshToken - Refresh token to revoke
   * @returns {Boolean} Success status
   */
  async logout(refreshToken) {
    try {
      if (!refreshToken) {
        logger.warn("Logout attempt without refresh token");
        return false;
      }

      const success = await tokenService.revokeRefreshToken(refreshToken);

      if (success) {
        logger.info("User logged out successfully");
      } else {
        logger.warn("Logout failed - token not found");
      }

      return success;
    } catch (error) {
      logger.error("Error during logout", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   * @param {Number} userId - User ID
   * @returns {Number} Count of revoked tokens
   */
  async logoutAll(userId) {
    try {
      const revokedCount = await tokenService.revokeAllUserTokens(userId);

      logger.info("User logged out from all devices", {
        userId,
        revokedCount,
      });

      return revokedCount;
    } catch (error) {
      logger.error("Error during logout all", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {Number} userId - User ID
   * @returns {Object} User object (without password)
   */
  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        const error = new Error("User not found");
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      return user.toSafeObject();
    } catch (error) {
      logger.error("Error getting user by ID", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Verify user exists and is active
   * @param {Number} userId - User ID
   * @returns {Boolean} User exists and is active
   */
  async verifyUser(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        logger.warn("User verification failed - user not found", { userId });
        return false;
      }

      if (!user.is_active) {
        logger.warn("User verification failed - user inactive", { userId });
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Error verifying user", {
        error: error.message,
        userId,
      });
      return false;
    }
  }
}

module.exports = new AuthService();
