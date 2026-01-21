/**
 * Authentication Controller - ENHANCED
 * Added session management endpoints
 */

const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const jwtConfig = require("../config/jwt");
const {
  formatSuccessResponse,
  formatErrorResponse,
  getClientIp,
  getUserAgent,
} = require("../utils/helpers");
const logger = require("../utils/logger");

class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      const user = await authService.register(username, email, password);

      logger.info("User registration successful", {
        userId: user.id,
        email: user.email,
      });

      res.status(201).json(
        formatSuccessResponse(
          {
            user,
          },
          "Registration successful",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const userAgent = getUserAgent(req);
      const ipAddress = getClientIp(req);

      const { accessToken, refreshToken, user, expiresIn } =
        await authService.login(email, password, userAgent, ipAddress);

      res.cookie(jwtConfig.cookie.name, refreshToken, {
        httpOnly: jwtConfig.cookie.httpOnly,
        secure: jwtConfig.cookie.secure,
        sameSite: jwtConfig.cookie.sameSite,
        maxAge: jwtConfig.cookie.maxAge,
      });

      logger.info("User login successful", {
        userId: user.id,
        email: user.email,
        ipAddress,
      });

      res.status(200).json(
        formatSuccessResponse(
          {
            accessToken,
            expiresIn,
            user,
          },
          "Login successful",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies[jwtConfig.cookie.name];

      if (!refreshToken) {
        logger.warn("Refresh attempt without token");
        return res
          .status(401)
          .json(
            formatErrorResponse(
              "Refresh token required",
              "REFRESH_TOKEN_REQUIRED",
            ),
          );
      }

      const userAgent = getUserAgent(req);
      const ipAddress = getClientIp(req);

      const { accessToken, expiresIn } = await tokenService.refreshAccessToken(
        refreshToken,
        userAgent,
        ipAddress,
      );

      logger.info("Access token refreshed", { ipAddress });

      res.status(200).json(
        formatSuccessResponse({
          accessToken,
          expiresIn,
        }),
      );
    } catch (error) {
      res.clearCookie(jwtConfig.cookie.name, {
        httpOnly: jwtConfig.cookie.httpOnly,
        secure: jwtConfig.cookie.secure,
        sameSite: jwtConfig.cookie.sameSite,
      });

      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies[jwtConfig.cookie.name];

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie(jwtConfig.cookie.name, {
        httpOnly: jwtConfig.cookie.httpOnly,
        secure: jwtConfig.cookie.secure,
        sameSite: jwtConfig.cookie.sameSite,
      });

      logger.info("User logged out", {
        userId: req.userId,
      });

      res.status(200).json(formatSuccessResponse({}, "Logout successful"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  async logoutAll(req, res, next) {
    try {
      const userId = req.userId;

      const revokedCount = await authService.logoutAll(userId);

      res.clearCookie(jwtConfig.cookie.name, {
        httpOnly: jwtConfig.cookie.httpOnly,
        secure: jwtConfig.cookie.secure,
        sameSite: jwtConfig.cookie.sameSite,
      });

      logger.info("User logged out from all devices", {
        userId,
        revokedSessions: revokedCount,
      });

      res.status(200).json(
        formatSuccessResponse(
          {
            revokedSessions: revokedCount,
          },
          "Logged out from all devices",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.userId;

      const user = await authService.getUserById(userId);

      res.status(200).json(
        formatSuccessResponse({
          user,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * ENHANCEMENT: Get all active sessions
   * GET /api/auth/sessions
   */
  async getSessions(req, res, next) {
    try {
      const userId = req.userId;
      const currentRefreshToken = req.cookies[jwtConfig.cookie.name];

      const sessions = await tokenService.getActiveSessions(userId);

      // Mark current session
      if (currentRefreshToken) {
        const jwt = require("jsonwebtoken");
        try {
          const decoded = jwt.decode(currentRefreshToken);
          if (decoded && decoded.tokenId) {
            sessions.forEach((session) => {
              if (session.id === decoded.tokenId) {
                session.isCurrent = true;
              }
            });
          }
        } catch (error) {
          // Ignore decode errors
        }
      }

      logger.info("Retrieved active sessions", {
        userId,
        sessionCount: sessions.length,
      });

      res.status(200).json(
        formatSuccessResponse({
          sessions,
          total: sessions.length,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * ENHANCEMENT: Revoke specific session
   * DELETE /api/auth/sessions/:sessionId
   */
  async revokeSession(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(sessionId)) {
        return res
          .status(400)
          .json(
            formatErrorResponse("Invalid session ID", "INVALID_SESSION_ID"),
          );
      }

      await tokenService.revokeSessionById(userId, sessionId);

      logger.info("Session revoked", {
        userId,
        sessionId,
      });

      res
        .status(200)
        .json(formatSuccessResponse({}, "Session revoked successfully"));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
