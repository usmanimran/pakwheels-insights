#!/bin/bash
echo "==================================================="
echo "  PakWheels Market Intelligence - Live Web Sharing "
echo "==================================================="
echo ""

# Ensure backend server is running on port 8000
if ! curl -s http://localhost:8000/api/catalog > /dev/null; then
    echo "Starting backend server on port 8000..."
    cd "$(dirname "$0")/backend"
    ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
    sleep 2
fi

echo "Creating secure public HTTPS URL (No credit card needed)..."
echo ""
echo "Press Ctrl+C anytime to stop sharing."
echo "---------------------------------------------------"
npx -y localtunnel --port 8000
