# Plant Health Backend - Docker Quick Guide

A containerized Node.js backend with Python AI service and Redis, optimized for CPU-only deployment.

---

## Quick Start

```bash
# 1. Clone and configure
git clone -b backend-docker --single-branch https://github.com/adityagupta000/plant_backend.git
cd plant_backend
cp .env.docker
# Edit .env.docker with your configuration

# 2. Build and start services
docker compose up --build -d

# 3. Verify deployment
curl http://localhost:5000/health
docker compose logs -f backend
```

---

## Essential Commands

### Build & Run
```bash
docker compose up --build -d      # Build and start in background
docker compose down               # Stop and remove containers
docker compose restart            # Quick restart
docker compose up                 # Start with logs visible
```

### Monitor & Debug
```bash
docker compose logs -f backend    # Follow backend logs
docker compose logs -f redis      # Follow Redis logs
docker compose logs --tail=100    # Last 100 log lines
docker compose ps                 # Check service status
docker compose exec backend sh    # Access container shell
docker compose exec redis redis-cli  # Access Redis CLI
```

### Testing & Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Redis health
docker compose exec redis redis-cli ping

# View recent logs
docker compose logs --tail=50 backend
```

---

## Project Structure

```
backend/
├── docker-compose.yml      # Service orchestration
├── Dockerfile              # Container build instructions
├── .env.docker             # Environment variables
├── .dockerignore           # Files to exclude from build
├── package.json            # Node.js dependencies
├── src/                    # Node.js backend source
│   ├── server.js           # Main application entry
│   ├── routes/             # API routes
│   └── services/           # Business logic
├── ai/                     # Python AI service
│   ├── requirements.txt    # Python dependencies (CPU-only PyTorch)
│   ├── model.py            # AI model logic
│   └── saved_models/       # Pre-trained AI models
├── data/                   # Persistent application data (volume)
├── uploads/                # User uploaded files (volume)
└── logs/                   # Application logs (volume)
```

---

## Dockerfile Highlights

```dockerfile
FROM python:3.10-slim
ENV PYTHONUNBUFFERED=1 NODE_ENV=production

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y curl gcc g++ \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# Install CPU-only PyTorch (critical for deployment!)
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.1.2+cpu torchvision==0.16.2+cpu

# Install Python dependencies
COPY ai/requirements.txt ./ai/
RUN pip install --no-cache-dir -r ai/requirements.txt

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/
COPY ai/ ./ai/

# Security: Run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000
CMD ["node", "src/server.js"]
```

**Key Points:**
- Uses Python 3.10 slim base image for smaller size
- Installs Node.js 20 alongside Python
- CPU-only PyTorch to avoid CUDA dependencies
- Non-root user for security
- Multi-stage dependency installation for better caching

---

## docker-compose.yml Essentials

```yaml
version: '3.8'

services:
  backend:
    build: .
    container_name: plant-health-backend
    ports:
      - "5000:5000"
    env_file: .env.docker
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
      - ./ai/saved_models:/app/ai/saved_models:ro
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: plant-health-redis
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

**Key Features:**
- Automatic container restart on failure
- Health checks for both services
- Persistent volumes for data, uploads, and Redis
- Read-only mount for AI models
- Isolated network for service communication

---

## Environment Configuration

Create `.env.docker` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AI Service
AI_MODEL_PATH=/app/ai/saved_models
INFERENCE_TIMEOUT=30000

# File Upload
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Database (if applicable)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=plant_health
DB_USER=your-username
DB_PASSWORD=your-password
```

---

## Common Issues & Fixes

### PyTorch CUDA Errors
```bash
# Rebuild with no cache to ensure CPU-only installation
docker compose build --no-cache backend
docker compose up -d
```

### OpenCV Import Errors
Ensure `opencv-python-headless` is in `ai/requirements.txt`:
```txt
opencv-python-headless==4.9.0.80
```

### Permission Errors
```bash
# Fix ownership of mounted volumes
sudo chown -R 1000:1000 ./data ./uploads ./logs

# Or set permissions in Dockerfile
RUN mkdir -p /app/data /app/uploads /app/logs \
    && chown -R appuser:appuser /app
```

### Port Already in Use
Edit `docker-compose.yml` to change host port:
```yaml
ports:
  - "5001:5000"  # Changed from 5000:5000
```

### Redis Connection Failed
```bash
# Check Redis logs
docker compose logs redis

# Verify network connectivity
docker compose exec backend ping redis

# Test Redis directly
docker compose exec redis redis-cli ping
```

### Container Keeps Restarting
```bash
# Check logs for errors
docker compose logs --tail=100 backend

# Disable healthcheck temporarily to debug
# Comment out healthcheck section in docker-compose.yml
```

---

## Key Dependencies

### ai/requirements.txt
```txt
# CPU-only PyTorch (must be installed first!)
--index-url https://download.pytorch.org/whl/cpu
torch==2.1.2+cpu
torchvision==0.16.2+cpu

# Docker-safe OpenCV (no GUI dependencies)
opencv-python-headless==4.9.0.80

# AI/ML Libraries
timm==1.0.24
scikit-learn==1.4.2
Pillow==10.4.0
numpy==1.24.3

# Utilities
pyyaml==6.0.1
tqdm==4.66.1
```

**Important:** Always install CPU-only PyTorch first to avoid downloading CUDA dependencies.

---

## Health Checks

### Backend Health Endpoint
```bash
curl http://localhost:5000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-23T10:30:00.000Z",
  "services": {
    "redis": "connected",
    "ai": "ready"
  }
}
```

### Redis Health
```bash
docker compose exec redis redis-cli ping
# Expected: PONG
```

### Container Health
```bash
docker compose ps
# Look for "healthy" status
```

### Log Monitoring
```bash
# All services
docker compose logs --tail=100 -f

# Specific service
docker compose logs --tail=50 -f backend

# Save logs to file
docker compose logs --no-color > docker-logs.txt
```

---

## Production Deployment

### Pre-deployment Checklist
- [ ] Update `.env.docker` with production values
- [ ] Set strong Redis password if exposed
- [ ] Configure reverse proxy (nginx/traefik)
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup strategy for volumes
- [ ] Set up log rotation
- [ ] Configure monitoring and alerts

### Resource Limits
Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Backup Volumes
```bash
# Backup Redis data
docker compose exec redis redis-cli BGSAVE
docker cp plant-health-redis:/data/dump.rdb ./backup/

# Backup uploads
tar -czf backup/uploads-$(date +%Y%m%d).tar.gz ./uploads/
```

---

## Troubleshooting Tips

1. **Always check logs first:** `docker compose logs --tail=100`
2. **Verify network connectivity:** `docker compose exec backend ping redis`
3. **Check disk space:** `df -h` and `docker system df`
4. **Rebuild from scratch:** `docker compose down -v && docker compose up --build -d`
5. **Clear Docker cache:** `docker system prune -a --volumes` (warning: deletes all unused data)
