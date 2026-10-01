#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=== Starting PakWheels Market Intelligence & Analytics App ==="

# Trap Ctrl+C to kill child processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Backend
echo "Starting FastAPI Backend on http://127.0.0.1:8000..."
cd "$DIR/backend"
"$DIR/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:8000/api/health >/dev/null; then
        echo "Backend is ready!"
        break
    fi
    sleep 0.5
done

# Start Frontend
echo "Starting Vite Frontend on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "=================================================================="
echo "  PakWheels Market Intelligence Web App is running!"
echo "  Web UI: http://localhost:5173"
echo "  Backend API: http://127.0.0.1:8000/docs"
echo "=================================================================="
echo "Press Ctrl+C to stop all servers."

wait
