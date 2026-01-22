#!/bin/bash
# ============================================================================
# Docker Entrypoint Script
# Initializes the application before starting
# ============================================================================

set -e

echo "=========================================="
echo "Plant Health Detection Backend"
echo "=========================================="
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "=========================================="

# Ensure directories exist
mkdir -p /app/data /app/uploads /app/logs /app/temp_pdfs

# Check if database needs initialization
if [ ! -f "/app/data/database.sqlite" ]; then
    echo "🔧 Database not found. It will be created on first start."
fi

# Check if model exists
if [ ! -f "/app/ai/saved_models/best_model.encrypted" ]; then
    echo "⚠️  WARNING: Encrypted model not found!"
    echo "   Expected: /app/ai/saved_models/best_model.encrypted"
fi

# Check if model key exists
if [ ! -f "/app/ai/secrets/model.key" ]; then
    echo "⚠️  WARNING: Model encryption key not found!"
    echo "   Expected: /app/ai/secrets/model.key"
fi

# Verify Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python 3 not found!"
    exit 1
fi

echo "✅ Python version: $(python3 --version)"

# Verify Node is available
echo "✅ Node version: $(node --version)"

# Test Python AI dependencies
echo "🔍 Checking Python dependencies..."
python3 -c "import torch; import cv2; import timm; print('✅ All Python packages available')" || {
    echo "❌ ERROR: Python dependencies missing!"
    exit 1
}

echo "=========================================="
echo "🚀 Starting application..."
echo "=========================================="

# Execute the main command
exec "$@"