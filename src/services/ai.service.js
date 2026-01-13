/**
 * FIXED AI Service - Node.js calling Python
 * FIXES:
 * 1. Proper process cleanup on timeout
 * 2. Stdout buffer overflow protection
 * 3. Zombie process prevention
 * 4. Memory leak protection
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const constants = require("../config/constants");
const { sleep } = require("../utils/helpers");
const logger = require("../utils/logger");

class AIService {
  constructor() {
    this.pythonPath =
      process.env.PYTHON_PATH ||
      (process.platform === "win32"
        ? path.join(__dirname, "../../ai/venv/Scripts/python.exe")
        : path.join(__dirname, "../../ai/venv/bin/python"));
    this.scriptPath = path.join(__dirname, "../../ai/inference.py");
    this.modelPath =
      process.env.MODEL_PATH ||
      path.join(__dirname, "../../ai/saved_models/best_model.pth");
    this.maxRetries = constants.AI_SERVICE_MAX_RETRIES || 3;
    this.retryDelay = constants.AI_SERVICE_RETRY_DELAY || 1000;
    // SECURITY: Max output size to prevent DoS
    this.maxOutputSize = constants.AI_MAX_OUTPUT_SIZE || 1048576; // 1MB
    this.isModelLoaded = false;
    this.loadAttempted = false;

    // FIXED: Track active processes for cleanup
    this.activeProcesses = new Set();
  }

  /**
   * Check health
   */
  async checkHealth() {
    try {
      if (!fs.existsSync(this.scriptPath)) {
        logger.error("Inference script not found", { path: this.scriptPath });
        return false;
      }

      if (!fs.existsSync(this.modelPath)) {
        logger.error("Model file not found", { path: this.modelPath });
        return false;
      }

      // Quick Python check with timeout
      const pythonCheck = await this._runPythonCommand(
        ["-c", 'import torch; print("OK")'],
        5000
      );

      if (pythonCheck.success && pythonCheck.output.includes("OK")) {
        logger.info("AI service health check passed", {
          python: this.pythonPath,
          script: this.scriptPath,
          model: this.modelPath,
        });
        this.isModelLoaded = true;
        return true;
      }

      logger.warn("AI service health check failed - PyTorch not available");
      return false;
    } catch (error) {
      logger.error("AI service health check failed", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * FIXED: Run Python command with proper cleanup
   */
  _runPythonCommand(args, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, args);
      this.activeProcesses.add(process);

      let stdout = "";
      let stderr = "";
      let killed = false;
      let outputSize = 0;

      // SECURITY FIX: Prevent buffer overflow
      process.stdout.on("data", (data) => {
        outputSize += data.length;
        if (outputSize > this.maxOutputSize) {
          killed = true;
          process.kill("SIGKILL");
          reject(new Error("Output size exceeded limit"));
          return;
        }
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        outputSize += data.length;
        if (outputSize > this.maxOutputSize) {
          killed = true;
          process.kill("SIGKILL");
          reject(new Error("Output size exceeded limit"));
          return;
        }
        stderr += data.toString();
      });

      process.on("close", (code) => {
        this.activeProcesses.delete(process);
        if (killed) return;

        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: stderr });
        }
      });

      process.on("error", (error) => {
        this.activeProcesses.delete(process);
        if (killed) return;
        reject(error);
      });

      // FIXED: Proper timeout handling
      const timeoutId = setTimeout(() => {
        if (!killed) {
          killed = true;
          logger.warn("Python command timeout", { args, timeout });

          // Try graceful shutdown first
          process.kill("SIGTERM");

          // Force kill after 2 seconds
          setTimeout(() => {
            if (this.activeProcesses.has(process)) {
              process.kill("SIGKILL");
              this.activeProcesses.delete(process);
            }
          }, 2000);

          reject(new Error("Python command timeout"));
        }
      }, timeout);

      // Clear timeout on completion
      process.on("close", () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Make prediction
   */
  async predict(imagePath, retryCount = 0) {
    const startTime = Date.now();

    try {
      // Validate image file
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      logger.debug("Running prediction", {
        imagePath,
        attempt: retryCount + 1,
        maxRetries: this.maxRetries,
      });

      // Run inference
      const result = await this._runInference(imagePath);
      const processingTime = Date.now() - startTime;

      if (result.success) {
        logger.info("Prediction successful", {
          processingTime,
          predictedClass: result.data.predicted_class,
          confidence: result.data.confidence,
        });

        return {
          success: true,
          data: result.data,
          processingTime,
        };
      } else {
        throw new Error(result.error || "Prediction failed");
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Retry logic
      if (retryCount < this.maxRetries) {
        const delay = this._calculateRetryDelay(retryCount);

        logger.warn("Prediction failed, retrying", {
          attempt: retryCount + 1,
          maxRetries: this.maxRetries,
          retryDelay: delay,
          error: error.message,
        });

        await sleep(delay);
        return this.predict(imagePath, retryCount + 1);
      }

      // Max retries reached
      logger.error("Prediction failed after retries", {
        error: error.message,
        retryCount,
        processingTime,
      });

      return {
        success: false,
        error: error.message,
        errorCode: "AI_PREDICTION_FAILED",
        processingTime,
      };
    }
  }

  /**
   * FIXED: Run inference with proper cleanup
   */
  _runInference(imagePath, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(
        this.pythonPath,
        [this.scriptPath, imagePath],
        {
          env: {
            ...process.env,
            MODEL_PATH: this.modelPath,
          },
        }
      );

      this.activeProcesses.add(pythonProcess);

      let stdout = "";
      let stderr = "";
      let killed = false;
      let outputSize = 0;

      // SECURITY FIX: Buffer overflow protection
      pythonProcess.stdout.on("data", (data) => {
        outputSize += data.length;
        if (outputSize > this.maxOutputSize) {
          killed = true;
          pythonProcess.kill("SIGKILL");
          reject(new Error("AI output size exceeded limit"));
          return;
        }
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        outputSize += data.length;
        if (outputSize > this.maxOutputSize) {
          killed = true;
          pythonProcess.kill("SIGKILL");
          reject(new Error("AI output size exceeded limit"));
          return;
        }
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        this.activeProcesses.delete(pythonProcess);
        if (killed) return;

        if (code === 0 && stdout) {
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (parseError) {
            reject(
              new Error(`Failed to parse Python output: ${parseError.message}`)
            );
          }
        } else {
          const errorMessage =
            stderr || `Python process exited with code ${code}`;
          reject(new Error(errorMessage));
        }
      });

      pythonProcess.on("error", (error) => {
        this.activeProcesses.delete(pythonProcess);
        if (killed) return;

        if (error.code === "ENOENT") {
          reject(new Error(`Python not found at: ${this.pythonPath}`));
        } else {
          reject(error);
        }
      });

      // FIXED: Proper timeout with graceful shutdown
      const timeoutId = setTimeout(() => {
        if (!killed) {
          killed = true;
          logger.warn("Inference timeout", { imagePath, timeout });

          // Graceful shutdown
          pythonProcess.kill("SIGTERM");

          // Force kill after 2 seconds
          setTimeout(() => {
            if (this.activeProcesses.has(pythonProcess)) {
              pythonProcess.kill("SIGKILL");
              this.activeProcesses.delete(pythonProcess);
            }
          }, 2000);

          reject(new Error("Inference timeout"));
        }
      }, timeout);

      pythonProcess.on("close", () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  _calculateRetryDelay(retryCount) {
    const baseDelay = this.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 10000);
  }

  /**
   * Ensure service is available
   */
  async ensureAvailable() {
    if (!this.loadAttempted) {
      this.loadAttempted = true;
      const isHealthy = await this.checkHealth();

      if (!isHealthy) {
        const error = new Error(
          "AI service is not available. Make sure Python and PyTorch are installed."
        );
        error.code = "AI_SERVICE_UNAVAILABLE";
        throw error;
      }
    }

    return true;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      modelPath: this.modelPath,
      scriptPath: this.scriptPath,
      pythonPath: this.pythonPath,
      isLoaded: this.isModelLoaded,
    };
  }

  /**
   * FIXED: Cleanup on shutdown
   */
  async cleanup() {
    logger.info("Cleaning up AI service", {
      activeProcesses: this.activeProcesses.size,
    });

    // Kill all active processes
    for (const process of this.activeProcesses) {
      try {
        process.kill("SIGTERM");

        // Force kill after timeout
        setTimeout(() => {
          if (!process.killed) {
            process.kill("SIGKILL");
          }
        }, 2000);
      } catch (error) {
        logger.error("Error killing process", { error: error.message });
      }
    }

    this.activeProcesses.clear();
  }
}

module.exports = new AIService();
