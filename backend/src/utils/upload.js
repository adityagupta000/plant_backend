/**
 * SECURE File Upload - FIXED Race Condition
 * All security checks before AND after file upload
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fileType = require("file-type");
const constants = require("../config/constants");
const {
  generateUniqueFilename,
  isValidExtension,
  isValidMimeType,
} = require("./helpers");
const logger = require("./logger");

// Create uploads directory
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info("Created uploads directory");
}

// SECURITY: Strict path traversal patterns
const DANGEROUS_PATTERNS = [
  /\.\./, // Standard ..
  /\//, // Forward slash
  /\\/, // Backslash
  /%2e%2e/i, // URL-encoded ..
  /%2f/i, // URL-encoded /
  /%5c/i, // URL-encoded \
  /\x00/, // Null byte
  /\x2e\x2e/, // Hex-encoded ..
  /\.\.\//, // ../
  /\.\.\\/, // ..\
];

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    try {
      const uniqueFilename = generateUniqueFilename(file.originalname);
      logger.debug("Generated unique filename", {
        original: file.originalname,
        unique: uniqueFilename,
      });
      cb(null, uniqueFilename);
    } catch (error) {
      logger.error("Error generating filename", { error: error.message });
      cb(error);
    }
  },
});

// Synchronous file filter (pre-upload validation)
const fileFilter = (req, file, cb) => {
  try {
    // SECURITY CHECK 1: Path traversal detection
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(file.originalname)) {
        logger.warn("Path traversal attempt detected", {
          filename: file.originalname,
          pattern: pattern.toString(),
          ip: req.ip,
        });
        const error = new Error("Invalid filename - security violation");
        error.code = "PATH_TRAVERSAL_ATTEMPT";
        return cb(error, false);
      }
    }

    // SECURITY CHECK 2: Null byte injection
    if (file.originalname.includes("\0")) {
      logger.warn("Null byte injection attempt", {
        filename: file.originalname,
        ip: req.ip,
      });
      const error = new Error("Invalid filename");
      error.code = "INVALID_FILENAME";
      return cb(error, false);
    }

    // SECURITY CHECK 3: Filename length
    if (file.originalname.length > 255) {
      logger.warn("Filename too long", {
        length: file.originalname.length,
        ip: req.ip,
      });
      const error = new Error("Filename too long");
      error.code = "INVALID_FILENAME";
      return cb(error, false);
    }

    // SECURITY CHECK 4: MIME type validation
    if (!isValidMimeType(file.mimetype)) {
      logger.warn("Invalid file MIME type", {
        mimetype: file.mimetype,
        allowed: constants.ALLOWED_FILE_TYPES,
        ip: req.ip,
      });
      const error = new Error(
        "Invalid file type. Only JPEG, JPG, and PNG images are allowed.",
      );
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }

    // SECURITY CHECK 5: File extension validation
    if (!isValidExtension(file.originalname)) {
      logger.warn("Invalid file extension", {
        filename: file.originalname,
        allowed: constants.ALLOWED_EXTENSIONS,
        ip: req.ip,
      });
      const error = new Error(
        "Invalid file extension. Only .jpg, .jpeg, and .png files are allowed.",
      );
      error.code = "INVALID_FILE_EXTENSION";
      return cb(error, false);
    }

    logger.debug("File validation passed", {
      filename: file.originalname,
      mimetype: file.mimetype,
    });

    cb(null, true);
  } catch (error) {
    logger.error("Error in file filter", { error: error.message });
    cb(error, false);
  }
};

// CRITICAL FIX: File signature validation (magic bytes check)
const validateFileSignature = async (filePath) => {
  try {
    const type = await fileType.fromFile(filePath);

    if (!type) {
      logger.warn("Could not detect file type", { filePath });
      return false;
    }

    const validMimeTypes = ["image/jpeg", "image/png"];

    if (!validMimeTypes.includes(type.mime)) {
      logger.warn("File signature mismatch", {
        filePath,
        detectedMime: type.mime,
        expectedMime: validMimeTypes,
      });
      return false;
    }

    // Additional check: verify extension matches detected type
    const ext = path.extname(filePath).toLowerCase();
    const expectedExts = {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    };

    if (!expectedExts[type.mime]?.includes(ext)) {
      logger.warn("Extension/MIME type mismatch", {
        filePath,
        extension: ext,
        detectedMime: type.mime,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error validating file signature", {
      error: error.message,
      filePath,
    });
    return false;
  }
};

// Configure multer with strict limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: constants.MAX_FILE_SIZE,
    files: 1,
    fields: 10,
    parts: 11,
    headerPairs: 20,
  },
});

// CRITICAL FIX: Synchronous cleanup helper
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info("Deleted file", { path: filePath });
    }
  } catch (e) {
    logger.error("Error deleting file", { error: e.message, path: filePath });
  }
};

// CRITICAL FIX: Proper async middleware with sequential validation
const handleMulterError = (err, req, res, next) => {
  // Step 1: Handle multer errors (upload errors)
  if (err instanceof multer.MulterError) {
    // Cleanup uploaded file
    if (req.file) {
      cleanupFile(req.file.path);
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      logger.warn("File too large", {
        maxSize: constants.MAX_FILE_SIZE,
        file: req.file ? req.file.originalname : "unknown",
        ip: req.ip,
      });
      return res.status(413).json({
        error: "File too large",
        code: "FILE_TOO_LARGE",
        message: `File size must not exceed ${
          constants.MAX_FILE_SIZE / 1024 / 1024
        }MB`,
      });
    } else if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files",
        code: "TOO_MANY_FILES",
        message: "Only one file is allowed per request",
      });
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected field",
        code: "UNEXPECTED_FIELD",
        message: 'Unexpected file field. Use "image" field name for upload.',
      });
    } else {
      logger.error("Multer error", {
        code: err.code,
        message: err.message,
        ip: req.ip,
      });
      return res.status(400).json({
        error: "File upload error",
        code: "UPLOAD_ERROR",
        message: err.message,
      });
    }
  }

  // Step 2: Handle custom file filter errors
  if (err) {
    // Cleanup on custom errors
    if (req.file) {
      cleanupFile(req.file.path);
    }

    if (
      err.code === "INVALID_FILE_TYPE" ||
      err.code === "INVALID_FILE_EXTENSION"
    ) {
      return res.status(415).json({
        error: err.message,
        code: err.code,
      });
    }

    if (
      err.code === "INVALID_FILENAME" ||
      err.code === "PATH_TRAVERSAL_ATTEMPT"
    ) {
      return res.status(400).json({
        error: err.message,
        code: err.code,
      });
    }

    return next(err);
  }

  // Step 3: CRITICAL FIX - Validate file signature if upload succeeded
  if (req.file) {
    validateFileSignature(req.file.path)
      .then((isValid) => {
        if (!isValid) {
          cleanupFile(req.file.path);

          return res.status(415).json({
            error: "File signature validation failed",
            code: "INVALID_IMAGE",
            message:
              "Uploaded file is not a valid image or has been tampered with",
          });
        }

        // File is valid, proceed to next middleware
        next();
      })
      .catch((validationError) => {
        logger.error("File validation error", {
          error: validationError.message,
        });

        cleanupFile(req.file.path);

        return res.status(500).json({
          error: "File validation failed",
          code: "VALIDATION_ERROR",
        });
      });
  } else {
    // No file uploaded, just continue
    next();
  }
};

module.exports = {
  upload,
  handleMulterError,
  uploadsDir,
  validateFileSignature,
  cleanupFile, // Export for use in controllers
};
