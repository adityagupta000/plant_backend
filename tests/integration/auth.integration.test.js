/**
 * Integration Tests - Authentication Flow
 * Tests complete authentication workflows including login, register, token refresh, and logout
 */

const {
  createAgent,
  generateUniqueEmail,
  generateUniqueUsername,
  expectSuccess,
} = require("../helpers/testHelpers");

describe("Authentication Integration Tests", () => {
  describe("Registration Flow", () => {
    it("should complete registration and verify email uniqueness", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const username = generateUniqueUsername();
      const password = "SecurePass123!@#";

      // Step 1: Register
      const registerResponse = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      expectSuccess(registerResponse, 201);
      expect(registerResponse.body.user).toHaveProperty("id");
      expect(registerResponse.body.user.email).toBe(email);
      expect(registerResponse.body.user.username).toBe(username);

      // Step 2: Try to register with same email (should fail)
      const duplicateResponse = await agent
        .post("/api/auth/register")
        .send({
          username: generateUniqueUsername(),
          email,
          password,
        })
        .expect(409);

      expect(duplicateResponse.body.error).toBeTruthy();
      expect(duplicateResponse.body.code).toBe("EMAIL_EXISTS");
    });

    it("should enforce password strength requirements", async () => {
      const agent = createAgent();
      const weakPasswords = ["123", "password", "abc123"];

      for (const weakPassword of weakPasswords) {
        const response = await agent.post("/api/auth/register").send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: weakPassword,
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeTruthy();
      }
    });

    it("should validate email format", async () => {
      const agent = createAgent();
      const invalidEmails = ["notanemail", "missing@.com", "@example.com"];

      for (const invalidEmail of invalidEmails) {
        const response = await agent.post("/api/auth/register").send({
          username: generateUniqueUsername(),
          email: invalidEmail,
          password: "ValidPass123!@#",
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeTruthy();
      }
    });

    it("should validate username format and length", async () => {
      const agent = createAgent();

      // Too short
      let response = await agent.post("/api/auth/register").send({
        username: "ab",
        email: generateUniqueEmail(),
        password: "ValidPass123!@#",
      });
      expect(response.status).toBe(400);

      // Contains invalid characters
      response = await agent.post("/api/auth/register").send({
        username: "user@#$",
        email: generateUniqueEmail(),
        password: "ValidPass123!@#",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Login and Token Management", () => {
    it("should login and receive valid tokens", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const password = "ValidPass123!@#";

      // Register first
      await agent.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email,
        password,
      });

      // Login
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      expectSuccess(loginResponse, 200);
      expect(loginResponse.body.accessToken).toBeTruthy();
      expect(loginResponse.body.user).toHaveProperty("id");
    });

    it("should reject login with invalid credentials", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();

      // Try to login with non-existent user
      const response = await agent
        .post("/api/auth/login")
        .send({ email, password: "AnyPassword123!@#" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeTruthy();
    });

    it("should reject login with wrong password", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const password = "CorrectPass123!@#";

      // Register
      await agent.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email,
        password,
      });

      // Try wrong password
      const response = await agent
        .post("/api/auth/login")
        .send({ email, password: "WrongPass123!@#" })
        .expect(401);

      expect(response.body.error).toBeTruthy();
    });
  });

  describe("Token Refresh Flow", () => {
    it("should refresh access token with valid refresh token", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const password = "ValidPass123!@#";

      // Register
      await agent.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email,
        password,
      });

      // Login
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password });

      const oldAccessToken = loginResponse.body.accessToken;

      // Refresh token
      const refreshResponse = await agent.post("/api/auth/refresh").expect(200);

      expectSuccess(refreshResponse, 200);
      expect(refreshResponse.body.accessToken).toBeTruthy();
      // New token might be different
      expect(refreshResponse.body.accessToken).toBeDefined();
    });

    it("should reject refresh without refresh token", async () => {
      const agent = createAgent();

      const response = await agent.post("/api/auth/refresh");

      expect(response.status).toBe(401);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe("Session Security", () => {
    it("should enforce session security on profile access", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const password = "ValidPass123!@#";

      // Register and login
      await agent.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email,
        password,
      });

      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password });

      const accessToken = loginResponse.body.accessToken;

      // Access profile (should succeed)
      const profileResponse = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(profileResponse, 200);
      expect(profileResponse.body.user.email).toBe(email);
    });

    it("should reject access with invalid token format", async () => {
      const agent = createAgent();

      const response = await agent
        .get("/api/auth/profile")
        .set("Authorization", "InvalidTokenFormat");

      expect(response.status).toBe(401);
    });

    it("should reject access without authentication header", async () => {
      const agent = createAgent();

      const response = await agent.get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe("Logout and Token Revocation", () => {
    it("should revoke tokens on logout", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const password = "ValidPass123!@#";

      // Register and login
      await agent.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email,
        password,
      });

      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password });

      const accessToken = loginResponse.body.accessToken;

      // Verify token works before logout
      const profileBeforeLogout = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(profileBeforeLogout.body.user).toBeTruthy();

      // Logout
      const logoutResponse = await agent
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(logoutResponse, 200);

      // Verify token is revoked after logout
      const profileAfterLogout = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(401);

      expect(profileAfterLogout.body.error).toBeTruthy();
    });

    it("should revoke all tokens on logout-all", async () => {
      const agent = createAgent();
      const email = generateUniqueEmail();
      const password = "ValidPass123!@#";

      // Register and login
      await agent.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email,
        password,
      });

      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password });

      const accessToken = loginResponse.body.accessToken;

      // Logout from all devices
      const logoutAllResponse = await agent
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(logoutAllResponse, 200);
      expect(logoutAllResponse.body.revokedSessions).toBeGreaterThanOrEqual(0);

      // Verify token is revoked
      const profileAfterLogout = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(401);

      expect(profileAfterLogout.body.error).toBeTruthy();
    });
  });

  describe("Multiple Account Management", () => {
    it("should handle multiple users logging in simultaneously", async () => {
      const agent1 = createAgent();
      const agent2 = createAgent();

      const user1Email = generateUniqueEmail();
      const user2Email = generateUniqueEmail();
      const password = "ValidPass123!@#";

      // Register and login user 1
      await agent1.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email: user1Email,
        password,
      });

      const login1 = await agent1
        .post("/api/auth/login")
        .send({ email: user1Email, password });

      // Register and login user 2
      await agent2.post("/api/auth/register").send({
        username: generateUniqueUsername(),
        email: user2Email,
        password,
      });

      const login2 = await agent2
        .post("/api/auth/login")
        .send({ email: user2Email, password });

      // Verify both have access to their own profiles
      const profile1 = await agent1
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${login1.body.accessToken}`)
        .expect(200);

      const profile2 = await agent2
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${login2.body.accessToken}`)
        .expect(200);

      expect(profile1.body.user.email).toBe(user1Email);
      expect(profile2.body.user.email).toBe(user2Email);
      expect(profile1.body.user.id).not.toBe(profile2.body.user.id);
    });
  });
});
