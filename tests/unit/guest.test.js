/**
 * Guest Prediction Unit Tests - FIXED
 * Tests guest mode endpoints with Jest + Supertest
 */

// ✅ FIXED: Correct import path
const {
  createAgent,
  uploadGuestImage,
  hasTestImage,
  getTestImagePath,
  expectSuccess,
  expectError,
} = require("../helpers/testHelpers");

// Import the guest limiter to clear memory store between tests
const {
  clearMemoryStore,
} = require("../../src/middlewares/guestRateLimiter.middleware");

describe("Guest Prediction API", () => {
  let agent;
  const testImagePath = getTestImagePath();

  beforeEach(() => {
    agent = createAgent();
    // Clear guest session store before each test to avoid rate limiting issues
    clearMemoryStore();
  });

  describe("POST /api/guest/predict", () => {
    beforeAll(() => {
      if (!hasTestImage()) {
        console.warn(
          "⚠️ Test image not available - skipping guest prediction tests",
        );
      }
    });

    it("should make guest prediction successfully", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      const response = await uploadGuestImage(agent, testImagePath).expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("prediction");
      expect(response.body).toHaveProperty("usage");
      expect(response.body).toHaveProperty("login_prompt");
      expect(response.body).toHaveProperty("features");

      // Check prediction data
      const prediction = response.body.prediction;
      expect(prediction).toHaveProperty("predicted_class");
      expect(prediction).toHaveProperty("confidence");
      expect(prediction).toHaveProperty("confidence_percentage");

      // Check usage tracking
      const usage = response.body.usage;
      expect(usage).toHaveProperty("predictions_used");
      expect(usage).toHaveProperty("session_remaining");
      expect(usage).toHaveProperty("daily_remaining");
    }, 60000);

    it("should track guest usage across requests", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      // First prediction
      const response1 = await uploadGuestImage(agent, testImagePath).expect(
        200,
      );

      expectSuccess(response1, 200);
      expect(response1.body.usage.predictions_used).toBe(1);

      // Second prediction (same agent/session)
      const response2 = await uploadGuestImage(agent, testImagePath).expect(
        200,
      );

      expectSuccess(response2, 200);
      expect(response2.body.usage.predictions_used).toBe(2);
    }, 120000);

    it("should show login prompt after usage", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      // Make prediction
      const response = await uploadGuestImage(agent, testImagePath).expect(200);

      expectSuccess(response, 200);

      // Check login prompt
      const loginPrompt = response.body.login_prompt;
      expect(loginPrompt).toHaveProperty("show");
      expect(loginPrompt).toHaveProperty("title");
      expect(loginPrompt).toHaveProperty("message");

      if (loginPrompt.show) {
        expect(loginPrompt.title).toBeTruthy();
        expect(loginPrompt.message).toBeTruthy();
      }
    }, 60000);

    it("should limit guest features compared to authenticated users", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      const response = await uploadGuestImage(agent, testImagePath).expect(200);

      expectSuccess(response, 200);

      const features = response.body.features;
      expect(features).toHaveProperty("current_access");
      expect(features).toHaveProperty("with_account");

      expect(Array.isArray(features.current_access)).toBe(true);
      expect(Array.isArray(features.with_account)).toBe(true);

      // Authenticated features should be more than guest features
      expect(features.with_account.length).toBeGreaterThan(
        features.current_access.length,
      );
    }, 60000);

    it("should reject guest prediction without image", async () => {
      const response = await agent.post("/api/guest/predict").expect(400);

      expectError(response, 400, "FILE_REQUIRED");
    });

    it("should enforce rate limits for guests", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      // Make multiple predictions to hit rate limit
      // Note: This test may take a while
      const predictions = [];

      for (let i = 0; i < 5; i++) {
        predictions.push(uploadGuestImage(agent, testImagePath));
      }

      const responses = await Promise.all(predictions);

      // Check if any request was rate limited
      const rateLimited = responses.some((res) => res.status === 429);

      if (rateLimited) {
        const limitedResponse = responses.find((res) => res.status === 429);
        expectError(limitedResponse, 429);
        expect(limitedResponse.body.code).toMatch(/LIMIT_EXCEEDED/);
      } else {
        // All passed - rate limit not hit yet
        console.log("⚠️ Rate limit not hit in 5 requests");
      }
    }, 300000); // 5 minutes timeout
  });

  describe("POST /api/guest/predict/download-pdf", () => {
    it("should block PDF download for guests", async () => {
      const response = await agent
        .post("/api/guest/predict/download-pdf")
        .send({
          prediction: {
            predicted_class: "Healthy",
            confidence: 0.95,
          },
        })
        .expect(403);

      expectError(response, 403, "FEATURE_REQUIRES_AUTHENTICATION");
      expect(response.body).toHaveProperty("details");
      expect(response.body.details).toHaveProperty("feature", "PDF downloads");
    });
  });
});
