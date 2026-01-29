/**
 * Token Service Unit Tests
 * Tests JWT token generation, validation, and management
 */

const tokenService = require("../../src/services/token.service");
const {
  User,
  RefreshToken,
  testConnection,
  syncDatabase,
} = require("../../src/models");
const {
  generateUniqueEmail,
  generateUniqueUsername,
} = require("../helpers/testHelpers");

describe("Token Service", () => {
  let testUser;

  beforeAll(async () => {
    await testConnection();
    await syncDatabase({ force: true });

    // Create test user
    testUser = await User.create({
      username: generateUniqueUsername(),
      email: generateUniqueEmail(),
      password_hash: "TestPass123!@#",
      is_active: true,
    });
  });

  afterAll(async () => {
    await User.destroy({ where: {} });
    await RefreshToken.destroy({ where: {} });
  });

  describe("generateTokenPair", () => {
    it("should generate access and refresh tokens", async () => {
      const result = await tokenService.generateTokenPair(
        testUser,
        "test-agent",
        "127.0.0.1",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("expiresIn");

      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
      expect(typeof result.expiresIn).toBe("number");
    });

    it("should store refresh token in database", async () => {
      await tokenService.generateTokenPair(testUser, "test-agent", "127.0.0.1");

      const tokens = await RefreshToken.findAll({
        where: { user_id: testUser.id },
      });

      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe("validateAccessToken", () => {
    it("should validate valid access token", async () => {
      const { accessToken } = await tokenService.generateTokenPair(testUser);

      const decoded = await tokenService.validateAccessToken(accessToken);

      expect(decoded).toHaveProperty("userId", testUser.id);
      expect(decoded).toHaveProperty("username", testUser.username);
    });

    it("should reject invalid access token", async () => {
      await expect(
        tokenService.validateAccessToken("invalid-token"),
      ).rejects.toThrow();
    });

    it("should reject expired access token", async () => {
      // This would require mocking time or using a very short expiry
      // Skipping for now as it requires complex setup
    });
  });

  describe("validateRefreshToken", () => {
    it("should validate valid refresh token", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      const result = await tokenService.validateRefreshToken(refreshToken);

      expect(result).toHaveProperty("valid", true);
      expect(result).toHaveProperty("decoded");
      expect(result).toHaveProperty("tokenRecord");
    });

    it("should reject revoked refresh token", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      // Revoke the token
      await tokenService.revokeRefreshToken(refreshToken);

      // Try to validate
      await expect(
        tokenService.validateRefreshToken(refreshToken),
      ).rejects.toThrow("Token has been revoked");
    });
  });

  describe("refreshAccessToken", () => {
    it("should generate new access token from refresh token", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      const result = await tokenService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("expiresIn");
      expect(typeof result.accessToken).toBe("string");
    });

    it("should update last_used_at timestamp", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      // Get token record before refresh
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(refreshToken);
      const tokenBefore = await RefreshToken.findByTokenId(decoded.tokenId);
      const lastUsedBefore = tokenBefore.last_used_at;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh
      await tokenService.refreshAccessToken(refreshToken);

      // Check if last_used_at was updated
      const tokenAfter = await RefreshToken.findByTokenId(decoded.tokenId);
      expect(tokenAfter.last_used_at.getTime()).toBeGreaterThan(
        lastUsedBefore.getTime(),
      );
    });
  });

  describe("revokeRefreshToken", () => {
    it("should revoke refresh token", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      const result = await tokenService.revokeRefreshToken(refreshToken);

      expect(result).toBe(true);

      // Verify token is revoked
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(refreshToken);
      const tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      expect(tokenRecord.is_revoked).toBe(true);
      expect(tokenRecord.revoked_at).not.toBeNull();
    });

    it("should handle revoking already revoked token", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      // Revoke twice
      await tokenService.revokeRefreshToken(refreshToken);
      const result = await tokenService.revokeRefreshToken(refreshToken);

      expect(result).toBe(true); // Should return true for already revoked
    });

    it("should handle revoking expired token", async () => {
      // This requires mocking or creating an expired token
      // For now, test with invalid token
      const result = await tokenService.revokeRefreshToken("invalid-token");
      expect(result).toBe(false);
    });
  });

  describe("revokeAllUserTokens", () => {
    it("should revoke all tokens for a user", async () => {
      // Generate multiple tokens
      await tokenService.generateTokenPair(testUser);
      await tokenService.generateTokenPair(testUser);
      await tokenService.generateTokenPair(testUser);

      const revokedCount = await tokenService.revokeAllUserTokens(testUser.id);

      expect(revokedCount).toBeGreaterThanOrEqual(3);

      // Verify all tokens are revoked
      const tokens = await RefreshToken.findAll({
        where: { user_id: testUser.id, is_revoked: false },
      });

      expect(tokens.length).toBe(0);
    });
  });

  describe("getActiveSessions", () => {
    it("should get all active sessions for user", async () => {
      // Clear existing tokens
      await RefreshToken.destroy({ where: { user_id: testUser.id } });

      // Generate tokens
      await tokenService.generateTokenPair(testUser, "chrome", "192.168.1.1");
      await tokenService.generateTokenPair(testUser, "firefox", "192.168.1.2");

      const sessions = await tokenService.getActiveSessions(testUser.id);

      expect(sessions.length).toBe(2);
      expect(sessions[0]).toHaveProperty("id");
      expect(sessions[0]).toHaveProperty("userAgent");
      expect(sessions[0]).toHaveProperty("ipAddress");
    });
  });

  describe("revokeSessionById", () => {
    it("should revoke specific session", async () => {
      const { refreshToken } = await tokenService.generateTokenPair(testUser);

      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(refreshToken);
      const tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      const result = await tokenService.revokeSessionById(
        testUser.id,
        tokenRecord.id,
      );

      expect(result).toBe(true);

      // Verify token is revoked
      const revokedToken = await RefreshToken.findByPk(tokenRecord.id);
      expect(revokedToken.is_revoked).toBe(true);
    });

    it("should reject revoking session of another user", async () => {
      // Create another user
      const otherUser = await User.create({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password_hash: "TestPass123!@#",
      });

      const { refreshToken } = await tokenService.generateTokenPair(otherUser);

      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(refreshToken);
      const tokenRecord = await RefreshToken.findByTokenId(decoded.tokenId);

      // Try to revoke with wrong user
      await expect(
        tokenService.revokeSessionById(testUser.id, tokenRecord.id),
      ).rejects.toThrow("Session not found");
    });
  });
});
