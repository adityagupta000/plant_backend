const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require("./utils/logger");
const errorMiddleware = require("./middlewares/error.middleware");
const {
  globalLimiter,
  healthLimiter,
} = require("./middlewares/rateLimiter.middleware");
// ENHANCEMENT: Import CSRF protection
const { csrfErrorHandler } = require("./middlewares/csrf.middleware");

// Import routes
const authRoutes = require("./routes/auth.routes");
const predictionRoutes = require("./routes/prediction.routes");
const historyRoutes = require("./routes/history.routes");
const guestRoutes = require("./routes/guest.routes");
const systemRoutes = require("./routes/system.routes");

// Create Express app
const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
    xssFilter: true,
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"], // ENHANCEMENT: Allow CSRF header
    exposedHeaders: ["Set-Cookie", "X-CSRF-Token"], // ENHANCEMENT: Expose CSRF header
  }),
);

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.use(globalLimiter);

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================

app.use(cookieParser()); // MUST be before CSRF
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

app.use((req, res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get("/health", healthLimiter, (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "plant-health-backend",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// System routes (monitoring/diagnostics)
app.use("/api/system", systemRoutes);

// Guest routes (no authentication required, no CSRF needed)
app.use("/api/guest", guestRoutes);

// Authenticated routes (with CSRF protection)
app.use("/api/auth", authRoutes);
app.use("/api/predict", predictionRoutes);
app.use("/api/history", historyRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE (MUST BE LAST)
// ============================================================================

// ENHANCEMENT: CSRF error handler (before general error handler)
app.use(csrfErrorHandler);

app.use(errorMiddleware);

module.exports = app;
