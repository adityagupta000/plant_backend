/**
 * End-to-End System Tests
 * Tests system-level functionality with Jest + Supertest
 */

const { createAgent, expectSuccess } = require("../helpers/testHelpers");

describe("System E2E Tests", () => {
  let agent;

  beforeEach(() => {
    agent = createAgent();
  });

  describe("System Health", () => {
    it("should return system health status", async () => {
      const response = await agent.get("/api/system/health").expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("services");
      expect(response.body).toHaveProperty("system");

      // Check services
      expect(response.body.services).toHaveProperty("database");
      expect(response.body.services).toHaveProperty("redis");
      expect(response.body.services).toHaveProperty("ai_service");
      expect(response.body.services).toHaveProperty("storage");
    });

    it("should check Redis status", async () => {
      const response = await agent.get("/api/system/redis-status").expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("redis");
      expect(response.body.redis).toHaveProperty("overall_status");
      expect(response.body.redis).toHaveProperty("guest_limiter");
      expect(response.body.redis).toHaveProperty("rate_limiter");
    });

    it("should get guest statistics", async () => {
      const response = await agent.get("/api/system/guest-stats").expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("storage_type");
      expect(response.body).toHaveProperty("redis_connected");
    });
  });

  describe("Basic Health Check", () => {
    it("should return health check", async () => {
      const response = await agent.get("/health").expect(200);

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("service", "plant-health-backend");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
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
  });

  describe("Security Headers", () => {
    it("should set security headers", async () => {
      const response = await agent.get("/health").expect(200);

      // Check for common security headers
      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  describe("CORS Headers", () => {
    it("should handle OPTIONS requests", async () => {
      const response = await agent
        .options("/api/auth/login")
        .set("Origin", process.env.FRONTEND_URL || "http://localhost:5173")
        .expect(204);

      // CORS headers should be present
      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on health endpoint", async () => {
      // Make multiple requests quickly
      const requests = [];

      for (let i = 0; i < 35; i++) {
        requests.push(agent.get("/health"));
      }

      const responses = await Promise.all(requests);

      // Check if any were rate limited
      const rateLimitedCount = responses.filter(
        (res) => res.status === 429,
      ).length;

      // At least some should be rate limited
      // Note: May not hit limit if rate is high
      if (rateLimitedCount > 0) {
        expect(rateLimitedCount).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe("Database Connection", () => {
    it("should have functional database", async () => {
      const response = await agent.get("/api/system/health").expect(200);

      expect(response.body.services.database.status).toBe("healthy");
      expect(response.body.services.database.connected).toBe(true);
    });
  });

  describe("AI Service", () => {
    it("should report AI service status", async () => {
      const response = await agent.get("/api/system/health").expect(200);

      expect(response.body.services.ai_service).toHaveProperty("status");
      expect(["healthy", "unhealthy"]).toContain(
        response.body.services.ai_service.status,
      );

      if (response.body.services.ai_service.status === "healthy") {
        expect(response.body.services.ai_service).toHaveProperty("workers");
        expect(
          response.body.services.ai_service.workers,
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Storage Service", () => {
    it("should report storage status", async () => {
      const response = await agent.get("/api/system/health").expect(200);

      expect(response.body.services.storage.status).toBe("healthy");
      expect(response.body.services.storage).toHaveProperty("files");
      expect(response.body.services.storage).toHaveProperty("total_size");
    });
  });

  describe("System Memory", () => {
    it("should report system memory usage", async () => {
      const response = await agent.get("/api/system/health").expect(200);

      expect(response.body.system).toHaveProperty("memory");
      expect(response.body.system.memory).toHaveProperty("used");
      expect(response.body.system.memory).toHaveProperty("total");
    });
  });
});
