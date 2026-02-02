/**
 * Jest Setup After Environment
 * Runs in the SAME PROCESS as tests
 */

const { sequelize } = require("../src/models");
const aiService = require("../src/services/ai.service");

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Initialize AI service with mock predictions for testing
  // In test environment, we mock the AI service to return consistent results
  await initializeAIServiceMock();
});

// Mock AI Service for testing
async function initializeAIServiceMock() {
  try {
    // Initialize the AI service
    const initialized = await aiService.initialize();

    if (!initialized) {
      // If initialization fails, override the predict method with a mock
      aiService.predict = async (imagePath) => {
        return {
          success: true,
          processingTime: 100, // CRITICAL: at top level for service.js to use
          data: {
            predicted_class: "Healthy",
            category: "Normal",
            subtype: "Green Leaf",
            confidence: 0.95,
            confidence_percentage: 95,
            confidence_level: "High",
            all_probabilities: [
              { class: "Healthy", confidence: 0.95 },
              { class: "Powdery Mildew", confidence: 0.03 },
              { class: "Rust", confidence: 0.02 },
            ],
            model_version: "test-v1.0",
            model_name: "test-model",
            explanation: "Test prediction - AI service mocked",
          },
        };
      };

      // Mark as initialized so other code works
      aiService.initialized = true;
    }
  } catch (error) {
    console.warn("Failed to initialize AI service, using mock:", error.message);

    // Override predict method with mock
    aiService.predict = async (imagePath) => {
      return {
        success: true,
        processingTime: 100, // CRITICAL: at top level for service.js to use
        data: {
          predicted_class: "Healthy",
          category: "Normal",
          subtype: "Green Leaf",
          confidence: 0.95,
          confidence_percentage: 95,
          confidence_level: "High",
          all_probabilities: [
            { class: "Healthy", confidence: 0.95 },
            { class: "Powdery Mildew", confidence: 0.03 },
            { class: "Rust", confidence: 0.02 },
          ],
          model_version: "test-v1.0",
          model_name: "test-model",
          explanation: "Test prediction - AI service mocked",
        },
      };
    };

    // Mark as initialized
    aiService.initialized = true;
  }
}

global.testTimeout = 5000;
