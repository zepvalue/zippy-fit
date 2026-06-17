#!/bin/bash

# 1. Path to Python (Note: Linux/Mac uses 'bin', not 'Scripts')
PYTHON="./.venv/bin/python"

# 2. Check if Venv exists
if [ ! -f "$PYTHON" ]; then
    echo "❌ .venv not found! Run: python3 -m venv .venv"
    exit 1
fi

# 3. Start Convex in the background BEFORE the Python server
echo -e "\033[0;35m☁️ Starting Convex Database connection...\033[0m"
(cd ../mobile && npx convex dev) &
CONVEX_PID=$!

# Trap Ctrl+C (SIGINT) to cleanly shut down both servers
trap 'echo -e "\n\033[0;31m🛑 Shutting down servers...\033[0m"; kill $CONVEX_PID; exit' SIGINT

# 4. Run Uvicorn
# We use ANSI escape codes for Cyan color output
echo -e "\033[0;36m🚀 Starting Brain...\033[0m"

# Execute uvicorn using the specific venv python
"$PYTHON" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000