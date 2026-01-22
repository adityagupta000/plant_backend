# ============================================================================
# Multi-stage Dockerfile for Plant Health Detection Backend
# Stage 1: Python AI Environment
# Stage 2: Node.js Application
# ============================================================================

# ============================================================================
# Stage 1: Build Python AI Environment
# ============================================================================
FROM python:3.10-slim as python-builder

# Set working directory
WORKDIR /app/ai

# Install system dependencies for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY ai/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 2: Final Production Image
# ============================================================================
FROM node:18-slim

ENV NODE_ENV=production

# Install Python runtime and system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/ai/saved_models \
    /app/ai/secrets \
    /app/uploads \
    /app/logs \
    /app/temp_pdfs

# Copy Python packages from builder
COPY --from=python-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages

# Copy package files
COPY package*.json ./

# Install Node.js dependencies (production only)
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY ai/*.py ./ai/

# Copy AI model and secrets (these should be provided via volumes in production)
COPY ai/saved_models/ ./ai/saved_models/
COPY ai/secrets/ ./ai/secrets/

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "src/server.js"]