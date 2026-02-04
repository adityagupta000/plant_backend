# Plant Health Monitoring Backend - Complete Documentation

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Docker Setup](#docker-setup)
- [Testing Framework](#testing-framework)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Getting Started](#getting-started)

---

## Project Overview

**Plant Health Monitoring Backend** is a production-ready, containerized Node.js backend service integrated with a Python-based AI inference engine for plant disease detection. The system is designed with a **privacy-first architecture** and optimized for **CPU-only deployment**.

### Key Features

- **Secure Authentication System** - JWT-based auth with refresh tokens, session management, and CSRF protection
- **AI-Powered Disease Detection** - Python inference server with encrypted model loading
- **Fully Dockerized** - Production-ready containerized deployment with Docker Compose
- **Worker Pool Architecture** - Efficient AI request handling with Python worker processes
- **Guest Mode Support** - Allow anonymous users to test predictions without registration
- **Comprehensive Testing** - 101 test cases covering unit, integration, and E2E testing
- **Automated Reporting** - Excel-based test reports with bug tracking
- **Production Optimized** - Rate limiting, Redis caching, request logging, and health checks
- **Enterprise Security** - Helmet.js, CORS, CSP, XSS protection, and secure file upload

### What This System Does

1. **User Authentication & Authorization**
   - User registration and login
   - JWT access/refresh token management
   - Admin role support
   - Session tracking

2. **Plant Disease Detection**
   - Upload plant images for analysis
   - AI-powered classification into 8 categories:
     - Healthy
     - Pest: Fungal, Bacterial, Insect
     - Nutrient: Nitrogen deficiency, Potassium deficiency
     - Water Stress
     - Not a Plant

3. **Prediction History Management**
   - Store user prediction history
   - CRUD operations on predictions
   - PDF report generation
   - Guest mode predictions (limited access)

4. **System Monitoring**
   - Health check endpoints
   - Database monitoring
   - Redis connectivity checks
   - AI worker pool statistics

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React/Vue)                    │
│                    http://localhost:5173                     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Express Backend                    │
│                    http://localhost:5000                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │  Prediction  │  │   History    │      │
│  │  Controller  │  │  Controller  │  │  Controller  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐       │
│  │          AI Service (Worker Pool Manager)        │       │
│  └──────────────────┬───────────────────────────────┘       │
└────────────────────┼────────────────────────────────────────┘
                     │ Child Process Communication
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Python AI Inference Workers (Process Pool)           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Worker 1  │  │  Worker 2  │  │  Worker 3  │            │
│  │ PyTorch    │  │ PyTorch    │  │ PyTorch    │            │
│  │ Model      │  │ Model      │  │ Model      │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  File System │      │
│  │  Database    │  │    Cache     │  │  Storage     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── ai/                          # Python AI Service
│   ├── inference_server.py      # Main inference worker process
│   ├── inference.py             # Prediction logic
│   ├── model_loader.py          # Encrypted model loading
│   ├── model_encryption.py      # Model encryption utilities
│   ├── requirements.txt         # Python dependencies
│   ├── saved_models/            # Encrypted model files (not in Git)
│   │   └── best_model.encrypted
│   └── secrets/                 # Encryption keys (not in Git)
│       └── model.key
│
├── src/                         # Node.js Backend
│   ├── app.js                   # Express app configuration
│   ├── server.js                # Server entry point
│   ├── config/                  # Configuration files
│   │   ├── constants.js         # App constants
│   │   ├── database.js          # Database config
│   │   └── jwt.js               # JWT config
│   ├── controllers/             # Request handlers
│   │   ├── auth.controller.js
│   │   ├── prediction.controller.js
│   │   ├── history.controller.js
│   │   ├── guest.controller.js
│   │   └── system.controller.js
│   ├── middlewares/             # Express middlewares
│   │   ├── auth.middleware.js   # JWT verification
│   │   ├── admin.middleware.js  # Admin role check
│   │   ├── rateLimiter.middleware.js
│   │   ├── csrf.middleware.js
│   │   ├── validation.middleware.js
│   │   └── error.middleware.js
│   ├── models/                  # Sequelize ORM models
│   │   ├── user.model.js
│   │   ├── prediction.model.js
│   │   ├── session.model.js
│   │   └── refreshToken.model.js
│   ├── routes/                  # API route definitions
│   │   ├── auth.routes.js       # /api/auth/*
│   │   ├── prediction.routes.js # /api/predictions/*
│   │   ├── history.routes.js    # /api/history/*
│   │   ├── guest.routes.js      # /api/guest/*
│   │   └── system.routes.js     # /api/system/*
│   ├── services/                # Business logic
│   │   ├── ai.service.js        # AI service interface
│   │   ├── ai.service.pool.js   # Worker pool manager
│   │   ├── auth.service.js      # Authentication logic
│   │   ├── prediction.service.js
│   │   ├── storage.service.js   # File storage
│   │   └── token.service.js     # JWT operations
│   ├── utils/                   # Utility functions
│   │   ├── logger.js            # Winston logger
│   │   ├── helpers.js           # Helper functions
│   │   ├── pdfGenerator.js      # PDF creation
│   │   ├── tokens.js            # Token utilities
│   │   └── upload.js            # Multer config
│   └── scripts/                 # Utility scripts
│       └── create-admin.js      # Admin user creation
│
├── tests/                       # Test Suite
│   ├── unit/                    # Unit tests (42 tests)
│   ├── integration/             # Integration tests (49 tests)
│   ├── e2e/                     # End-to-end tests (10 tests)
│   ├── helpers/                 # Test utilities
│   ├── setup.js                 # Jest setup
│   ├── globalSetup.js           # Pre-test initialization
│   └── globalTeardown.js        # Post-test cleanup
│
├── test-reporter/               # Test Reporting System
│   ├── testReporter.js          # Excel report generator
│   ├── jestReporter.js          # Jest custom reporter
│   └── cli.js                   # CLI interface
│
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Container build instructions
├── .env.docker                  # Docker environment variables (not in Git)
├── package.json                 # Node.js dependencies
├── jest.config.js               # Jest configuration
└── nodemon.json                 # Development server config
```

---

## Technology Stack

### Backend (Node.js)

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 5.x
- **Database ORM**: Sequelize 6.x
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Joi
- **File Upload**: Multer
- **Logging**: Winston

### AI Service (Python)

- **Language**: Python 3.10
- **ML Framework**: PyTorch 2.1.2 (CPU-only)
- **Computer Vision**: OpenCV (opencv-python-headless)
- **Model**: EfficientNet-B2
- **Image Processing**: torchvision, albumentations

### Infrastructure

- **Containerization**: Docker, Docker Compose
- **Database**: PostgreSQL / SQLite
- **Cache**: Redis (for rate limiting & sessions)
- **Process Management**: Node.js child_process for worker pool

### Security

- **Security Headers**: Helmet.js
- **CORS**: Express CORS middleware
- **Rate Limiting**: express-rate-limit + rate-limit-redis
- **CSRF Protection**: Custom CSRF middleware
- **File Validation**: file-type, custom MIME validation

### Testing

- **Test Framework**: Jest 29.x
- **HTTP Testing**: Supertest
- **Test Coverage**: jest-coverage
- **Reporting**: Custom Excel reporter (ExcelJS)

### Development Tools

- **Hot Reload**: nodemon
- **Code Quality**: ESLint (implicit)
- **Version Control**: Git

---

## Docker Setup

### Docker Architecture

The application runs as a multi-container setup orchestrated by Docker Compose:

1. **Backend Container** - Node.js + Python hybrid container
2. **Redis Container** - Caching and rate limiting
3. **Shared Volumes** - Persistent data storage

### Dockerfile Highlights

```dockerfile
FROM python:3.10-slim

# Install CPU-only PyTorch (Critical for production!)
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.1.2+cpu torchvision==0.16.2+cpu

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install system dependencies for OpenCV
RUN apt-get install -y gcc g++ libgomp1 libglib2.0-0 \
    libsm6 libxext6 libxrender-dev libgl1

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

COPY ai/requirements.txt ./ai/requirements.txt
RUN pip install --no-cache-dir -r ai/requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "src/server.js"]
```

### Docker Compose Configuration

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: plant-health-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - .env.docker
    volumes:
      - ./data:/app/data # Database files
      - ./uploads:/app/uploads # User uploaded images
      - ./logs:/app/logs # Application logs
      - ./ai/saved_models:/app/ai/saved_models:ro # AI models (read-only)
      - ./ai/secrets:/app/ai/secrets:ro # Encryption keys (read-only)
    networks:
      - app-network
    depends_on:
      - redis
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "require('http').get('http://localhost:5000/health')",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: plant-health-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  app-network:
    driver: bridge

volumes:
  redis-data:
```

### Essential Docker Commands

```bash
# Build and start services
docker compose up --build -d

# Stop services
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f redis

# Check service status
docker compose ps

# Restart services
docker compose restart

# Access container shell
docker compose exec backend sh

# Check backend health
curl http://localhost:5000/health

# Check Redis health
docker compose exec redis redis-cli ping
```

### Environment Variables (.env.docker)

**⚠️ Note**: This file is NOT included in Git for security reasons. You must create it manually.

```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database (SQLite for simplicity, can switch to PostgreSQL)
DB_DIALECT=sqlite
DB_STORAGE=./data/database.sqlite
DB_LOGGING=false

# PostgreSQL (if using)
# DB_DIALECT=postgres
# DB_HOST=postgres
# DB_PORT=5432
# DB_NAME=plant_health
# DB_USER=postgres
# DB_PASSWORD=yourpassword

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
USE_REDIS=true

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AI Model Configuration
AI_POOL_SIZE=3
AI_TIMEOUT=30000
MODEL_PATH=./ai/saved_models/best_model.encrypted
MODEL_KEY_PATH=./ai/secrets/model.key

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/jpg

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Guest Mode
GUEST_RATE_LIMIT_WINDOW_MS=3600000
GUEST_RATE_LIMIT_MAX_REQUESTS=10
```

### Volume Management

**Persistent Data Volumes:**

- `./data` - SQLite database files
- `./uploads` - User uploaded plant images
- `./logs` - Application logs (Winston)
- `redis-data` - Redis data persistence

**Read-Only Volumes:**

- `./ai/saved_models` - Encrypted AI model files
- `./ai/secrets` - Model encryption keys

### Security Considerations

1. **Model Files**: AI models are encrypted and keys are stored separately
2. **Environment Secrets**: Never commit `.env.docker` to version control
3. **Volume Permissions**: Read-only mounts for sensitive data
4. **Network Isolation**: Services communicate via internal Docker network
5. **Health Checks**: Automated health monitoring for all services

---

## Testing Framework

### Test Suite Overview

The project includes a comprehensive testing framework with **101 test cases** covering:

- Unit tests (42 tests)
- Integration tests (49 tests)
- End-to-end tests (10 tests)

**Test Coverage**: ~95% (96 passed, 5 expected failures due to environment constraints)

### Test Structure

```
tests/
├── unit/                        # Isolated component tests
│   ├── auth.test.js             # Authentication logic (15 tests)
│   ├── token.test.js            # JWT operations (8 tests)
│   ├── upload.test.js           # File validation (12 tests)
│   ├── middleware.test.js       # Middleware validation (9 tests)
│   ├── prediction.test.js       # Prediction endpoints (8 tests)
│   ├── history.test.js          # CRUD operations (12 tests)
│   └── guest.test.js            # Guest functionality (7 tests)
│
├── integration/                 # Multi-component workflows
│   ├── auth.integration.test.js # Auth flow (20 tests)
│   ├── guest.integration.test.js # Guest flow (15 tests)
│   └── userWorkflow.test.js     # User journey (14 tests)
│
└── e2e/                         # Full system tests
    └── system.test.js           # Health checks & system status (10 tests)
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e              # E2E tests only

# Run specific test files
npm run test:auth             # Authentication tests
npm run test:prediction       # Prediction tests
npm run test:guest            # Guest mode tests

# Watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Debug tests
npm run test:debug
```

### Test Reporting System

The project includes an **automated Excel reporting system** that generates professional test reports:

#### Features:

1. **Executive Summary Sheet**
   - Total tests: 101
   - Pass rate: 95%
   - Bugs found: 68
   - Test execution timestamp

2. **Test Cases Sheet** (101 rows)
   - Test ID, Name, Module, Priority
   - Status (PASSED/FAILED/SKIPPED)
   - Execution duration
   - Error messages
   - Color-coded results (Green=Pass, Red=Fail, Yellow=Skip)

3. **Bug Reports Sheet** (68 entries)
   - Bug ID, Title, Severity, Priority
   - Description and location
   - Color-coded severity (Red=Critical, Orange=High, Yellow=Minor)
   - Detected issues include:
     - Failed test cases
     - Code quality issues (TODO comments, console.logs)
     - Empty catch blocks
     - Security concerns

#### Generate Reports

```bash
# Generate report for all tests
npm run test:report

# Generate report for specific test types
npm run test:unit:report
npm run test:integration:report
npm run test:e2e:report

# Manual generation via CLI
node test-reporter/cli.js all
node test-reporter/cli.js unit
```

#### Report Output Location

```
test-reports/
├── test-report-YYYYMMDD-HHMMSS.xlsx
├── test-report-unit-YYYYMMDD-HHMMSS.xlsx
├── test-report-integration-YYYYMMDD-HHMMSS.xlsx
└── test-report-e2e-YYYYMMDD-HHMMSS.xlsx
```

### Jest Configuration

```javascript
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupAfterEnv.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
  coverageDirectory: "tests/coverage",
  reporters: ["default", "<rootDir>/test-reporter/jestReporter.js"],
};
```

### Test Helpers

```javascript
// tests/helpers/testHelpers.js
module.exports = {
  createTestUser, // Create test user
  loginTestUser, // Get auth tokens
  createTestPrediction, // Create prediction record
  cleanupTestData, // Clean up test database
  generateTestImage, // Create test image file
  waitForCondition, // Async wait helper
};
```

### Testing Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Cleanup**: Tests clean up after themselves (database, files)
3. **Mocking**: External services are mocked (AI service, file system)
4. **Coverage**: Aim for 80%+ code coverage
5. **Performance**: Tests run in under 30 seconds
6. **CI/CD Ready**: Tests can run in CI environments

---

## API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### POST /api/auth/register

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### POST /api/auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/auth/logout

Logout and invalidate tokens.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Prediction Endpoints

#### POST /api/predictions

Make a plant health prediction (Authenticated users).

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

```
image: <file> (PNG/JPEG, max 10MB)
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "prediction": "Pest_Fungal",
    "confidence": 0.94,
    "imageUrl": "/uploads/image-1234567890.jpg",
    "timestamp": "2026-02-04T10:30:00Z",
    "userId": 1
  }
}
```

#### POST /api/guest/predict

Make a prediction without authentication (Guest mode).

**Request Body (Form Data):**

```
image: <file> (PNG/JPEG, max 10MB)
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "prediction": "Healthy",
    "confidence": 0.97,
    "message": "Limited guest prediction. Register for full features."
  }
}
```

**Rate Limit:** 10 requests per hour per IP

### History Endpoints

#### GET /api/history

Get user's prediction history.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

```
?page=1&limit=10&sort=createdAt&order=DESC
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "id": 123,
        "prediction": "Healthy",
        "confidence": 0.97,
        "imageUrl": "/uploads/image-123.jpg",
        "createdAt": "2026-02-04T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

#### GET /api/history/:id

Get specific prediction details.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "prediction": "Pest_Fungal",
    "confidence": 0.94,
    "imageUrl": "/uploads/image-123.jpg",
    "metadata": {
      "imageSize": "224x224",
      "processingTime": "1.2s"
    },
    "createdAt": "2026-02-04T10:30:00Z"
  }
}
```

#### DELETE /api/history/:id

Delete a prediction from history.

**Response (200):**

```json
{
  "success": true,
  "message": "Prediction deleted successfully"
}
```

#### GET /api/history/:id/pdf

Download prediction result as PDF.

**Response:**

- Content-Type: application/pdf
- PDF file download

### System Endpoints

#### GET /health

Check service health status.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-02-04T10:30:00Z",
  "service": "plant-health-backend",
  "environment": "production",
  "uptime": 3600
}
```

#### GET /api/system/status

Get detailed system status (Admin only).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "database": "connected",
    "redis": "connected",
    "aiWorkers": {
      "poolSize": 3,
      "activeWorkers": 3,
      "totalPredictions": 150,
      "successRate": 0.98
    },
    "uptime": 3600,
    "memoryUsage": {
      "heapUsed": 45.2,
      "heapTotal": 60.1
    }
  }
}
```

### Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE",
  "statusCode": 400
}
```

**Common Error Codes:**

- `VALIDATION_ERROR` - Invalid request data
- `AUTHENTICATION_ERROR` - Invalid or missing auth token
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AI_PREDICTION_FAILED` - AI service error
- `SERVER_ERROR` - Internal server error

---

## Security Features

### 1. Authentication & Authorization

- **JWT Tokens**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Redis-based session tracking
- **Role-Based Access**: User and Admin roles

### 2. Request Security

- **CSRF Protection**: Custom CSRF token middleware
- **Rate Limiting**:
  - Global: 100 requests/15 min
  - Auth endpoints: 5 requests/15 min
  - Guest predictions: 10 requests/hour
- **CORS**: Configured for specific frontend origin
- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options, etc.)

### 3. Input Validation

- **Joi Schema Validation**: All request bodies validated
- **File Upload Security**:
  - MIME type validation (JPEG/PNG only)
  - File size limits (10MB max)
  - Magic number verification
  - Filename sanitization
  - Isolated storage directory

### 4. Data Protection

- **Model Encryption**: AI models stored encrypted (AES)
- **Environment Secrets**: All secrets in .env files (not in Git)
- **SQL Injection Prevention**: Sequelize ORM with parameterized queries
- **XSS Prevention**: Output sanitization, CSP headers

### 5. Logging & Monitoring

- **Winston Logger**: Structured logging with levels
- **Request Tracking**: Unique request IDs
- **Error Logging**: Detailed error stack traces
- **Access Logs**: All API requests logged

### 6. Privacy-First Design

- **No Telemetry**: No external tracking
- **Local Storage**: All data stored on-premises
- **User Control**: Users can delete their data
- **Guest Mode**: Anonymous predictions with strict limits

---

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Git** for version control
- **Node.js 20+** (for local development)
- **Python 3.10+** (for local development)

### Installation Steps

#### 1. Clone Repository

```bash
git clone https://github.com/adityagupta000/plant_backend.git
cd plant_backend
```

#### 2. Download Required Files

**⚠️ Important**: The following files are NOT in Git and must be obtained separately:

```
ai/
├── saved_models/
│   └── best_model.encrypted   # AI model file
├── secrets/
│   └── model.key              # Encryption key
.env.docker                    # Environment configuration
```

These files are shared via secure storage (Google Drive/OneDrive).

#### 3. Place Files in Project

```
backend/
├── ai/
│   ├── saved_models/
│   │   └── best_model.encrypted   ← Place here
│   ├── secrets/
│   │   └── model.key              ← Place here
├── .env.docker                    ← Place here
└── ...
```

#### 4. Configure Environment

Edit `.env.docker` with your configuration:

```env
# Critical settings to change:
JWT_ACCESS_SECRET=your-unique-secret-key-here
JWT_REFRESH_SECRET=your-unique-refresh-key-here
FRONTEND_URL=http://your-frontend-url:port
```

#### 5. Build and Start Services

```bash
# Build and start in background
docker compose up --build -d

# View logs
docker compose logs -f backend
```

#### 6. Verify Deployment

```bash
# Check health
curl http://localhost:5000/health

# Expected response:
# {
#   "status": "ok",
#   "service": "plant-health-backend",
#   ...
# }

# Check container status
docker compose ps
```

#### 7. Create Admin User (Optional)

```bash
# Access container
docker compose exec backend sh

# Run admin creation script
node src/scripts/create-admin.js

# Follow prompts to create admin account
```

### Local Development (Without Docker)

#### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd ai
pip install -r requirements.txt
cd ..
```

#### 2. Create .env File

Create `.env` in project root:

```env
NODE_ENV=development
PORT=5000
DB_DIALECT=sqlite
DB_STORAGE=./data/database.sqlite
REDIS_HOST=localhost
REDIS_PORT=6379
USE_REDIS=false
JWT_ACCESS_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-refresh-secret
AI_POOL_SIZE=2
```

#### 3. Start Redis (Optional)

```bash
# Using Docker
docker run -d -p 6379:6379 --name plant-health-redis redis:alpine

# Or install Redis locally
```

#### 4. Start Development Server

```bash
# Start with hot reload
npm run dev

# Server will start on http://localhost:5000
```

#### 5. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Generate Excel report
npm run test:report
```

### Project URLs

- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Base**: http://localhost:5000/api
- **Redis**: localhost:6379

### Troubleshooting

#### Issue: AI service not starting

```bash
# Check model files exist
ls ai/saved_models/best_model.encrypted
ls ai/secrets/model.key

# Check Python dependencies
docker compose exec backend pip list | grep torch
```

#### Issue: Database connection error

```bash
# Check data directory permissions
ls -la data/

# Recreate database
rm data/database.sqlite
docker compose restart backend
```

#### Issue: Redis connection failed

```bash
# Check Redis status
docker compose exec redis redis-cli ping

# Restart Redis
docker compose restart redis
```

#### Issue: Tests failing

```bash
# Clean test database
rm tests/test-database.sqlite

# Run tests with verbose output
npm test -- --verbose
```

### Support & Resources

- **GitHub Repository**: https://github.com/adityagupta000/plant_backend
- **Issues**: Report bugs via GitHub Issues
- **Documentation**: This file (PROJECT_DOCUMENTATION.md)

---

## Additional Notes

### Model Information

- **Architecture**: EfficientNet-B2
- **Input Size**: 224x224 pixels
- **Classes**: 8 disease categories
- **Framework**: PyTorch 2.1.2 (CPU optimized)
- **Inference Time**: ~1-2 seconds per image

### Performance Metrics

- **Request Handling**: 100+ req/min (with rate limiting)
- **AI Worker Pool**: 3 concurrent workers
- **Average Response Time**: <2s for predictions
- **Database**: SQLite (can scale to PostgreSQL)
- **Memory Usage**: ~500MB (includes AI models)

### Future Enhancements

- [ ] PostgreSQL for production database
- [ ] WebSocket support for real-time updates
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] Batch prediction processing
- [ ] Enhanced PDF reports with charts
- [ ] Email notifications
- [ ] Analytics dashboard