# Quick Reference Guide - Backend Implementation

## 🚀 5-Minute Setup

```bash
# 1. Create structure
mkdir -p backend/src/{config,controllers,middlewares,models,routes,services,utils} backend/{uploads,logs}
cd backend

# 2. Initialize
npm init -y

# 3. Install ALL dependencies at once
npm install express jsonwebtoken bcrypt cookie-parser helmet cors multer sqlite3 sequelize axios form-data joi express-rate-limit dotenv winston uuid && npm install --save-dev nodemon

# 4. Generate secrets
echo "ACCESS_TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo "REFRESH_TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"

# 5. Create .gitkeep files
touch uploads/.gitkeep logs/.gitkeep
```

---

## 📝 Copy Files Checklist

### Root (5 files)
```bash
# In backend/ directory
touch .env .env.example .gitignore package.json README.md
```

### Source Files (29 files)
```bash
# Config (3)
touch src/config/{jwt,database,constants}.js

# Utils (4)
touch src/utils/{logger,tokens,helpers,upload}.js

# Models (5)
touch src/models/{index,user.model,refreshToken.model,session.model,prediction.model}.js

# Services (5)
touch src/services/{token.service,auth.service,ai.service,storage.service,prediction.service}.js

# Middleware (4)
touch src/middlewares/{auth.middleware,validation.middleware,rateLimiter.middleware,error.middleware}.js

# Controllers (3)
touch src/controllers/{auth.controller,prediction.controller,history.controller}.js

# Routes (3)
touch src/routes/{auth.routes,prediction.routes,history.routes}.js

# Main (2)
touch src/{app,server}.js
```

---

## 🔑 Essential .env Variables

```bash
# Copy these into .env with your generated secrets:
ACCESS_TOKEN_SECRET=<YOUR_GENERATED_SECRET_1>
REFRESH_TOKEN_SECRET=<YOUR_GENERATED_SECRET_2>
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000
AI_SERVICE_URL=http://localhost:8000
```

---

## 🧪 Testing Commands

```bash
# Start server
npm run dev

# Test health (should return {"status":"ok"})
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Login (save token and cookie)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  -c cookies.txt -v

# Test protected route (replace TOKEN)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt -c cookies.txt

# Test prediction (requires AI service + image file)
curl -X POST http://localhost:3000/api/predict \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "image=@path/to/image.jpg" \
  -b cookies.txt
```

---

## 📊 API Endpoints Quick Reference

### Auth Endpoints
```
POST   /api/auth/register       - Create account
POST   /api/auth/login          - Get access token + cookie
POST   /api/auth/refresh        - Get new access token
POST   /api/auth/logout         - Logout current session
POST   /api/auth/logout-all     - Logout all sessions
GET    /api/auth/profile        - Get user info
```

### Prediction Endpoints
```
GET    /api/predict/health      - Check AI service
POST   /api/predict/session     - Create session
POST   /api/predict             - Make prediction
```

### History Endpoints
```
GET    /api/history/sessions                    - List sessions
GET    /api/history/sessions/:id/predictions    - List predictions
PATCH  /api/history/sessions/:id                - Update title
DELETE /api/history/sessions/:id                - Delete session
GET    /api/history/predictions/:id             - Get prediction
```

---

## 🎯 File Copy Order (Recommended)

1. **Root files first** (.env, package.json, .gitignore)
2. **Config files** (jwt, database, constants)
3. **Utils** (logger, tokens, helpers, upload)
4. **Models** (user, refreshToken, session, prediction, index)
5. **Services** (token, auth, ai, storage, prediction)
6. **Middleware** (auth, validation, rateLimiter, error)
7. **Controllers** (auth, prediction, history)
8. **Routes** (auth, prediction, history)
9. **Main files** (app.js, server.js)

---

## 🔍 Artifact Reference Table

| File Path | Artifact Name |
|-----------|---------------|
| `.env` | env_file |
| `.env.example` | env_example |
| `.gitignore` | gitignore |
| `package.json` | package_json |
| `README.md` | readme |
| `src/config/jwt.js` | jwt_config |
| `src/config/database.js` | database_config |
| `src/config/constants.js` | constants_config |
| `src/utils/logger.js` | logger_util |
| `src/utils/tokens.js` | tokens_util |
| `src/utils/helpers.js` | helpers_util |
| `src/utils/upload.js` | upload_util |
| `src/models/user.model.js` | user_model |
| `src/models/refreshToken.model.js` | refresh_token_model |
| `src/models/session.model.js` | session_model |
| `src/models/prediction.model.js` | prediction_model |
| `src/models/index.js` | models_index |
| `src/services/token.service.js` | token_service |
| `src/services/auth.service.js` | auth_service |
| `src/services/ai.service.js` | ai_service |
| `src/services/storage.service.js` | storage_service |
| `src/services/prediction.service.js` | prediction_service_full |
| `src/middlewares/auth.middleware.js` | auth_middleware |
| `src/middlewares/validation.middleware.js` | complete_implementation |
| `src/middlewares/rateLimiter.middleware.js` | complete_implementation |
| `src/middlewares/error.middleware.js` | complete_implementation |
| `src/controllers/auth.controller.js` | auth_controller |
| `src/controllers/prediction.controller.js` | prediction_controller |
| `src/controllers/history.controller.js` | history_controller |
| `src/routes/auth.routes.js` | auth_routes |
| `src/routes/prediction.routes.js` | prediction_routes |
| `src/routes/history.routes.js` | history_routes |
| `src/app.js` | app_js |
| `src/server.js` | server_js |
| `uploads/.gitkeep` | placeholder_files |

**Note**: The `complete_implementation` artifact contains validation, rate limiter, and error middleware - you'll need to extract each section into separate files.

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Forgot to generate JWT secrets → Server won't start
2. ❌ Used same secret for access and refresh → Security issue
3. ❌ Didn't create uploads/ directory → File upload fails
4. ❌ Didn't install all dependencies → Import errors
5. ❌ Wrong FRONTEND_URL → CORS errors
6. ❌ Missing .env file → Configuration errors
7. ❌ Forgot to start AI service → Prediction fails

---

## ✅ Success Indicators

Server is working correctly when:
- ✅ Logs show "Server started successfully"
- ✅ `/health` returns `{"status":"ok"}`
- ✅ Database file `database.sqlite` is created
- ✅ Registration creates users
- ✅ Login returns token + sets cookie
- ✅ Protected routes require auth
- ✅ Token refresh works
- ✅ Logs are written to `logs/` folder

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Module not found" | Run `npm install` |
| "Port already in use" | Change PORT in .env or kill process |
| "Cannot find module" | Check file paths and imports |
| "Database connection failed" | Check DB_PATH in .env |
| "JWT secret not set" | Add secrets to .env |
| "CORS error" | Update FRONTEND_URL in .env |
| "File upload fails" | Create uploads/ directory |
| "AI service unavailable" | Start Python service on port 8000 |

---

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

Use:
- `npm start` - Production mode
- `npm run dev` - Development mode (auto-reload)

---

## 🎓 Key Concepts

### Dual Token Authentication
- **Access Token**: 15min, stored in memory, used for API calls
- **Refresh Token**: 7 days, stored in HTTP-only cookie, used to get new access token

### Session Management
- Like Claude's conversations
- Each session contains multiple predictions
- Can rename, delete sessions
- Automatic session creation on first prediction

### File Upload Flow
1. Client uploads image
2. Multer validates and saves temporarily
3. AI service processes image
4. Result saved to database
5. Temp file deleted

### Error Handling
- Joi validates input
- Middleware catches errors
- Logs errors with Winston
- Returns JSON error responses
- Never leaks stack traces in production

---

## 🚀 Ready to Deploy?

Production checklist:
- [ ] NODE_ENV=production
- [ ] Strong JWT secrets
- [ ] PostgreSQL database
- [ ] COOKIE_SECURE=true
- [ ] HTTPS enabled
- [ ] FRONTEND_URL correct
- [ ] Rate limits configured
- [ ] Logs configured
- [ ] Monitoring setup
- [ ] Backups configured

---
