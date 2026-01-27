#!/bin/bash
#
# Optimized Baseline Test Runner
# Starts all required services and runs the load test
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
echo -e "${BLUE}  Watchwyrd Optimized Baseline Load Test${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"
  
  # Kill mock server
  if [ ! -z "$MOCK_SERVER_PID" ]; then
    echo "Stopping mock server (PID: $MOCK_SERVER_PID)"
    kill $MOCK_SERVER_PID 2>/dev/null || true
  fi
  
  # Kill Watchwyrd server
  if [ ! -z "$WATCHWYRD_PID" ]; then
    echo "Stopping Watchwyrd server (PID: $WATCHWYRD_PID)"
    kill $WATCHWYRD_PID 2>/dev/null || true
  fi
  
  # Kill any remaining processes on ports
  lsof -ti:$MOCK_SERVER_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$WATCHWYRD_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Step 1: Start Mock Server
echo -e "${YELLOW}[1/4] Starting mock API server on port $MOCK_SERVER_PORT...${NC}"
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

# Step 2: Start Watchwyrd Server
echo -e "${YELLOW}[2/4] Starting Watchwyrd server on port $WATCHWYRD_PORT...${NC}"
MOCK_MODE=true SECRET_KEY=$SECRET_KEY node dist/index.js > watchwyrd-server.log 2>&1 &
WATCHWYRD_PID=$!
echo "Watchwyrd server PID: $WATCHWYRD_PID"

# Wait for Watchwyrd to be ready
sleep 3
if ! lsof -ti:$WATCHWYRD_PORT > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Watchwyrd server failed to start${NC}"
  cat watchwyrd-server.log
  exit 1
fi
echo -e "${GREEN}✓ Watchwyrd server started${NC}\n"

# Step 3: Verify HTTP Interception
echo -e "${YELLOW}[3/4] Verifying HTTP request interception...${NC}"
if ! MOCK_MODE=true SECRET_KEY=$SECRET_KEY node tests/load/test-interception.js; then
  echo -e "${RED}ERROR: HTTP interception verification failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ HTTP interception verified (zero external requests)${NC}\n"

# Step 4: Run Baseline Test
echo -e "${YELLOW}[4/4] Running baseline load test...${NC}"
echo -e "  Concurrent users: 200"
echo -e "  Ramp-up: 30s | Sustained: 120s | Ramp-down: 15s"
echo -e "  Total duration: ~165 seconds\n"

MOCK_MODE=true SECRET_KEY=$SECRET_KEY node tests/load/baseline-test.js

# Test completed
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  Test Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\nResults saved to: ${BLUE}BASELINE_RESULTS.md${NC}"
echo -e "Server logs:"
echo -e "  - Mock server: ${BLUE}mock-server.log${NC}"
echo -e "  - Watchwyrd: ${BLUE}watchwyrd-server.log${NC}"
