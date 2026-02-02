/**
 * File Upload Security Tests - FIXED
 * Tests file upload validation and security checks
 */

const request = require("supertest");
const app = require("../../src/app");
const fs = require("fs");
const path = require("path");
const { createAgent, createAndLoginUser } = require("../helpers/testHelpers");

describe("File Upload Security", () => {
  let agent;
  let authToken;

  // ✅ FIXED: Ensure database is ready
  beforeAll(async () => {
    const { sequelize } = require("../../src/models");

    // Ensure database is synced
    await sequelize.sync({ force: true });

    agent = createAgent();
    const userData = await createAndLoginUser(agent);
    authToken = userData.accessToken;
  }, 30000); // ✅ ADD: Timeout for setup

  // Create test files
  const createTempFile = (filename, content, mimetype = "text/plain") => {
    const filepath = path.join(__dirname, `../temp-${filename}`);
    fs.writeFileSync(filepath, content);
    return filepath;
  };

  const cleanup = (filepath) => {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  describe("File Type Validation", () => {
    it("should reject non-image MIME types", async () => {
      const textFile = createTempFile("test.txt", "This is a text file");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", textFile)
        .expect(415);

      expect(response.body).toHaveProperty("error");
      expect(response.body.code).toBe("INVALID_FILE_EXTENSION");

      cleanup(textFile);
    });

    it("should reject executable files", async () => {
      const exeFile = createTempFile("test.exe", "MZ fake exe");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", exeFile)
        .expect(415);

      expect(response.body.code).toBe("INVALID_FILE_EXTENSION");

      cleanup(exeFile);
    });

    it("should reject PHP files", async () => {
      const phpFile = createTempFile("shell.php", '<?php echo "hello"; ?>');

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", phpFile)
        .expect(415);

      expect(response.body.code).toBe("INVALID_FILE_EXTENSION");

      cleanup(phpFile);
    });
  });

  describe("File Extension Validation", () => {
    it("should reject invalid file extensions", async () => {
      const badFile = createTempFile("test.bad", "content");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", badFile)
        .expect(415);

      expect(response.body.code).toBe("INVALID_FILE_EXTENSION");

      cleanup(badFile);
    });

    it("should reject double extensions (bypass attempt)", async () => {
      const doubleExt = createTempFile("image.jpg.php", "malicious");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", doubleExt)
        .expect(415);

      cleanup(doubleExt);
    });
  });

  describe("Path Traversal Prevention", () => {
    it("should reject filename with ../", async () => {
      const file = createTempFile("test.jpg", "content");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", file, "../../../etc/passwd.jpg")
        .expect(400);

      expect(response.body.code).toBe("PATH_TRAVERSAL_ATTEMPT");

      cleanup(file);
    });

    it("should reject filename with encoded path traversal", async () => {
      const file = createTempFile("test.jpg", "content");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", file, "%2e%2e%2f%2e%2e%2fpasswd")
        .expect(400);

      expect(response.body.code).toBe("PATH_TRAVERSAL_ATTEMPT");

      cleanup(file);
    });

    it("should reject filename with backslash", async () => {
      const file = createTempFile("test.jpg", "content");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", file, "..\\..\\windows\\system32.png")
        .expect(400);

      expect(response.body.code).toBe("PATH_TRAVERSAL_ATTEMPT");

      cleanup(file);
    });
  });

  describe("Null Byte Injection Prevention", () => {
    it("should reject filename with null byte", async () => {
      const file = createTempFile("test.jpg", "content");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", file, "image.jpg\0.php")
        .expect(400);

      expect(response.body.code).toBe("INVALID_FILENAME");

      cleanup(file);
    });
  });

  describe("File Size Limits", () => {
    it("should reject files larger than MAX_FILE_SIZE", async () => {
      // Create 10MB file (exceeds 5MB limit)
      const largeContent = Buffer.alloc(10 * 1024 * 1024, "x");
      const largeFile = createTempFile("large.jpg", largeContent);

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", largeFile)
        .expect(413);

      expect(response.body.code).toBe("FILE_TOO_LARGE");

      cleanup(largeFile);
    }, 30000);
  });

  describe("Filename Length Validation", () => {
    it("should reject extremely long filenames", async () => {
      const file = createTempFile("test.jpg", "content");
      const longName = "a".repeat(300) + ".jpg";

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", file, longName)
        .expect(400);

      expect(response.body.code).toBe("INVALID_FILENAME");

      cleanup(file);
    });
  });

  describe("Multiple File Upload Prevention", () => {
    it("should reject multiple files in single request", async () => {
      const file1 = createTempFile("test1.jpg", "content1");
      const file2 = createTempFile("test2.jpg", "content2");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", file1)
        .attach("image", file2)
        .expect(400);

      expect(response.body.code).toBe("TOO_MANY_FILES");

      cleanup(file1);
      cleanup(file2);
    });
  });

  describe("Field Name Validation", () => {
    it("should reject unexpected field names", async () => {
      const file = createTempFile("test.jpg", "content");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("wrong_field", file)
        .expect(400);

      expect(response.body.code).toBe("UNEXPECTED_FIELD");

      cleanup(file);
    });
  });

  describe("File Signature Validation (Magic Bytes)", () => {
    it("should reject file with fake extension", async () => {
      // Create text file with .jpg extension
      const fakeImage = createTempFile(
        "fake.jpg",
        "This is actually a text file",
      );

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", fakeImage)
        .expect(415);

      expect(response.body.code).toBe("INVALID_IMAGE");
      expect(response.body.error).toContain("File signature validation failed");

      cleanup(fakeImage);
    });
  });

  describe("Empty File Handling", () => {
    it("should reject empty files", async () => {
      const emptyFile = createTempFile("empty.jpg", "");

      const response = await agent
        .post("/api/predict")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", emptyFile)
        .expect(415);

      cleanup(emptyFile);
    });
  });

  describe("Guest Upload Security", () => {
    it("should apply same security checks to guest uploads", async () => {
      const textFile = createTempFile("test.txt", "text");

      const response = await agent
        .post("/api/guest/predict")
        .attach("image", textFile)
        .expect(415);

      expect(response.body.code).toBe("INVALID_FILE_TYPE");

      cleanup(textFile);
    });
  });
});
