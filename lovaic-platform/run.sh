#!/usr/bin/env bash
# Start the LOVAIC platform: FastAPI CV backend + Next.js frontend.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Starting backend (port 8000)…"
cd "$ROOT/backend"
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install -q -r requirements.txt
./venv/bin/uvicorn main:app --port 8000 &
BACK_PID=$!

echo "▶ Starting frontend (port 3000)…"
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
npm run dev &
FRONT_PID=$!

trap "echo '⏹ stopping…'; kill $BACK_PID $FRONT_PID 2>/dev/null" INT TERM
echo "✔ LOVAIC up → http://localhost:3000  (API: http://localhost:8000)"
wait
