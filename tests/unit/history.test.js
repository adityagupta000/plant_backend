/**
 * History/Session Unit Tests
 * Tests history and session management endpoints with Jest + Supertest
 */

const {
  createAgent,
  createAndLoginUser,
  uploadImage,
  hasTestImage,
  getTestImagePath,
  expectSuccess,
  expectError,
} = require("../../helpers/testHelpers");

describe("History API", () => {
  let agent;
  let authToken;
  let sessionId;
  const testImagePath = getTestImagePath();

  beforeAll(async () => {
    agent = createAgent();
    const userData = await createAndLoginUser(agent);
    authToken = userData.accessToken;

    // Create a session for testing
    const sessionResponse = await agent
      .post("/api/predict/session")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Test History Session" })
      .expect(201);

    sessionId = sessionResponse.body.session.id;

    // Make a prediction if test image available
    if (hasTestImage()) {
      await uploadImage(agent, testImagePath, authToken)
        .field("session_id", sessionId)
        .expect(200);
    }
  }, 90000);

  describe("GET /api/history/sessions", () => {
    it("should get all sessions for user", async () => {
      const response = await agent
        .get("/api/history/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("sessions");
      expect(response.body).toHaveProperty("pagination");

      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);

      // Check session structure
      if (response.body.sessions.length > 0) {
        const session = response.body.sessions[0];
        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("title");
        expect(session).toHaveProperty("created_at");
        expect(session).toHaveProperty("updated_at");
      }
    });

    it("should support pagination", async () => {
      const response = await agent
        .get("/api/history/sessions")
        .query({ limit: 5, offset: 0 })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expectSuccess(response, 200);

      expect(response.body.pagination).toHaveProperty("limit", 5);
      expect(response.body.pagination).toHaveProperty("offset", 0);
      expect(response.body.sessions.length).toBeLessThanOrEqual(5);
    });

    it("should reject sessions request without authentication", async () => {
      const response = await agent.get("/api/history/sessions").expect(401);

      expectError(response, 401, "TOKEN_REQUIRED");
    });
  });

  describe("GET /api/history/sessions/:sessionId/predictions", () => {
    it("should get predictions for a session", async () => {
      const response = await agent
        .get(`/api/history/sessions/${sessionId}/predictions`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("session_id", sessionId);
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("predictions");
      expect(response.body).toHaveProperty("pagination");

      expect(Array.isArray(response.body.predictions)).toBe(true);

      // Check prediction structure if any predictions exist
      if (response.body.predictions.length > 0) {
        const prediction = response.body.predictions[0];
        expect(prediction).toHaveProperty("id");
        expect(prediction).toHaveProperty("predicted_class");
        expect(prediction).toHaveProperty("confidence");
        expect(prediction).toHaveProperty("created_at");
      }
    });

    it("should reject with invalid session ID", async () => {
      const response = await agent
        .get("/api/history/sessions/invalid/predictions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expectError(response, 400, "INVALID_SESSION_ID");
    });

    it("should reject with non-existent session", async () => {
      const response = await agent
        .get("/api/history/sessions/99999/predictions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expectError(response, 404, "SESSION_NOT_FOUND");
    });
  });

  describe("PATCH /api/history/sessions/:sessionId", () => {
    it("should update session title", async () => {
      const newTitle = `Updated Title ${Date.now()}`;

      const response = await agent
        .patch(`/api/history/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: newTitle })
        .expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("session");
      expect(response.body.session).toHaveProperty("title", newTitle);
    });

    it("should reject empty title", async () => {
      const response = await agent
        .patch(`/api/history/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "" })
        .expect(400);

      expectError(response, 400, "VALIDATION_ERROR");
    });

    it("should reject title update for non-existent session", async () => {
      const response = await agent
        .patch("/api/history/sessions/99999")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "New Title" })
        .expect(404);

      expectError(response, 404, "SESSION_NOT_FOUND");
    });
  });

  describe("DELETE /api/history/sessions/:sessionId", () => {
    it("should delete a session", async () => {
      // Create a new session to delete
      const newSessionResponse = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Session to Delete" })
        .expect(201);

      const sessionToDelete = newSessionResponse.body.session.id;

      // Delete the session
      const response = await agent
        .delete(`/api/history/sessions/${sessionToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expectSuccess(response, 200);

      // Verify session is deleted
      const verifyResponse = await agent
        .get(`/api/history/sessions/${sessionToDelete}/predictions`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expectError(verifyResponse, 404, "SESSION_NOT_FOUND");
    });

    it("should reject deletion of non-existent session", async () => {
      const response = await agent
        .delete("/api/history/sessions/99999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expectError(response, 404, "SESSION_NOT_FOUND");
    });
  });

  describe("GET /api/history/predictions/:predictionId", () => {
    it("should get prediction details", async () => {
      if (!hasTestImage()) {
        console.log("⏭️  Skipping: No test image available");
        return;
      }

      // Get sessions to find a prediction
      const sessionsResponse = await agent
        .get("/api/history/sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      if (sessionsResponse.body.sessions.length === 0) {
        console.log("⏭️  Skipping: No sessions available");
        return;
      }

      const firstSession = sessionsResponse.body.sessions[0].id;

      // Get predictions for session
      const predictionsResponse = await agent
        .get(`/api/history/sessions/${firstSession}/predictions`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      if (predictionsResponse.body.predictions.length === 0) {
        console.log("⏭️  Skipping: No predictions available");
        return;
      }

      const predictionId = predictionsResponse.body.predictions[0].id;

      // Get prediction details
      const response = await agent
        .get(`/api/history/predictions/${predictionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expectSuccess(response, 200);

      expect(response.body).toHaveProperty("prediction");
      expect(response.body.prediction).toHaveProperty("id", predictionId);
      expect(response.body.prediction).toHaveProperty("predicted_class");
      expect(response.body.prediction).toHaveProperty("confidence");
    });

    it("should reject invalid prediction ID", async () => {
      const response = await agent
        .get("/api/history/predictions/invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expectError(response, 400, "INVALID_PREDICTION_ID");
    });

    it("should reject non-existent prediction", async () => {
      const response = await agent
        .get("/api/history/predictions/99999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expectError(response, 404, "PREDICTION_NOT_FOUND");
    });
  });
});
