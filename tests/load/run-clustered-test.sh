#!/bin/bash
#
# Clustered Baseline Test Runner (PM2)
# Tests performance with multi-core clustering enabled
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MOCK_SERVER_PORT=8888
WATCHWYRD_PORT=7000
SECRET_KEY="test-secret-key"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Watchwyrd Clustered Baseline Test (PM2)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"
  
  # Stop PM2 apps
  pm2 delete watchwyrd 2>/dev/null || true
  
  # Kill mock server
  if [ ! -z "$MOCK_SERVER_PID" ]; then
    echo "Stopping mock server (PID: $MOCK_SERVER_PID)"
    kill $MOCK_SERVER_PID 2>/dev/null || true
  fi
  
  # Kill any remaining processes on ports
  lsof -ti:$MOCK_SERVER_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$WATCHWYRD_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Step 1: Start Mock Server
echo -e "${YELLOW}[1/5] Starting mock API server on port $MOCK_SERVER_PORT...${NC}"
node tests/load/mock-server.js > mock-server.log 2>&1 &
MOCK_SERVER_PID=$!
echo "Mock server PID: $MOCK_SERVER_PID"

# Wait for mock server to be ready
sleep 2
if ! lsof -ti:$MOCK_SERVER_PORT > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Mock server failed to start${NC}"
  cat mock-server.log
  exit 1
fi
echo -e "${GREEN}✓ Mock server started${NC}\n"

# Step 2: Start Watchwyrd with PM2 Clustering
echo -e "${YELLOW}[2/5] Starting Watchwyrd with PM2 clustering...${NC}"
pm2 start ecosystem.config.js --env load_test --update-env

# Wait for PM2 cluster to be ready
sleep 4
if ! lsof -ti:$WATCHWYRD_PORT > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Watchwyrd cluster failed to start${NC}"
  pm2 logs --nostream
  exit 1
fi

# Show PM2 status
echo -e "${GREEN}✓ Watchwyrd cluster started${NC}"
pm2 status
echo ""

# Step 3: Verify HTTP Interception
echo -e "${YELLOW}[3/5] Verifying HTTP request interception...${NC}"
if ! MOCK_MODE=true SECRET_KEY=$SECRET_KEY node tests/load/test-interception.js; then
  echo -e "${RED}ERROR: HTTP interception verification failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ HTTP interception verified (zero external requests)${NC}\n"

# Step 4: Show Cluster Info
echo -e "${YELLOW}[4/5] Cluster Information:${NC}"
CPU_CORES=$(node -e "console.log(require('os').cpus().length)")
TOTAL_MEMORY=$(node -e "console.log((require('os').totalmem() / (1024**3)).toFixed(2))")
echo -e "  CPU Cores: ${BLUE}${CPU_CORES}${NC}"
echo -e "  Total Memory: ${BLUE}${TOTAL_MEMORY} GB${NC}"
echo -e "  PM2 Instances: ${BLUE}$(pm2 list | grep -c watchwyrd || echo 1)${NC}"
echo ""

# Step 5: Run Baseline Test
echo -e "${YELLOW}[5/5] Running baseline load test...${NC}"
echo -e "  Concurrent users: 200"
echo -e "  Ramp-up: 30s | Sustained: 120s | Ramp-down: 15s"
echo -e "  Total duration: ~165 seconds\n"

MOCK_MODE=true SECRET_KEY=$SECRET_KEY node tests/load/baseline-test.js

# Test completed
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  Test Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\nResults:"
echo -e "  - Test results: ${BLUE}BASELINE_RESULTS.md${NC}"
echo -e "  - Server logs: ${BLUE}pm2 logs watchwyrd${NC}"
echo -e "  - Mock server: ${BLUE}mock-server.log${NC}"
echo ""
echo -e "PM2 Management:"
echo -e "  - View logs: ${BLUE}pm2 logs watchwyrd${NC}"
echo -e "  - View status: ${BLUE}pm2 status${NC}"
echo -e "  - Stop cluster: ${BLUE}pm2 delete watchwyrd${NC}"
