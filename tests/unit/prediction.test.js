/**
 * Prediction Unit Tests - FIXED
 * Tests prediction endpoints with Jest + Supertest
 */

// ✅ FIXED: Correct import path
const {
  createAgent,
  createAndLoginUser,
  uploadImage,
  hasTestImage,
  getTestImagePath,
  expectSuccess,
  expectError,
} = require("../helpers/testHelpers");

describe("Prediction API", () => {
  let agent;
  let authToken;
  let userId;
  const testImagePath = getTestImagePath();

  beforeAll(async () => {
    agent = createAgent();
    const userData = await createAndLoginUser(agent);
    authToken = userData.accessToken;
    userId = userData.user.id;
  });

  describe("GET /api/predict/health", () => {
    it("should check AI service health", async () => {
      const response = await agent
        .get("/api/predict/health")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("aiService");
      expect(["healthy", "unavailable"]).toContain(response.body.aiService);
    });
  });

  describe("POST /api/predict/session", () => {
    it("should create a new prediction session", async () => {
      const response = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Test Session" })
        .expect(201);

      expectSuccess(response, 201);
      expect(response.body).toHaveProperty("session");
      expect(response.body.session).toHaveProperty("id");
      expect(response.body.session).toHaveProperty("title", "Test Session");
      expect(response.body.session).toHaveProperty("user_id", userId);
    });

    it("should create session with default title", async () => {
      const response = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expectSuccess(response, 201);
      expect(response.body.session).toHaveProperty("title");
      expect(response.body.session.title).toContain("Diagnosis");
    });

    it("should reject session creation without authentication", async () => {
      const response = await agent
        .post("/api/predict/session")
        .send({ title: "Test" })
        .expect(401);

      expectError(response, 401, "TOKEN_REQUIRED");
    });
  });

  describe("POST /api/predict", () => {
    beforeAll(() => {
      if (!hasTestImage()) {
        console.warn("⚠️ Test image not available - skipping prediction tests");
      }
    });

    it("should make prediction with valid image", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      const response = await uploadImage(
        agent,
        testImagePath,
        authToken,
      ).expect(200);

      expectSuccess(response, 200);

      // FIXED: Correct response structure
      expect(response.body).toHaveProperty("session_id");
      expect(response.body).toHaveProperty("prediction");

      const prediction = response.body.prediction;

      // FIXED: Backend returns "class" not "predicted_class" at top level
      expect(prediction).toHaveProperty("id");
      expect(prediction).toHaveProperty("class");
      expect(prediction).toHaveProperty("confidence");
      expect(prediction).toHaveProperty("confidence_percentage");
      expect(prediction).toHaveProperty("confidence_level");
      expect(prediction).toHaveProperty("explanation");
      expect(prediction).toHaveProperty("all_predictions");
      expect(prediction).toHaveProperty("model_version");
      expect(prediction).toHaveProperty("model_name");
      expect(prediction).toHaveProperty("processing_time_ms");
      expect(prediction).toHaveProperty("created_at");

      // Validate confidence ranges
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.confidence_percentage).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence_percentage).toBeLessThanOrEqual(100);

      // Validate all_predictions is an array
      expect(Array.isArray(prediction.all_predictions)).toBe(true);
      expect(prediction.all_predictions.length).toBeGreaterThan(0);
    }, 60000);

    it("should make prediction with specific session", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      // Create session first
      const sessionResponse = await agent
        .post("/api/predict/session")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Test Session for Prediction" })
        .expect(201);

      const sessionId = sessionResponse.body.session.id;

      // Make prediction with session
      const response = await uploadImage(agent, testImagePath, authToken)
        .field("session_id", sessionId)
        .expect(200);

      expectSuccess(response, 200);
      expect(response.body).toHaveProperty("session_id", sessionId);
    }, 60000);

    it("should reject prediction without authentication", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      const response = await uploadImage(agent, testImagePath, null).expect(
        401,
      );

      expectError(response, 401, "TOKEN_REQUIRED");
    });

    it("should reject prediction without image", async () => {
      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expectError(response, 400, "FILE_REQUIRED");
    });

    it("should reject prediction with invalid file type", async () => {
      const fs = require("fs");
      const path = require("path");
      const tempFile = path.join(__dirname, "../../temp-test.txt");
      fs.writeFileSync(tempFile, "This is not an image");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", tempFile)
        .expect(415);

      expectError(response, 415);

      // Cleanup
      fs.unlinkSync(tempFile);
    });
  });

  describe("POST /api/predict/download-pdf", () => {
    it("should generate PDF report for authenticated users", async () => {
      if (!hasTestImage()) {
        console.log("⚠️ Skipping: No test image available");
        return;
      }

      // First make a prediction
      const predictionResponse = await uploadImage(
        agent,
        testImagePath,
        authToken,
      ).expect(200);

      const prediction = predictionResponse.body.prediction;

      // Now try to download PDF
      const pdfResponse = await agent
        .post("/api/predict/download-pdf")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ prediction })
        .expect(200);

      // PDF should be returned
      expect(pdfResponse.headers["content-type"]).toContain("application/pdf");
    }, 90000);

    it("should reject PDF download without authentication", async () => {
      const response = await agent
        .post("/api/predict/download-pdf")
        .send({
          prediction: {
            predicted_class: "Healthy",
            confidence: 0.95,
          },
        })
        .expect(401);

      expectError(response, 401, "TOKEN_REQUIRED");
    });

    it("should reject PDF download without prediction data", async () => {
      const response = await agent
        .post("/api/predict/download-pdf")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expectError(response, 400, "VALIDATION_ERROR");
    });
  });
});
