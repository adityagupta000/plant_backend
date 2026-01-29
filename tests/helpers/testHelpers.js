/**
 * Test Helper Functions
 * Reusable utilities for Jest/Supertest tests
 */

const request = require("supertest");
const app = require("../../src/app");
const fs = require("fs");
const path = require("path");

/**
 * Create Supertest agent
 */
const createAgent = () => {
  return request.agent(app);
};

/**
 * Generate unique test email
 */
const generateUniqueEmail = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test${timestamp}${random}@test.com`;
};

/**
 * Generate unique test username
 */
const generateUniqueUsername = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `testuser${timestamp}${random}`;
};

/**
 * Create and register a test user
 */
const createTestUser = async (agent) => {
  const username = generateUniqueUsername();
  const email = generateUniqueEmail();
  const password = "TestPass123!@#";

  const response = await agent
    .post("/api/auth/register")
    .send({ username, email, password })
    .expect(201);

  return {
    username,
    email,
    password,
    user: response.body.user,
  };
};

/**
 * Login with credentials
 */
const loginUser = async (agent, email, password) => {
  const response = await agent
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    user: response.body.user,
    expiresIn: response.body.expiresIn,
  };
};

/**
 * Create user and login (convenience method)
 */
const createAndLoginUser = async (agent) => {
  const testUser = await createTestUser(agent);
  const loginData = await loginUser(agent, testUser.email, testUser.password);

  return {
    ...testUser,
    ...loginData,
  };
};

/**
 * Upload test image
 */
const uploadImage = async (agent, imagePath, token = null) => {
  const absolutePath = path.resolve(imagePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Test image not found: ${absolutePath}`);
  }

  let req = agent.post("/api/predict").attach("image", absolutePath);

  if (token) {
    req = req.set("Authorization", `Bearer ${token}`);
  }

  return req;
};

/**
 * Upload guest image
 */
const uploadGuestImage = async (agent, imagePath) => {
  const absolutePath = path.resolve(imagePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Test image not found: ${absolutePath}`);
  }

  return agent.post("/api/guest/predict").attach("image", absolutePath);
};

/**
 * Clean up test files
 */
const cleanupTestFiles = async (filePaths) => {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
};

/**
 * Wait for condition with timeout
 */
const waitForCondition = async (
  conditionFn,
  timeout = 5000,
  interval = 100,
) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error("Condition not met within timeout");
};

/**
 * Get test image path
 */
const getTestImagePath = () => {
  const testImagePath = process.env.TEST_IMAGE || "../../test-data/test-plant.jpg";
  const absolutePath = path.resolve(__dirname, testImagePath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`⚠️  Test image not found: ${absolutePath}`);
    return null;
  }

  return absolutePath;
};

/**
 * Check if test image exists
 */
const hasTestImage = () => {
  return getTestImagePath() !== null;
};

/**
 * Expect successful response
 */
const expectSuccess = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty("success", true);
  return response.body;
};

/**
 * Expect error response
 */
const expectError = (response, statusCode, errorCode = null) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty("error");

  if (errorCode) {
    expect(response.body).toHaveProperty("code", errorCode);
  }

  return response.body;
};

module.exports = {
  createAgent,
  generateUniqueEmail,
  generateUniqueUsername,
  createTestUser,
  loginUser,
  createAndLoginUser,
  uploadImage,
  uploadGuestImage,
  cleanupTestFiles,
  waitForCondition,
  getTestImagePath,
  hasTestImage,
  expectSuccess,
  expectError,
};
