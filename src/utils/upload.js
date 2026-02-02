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
  /\.\./, // Two dots (..) - for parent directory references
  /\//, // Forward slash (/) - for Unix path separators
  /\\/, // Backslash (\) - for Windows path separators
  /%2e%2e/i, // URL-encoded .. (.%2e)
  /%2f/i, // URL-encoded / (%2f)
  /%5c/i, // URL-encoded \ (%5c)
  /\x00/, // Null byte
  /\x2e\x2e/, // Hex-encoded ..
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
    // CRITICAL DEBUG: Log the exact filename received
    // console.log("=== FILE FILTER CALLED ===");
    // console.log("originalName:", file.originalname);
    // console.log("mimetype:", file.mimetype);

    console.log(
      "🟡 FILE FILTER - name:",
      file.originalname,
      "mime:",
      file.mimetype,
    );

    // SECURITY CHECK 1: Filename length (quick check)
    if (file.originalname.length > 255) {
      logger.warn("Filename too long", {
        length: file.originalname.length,
        ip: req.ip,
      });
      const error = new Error("Filename too long");
      error.code = "INVALID_FILENAME";
      console.log("🟡 FILE FILTER REJECT - filename too long");
      return cb(error, false);
    }

    // SECURITY CHECK 2: Null byte injection (check before path traversal to catch encoding issues)
    try {
      if (file.originalname.includes("\0")) {
        logger.warn("Null byte injection attempt", {
          filename: file.originalname,
          ip: req.ip,
        });
        const error = new Error("Null byte detected in filename");
        error.code = "INVALID_FILENAME";
        console.log("🟡 FILE FILTER REJECT - null byte");
        return cb(error, false);
      }
    } catch (nullByteError) {
      logger.error("Error checking null byte", {
        error: nullByteError.message,
      });
      const error = new Error("Invalid filename");
      error.code = "INVALID_FILENAME";
      console.log("🟡 FILE FILTER REJECT - null byte error");
      return cb(error, false);
    }

    // SECURITY CHECK 3: Path traversal detection (check before extension/MIME)
    let pathTraversalDetected = false;
    let matchedPattern = null;

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(file.originalname)) {
        pathTraversalDetected = true;
        matchedPattern = pattern.toString();
        logger.warn("Path traversal attempt detected", {
          filename: file.originalname,
          pattern: pattern.toString(),
          ip: req.ip,
        });
        const error = new Error("Invalid filename - security violation");
        error.code = "PATH_TRAVERSAL_ATTEMPT";
        console.log("🟡 FILE FILTER REJECT - path traversal");
        return cb(error, false);
      }
    }

    // Log which patterns we tested
    logger.info("Path traversal pattern check completed", {
      filename: file.originalname,
      detected: pathTraversalDetected,
      matchedPattern: matchedPattern,
      testResults: DANGEROUS_PATTERNS.map((p) => ({
        pattern: p.toString(),
        matches: p.test(file.originalname),
      })),
    });

    // SECURITY CHECK 4: File extension validation (check before MIME - catches .bad, .exe, etc.)
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
      console.log("🟡 FILE FILTER REJECT - invalid extension");
      return cb(error, false);
    }

    // SECURITY CHECK 5: MIME type validation (double-check after extension)
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
      console.log("🟡 FILE FILTER REJECT - invalid MIME type:", file.mimetype);
      return cb(error, false);
    }

    logger.debug("File validation passed", {
      filename: file.originalname,
      mimetype: file.mimetype,
    });

    console.log("🟡 FILE FILTER PASS");

    cb(null, true);
  } catch (error) {
    logger.error("Error in file filter", { error: error.message });
    console.log("🟡 FILE FILTER ERROR:", error.message);
    cb(error, false);
  }
};

// CRITICAL FIX: File signature validation (magic bytes check)
const validateFileSignature = async (filePath) => {
  try {
    console.log("🟢 validateFileSignature called for:", filePath);
    logger.debug("Starting file signature validation", { filePath });

    // Check if file exists and has content
    if (!fs.existsSync(filePath)) {
      console.log("🟢 File does not exist:", filePath);
      logger.error("File does not exist at validation time", { filePath });
      return false;
    }

    const stats = fs.statSync(filePath);
    console.log("🟢 File stats - size:", stats.size);
    logger.debug("File stats", { filePath, size: stats.size, exists: true });

    if (stats.size === 0) {
      console.log("🟢 Empty file detected");
      logger.warn("Empty file detected", { filePath });
      return false;
    }

    const type = await fileType.fromFile(filePath);
    console.log("🟢 File type detected:", type?.mime, "ext:", type?.ext);
    logger.debug("File type detection result", {
      filePath,
      detectedType: type?.mime,
      ext: type?.ext,
    });

    if (!type) {
      console.log("🟢 Could not detect file type");
      logger.warn("Could not detect file type (null/undefined response)", {
        filePath,
      });
      return false;
    }

    const validMimeTypes = ["image/jpeg", "image/png"];

    if (!validMimeTypes.includes(type.mime)) {
      console.log("🟢 Invalid MIME type detected:", type.mime);
      logger.warn("File signature mismatch - invalid MIME", {
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
      console.log("🟢 Extension mismatch - ext:", ext, "mime:", type.mime);
      logger.warn("Extension/MIME type mismatch", {
        filePath,
        extension: ext,
        detectedMime: type.mime,
      });
      return false;
    }

    console.log("🟢 File signature valid!");
    logger.debug("File signature valid", { filePath });
    return true;
  } catch (error) {
    console.log("🟢 Error validating file signature:", error.message);
    logger.error("Error validating file signature", {
      error: error.message,
      stack: error.stack,
      filePath,
    });
    // Return false instead of throwing - let the caller handle it
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

// CRITICAL FIX: Create a single middleware that handles both upload errors and signature validation
// This wraps the entire upload process
const uploadWithSignatureValidation = [
  // First: perform the upload
  upload.single("image"),

  // Second: error handler (if upload.single encountered an error)
  (err, req, res, next) => {
    if (!err) {
      // No error from upload.single, proceed to signature validation
      return next();
    }

    logger.debug("Error occurred during upload", { error: err.code });
    // Cleanup uploaded file if it exists
    if (req.file) {
      cleanupFile(req.file.path);
    }

    // Handle busboy/multer parse errors (including malformed part headers from null bytes)
    if (err.message && err.message.includes("Malformed part header")) {
      logger.warn("Malformed multipart data - possibly null byte in filename", {
        error: err.message,
        ip: req.ip,
      });
      return res.status(400).json({
        error: "Invalid filename - contains illegal characters",
        code: "INVALID_FILENAME",
      });
    }

    // Handle multer-specific errors
    if (err instanceof multer.MulterError) {
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

    // Handle custom file filter errors from fileFilter
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

    // Unknown error - pass to global error handler
    return next(err);
  },

  // Third: signature validation for successful uploads
  async (req, res, next) => {
    // If file was uploaded successfully, validate signature
    if (req.file) {
      console.log(
        "🔵 FILE SIGNATURE VALIDATION STARTING for:",
        req.file.originalname,
      );
      logger.debug("Validating file signature for uploaded file", {
        path: req.file.path,
        originalName: req.file.originalname,
      });

      try {
        const isValid = await validateFileSignature(req.file.path);
        console.log(
          "🔵 FILE SIGNATURE VALIDATION RESULT:",
          isValid,
          "for:",
          req.file.originalname,
        );
        logger.debug("File signature validation complete", { isValid });

        if (!isValid) {
          logger.warn("File signature validation failed", {
            path: req.file.path,
            originalName: req.file.originalname,
          });
          cleanupFile(req.file.path);
          return res.status(415).json({
            error: "File signature validation failed",
            code: "INVALID_IMAGE",
            message:
              "Uploaded file is not a valid image or has been tampered with",
          });
        }
        // File is valid, proceed to controller
        next();
      } catch (validationError) {
        logger.error("File validation error", {
          error: validationError?.message || String(validationError),
        });
        if (req.file) {
          cleanupFile(req.file.path);
        }
        return res.status(415).json({
          error: "File signature validation failed",
          code: "INVALID_IMAGE",
          message:
            "Uploaded file is not a valid image or has been tampered with",
        });
      }
    } else {
      // No file uploaded, just continue
      logger.debug("No file in request, proceeding to controller");
      next();
    }
  },
];

// Keep the old handleMulterError for backwards compatibility (but now just call the middleware chain)
const handleMulterError = uploadWithSignatureValidation;

module.exports = {
  upload,
  uploadWithSignatureValidation,
  handleMulterError,
  uploadsDir,
  validateFileSignature,
  cleanupFile, // Export for use in controllers
};
