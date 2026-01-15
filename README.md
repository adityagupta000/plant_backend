# Plant Health Detection Backend

Node.js backend with dual token authentication for plant disease detection system.

## 🌟 Features

- **Dual Token Authentication**: Access tokens (15min) + Refresh tokens (7 days)
- **Session Management**: Claude-style conversation history
- **AI Integration**: Communicates with Python FastAPI inference service
- **File Upload**: Secure image upload with validation
- **Rate Limiting**: Protect against abuse
- **Comprehensive Logging**: Winston-based logging system
- **Error Handling**: Centralized error management
- **Database**: SQLite (dev) / PostgreSQL (prod)

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Python FastAPI service running (for AI predictions)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone repository
git clone <repository-url>
cd backend

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Generate secure JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Edit .env file with your secrets
nano .env
```

**CRITICAL**: Update these values in `.env`:
- `ACCESS_TOKEN_SECRET` - Generate a strong random secret
- `REFRESH_TOKEN_SECRET` - Generate a DIFFERENT strong random secret
- `FRONTEND_URL` - Your frontend URL (for CORS)

### 3. Create Required Directories

```bash
# Create directories
mkdir -p uploads logs

# Add .gitkeep to uploads folder
touch uploads/.gitkeep
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js
│   │   ├── jwt.js
│   │   └── constants.js
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.js
│   │   ├── prediction.controller.js
│   │   └── history.controller.js
│   ├── middlewares/      # Express middleware
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   └── error.middleware.js
│   ├── models/           # Database models
│   │   ├── index.js
│   │   ├── user.model.js
│   │   ├── refreshToken.model.js
│   │   ├── session.model.js
│   │   └── prediction.model.js
│   ├── routes/           # API routes
│   │   ├── auth.routes.js
│   │   ├── prediction.routes.js
│   │   └── history.routes.js
│   ├── services/         # Business logic
│   │   ├── auth.service.js
│   │   ├── token.service.js
│   │   ├── ai.service.js
│   │   ├── storage.service.js
│   │   └── prediction.service.js
│   ├── utils/            # Utility functions
│   │   ├── logger.js
│   │   ├── tokens.js
│   │   ├── helpers.js
│   │   └── upload.js
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── uploads/              # Temporary image storage
├── logs/                 # Application logs
├── .env                  # Environment variables
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
└── README.md             # Documentation
```

## 🔐 Authentication Flow

### Dual Token System

1. **Access Token** (Short-lived - 15 minutes)
   - Stored in client memory
   - Used for API requests
   - Sent in Authorization header

2. **Refresh Token** (Long-lived - 7 days)
   - Stored in HTTP-only cookie
   - Used to obtain new access tokens
   - Cannot be accessed by JavaScript

### Login Flow

```javascript
// 1. User logs in
POST /api/auth/login
Body: { email, password }

// 2. Server responds with access token
Response: {
  accessToken: "...",
  expiresIn: 900,
  user: {...}
}
// + Sets refresh token in HTTP-only cookie

// 3. Client stores access token in memory
let accessToken = response.accessToken;

// 4. Client makes API requests
GET /api/predict/health
Headers: { Authorization: "Bearer <accessToken>" }

// 5. When access token expires
POST /api/auth/refresh
// Server automatically reads refresh token from cookie

// 6. Server responds with new access token
Response: {
  accessToken: "...",
  expiresIn: 900
}
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public* |
| POST | `/api/auth/logout` | Logout current session | Private |
| POST | `/api/auth/logout-all` | Logout all sessions | Private |
| GET | `/api/auth/profile` | Get user profile | Private |

*Requires refresh token in cookie

### Predictions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/predict/health` | Check AI service health | Private |
| POST | `/api/predict/session` | Create new session | Private |
| POST | `/api/predict` | Make prediction | Private |

### History

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/history/sessions` | Get all sessions | Private |
| GET | `/api/history/sessions/:id/predictions` | Get session predictions | Private |
| PATCH | `/api/history/sessions/:id` | Update session title | Private |
| DELETE | `/api/history/sessions/:id` | Delete session | Private |
| GET | `/api/history/predictions/:id` | Get prediction details | Private |

## 🧪 Testing

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login (save cookies)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Make prediction (with saved cookies)
curl -X POST http://localhost:3000/api/predict \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "image=@/path/to/image.jpg" \
  -b cookies.txt

# Refresh token (uses cookies automatically)
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -b cookies.txt
```

### Using Postman

1. **Register/Login**: Save the `accessToken` from response
2. **Set Authorization**: Use "Bearer Token" with saved `accessToken`
3. **Enable Cookies**: Settings → Enable "Interceptor" for cookie handling
4. **Make Requests**: Cookies are sent automatically

## 🔒 Security Features

- **Password Hashing**: bcrypt with 10 rounds
- **JWT Tokens**: HS256 algorithm
- **HTTP-Only Cookies**: XSS protection
- **SameSite Cookies**: CSRF protection
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Joi schemas
- **File Validation**: Type and size checking
- **Helmet**: Security headers

## 📊 Database Schema

### Users
- id, username, email, password_hash, is_active, created_at, updated_at

### Refresh Tokens
- id, token_id, user_id, expires_at, is_revoked, revoked_at, created_at, last_used_at, user_agent, ip_address

### Prediction Sessions
- id, user_id, title, created_at, updated_at

### Predictions
- id, session_id, user_id, image_name, image_url, image_size, predicted_class, category, subtype, confidence, confidence_percentage, all_predictions, confidence_level, explanation, model_version, model_name, processing_time_ms, status, error_message, created_at

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Locked

```bash
# Delete SQLite database and restart
rm database.sqlite
npm run dev
```

### AI Service Unavailable

1. Check if Python service is running
2. Verify `AI_SERVICE_URL` in `.env`
3. Check AI service logs

### CORS Issues

1. Verify `FRONTEND_URL` in `.env`
2. Ensure `credentials: true` in frontend fetch
3. Check CORS middleware in `app.js`

## 🚀 Production Deployment

### Environment Setup

```bash
NODE_ENV=production
COOKIE_SECURE=true
DB_DIALECT=postgres
# ... update all production values
```

### PostgreSQL Setup

```bash
# Install pg packages
npm install pg pg-hstore

# Update .env
DB_DIALECT=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=plant_health_prod
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start src/server.js --name plant-health-backend

# View logs
pm2 logs plant-health-backend

# Monitor
pm2 monit

# Restart
pm2 restart plant-health-backend

# Stop
pm2 stop plant-health-backend
```

### Docker (Optional)

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| NODE_ENV | Environment mode | development | No |
| PORT | Server port | 3000 | No |
| ACCESS_TOKEN_SECRET | JWT access token secret | - | **Yes** |
| REFRESH_TOKEN_SECRET | JWT refresh token secret | - | **Yes** |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:5173 | No |
| AI_SERVICE_URL | Python AI service URL | http://localhost:8000 | No |

See `.env.example` for complete list.
