#!/bin/bash

# Plant Health Backend - AWS Deployment Script (Bash)
# This script automates EC2 instance setup with all dependencies

set -e  # Exit on error

echo "🚀 Starting Plant Health Backend AWS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Update system
print_status "Updating system packages..."
sudo yum update -y > /dev/null 2>&1
print_success "System updated"

# Step 2: Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - > /dev/null 2>&1
sudo yum install -y nodejs > /dev/null 2>&1
print_success "Node.js $(node --version) installed"

# Step 3: Install Python 3.10
print_status "Installing Python 3.10..."
sudo yum install -y python3.10 python3-pip > /dev/null 2>&1
print_success "Python $(python3.10 --version) installed"

# Step 4: Install Docker
print_status "Installing Docker..."
sudo yum install -y docker > /dev/null 2>&1
sudo systemctl start docker
sudo usermod -a -G docker ec2-user
print_success "Docker installed"

# Step 5: Install Git
print_status "Installing Git..."
sudo yum install -y git > /dev/null 2>&1
print_success "Git installed"

# Step 6: Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2 > /dev/null 2>&1
print_success "PM2 installed"

# Step 7: Clone repository
print_status "Cloning backend repository..."
if [ ! -d "plant_backend" ]; then
    git clone https://github.com/adityagupta000/plant_backend.git
    print_success "Repository cloned"
else
    print_status "Repository already exists, pulling latest changes..."
    cd plant_backend && git pull && cd ..
fi

# Step 8: Install dependencies
print_status "Installing Node.js dependencies..."
cd plant_backend
npm install > /dev/null 2>&1
print_success "Node.js dependencies installed"

# Step 9: Install Python dependencies
print_status "Installing Python dependencies..."
cd ai
pip3 install -r requirements.txt > /dev/null 2>&1
cd ..
print_success "Python dependencies installed"

# Step 10: Create .env file
print_status "Creating .env file (you must update with your AWS resource details)..."

cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database Configuration
DB_DIALECT=postgres
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=plant_health
DB_USER=admin
DB_PASSWORD=YOUR_SECURE_PASSWORD

# Redis Configuration
REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
REDIS_PORT=6379
USE_REDIS=true

# JWT Secrets - CHANGE THESE IMMEDIATELY!
JWT_ACCESS_SECRET=this-is-not-secure-change-immediately-123456
JWT_REFRESH_SECRET=this-is-not-secure-change-immediately-789012
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AI Model Configuration
AI_POOL_SIZE=2
AI_TIMEOUT=30000
MODEL_PATH=./ai/saved_models/best_model.encrypted
MODEL_KEY_PATH=./ai/secrets/model.key

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/jpg

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
GUEST_RATE_LIMIT_WINDOW_MS=3600000
GUEST_RATE_LIMIT_MAX_REQUESTS=10
EOF

print_success ".env file created"

# Step 11: Create directories
print_status "Creating required directories..."
mkdir -p data uploads logs ai/saved_models ai/secrets
print_success "Directories created"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo ""
echo "1. ${BLUE}Update .env file with AWS resources:${NC}"
echo "   - DB_HOST: Your RDS endpoint"
echo "   - REDIS_HOST: Your ElastiCache endpoint"
echo "   - Change JWT secrets to secure values"
echo ""
echo "2. ${BLUE}Transfer model files to EC2:${NC}"
echo "   From your local machine (in backend directory):"
echo "   scp -i plant-health-key.pem -r ./ai/saved_models ec2-user@YOUR_IP:~/plant_backend/ai/"
echo "   scp -i plant-health-key.pem -r ./ai/secrets ec2-user@YOUR_IP:~/plant_backend/ai/"
echo ""
echo "3. ${BLUE}Initialize database:${NC}"
echo "   cd ~/plant_backend"
echo "   npm run db:init"
echo ""
echo "4. ${BLUE}Start application with PM2:${NC}"
echo "   pm2 start src/server.js --name 'plant-health'"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. ${BLUE}Verify it's running:${NC}"
echo "   curl http://localhost:5000/health"
echo ""
echo -e "${GREEN}For more details, see: docs/AWS_DEPLOYMENT.md${NC}"
echo ""
