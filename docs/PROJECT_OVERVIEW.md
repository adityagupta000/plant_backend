# Project Overview

**Plant Health Monitoring Backend** is a production-ready, containerized Node.js backend service integrated with a Python-based AI inference engine for plant disease detection. The system is designed with a **privacy-first architecture** and optimized for **CPU-only deployment**.

## Key Features

- **Secure Authentication System** - JWT-based auth with refresh tokens, session management, and CSRF protection
- **AI-Powered Disease Detection** - Python inference server with encrypted model loading
- **Fully Dockerized** - Production-ready containerized deployment with Docker Compose
- **Worker Pool Architecture** - Efficient AI request handling with Python worker processes
- **Guest Mode Support** - Allow anonymous users to test predictions without registration
- **Comprehensive Testing** - 101 test cases covering unit, integration, and E2E testing
- **Automated Reporting** - Excel-based test reports with bug tracking
- **Production Optimized** - Rate limiting, Redis caching, request logging, and health checks
- **Enterprise Security** - Helmet.js, CORS, CSP, XSS protection, and secure file upload

## What This System Does

### 1. User Authentication & Authorization

- User registration and login
- JWT access/refresh token management
- Admin role support
- Session tracking

### 2. Plant Disease Detection

- Upload plant images for analysis
- AI-powered classification into 8 categories:
  - Healthy
  - Pest: Fungal, Bacterial, Insect
  - Nutrient: Nitrogen deficiency, Potassium deficiency
  - Water Stress
  - Not a Plant

### 3. Prediction History Management

- Store user prediction history
- CRUD operations on predictions
- PDF report generation
- Guest mode predictions (limited access)

### 4. System Monitoring

- Health check endpoints
- Database monitoring
- Redis connectivity checks
- AI worker pool statistics
