# Getting Started

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Git** for version control
- **Node.js 20+** (for local development)
- **Python 3.10+** (for local development)

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/adityagupta000/plant_backend.git
cd plant_backend
```

### 2. Download Required Files

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

### 3. Place Files in Project

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

### 4. Configure Environment

Edit `.env.docker` with your configuration:

```env
# Critical settings to change:
JWT_ACCESS_SECRET=your-unique-secret-key-here
JWT_REFRESH_SECRET=your-unique-refresh-key-here
FRONTEND_URL=http://your-frontend-url:port
```

### 5. Build and Start Services

```bash
# Build and start in background
docker compose up --build -d

# View logs
docker compose logs -f backend
```

### 6. Verify Deployment

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

### 7. Create Admin User (Optional)

```bash
# Access container
docker compose exec backend sh

# Run admin creation script
node src/scripts/create-admin.js

# Follow prompts to create admin account
```

## Local Development (Without Docker)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd ai
pip install -r requirements.txt
cd ..
```

### 2. Create .env File

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

### 3. Start Redis (Optional)

```bash
# Using Docker
docker run -d -p 6379:6379 --name plant-health-redis redis:alpine

# Or install Redis locally
```

### 4. Start Development Server

```bash
# Start with hot reload
npm run dev

# Server will start on http://localhost:5000
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Generate Excel report
npm run test:report
```

## Project URLs

- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Base**: http://localhost:5000/api
- **Redis**: localhost:6379

## Troubleshooting

### Issue: AI service not starting

```bash
# Check model files exist
ls ai/saved_models/best_model.encrypted
ls ai/secrets/model.key

# Check Python dependencies
docker compose exec backend pip list | grep torch
```

### Issue: Database connection error

```bash
# Check data directory permissions
ls -la data/

# Recreate database
rm data/database.sqlite
docker compose restart backend
```

### Issue: Redis connection failed

```bash
# Check Redis status
docker compose exec redis redis-cli ping

# Restart Redis
docker compose restart redis
```

### Issue: Tests failing

```bash
# Clean test database
rm tests/test-database.sqlite

# Run tests with verbose output
npm test -- --verbose
```

## Support & Resources

- **GitHub Repository**: https://github.com/adityagupta000/plant_backend
- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See [main README](../../README.md)

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
