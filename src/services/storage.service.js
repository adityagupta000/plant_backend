/**
 * Storage Service
 * Manages file storage and cleanup
 */

const fs = require("fs").promises;
const path = require("path");
const constants = require("../config/constants");
const logger = require("../utils/logger");

class StorageService {
  /**
   * Save image metadata
   * @param {Object} file - Multer file object
   * @returns {Object} Image metadata
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
   * Cleanup temporary file
   * @param {String} filePath - Path to file
   */
  async cleanupTempFile(filePath) {
    if (!constants.TEMP_FILE_CLEANUP) {
      logger.debug("Temp file cleanup disabled", { filePath });
      return;
    }

    try {
      // Wait before cleanup to allow AI service to process
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
          logger.debug("Temp file cleaned up", { filePath });
        } catch (error) {
          logger.error("Error cleaning up temp file", {
            error: error.message,
            filePath,
          });
        }
      }, constants.CLEANUP_DELAY_MS);
    } catch (error) {
      logger.error("Error scheduling file cleanup", {
        error: error.message,
        filePath,
      });
    }
  }

  /**
   * Check if file exists
   * @param {String} filePath - Path to file
   * @returns {Boolean} File exists
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
   * @param {String} filePath - Path to file
   * @returns {Number} File size in bytes
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
   * Delete file immediately (for error cleanup)
   * @param {String} filePath - Path to file
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug("File deleted", { filePath });
      return true;
    } catch (error) {
      logger.error("Error deleting file", {
        error: error.message,
        filePath,
      });
      return false;
    }
  }

  /**
   * Future: Upload to cloud storage (S3, Cloudinary, etc.)
   * @param {String} filePath - Path to local file
   * @returns {String} Cloud URL
   */
  async uploadToCloud(filePath) {
    // Placeholder for cloud storage implementation
    logger.warn("Cloud upload not implemented", { filePath });
    throw new Error("Cloud storage not configured");
  }
}

module.exports = new StorageService();
