#!/usr/bin/env bash
# Start both server and client in separate terminal windows.
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Ensure dependencies are installed
if [ ! -d "$ROOT/server/node_modules" ]; then
  echo "Installing server dependencies..."
  (cd "$ROOT/server" && npm install)
fi
if [ ! -d "$ROOT/client/node_modules" ]; then
  echo "Installing client dependencies..."
  (cd "$ROOT/client" && npm install)
fi

# Open terminal for server
echo "Starting server..."
x-terminal-emulator -w "$ROOT/server" &

# Small delay so windows don't overlap identically
sleep 0.5

# Open terminal for client
echo "Starting client..."
x-terminal-emulator -w "$ROOT/client" &

echo ""
echo "=== Both terminals opened ==="
echo "In each window, run: npm run dev"
echo ""
echo "Server → http://localhost:8080"
echo "Client → http://localhost:5173"
