# Security Features

## 1. Authentication & Authorization

- **JWT Tokens**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Redis-based session tracking
- **Role-Based Access**: User and Admin roles

## 2. Request Security

- **CSRF Protection**: Custom CSRF token middleware
- **Rate Limiting**:
  - Global: 100 requests/15 min
  - Auth endpoints: 5 requests/15 min
  - Guest predictions: 10 requests/hour
- **CORS**: Configured for specific frontend origin
- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options, etc.)

## 3. Input Validation

- **Joi Schema Validation**: All request bodies validated
- **File Upload Security**:
  - MIME type validation (JPEG/PNG only)
  - File size limits (10MB max)
  - Magic number verification
  - Filename sanitization
  - Isolated storage directory

## 4. Data Protection

- **Model Encryption**: AI models stored encrypted (AES)
- **Environment Secrets**: All secrets in .env files (not in Git)
- **SQL Injection Prevention**: Sequelize ORM with parameterized queries
- **XSS Prevention**: Output sanitization, CSP headers

## 5. Logging & Monitoring

- **Winston Logger**: Structured logging with levels
- **Request Tracking**: Unique request IDs
- **Error Logging**: Detailed error stack traces
- **Access Logs**: All API requests logged

## 6. Privacy-First Design

- **No Telemetry**: No external tracking
- **Local Storage**: All data stored on-premises
- **User Control**: Users can delete their data
- **Guest Mode**: Anonymous predictions with strict limits
