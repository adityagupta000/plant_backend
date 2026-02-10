# Docker Setup

## Docker Architecture

The application runs as a multi-container setup orchestrated by Docker Compose:

1. **Backend Container** - Node.js + Python hybrid container
2. **Redis Container** - Caching and rate limiting
3. **Shared Volumes** - Persistent data storage

## Dockerfile Highlights

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

## Docker Compose Configuration

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

## Essential Docker Commands

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

## Environment Variables (.env.docker)

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

## Volume Management

**Persistent Data Volumes:**

- `./data` - SQLite database files
- `./uploads` - User uploaded plant images
- `./logs` - Application logs (Winston)
- `redis-data` - Redis data persistence

**Read-Only Volumes:**

- `./ai/saved_models` - Encrypted AI model files
- `./ai/secrets` - Model encryption keys

## Security Considerations

1. **Model Files**: AI models are encrypted and keys are stored separately
2. **Environment Secrets**: Never commit `.env.docker` to version control
3. **Volume Permissions**: Read-only mounts for sensitive data
4. **Network Isolation**: Services communicate via internal Docker network
5. **Health Checks**: Automated health monitoring for all services
