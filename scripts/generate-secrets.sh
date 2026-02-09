#!/bin/bash

# ============================================================================
# Secret File Generator for Docker Secrets
# Generates secure random secrets for the backend
# ============================================================================

set -e  # Exit on error

echo "🔐 Generating Docker Secrets for Plant Health Backend..."
echo ""

SECRETS_DIR="./secrets"

# Create secrets directory if it doesn't exist
if [ ! -d "$SECRETS_DIR" ]; then
    echo "📁 Creating secrets directory: $SECRETS_DIR"
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"  # Only owner can access
fi

# Function to generate a secret and save it to file
generate_secret() {
    local secret_name=$1
    local secret_file="$SECRETS_DIR/${secret_name}.txt"
    
    if [ -f "$secret_file" ]; then
        echo "⚠️  Secret already exists: $secret_file (skipping)"
        return
    fi
    
    echo "🔑 Generating: $secret_name"
    
    # Generate 64-byte random hex string (256-bit security)
    openssl rand -hex 32 > "$secret_file"
    
    # Set restrictive permissions (owner read/write only)
    chmod 600 "$secret_file"
    
    echo "✅ Generated: $secret_file"
}

# Generate all required secrets
generate_secret "jwt_access_secret"
generate_secret "jwt_refresh_secret"
generate_secret "redis_password"

echo ""
echo "✅ All secrets generated successfully!"
echo ""
echo "📋 Created files:"
ls -lh "$SECRETS_DIR"/*.txt 2>/dev/null || echo "No secret files found"
echo ""
echo "⚠️  IMPORTANT:"
echo "  • These files should NOT be committed to Git"
echo "  • Ensure .gitignore includes ./secrets/"
echo "  • Keep file permissions restrictive (chmod 600)"
echo "  • In production, use Docker Swarm Secrets or Kubernetes"
echo ""
echo "🚀 Ready to start: docker-compose up --build"
