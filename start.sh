#!/bin/bash

# Kill all leftover sessions from previous runs
echo "🧹 Cleaning up previous sessions..."
pkill -f "uvicorn" 2>/dev/null
pkill -f "convex dev" 2>/dev/null
pkill -f "expo start" 2>/dev/null
pkill -f "ngrok http" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null
sleep 1

cleanup() {
  echo -e "\n🛑 Shutting down..."
  kill $BACKEND_PID $NGROK_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

# Write CONVEX_DEPLOYMENT and EXPO_PUBLIC_CONVEX_URL to .env.local
CONVEX_SLUG=$(grep -E '^EXPO_PUBLIC_CONVEX_URL=' mobile/.env | sed 's|.*https://||;s|\.convex\.cloud.*||;s/"//g')
CONVEX_URL=$(grep -E '^EXPO_PUBLIC_CONVEX_URL=' mobile/.env | sed 's/EXPO_PUBLIC_CONVEX_URL=//;s/"//g')
CONVEX_ENV_LOCAL="mobile/.env.local"
[ ! -f "$CONVEX_ENV_LOCAL" ] && touch "$CONVEX_ENV_LOCAL"
grep -q 'CONVEX_DEPLOYMENT'      "$CONVEX_ENV_LOCAL" || echo "CONVEX_DEPLOYMENT=prod:$CONVEX_SLUG"    >> "$CONVEX_ENV_LOCAL"
grep -q 'EXPO_PUBLIC_CONVEX_URL' "$CONVEX_ENV_LOCAL" || echo "EXPO_PUBLIC_CONVEX_URL=\"$CONVEX_URL\"" >> "$CONVEX_ENV_LOCAL"

# Ensure ngrok v3 is installed
NGROK_BIN=/opt/homebrew/bin/ngrok
NGROK_MAJOR=$("$NGROK_BIN" --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ "${NGROK_MAJOR:-0}" -lt 3 ]; then
  echo "📦 Installing ngrok v3 (one-time setup)..."
  brew uninstall --cask ngrok 2>/dev/null
  brew install ngrok/ngrok/ngrok
  NGROK_BIN=$(which ngrok)
fi

# Start ngrok tunnel for the backend API
echo "🌐 Starting ngrok tunnel..."
NGROK_LOG=/tmp/ngrok-api.log
> "$NGROK_LOG"
"$NGROK_BIN" http 8000 --log stdout --log-format json > "$NGROK_LOG" 2>&1 &
NGROK_PID=$!

# Read API URL from ngrok log
echo "⏳ Waiting for ngrok tunnel..."
API_URL=""
for i in {1..30}; do
  sleep 1
  API_URL=$(grep -o '"url":"https://[^"]*"' "$NGROK_LOG" 2>/dev/null | head -1 | sed 's/"url":"//;s/"//')
  [ -n "$API_URL" ] && break
done

if [ -z "$API_URL" ]; then
  echo "❌ Tunnel failed. Ngrok log:"
  cat "$NGROK_LOG"
  exit 1
fi

echo "✅ API tunnel: $API_URL"

# Inject backend URL into backend/.env
sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=\"$API_URL\"|" backend/.env

# Start backend
echo "🚀 Starting backend..."
(cd backend && bash dev.sh) &
BACKEND_PID=$!

# Start Expo in foreground so keyboard shortcuts (a/i/r/etc.) work
echo "📱 Starting mobile..."
cd mobile
[ ! -d node_modules ] && npm install
npx expo start -c
