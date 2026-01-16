/**
 * Express Application Setup
 * Configure middleware, routes, and error handling
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const errorMiddleware = require('./middlewares/error.middleware');

// Import routes
<<<<<<< Updated upstream
const authRoutes = require('./routes/auth.routes');
const predictionRoutes = require('./routes/prediction.routes');
const historyRoutes = require('./routes/history.routes');
=======
const authRoutes = require("./routes/auth.routes");
const predictionRoutes = require("./routes/prediction.routes");
const historyRoutes = require("./routes/history.routes");
const guestRoutes = require("./routes/guest.routes");
const systemRoutes = require("./routes/system.routes");
>>>>>>> Stashed changes

// Create Express app
const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet - Security headers
app.use(helmet());

<<<<<<< Updated upstream
// CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // CRITICAL: Allow cookies to be sent
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));
=======
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.use(globalLimiter);
>>>>>>> Stashed changes

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================

// Cookie parser - Parse cookies from requests
app.use(cookieParser());

// JSON parser - Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// URL-encoded parser - Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

// Log all incoming requests
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'plant-health-backend',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Mount route handlers
app.use('/api/auth', authRoutes);
app.use('/api/predict', predictionRoutes);
app.use('/api/history', historyRoutes);

// System routes (monitoring and diagnostics)
app.use("/api/system", systemRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path
  });
  
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE (MUST BE LAST)
// ============================================================================

app.use(errorMiddleware);

// ============================================================================
// EXPORT APP
// ============================================================================

module.exports = app;