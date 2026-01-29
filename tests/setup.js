/**
 * Jest Setup
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.LOG_LEVEL = "error";

// JWT Secrets
process.env.ACCESS_TOKEN_SECRET = "da7915d47f27d018c7c46a6371cf0c98d16660fe3b89921bcb7e656a16db926153d304b9e610ea3430e90ec70f9ef50456592e08dbf02ef525135ee1d8241d8d";
process.env.REFRESH_TOKEN_SECRET = "85979a2f723fdfbf671e62410df21388da40d6390b9410e2a1712b32fc9ff291572fb3fd7687be0d2997f26679c68564297f8a093b2cdc7c2849e3e2fb1e707f";

// Server config
process.env.PORT = "5001";
process.env.FRONTEND_URL = "http://localhost:3000";

// Rate limiting
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX_REQUESTS = "100";
process.env.RATE_LIMIT_SKIP_SUCCESS = "true";

process.env.AUTH_RATE_WINDOW_MS = "900000"; 
process.env.AUTH_RATE_MAX = "1000"

// Guest mode limits
process.env.GUEST_IP_LIMIT = "100";
process.env.GUEST_IP_WINDOW_HOURS = "1";
process.env.GUEST_FINGERPRINT_LIMIT = "100";
process.env.GUEST_FINGERPRINT_WINDOW_HOURS = "24";
process.env.GUEST_SESSION_LIMIT = "50";

// File upload
process.env.MAX_FILE_SIZE = "5242880";
process.env.ALLOWED_FILE_TYPES = "image/jpeg,image/jpg,image/png,image/webp";

// AI service
process.env.AI_SERVICE_URL = "http://localhost:5002";

// Set timeout
jest.setTimeout(30000);