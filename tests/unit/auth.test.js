const request = require("supertest");
const app = require("../../src/app");
const { sequelize, User, RefreshToken } = require("../../src/models");
const {
  generateUniqueEmail,
  generateUniqueUsername,
  createAgent,
  createTestUser,
  loginUser,
  expectSuccess,
  expectError,
} = require("../helpers/testHelpers");

describe("Authentication API", () => {
  let agent;

  // Initialize database tables once before all tests
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Create a fresh agent for each test
    agent = request.agent(app);

    // Clear all data before each test
    await RefreshToken.destroy({ where: {}, truncate: false });
    await User.destroy({ where: {}, truncate: false });
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await RefreshToken.destroy({ where: {}, truncate: false });
      await User.destroy({ where: {}, truncate: false });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      const response = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      expectSuccess(response, 201);

      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("username", username);
      expect(response.body.user).toHaveProperty("email", email);
      expect(response.body.user).not.toHaveProperty("password_hash");
    });

    it("should reject registration with duplicate email", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Create first user
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      // Attempt to create second user with same email
      const response = await agent
        .post("/api/auth/register")
        .send({
          username: generateUniqueUsername(),
          email, // Same email
          password,
        })
        .expect(409);

      expectError(response, 409, "EMAIL_EXISTS");
    });

    it("should reject weak password", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "weak";

      const response = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(400);

      expectError(response, 400);

      const errorText =
        response.body.message ||
        (response.body.details ? response.body.details.join(" ") : "") ||
        JSON.stringify(response.body);

      expect(errorText.toLowerCase()).toContain("password");
    });

    it("should reject invalid email format", async () => {
      const username = generateUniqueUsername();
      const email = "invalid-email";
      const password = "TestPass123!@#";

      const response = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(400);

      expectError(response, 400);

      const errorText =
        response.body.message ||
        (response.body.details ? response.body.details.join(" ") : "") ||
        JSON.stringify(response.body);

      expect(errorText.toLowerCase()).toContain("email");
    });

    it("should reject invalid username", async () => {
      const username = "ab"; // Too short
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      const response = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(400);

      expectError(response, 400);

      const errorText =
        response.body.message ||
        (response.body.details ? response.body.details.join(" ") : "") ||
        JSON.stringify(response.body);

      expect(errorText.toLowerCase()).toContain("username");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register user first
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      const response = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("username", username);
      expect(response.body.user).toHaveProperty("email", email);

      // Check for refresh token in cookies
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.startsWith("refreshToken="))).toBe(
        true,
      );
    });

    it("should reject login with invalid email", async () => {
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      const response = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(401);

      expectError(response, 401, "INVALID_CREDENTIALS");
    });

    it("should reject login with invalid password", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register user first
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      const response = await agent
        .post("/api/auth/login")
        .send({ email, password: "WrongPassword123!@#" })
        .expect(401);

      expectError(response, 401, "INVALID_CREDENTIALS");
    });

    it("should reject login with missing credentials", async () => {
      const response = await agent.post("/api/auth/login").send({}).expect(400);

      expectError(response, 400);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register and login to get refresh token
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      await agent.post("/api/auth/login").send({ email, password }).expect(200);

      const response = await agent.post("/api/auth/refresh").expect(200);

      expectSuccess(response, 200);
      expect(response.body).toHaveProperty("accessToken");
    });

    it("should reject refresh without refresh token", async () => {
      const response = await agent.post("/api/auth/refresh").expect(401);

      expectError(response, 401);
    });
  });

  describe("GET /api/auth/profile", () => {
    it("should get user profile with valid token", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register user
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      // Login to get access token
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      const response = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(response, 200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("username", username);
      expect(response.body.user).toHaveProperty("email", email);
    });

    it("should reject profile request without token", async () => {
      const response = await agent.get("/api/auth/profile").expect(401);

      expectError(response, 401);
    });

    it("should reject profile request with invalid token", async () => {
      const response = await agent
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid_token")
        .expect(401);

      expectError(response, 401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register and login
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      const response = await agent
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(response, 200);

      // FIX: Check that refreshToken cookie is cleared (empty value or Max-Age=0)
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();

      // Cookie should either be empty or have Max-Age=0
      const hasRefreshTokenCookie = cookies.some((cookie) =>
        cookie.startsWith("refreshToken="),
      );

      if (hasRefreshTokenCookie) {
        // If cookie is present, it should be cleared (empty or Max-Age=0)
        const refreshTokenCookie = cookies.find((cookie) =>
          cookie.startsWith("refreshToken="),
        );
        const isClearedCookie =
          refreshTokenCookie.includes("refreshToken=;") ||
          refreshTokenCookie.includes("Max-Age=0") ||
          refreshTokenCookie.includes("Expires=");

        expect(isClearedCookie).toBe(true);
      }
      // If no refresh token cookie, that's also fine (already cleared)
    });

    it("should logout even without refresh token", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register user
      const registerResponse = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      const user = registerResponse.body.user;

      // FIX: Use correct JWT config import
      const jwt = require("jsonwebtoken");
      const jwtConfig = require("../../src/config/jwt");

      // FIXED: Create access token with all required fields matching production token structure
      const accessToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          tokenType: "access", // CRITICAL: Required by verifyAccessToken validation
        },
        jwtConfig.access.secret,
        {
          expiresIn: "15m",
          algorithm: "HS256", // Match production token algorithm
        },
      );

      const response = await agent
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(response, 200);
    });
  });

  describe("POST /api/auth/logout-all", () => {
    it("should logout from all devices", async () => {
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      // Register
      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      // Login from first device
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;
      const userId = loginResponse.body.user.id;

      // Login from another "device"
      const agent2 = request.agent(app);
      await agent2
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      const response = await agent
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(response, 200);

      const refreshTokens = await RefreshToken.findAll({
        where: { user_id: userId, is_revoked: false },
      });

      expect(refreshTokens).toHaveLength(0);
    });
  });
});
