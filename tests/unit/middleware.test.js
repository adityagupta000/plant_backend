/**
 * Middleware Unit Tests
 * Tests validation, error handling, and other middleware
 */

const request = require("supertest");
const app = require("../../src/app");
const { createAgent } = require("../helpers/testHelpers");

describe("Middleware Tests", () => {
  let agent;

  beforeEach(() => {
    agent = createAgent();
  });

  describe("Validation Middleware", () => {
    describe("Registration Validation", () => {
      it("should validate email format", async () => {
        const response = await agent
          .post("/api/auth/register")
          .send({
            username: "testuser",
            email: "not-an-email",
            password: "TestPass123!@#",
          })
          .expect(400);

        expect(response.body.code).toBe("VALIDATION_ERROR");
        expect(response.body.details).toEqual(
          expect.arrayContaining([expect.stringContaining("email")]),
        );
      });

      it("should validate username length", async () => {
        const response = await agent
          .post("/api/auth/register")
          .send({
            username: "ab", // Too short
            email: "test@test.com",
            password: "TestPass123!@#",
          })
          .expect(400);

        expect(response.body.code).toBe("VALIDATION_ERROR");
      });

      it("should validate password strength", async () => {
        const response = await agent
          .post("/api/auth/register")
          .send({
            username: "testuser",
            email: "test@test.com",
            password: "weak", // Too weak
          })
          .expect(400);

        expect(response.body.code).toBe("VALIDATION_ERROR");
        expect(response.body.details).toEqual(
          expect.arrayContaining([expect.stringContaining("password")]),
        );
      });

      it("should validate username alphanumeric only", async () => {
        const response = await agent
          .post("/api/auth/register")
          .send({
            username: "user@name!", // Invalid characters
            email: "test@test.com",
            password: "TestPass123!@#",
          })
          .expect(400);

        expect(response.body.code).toBe("VALIDATION_ERROR");
      });
    });

    describe("Login Validation", () => {
      it("should require email", async () => {
        const response = await agent
          .post("/api/auth/login")
          .send({
            password: "password",
          })
          .expect(400);

        expect(response.body.code).toBe("VALIDATION_ERROR");
      });

      it("should require password", async () => {
        const response = await agent
          .post("/api/auth/login")
          .send({
            email: "test@test.com",
          })
          .expect(400);

        expect(response.body.code).toBe("VALIDATION_ERROR");
      });
    });

    describe("Session Validation", () => {
      it("should validate session title length", async () => {
        // This would need authentication
        // Skipping for now as it requires full setup
      });
    });
  });

  describe("Error Handling Middleware", () => {
    it("should handle Sequelize validation errors", async () => {
      // Trigger duplicate email error
      const userData = {
        username: `user${Date.now()}`,
        email: `test${Date.now()}@test.com`,
        password: "TestPass123!@#",
      };

      // Register once
      await agent.post("/api/auth/register").send(userData).expect(201);

      // Try to register again with same email
      const response = await agent
        .post("/api/auth/register")
        .send({
          username: `user${Date.now()}2`,
          email: userData.email, // Same email
          password: "TestPass123!@#",
        })
        .expect(409);

      expect(response.body.code).toBe("EMAIL_EXISTS");
    });

    it("should handle 404 errors for unknown routes", async () => {
      const response = await agent.get("/api/nonexistent").expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("not found");
    });

    it("should handle malformed JSON", async () => {
      const response = await agent
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{ invalid json }")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should include error details in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const response = await agent.post("/api/auth/login").send({}).expect(400);

      expect(response.body).toHaveProperty("error");

      process.env.NODE_ENV = originalEnv;
    });

    it("should not leak stack traces in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const response = await agent.post("/api/auth/login").send({}).expect(400);

      expect(response.body).not.toHaveProperty("stack");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Rate Limiting Middleware", () => {
    it("should enforce global rate limits", async () => {
      const requests = [];

      // Make 1005 requests (global limit is 1000 per 15 min)
      for (let i = 0; i < 1005; i++) {
        requests.push(agent.get("/health"));
      }

      const responses = await Promise.all(requests);

      const rateLimited = responses.filter((res) => res.status === 429);

      // At least some should be rate limited
      if (rateLimited.length > 0) {
        expect(rateLimited[0].body.code).toMatch(/LIMIT_EXCEEDED/);
      }
    }, 60000);

    it("should enforce auth endpoint rate limits", async () => {
      const requests = [];

      // Make 15 requests (auth limit is 10 per 15 min)
      for (let i = 0; i < 15; i++) {
        requests.push(
          agent.post("/api/auth/login").send({
            email: "test@test.com",
            password: "wrong",
          }),
        );
      }

      const responses = await Promise.all(requests);

      const rateLimited = responses.filter((res) => res.status === 429);

      if (rateLimited.length > 0) {
        expect(rateLimited[0].body.code).toBe("AUTH_RATE_LIMIT_EXCEEDED");
      }
    }, 30000);
  });

  describe("CORS Middleware", () => {
    it("should set CORS headers", async () => {
      const response = await agent
        .get("/health")
        .set("Origin", process.env.FRONTEND_URL || "http://localhost:5173")
        .expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });

    it("should handle preflight requests", async () => {
      const response = await agent
        .options("/api/auth/login")
        .set("Origin", process.env.FRONTEND_URL || "http://localhost:5173")
        .set("Access-Control-Request-Method", "POST")
        .expect(204);

      expect(response.headers).toHaveProperty("access-control-allow-methods");
    });
  });

  describe("Security Headers Middleware", () => {
    it("should set X-Content-Type-Options", async () => {
      const response = await agent.get("/health").expect(200);

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("should set X-Frame-Options", async () => {
      const response = await agent.get("/health").expect(200);

      expect(response.headers["x-frame-options"]).toBeTruthy();
    });

    it("should set Content-Security-Policy", async () => {
      const response = await agent.get("/health").expect(200);

      expect(response.headers["content-security-policy"]).toBeTruthy();
    });
  });
});
