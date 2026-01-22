# =============================================================================
# Plant Health Detection Backend - CPU ONLY (FINAL FIX)
# Python 3.10 + Node.js 20
# =============================================================================

FROM python:3.10-slim

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
# System dependencies (OpenCV + Node.js + build tools)
# -----------------------------------------------------------------------------
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# App directory
# -----------------------------------------------------------------------------
WORKDIR /app

# -----------------------------------------------------------------------------
# Python dependencies (FORCE CPU-ONLY TORCH)
# -----------------------------------------------------------------------------
COPY ai/requirements.txt ./ai/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.1.2+cpu torchvision==0.16.2+cpu && \
    pip install --no-cache-dir -r ai/requirements.txt

# -----------------------------------------------------------------------------
# Node dependencies
# -----------------------------------------------------------------------------
COPY package*.json ./
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Application source
# -----------------------------------------------------------------------------
COPY src/ ./src/
COPY ai/ ./ai/

# -----------------------------------------------------------------------------
# Runtime directories
# -----------------------------------------------------------------------------
RUN mkdir -p \
    /app/data \
    /app/uploads \
    /app/logs \
    /app/temp_pdfs \
    /app/ai/saved_models \
    /app/ai/secrets

# -----------------------------------------------------------------------------
# Security: non-root user
# -----------------------------------------------------------------------------
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

# -----------------------------------------------------------------------------
# Networking & health
# -----------------------------------------------------------------------------
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# -----------------------------------------------------------------------------
# Start backend
# -----------------------------------------------------------------------------
CMD ["node", "src/server.js"]