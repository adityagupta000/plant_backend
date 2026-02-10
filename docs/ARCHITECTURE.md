# Architecture

## System Components

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

## Directory Structure

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
