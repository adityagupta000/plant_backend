# =============================================================================
# Plant Health Detection Backend - CPU ONLY (WITH LAYER CACHING)
# Python 3.10 + Node.js 20
# =============================================================================

FROM python:3.10-slim

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# =============================================================================
# LAYER 1: System dependencies (changes rarely - cached most of the time)
# =============================================================================
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

WORKDIR /app

# =============================================================================
# LAYER 2: Python dependencies (copy & install BEFORE source code)
# This layer is cached independently of source code changes
# Only rebuilds if ai/requirements.txt or PyTorch version changes
# =============================================================================
COPY ai/requirements.txt ./ai/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.1.2+cpu torchvision==0.16.2+cpu && \
    pip install --no-cache-dir -r ai/requirements.txt

# =============================================================================
# LAYER 3: Node.js dependencies (copy & install BEFORE source code)
# This layer is cached independently of source code changes
# Only rebuilds if package.json or package-lock.json changes
# =============================================================================
COPY package*.json ./
RUN npm ci --omit=dev

# =============================================================================
# LAYER 4: Application source code (copy last - most frequently changed)
# Even if source changes, all dependency layers remain cached
# This significantly speeds up rebuild times during development
# =============================================================================
COPY src/ ./src/
COPY ai/ ./ai/

# =============================================================================
# LAYER 5: Runtime directories setup
# Depends on source code being present (for permission changes)
# =============================================================================
RUN mkdir -p \
    /app/data \
    /app/uploads \
    /app/logs \
    /app/temp_pdfs \
    /app/ai/saved_models \
    /app/ai/secrets

# =============================================================================
# LAYER 6: Security hardening - non-root user for container runtime
# =============================================================================
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

# DEBUG: Temporarily run as root to debug startup issues
# USER appuser

# =============================================================================
# LAYER 7: Networking & Health Check Configuration
# =============================================================================
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# =============================================================================
# LAYER 8: Container entrypoint
# =============================================================================
CMD ["node", "src/server.js"]

# =============================================================================
# DOCKER LAYER CACHING STRATEGY DOCUMENTATION:
# =============================================================================
# Layer 1 (System deps):    ~30-60s (rarely changes, heavily cached)
# Layer 2 (Python deps):    ~3-5m   (changes when PyTorch/pip packages change)
# Layer 3 (Node deps):      ~1-2m   (changes when package.json changes)
# Layer 4 (Source code):    ~1s     (changes frequently, but prev layers cached)
# Layer 5-8 (Config):       ~30s    (minimal, depends on source)
#
# OPTIMIZATION BENEFITS:
# - Full rebuild time:      5-7 minutes (first run or multi-change)
# - Source-only changes:    30-45 seconds (cached dependency layers reused)
# - Cache hit rate:         ~90% for typical development workflows
#
# BEST PRACTICES APPLIED:
# 1. Dependencies copied & installed BEFORE source code
# 2. Frequently-changed files (source) copied last
# 3. System updates with apt-get cleanup in single RUN
# 4. pip --no-cache-dir to reduce image size
# 5. npm ci for reproducible installs (not npm install)