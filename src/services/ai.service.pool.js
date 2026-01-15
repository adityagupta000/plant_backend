// CRITICAL FIX: Remove double-wrapping of AI response
// File: src/services/ai.service.pool.js

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const EventEmitter = require("events");
const constants = require("../config/constants");
const logger = require("../utils/logger");

class AIWorker extends EventEmitter {
  constructor(workerId) {
    super();
    this.workerId = workerId;
    this.process = null;
    this.busy = false;
    this.isReady = false;
    this.failureCount = 0;
    this.maxFailures = 3;
    this.lastError = null;
    this.activeTimeout = null;
    this.firstPrediction = true;
  }

  async start(pythonPath, scriptPath, modelPath) {
    return new Promise((resolve, reject) => {
      logger.info(`Starting AI worker ${this.workerId}`);

      if (!fs.existsSync(scriptPath)) {
        return reject(new Error(`Python script not found: ${scriptPath}`));
      }

      if (!fs.existsSync(modelPath)) {
        return reject(new Error(`Model file not found: ${modelPath}`));
      }

      try {
        this.process = spawn(pythonPath, [scriptPath, "--server-mode"], {
          env: {
            ...process.env,
            MODEL_PATH: modelPath,
            WORKER_ID: this.workerId.toString(),
            PYTHONUNBUFFERED: "1",
            PYTHONIOENCODING: "utf-8",
          },
          stdio: ["pipe", "pipe", "pipe"],
        });

        let initOutput = "";
        let initTimeout = null;

        const onStdout = (data) => {
          const output = data.toString();
          initOutput += output;

          logger.debug(`Worker ${this.workerId} stdout: ${output.trim()}`);

          if (initOutput.includes("READY")) {
            clearTimeout(initTimeout);
            this.isReady = true;
            this.process.stdout.removeListener("data", onStdout);
            logger.info(`AI worker ${this.workerId} ready`);
            resolve();
          }
        };

        const onStderr = (data) => {
          const message = data.toString();
          if (
            message.toLowerCase().includes("error") ||
            message.toLowerCase().includes("fail")
          ) {
            logger.error(`Worker ${this.workerId} stderr: ${message}`);
          } else {
            logger.debug(`Worker ${this.workerId}: ${message}`);
          }
        };

        const onError = (error) => {
          clearTimeout(initTimeout);
          logger.error(`Worker ${this.workerId} process error`, {
            error: error.message,
          });
          this.lastError = error;
          this.isReady = false;
          reject(error);
        };

        const onExit = (code, signal) => {
          clearTimeout(initTimeout);
          logger.warn(`Worker ${this.workerId} exited`, { code, signal });
          this.isReady = false;
          this.cleanup();
          this.emit("exit", this.workerId, code, signal);
        };

        this.process.stdout.on("data", onStdout);
        this.process.stderr.on("data", onStderr);
        this.process.on("error", onError);
        this.process.on("exit", onExit);

        initTimeout = setTimeout(() => {
          if (!this.isReady) {
            this.cleanup();
            reject(new Error(`Worker ${this.workerId} initialization timeout`));
          }
        }, 60000);
      } catch (error) {
        reject(new Error(`Failed to spawn worker process: ${error.message}`));
      }
    });
  }

  async predict(imagePath, timeout = null) {
    if (!this.isReady || this.busy) {
      throw new Error(`Worker ${this.workerId} not available`);
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const actualTimeout = timeout || (this.firstPrediction ? 120000 : 60000);

    logger.info(`Worker ${this.workerId} processing prediction`, {
      imagePath,
      timeout: actualTimeout,
      isFirstPrediction: this.firstPrediction,
    });

    this.busy = true;

    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let outputSize = 0;
      const maxOutputSize = constants.AI_MAX_OUTPUT_SIZE || 1048576;
      let resolved = false;

      const cleanup = (error, result) => {
        if (resolved) return;
        resolved = true;

        clearTimeout(timeoutId);
        this.busy = false;

        this.process.stdout.removeListener("data", onStdout);
        this.process.stderr.removeListener("data", onStderr);
        this.process.removeListener("error", onError);
        this.process.removeListener("exit", onExit);

        if (error) {
          this.failureCount++;
          this.lastError = error;
          logger.error(`Worker ${this.workerId} prediction failed`, {
            error: error.message,
            stderr: stderr.slice(-500),
          });
          reject(error);
        } else {
          this.failureCount = 0;
          this.lastError = null;
          this.firstPrediction = false;
          resolve(result);
        }
      };

      const onStdout = (data) => {
        outputSize += data.length;
        if (outputSize > maxOutputSize) {
          cleanup(new Error("Output size exceeded limit"));
          return;
        }

        const chunk = data.toString("utf8");
        stdout += chunk;

        logger.debug(`Worker ${this.workerId} received stdout chunk`, {
          chunkSize: chunk.length,
          totalSize: stdout.length,
        });

        // Look for complete JSON line
        const lines = stdout.split("\n");

        if (lines.length >= 2) {
          const jsonLine = lines[0].trim();

          if (jsonLine && jsonLine.length > 0) {
            try {
              const result = JSON.parse(jsonLine);

              // CRITICAL FIX: Return the exact structure from Python
              // Python returns: {"success": true, "data": {...}}
              // We should return that directly, not wrap it again
              if (result && typeof result === "object" && "success" in result) {
                logger.info(
                  `Worker ${this.workerId} successfully parsed response`,
                  {
                    success: result.success,
                    hasData: !!result.data,
                  }
                );
                // Return the result AS-IS from Python
                cleanup(null, result);
              }
            } catch (error) {
              logger.debug(
                `Worker ${this.workerId} JSON parse error (may be incomplete)`,
                {
                  error: error.message,
                }
              );
            }
          }
        }
      };

      const onStderr = (data) => {
        const message = data.toString();
        stderr += message;

        if (message.toLowerCase().includes("error")) {
          logger.error(`Worker ${this.workerId} prediction stderr: ${message}`);
        }
      };

      const onError = (error) => {
        cleanup(error);
      };

      const onExit = (code, signal) => {
        cleanup(
          new Error(
            `Worker died during prediction (code: ${code}, signal: ${signal})`
          )
        );
      };

      // Send request
      try {
        const requestData = JSON.stringify({ imagePath }) + "\n";

        logger.debug(`Worker ${this.workerId} sending request`, {
          imagePath,
          requestSize: requestData.length,
        });

        if (this.process.stdin.writable) {
          this.process.stdin.write(requestData, (err) => {
            if (err) {
              cleanup(new Error(`Failed to write to stdin: ${err.message}`));
            }
          });
        } else {
          cleanup(new Error("Worker stdin is not writable"));
          return;
        }
      } catch (error) {
        cleanup(
          new Error(`Failed to send request to worker: ${error.message}`)
        );
        return;
      }

      this.process.stdout.on("data", onStdout);
      this.process.stderr.on("data", onStderr);
      this.process.on("error", onError);
      this.process.on("exit", onExit);

      const timeoutId = setTimeout(() => {
        cleanup(
          new Error(
            `Worker ${this.workerId} prediction timeout (${actualTimeout}ms)`
          )
        );
      }, actualTimeout);
    });
  }

  cleanup() {
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    this.busy = false;
    this.isReady = false;
  }

  kill() {
    this.cleanup();
    if (this.process) {
      try {
        if (!this.process.killed) {
          this.process.kill("SIGTERM");
          setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill("SIGKILL");
            }
          }, 2000);
        }
      } catch (error) {
        logger.error(`Error killing worker ${this.workerId}: ${error.message}`);
      }
    }
  }

  shouldRestart() {
    return this.failureCount >= this.maxFailures;
  }

  getStatus() {
    return {
      workerId: this.workerId,
      isReady: this.isReady,
      busy: this.busy,
      failureCount: this.failureCount,
      firstPrediction: this.firstPrediction,
      lastError: this.lastError ? this.lastError.message : null,
    };
  }
}

class AIWorkerPool {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH;
    if (!this.pythonPath) {
      const venvDir = path.join(__dirname, "../../ai/venv");
      if (process.platform === "win32") {
        this.pythonPath = path.join(venvDir, "Scripts", "python.exe");
      } else {
        this.pythonPath = path.join(venvDir, "bin", "python");
      }
    }

    this.scriptPath = path.join(__dirname, "../../ai/inference_server.py");
    this.modelPath =
      process.env.MODEL_PATH ||
      path.join(__dirname, "../../ai/saved_models/best_model.encrypted");

    this.modelKeyPath =
      process.env.MODEL_KEY_PATH ||
      path.join(__dirname, "../../secrets/model.key");

    this.poolSize = parseInt(process.env.AI_WORKERS) || 4;
    this.workers = [];
    this.initialized = false;
    this.isShuttingDown = false;

    this.stats = {
      totalPredictions: 0,
      successfulPredictions: 0,
      failedPredictions: 0,
      averageWaitTime: 0,
      workerRestarts: 0,
    };
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.info(`Initializing AI worker pool with ${this.poolSize} workers`);

    if (!fs.existsSync(this.pythonPath)) {
      throw new Error(`Python executable not found: ${this.pythonPath}`);
    }

    if (!fs.existsSync(this.scriptPath)) {
      throw new Error(`Inference script not found: ${this.scriptPath}`);
    }

    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`Model file not found: ${this.modelPath}`);
    }

    this.workers = new Array(this.poolSize);

    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = new AIWorker(i);
        worker.on("exit", (workerId, code, signal) => {
          this.handleWorkerExit(worker);
        });

        await worker.start(
          this.pythonPath,
          this.scriptPath,
          this.modelPath
        );
        this.workers[i] = worker;

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to start worker ${i}: ${error.message}`);
        await this.cleanup();
        throw new Error(`Worker pool initialization failed: ${error.message}`);
      }
    }

    this.initialized = true;
    logger.info("AI worker pool initialized successfully");
  }

  async handleWorkerExit(worker) {
    if (this.isShuttingDown) {
      return;
    }

    logger.warn(`Worker ${worker.workerId} exited, attempting to restart...`);
    this.stats.workerRestarts++;

    try {
      await worker.start(
        this.pythonPath,
        this.scriptPath,
        this.modelPath
      );
      logger.info(`Worker ${worker.workerId} restarted successfully`);
    } catch (error) {
      logger.error(
        `Failed to restart worker ${worker.workerId}: ${error.message}`
      );
    }
  }

  async getAvailableWorker(timeout = 120000) {
    const startTime = Date.now();
    const checkInterval = 100;

    while (Date.now() - startTime < timeout) {
      for (const worker of this.workers) {
        if (worker && worker.isReady && !worker.busy) {
          return worker;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error("No available workers (timeout)");
  }

  async predict(imagePath, retryCount = 0) {
    const maxRetries = 3;
    const startTime = Date.now();

    try {
      this.stats.totalPredictions++;

      const worker = await this.getAvailableWorker();
      const waitTime = Date.now() - startTime;

      this.stats.averageWaitTime =
        (this.stats.averageWaitTime * (this.stats.totalPredictions - 1) +
          waitTime) /
        this.stats.totalPredictions;

      logger.info(`Processing prediction with worker ${worker.workerId}`, {
        waitTime,
        imagePath,
        isFirstPrediction: worker.firstPrediction,
      });

      // CRITICAL FIX: Get result from worker (already properly formatted)
      const result = await worker.predict(imagePath);

      this.stats.successfulPredictions++;

      if (worker.shouldRestart()) {
        logger.warn(
          `Worker ${worker.workerId} has too many failures, restarting`
        );
        worker.kill();
      }

      // CRITICAL FIX: Return result directly from Python
      // Python already returns: {success: true, data: {...}}
      // Don't wrap it again!
      return result;
      
    } catch (error) {
      this.stats.failedPredictions++;

      if (retryCount < maxRetries) {
        logger.warn(
          `Prediction failed, retrying (${retryCount + 1}/${maxRetries})`,
          {
            error: error.message,
          }
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        );
        return this.predict(imagePath, retryCount + 1);
      }

      logger.error("Prediction failed after all retries", {
        error: error.message,
        retries: retryCount,
        imagePath,
      });

      return {
        success: false,
        error: error.message,
        errorCode: "AI_PREDICTION_FAILED",
        processingTime: Date.now() - startTime,
      };
    }
  }

  getStats() {
    const activeWorkers = this.workers.filter((w) => w && w.isReady).length;
    const busyWorkers = this.workers.filter((w) => w && w.busy).length;

    return {
      ...this.stats,
      poolSize: this.poolSize,
      activeWorkers,
      busyWorkers,
      availableWorkers: activeWorkers - busyWorkers,
      initialized: this.initialized,
      workers: this.workers.map((w) => (w ? w.getStatus() : null)),
    };
  }

  async checkHealth() {
    if (!this.initialized) {
      return false;
    }

    const healthyWorkers = this.workers.filter((w) => w && w.isReady).length;
    return healthyWorkers > 0;
  }

  async cleanup() {
    this.isShuttingDown = true;
    logger.info("Cleaning up AI worker pool");

    for (const worker of this.workers) {
      if (worker) {
        worker.kill();
      }
    }

    this.workers = [];
    this.initialized = false;
    this.isShuttingDown = false;
    logger.info("AI worker pool cleanup complete");
  }
}

const aiWorkerPool = new AIWorkerPool();
module.exports = aiWorkerPool;