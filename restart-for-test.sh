#!/usr/bin/env bash
# Clean restart of Watchwyrd for load testing

echo "🧹 Cleaning up old processes..."
# Find and kill only Watchwyrd server processes (not the AI/OpenCode)
lsof -ti:7000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:8888 2>/dev/null | xargs kill -9 2>/dev/null || true

sleep 2

echo "🚀 Starting mock server..."
node tests/load/mock-server.js > /tmp/mock-server.log 2>&1 &
sleep 2

echo "🚀 Starting Watchwyrd with workers..."
cp .env.load-test .env
MOCK_MODE=true node dist/index.js > /tmp/watchwyrd.log 2>&1 &
sleep 6

echo "✅ Checking services..."
curl -s http://localhost:8888/health && echo ""
curl -s http://localhost:7000/health && echo ""

echo "📊 Worker count:"
grep "Worker pool initialized" /tmp/watchwyrd.log | tail -1

echo ""
echo "Ready to run: cd tests/load && MOCK_MODE=true SECRET_KEY=watchwyrd-load-test-secret-key-12345678 node baseline-test.js"
