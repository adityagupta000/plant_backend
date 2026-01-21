/**
 * Storage Service - FIXED
 * Manages file storage with proper timeout tracking
 */

const fs = require("fs").promises;
const path = require("path");
const constants = require("../config/constants");
const logger = require("../utils/logger");

class StorageService {
  constructor() {
    // CRITICAL FIX: Track pending cleanups
    this.pendingCleanups = new Set();
  }

  /**
   * Save image metadata
   */
  saveImageMetadata(file) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      path: `/uploads/${file.filename}`,
    };
  }

  /**
   * CRITICAL FIX: Cleanup with timeout tracking
   */
  async cleanupTempFile(filePath) {
    if (!constants.TEMP_FILE_CLEANUP) {
      logger.debug("Temp file cleanup disabled", { filePath });
      return;
    }

    try {
      // CRITICAL FIX: Use a tracked timeout
      const timeoutId = setTimeout(async () => {
        try {
          await fs.unlink(filePath);
          logger.debug("Temp file cleaned up", { filePath });
        } catch (error) {
          // File might already be deleted
          if (error.code !== "ENOENT") {
            logger.error("Error cleaning up temp file", {
              error: error.message,
              filePath,
            });
          }
        } finally {
          // CRITICAL FIX: Remove from tracking set
          this.pendingCleanups.delete(timeoutId);
        }
      }, constants.CLEANUP_DELAY_MS);

      // CRITICAL FIX: Track the timeout
      this.pendingCleanups.add(timeoutId);
    } catch (error) {
      logger.error("Error scheduling file cleanup", {
        error: error.message,
        filePath,
      });
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error("Error getting file size", {
        error: error.message,
        filePath,
      });
      return 0;
    }
  }

  /**
   * Delete file immediately
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug("File deleted", { filePath });
      return true;
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.error("Error deleting file", {
          error: error.message,
          filePath,
        });
      }
      return false;
    }
  }

  /**
   * ENHANCEMENT: Delete file synchronously (for cleanup in error handlers)
   */
  deleteFileSync(filePath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug("File deleted synchronously", { filePath });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error deleting file synchronously", {
        error: error.message,
        filePath,
      });
      return false;
    }
  }

  /**
   * CRITICAL FIX: Cleanup all pending timeouts (on shutdown)
   */
  async cleanup() {
    logger.info("Cleaning up pending file deletions", {
      pending: this.pendingCleanups.size,
    });

    // Clear all pending timeouts
    for (const timeoutId of this.pendingCleanups) {
      clearTimeout(timeoutId);
    }

    this.pendingCleanups.clear();

    logger.info("Storage service cleanup complete");
  }

  /**
   * ENHANCEMENT: Get pending cleanup count
   */
  getPendingCleanupCount() {
    return this.pendingCleanups.size;
  }

  /**
   * ENHANCEMENT: Clean up old files from uploads directory
   */
  async cleanupOldFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const uploadsDir = path.join(__dirname, "../../uploads");
      const files = await fs.readdir(uploadsDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(uploadsDir, file);

        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAgeMs) {
            await fs.unlink(filePath);
            deletedCount++;
            logger.debug("Deleted old file", { file, age });
          }
        } catch (error) {
          logger.error("Error checking file age", {
            file,
            error: error.message,
          });
        }
      }

      logger.info("Old files cleanup complete", {
        deletedCount,
        maxAgeHours: maxAgeMs / (1000 * 60 * 60),
      });

      return deletedCount;
    } catch (error) {
      logger.error("Error cleaning up old files", {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * ENHANCEMENT: Get storage statistics
   */
  async getStorageStats() {
    try {
      const uploadsDir = path.join(__dirname, "../../uploads");
      const files = await fs.readdir(uploadsDir);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);

          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return {
        fileCount,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        pendingCleanups: this.pendingCleanups.size,
      };
    } catch (error) {
      logger.error("Error getting storage stats", {
        error: error.message,
      });
      return {
        fileCount: 0,
        totalSize: 0,
        totalSizeMB: "0.00",
        pendingCleanups: this.pendingCleanups.size,
        error: error.message,
      };
    }
  }

  /**
   * Future: Upload to cloud storage
   */
  async uploadToCloud(filePath) {
    logger.warn("Cloud upload not implemented", { filePath });
    throw new Error("Cloud storage not configured");
  }
}

module.exports = new StorageService();
