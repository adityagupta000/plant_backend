/**
 * FIXED File Upload - Enhanced Security
 * FIXES:
 * 1. URL-encoded path traversal detection
 * 2. Null byte injection protection
 * 3. MIME type verification (not just extension)
 * 4. File signature validation
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fileType = require('file-type'); // npm install file-type@16.5.4
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

// ENHANCED File filter with strict security checks
const fileFilter = async (req, file, cb) => {
  try {
    // SECURITY FIX 1: Enhanced path traversal detection
    const pathTraversalPatterns = [
      /\.\./,           // Standard ..
      /\//,             // Forward slash in filename
      /\\/,             // Backslash
      /%2e%2e/i,        // URL-encoded ..
      /%2f/i,           // URL-encoded /
      /%5c/i,           // URL-encoded \
      /\x00/,           // Null byte injection
      /\x2e\x2e/,       // Hex-encoded ..
    ];

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(file.originalname)) {
        logger.warn("Path traversal attempt detected", {
          filename: file.originalname,
          pattern: pattern.toString()
        });
        const error = new Error("Invalid filename - security violation");
        error.code = "PATH_TRAVERSAL_ATTEMPT";
        return cb(error, false);
      }
    }

    // SECURITY FIX 2: Null byte injection protection
    if (file.originalname.includes('\0')) {
      logger.warn("Null byte injection attempt", {
        filename: file.originalname
      });
      const error = new Error("Invalid filename");
      error.code = "INVALID_FILENAME";
      return cb(error, false);
    }

    // Validate MIME type
    if (!isValidMimeType(file.mimetype)) {
      logger.warn("Invalid file MIME type", {
        mimetype: file.mimetype,
        allowed: constants.ALLOWED_FILE_TYPES,
      });
      const error = new Error(
        "Invalid file type. Only JPEG, JPG, and PNG images are allowed."
      );
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }

    // Validate file extension
    if (!isValidExtension(file.originalname)) {
      logger.warn("Invalid file extension", {
        filename: file.originalname,
        allowed: constants.ALLOWED_EXTENSIONS,
      });
      const error = new Error(
        "Invalid file extension. Only .jpg, .jpeg, and .png files are allowed."
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

// SECURITY FIX 3: Post-upload file signature validation
const validateFileSignature = async (filePath) => {
  try {
    const type = await fileType.fromFile(filePath);
    
    if (!type) {
      logger.warn("Could not detect file type", { filePath });
      return false;
    }

    const validMimeTypes = ['image/jpeg', 'image/png'];
    
    if (!validMimeTypes.includes(type.mime)) {
      logger.warn("File signature mismatch", {
        filePath,
        detectedMime: type.mime,
        expectedMime: validMimeTypes
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error validating file signature", {
      error: error.message,
      filePath
    });
    return false;
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: constants.MAX_FILE_SIZE, // 5MB
    files: 1,
    fields: 10, // SECURITY: Limit form fields
    parts: 11,  // SECURITY: Limit total parts
  },
});

// ENHANCED error handler
const handleMulterError = async (error, req, res, next) => {
  // SECURITY FIX 4: Validate file signature after upload
  if (req.file && !error) {
    const isValid = await validateFileSignature(req.file.path);
    
    if (!isValid) {
      // Delete invalid file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        logger.error("Error deleting invalid file", { error: e.message });
      }
      
      return res.status(415).json({
        error: "File signature validation failed",
        code: "INVALID_IMAGE",
        message: "Uploaded file is not a valid image"
      });
    }
  }

  if (error instanceof multer.MulterError) {
    // Cleanup uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        logger.error("Error cleaning up file", { error: e.message });
      }
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      logger.warn("File too large", {
        maxSize: constants.MAX_FILE_SIZE,
        file: req.file ? req.file.originalname : "unknown",
      });
      return res.status(413).json({
        error: "File too large",
        code: "FILE_TOO_LARGE",
        message: `File size must not exceed ${
          constants.MAX_FILE_SIZE / 1024 / 1024
        }MB`,
      });
    } else if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files",
        code: "TOO_MANY_FILES",
        message: "Only one file is allowed per request",
      });
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected field",
        code: "UNEXPECTED_FIELD",
        message: 'Unexpected file field. Use "image" field name for upload.',
      });
    } else {
      logger.error("Multer error", {
        code: error.code,
        message: error.message,
      });
      return res.status(400).json({
        error: "File upload error",
        code: "UPLOAD_ERROR",
        message: error.message,
      });
    }
  } else if (error) {
    // Cleanup on custom errors
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        logger.error("Error cleaning up file", { error: e.message });
      }
    }

    // Handle custom file filter errors
    if (
      error.code === "INVALID_FILE_TYPE" ||
      error.code === "INVALID_FILE_EXTENSION"
    ) {
      return res.status(415).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error.code === "INVALID_FILENAME" || error.code === "PATH_TRAVERSAL_ATTEMPT") {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    next(error);
  } else {
    next();
  }
};

module.exports = {
  upload,
  handleMulterError,
  uploadsDir,
  validateFileSignature
};