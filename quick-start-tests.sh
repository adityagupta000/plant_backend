#!/bin/bash

# Plant Health Backend - Jest Test Suite Quick Start
# This script sets up and runs the test suite

set -e

echo "=============================================="
echo "  Plant Health Backend - Jest Test Suite"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the backend root directory${NC}"
    exit 1
fi

# Step 1: Install backend dependencies
echo -e "${YELLOW}Step 1: Installing backend dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Step 2: Install test dependencies
echo -e "${YELLOW}Step 2: Installing test dependencies...${NC}"
cd tests
npm install
echo -e "${GREEN}✓ Test dependencies installed${NC}"
echo ""

# Step 3: Check for test image
echo -e "${YELLOW}Step 3: Checking for test image...${NC}"
cd ..
if [ ! -f "test-data/test-plant.jpg" ]; then
    echo -e "${YELLOW}⚠️  Test image not found at test-data/test-plant.jpg${NC}"
    echo "   Some prediction tests will be skipped."
    echo "   To add a test image:"
    echo "   1. Create directory: mkdir -p test-data"
    echo "   2. Copy plant image: cp /path/to/plant.jpg test-data/test-plant.jpg"
else
    echo -e "${GREEN}✓ Test image found${NC}"
fi
echo ""

# Step 4: Check if backend is running
echo -e "${YELLOW}Step 4: Checking if backend is running...${NC}"
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Backend is not running${NC}"
    echo "   Please start the backend in another terminal:"
    echo "   npm start"
    echo ""
    read -p "Press Enter when backend is running..."
fi
echo ""

# Step 5: Run tests
echo -e "${YELLOW}Step 5: Running tests...${NC}"
echo ""
cd tests
npm test

echo ""
echo "=============================================="
echo -e "${GREEN}  Test suite execution complete!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  - View coverage: open tests/coverage/lcov-report/index.html"
echo "  - View test report: open tests/reports/test-report.html"
echo "  - Run specific tests: cd tests && npm run test:unit"
echo "  - Watch mode: cd tests && npm run test:watch"
echo ""