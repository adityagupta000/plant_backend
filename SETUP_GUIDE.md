# Complete Backend Setup Guide

## Step-by-Step Installation

### Step 1: Create Project Structure

```bash
# Create main project directory
mkdir backend
cd backend

# Create all subdirectories
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/middlewares
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/services
mkdir -p src/utils
mkdir -p uploads
mkdir -p logs

# Create placeholder for uploads (for git)
touch uploads/.gitkeep
```

### Step 2: Initialize npm Project

```bash
npm init -y
```

### Step 3: Install All Dependencies

```bash
# Install production dependencies
npm install express
npm install jsonwebtoken bcrypt cookie-parser helmet cors
npm install multer
npm install sqlite3 sequelize
npm install axios form-data
npm install joi express-rate-limit
npm install dotenv winston
npm install uuid

# Install development dependencies
npm install --save-dev nodemon
```

### Step 4: Create All Configuration Files

Create these files in the project root:

1. **`.env`** - Copy from the `.env` artifact I provided
2. **`.env.example`** - Copy from the `.env.example` artifact
3. **`.gitignore`** - Copy from the `.gitignore` artifact
4. **`package.json`** - Copy from the `package.json` artifact
5. **`README.md`** - Copy from the README artifact

### Step 5: Create All Source Files

Copy all the code from the artifacts into these files:

#### Config Files (`src/config/`)
1. `jwt.js`
2. `database.js`
3. `constants.js`

#### Utils Files (`src/utils/`)
1. `logger.js`
2. `tokens.js`
3. `helpers.js`
4. `upload.js`

#### Models Files (`src/models/`)
1. `user.model.js`
2. `refreshToken.model.js`
3. `session.model.js`
4. `prediction.model.js`
5. `index.js`

#### Services Files (`src/services/`)
1. `token.service.js`
2. `auth.service.js`
3. `ai.service.js`
4. `storage.service.js` - From the markdown guide
5. `prediction.service.js` - From the markdown guide

#### Middlewares Files (`src/middlewares/`)
1. `auth.middleware.js`
2. `validation.middleware.js` - From the complete implementation artifact
3. `rateLimiter.middleware.js` - From the complete implementation artifact
4. `error.middleware.js` - From the complete implementation artifact

#### Controllers Files (`src/controllers/`)
1. `auth.controller.js`
2. `prediction.controller.js`
3. `history.controller.js`

#### Routes Files (`src/routes/`)
1. `auth.routes.js`
2. `prediction.routes.js`
3. `history.routes.js`

#### Main Files (`src/`)
1. `app.js`
2. `server.js`

### Step 6: Generate JWT Secrets

```bash
# Generate ACCESS_TOKEN_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate REFRESH_TOKEN_SECRET (must be different!)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy these secrets into your `.env` file.

### Step 7: Update .env File

Edit `.env` and update:

```bash
# Required - Update these!
ACCESS_TOKEN_SECRET=<paste-generated-secret-1>
REFRESH_TOKEN_SECRET=<paste-generated-secret-2>
FRONTEND_URL=http://localhost:5173

# Optional - Adjust as needed
PORT=3000
AI_SERVICE_URL=http://localhost:8000
```

### Step 8: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:

```
==========================================================
🚀 Plant Health Detection Backend
==========================================================
Environment: development
Server: http://localhost:3000
Health: http://localhost:3000/health
API: http://localhost:3000/api
==========================================================
```

## Verification Checklist

### ✅ Server Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-10T...",
  "service": "plant-health-backend",
  "environment": "development",
  "uptime": 5.123
}
```

### ✅ Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    ...
  }
}
```

### ✅ Login User

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt -v
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "expiresIn": 900,
  "user": {...}
}
```

**Important**: Check that you see `Set-Cookie: refreshToken=...` in the headers!

### ✅ Access Protected Route

```bash
# Replace <ACCESS_TOKEN> with the token from login response
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### ✅ Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt
```

Expected response:
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "expiresIn": 900
}
```

## File Checklist

Make sure you have created all these files:

```
✓ .env
✓ .env.example
✓ .gitignore
✓ package.json
✓ README.md
✓ src/config/jwt.js
✓ src/config/database.js
✓ src/config/constants.js
✓ src/utils/logger.js
✓ src/utils/tokens.js
✓ src/utils/helpers.js
✓ src/utils/upload.js
✓ src/models/user.model.js
✓ src/models/refreshToken.model.js
✓ src/models/session.model.js
✓ src/models/prediction.model.js
✓ src/models/index.js
✓ src/services/token.service.js
✓ src/services/auth.service.js
✓ src/services/ai.service.js
✓ src/services/storage.service.js
✓ src/services/prediction.service.js
✓ src/middlewares/auth.middleware.js
✓ src/middlewares/validation.middleware.js
✓ src/middlewares/rateLimiter.middleware.js
✓ src/middlewares/error.middleware.js
✓ src/controllers/auth.controller.js
✓ src/controllers/prediction.controller.js
✓ src/controllers/history.controller.js
✓ src/routes/auth.routes.js
✓ src/routes/prediction.routes.js
✓ src/routes/history.routes.js
✓ src/app.js
✓ src/server.js
✓ uploads/.gitkeep
```

## Common Issues and Solutions

### Issue 1: Module Not Found

**Error**: `Cannot find module '...'`

**Solution**:
```bash
npm install
```

### Issue 2: Database Connection Failed

**Error**: `Unable to connect to the database`

**Solution**: SQLite creates the database automatically. Ensure you have write permissions in the project directory.

### Issue 3: Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or change the port in .env
PORT=3001
```

### Issue 4: JWT Secret Not Set

**Error**: `Failed to generate authentication tokens`

**Solution**: Make sure you've set both `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` in `.env`

### Issue 5: CORS Error

**Error**: `Access to fetch has been blocked by CORS policy`

**Solution**: Update `FRONTEND_URL` in `.env` to match your frontend URL

## Next Steps

1. ✅ Backend server running
2. 🔄 Set up Python AI service (FastAPI)
3. 🔄 Test prediction endpoint with AI service
4. 🔄 Set up frontend
5. 🔄 Deploy to production

## Testing the Complete Flow

Once your Python AI service is running:

```bash
# 1. Login (save cookies and token)
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt)

# 2. Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

# 3. Check AI service health
curl -X GET http://localhost:3000/api/predict/health \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 4. Make prediction
curl -X POST http://localhost:3000/api/predict \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "image=@/path/to/plant_image.jpg" \
  -b cookies.txt

# 5. Get history
curl -X GET http://localhost:3000/api/history/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Production Checklist

Before deploying to production:

- [ ] Change `NODE_ENV=production` in `.env`
- [ ] Set `COOKIE_SECURE=true` in `.env`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Use strong, unique JWT secrets
- [ ] Set up proper logging
- [ ] Configure firewall rules
- [ ] Use HTTPS
- [ ] Set up monitoring
- [ ] Configure backup system
- [ ] Review rate limits
- [ ] Test all endpoints

## Support

If you encounter any issues:

1. Check the logs in `logs/error.log` and `logs/combined.log`
2. Enable debug logging: `LOG_LEVEL=debug` in `.env`
3. Check that all environment variables are set correctly
4. Verify all dependencies are installed: `npm list`

## Success! 🎉

Your backend is now fully configured and ready to use!