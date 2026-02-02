/**
 * Integration Tests - User Workflows
 * Tests complete user journeys with Jest + Supertest
 */

const {
  createAgent,
  generateUniqueEmail,
  generateUniqueUsername,
  uploadImage,
  hasTestImage,
  getTestImagePath,
  expectSuccess,
} = require("../helpers/testHelpers");

describe("User Workflow Integration Tests", () => {
  const testImagePath = getTestImagePath();

  describe("Complete User Journey", () => {
    it("should complete full authenticated user workflow", async () => {
      const agent = createAgent();

      // Step 1: Register
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      const registerResponse = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      expectSuccess(registerResponse, 201);
      expect(registerResponse.body.user).toHaveProperty("id");

      // Step 2: Login
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      expectSuccess(loginResponse, 200);
      const { accessToken } = loginResponse.body;
      expect(accessToken).toBeTruthy();

      // Step 3: Get Profile
      const profileResponse = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(profileResponse, 200);
      expect(profileResponse.body.user.email).toBe(email);

      // Step 4: Create Session
      const sessionResponse = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Integration Test Session" })
        .expect(201);

      expectSuccess(sessionResponse, 201);
      const sessionId = sessionResponse.body.session.id;

      // Step 5: Make Prediction (if image available)
      if (hasTestImage()) {
        const predictionResponse = await uploadImage(
          agent,
          testImagePath,
          accessToken,
        )
          .field("session_id", sessionId)
          .expect(200);

        expectSuccess(predictionResponse, 200);
        expect(predictionResponse.body.session_id).toBe(sessionId);
        expect(predictionResponse.body.prediction).toHaveProperty("id");
      }

      // Step 6: Get Sessions
      const sessionsResponse = await agent
        .get("/api/history/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(sessionsResponse, 200);
      expect(sessionsResponse.body.total).toBeGreaterThanOrEqual(1);

      // Step 7: Logout
      const logoutResponse = await agent
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expectSuccess(logoutResponse, 200);

      // Step 8: Verify token is invalid after logout
      const profileAfterLogout = await agent
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(401);

      expect(profileAfterLogout.body).toHaveProperty("error");
    }, 120000); // 2 minutes timeout
  });

  describe("Guest to Registered User Conversion", () => {
    it("should convert guest user to registered user", async () => {
      const agent = createAgent();

      // Step 1: Make guest prediction
      if (hasTestImage()) {
        const guestResponse = await agent
          .post("/api/guest/predict")
          .attach("image", testImagePath)
          .expect(200);

        expectSuccess(guestResponse, 200);
        expect(guestResponse.body.usage).toHaveProperty("predictions_used", 1);
      }

      // Step 2: Register
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      const registerResponse = await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      expectSuccess(registerResponse, 201);

      // Step 3: Login
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      expectSuccess(loginResponse, 200);
      const { accessToken } = loginResponse.body;

      // Step 4: Make authenticated prediction
      if (hasTestImage()) {
        const authPredictionResponse = await uploadImage(
          agent,
          testImagePath,
          accessToken,
        ).expect(200);

        expectSuccess(authPredictionResponse, 200);
        expect(authPredictionResponse.body).toHaveProperty("session_id");
        expect(authPredictionResponse.body).toHaveProperty("prediction");
      }
    }, 120000);
  });

  describe("Session Management Workflow", () => {
    it("should manage multiple sessions and predictions", async () => {
      const agent = createAgent();

      // Setup: Register and login
      const username = generateUniqueUsername();
      const email = generateUniqueEmail();
      const password = "TestPass123!@#";

      await agent
        .post("/api/auth/register")
        .send({ username, email, password })
        .expect(201);

      const loginResponse = await agent
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      const { accessToken } = loginResponse.body;

      // Create multiple sessions
      const session1 = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Session 1" })
        .expect(201);

      const session2 = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Session 2" })
        .expect(201);

      const sessionId1 = session1.body.session.id;
      const sessionId2 = session2.body.session.id;

      // Update session title
      await agent
        .patch(`/api/history/sessions/${sessionId1}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Updated Session 1" })
        .expect(200);

      // Get all sessions
      const sessionsResponse = await agent
        .get("/api/history/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(sessionsResponse.body.total).toBeGreaterThanOrEqual(2);

      // Delete one session
      await agent
        .delete(`/api/history/sessions/${sessionId2}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      const afterDeleteResponse = await agent
        .get("/api/history/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(afterDeleteResponse.body.total).toBe(
        sessionsResponse.body.total - 1,
      );
    }, 60000);
  });
});
