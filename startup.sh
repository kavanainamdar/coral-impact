#!/bin/bash
# Startup script for Azure Web App to serve static Vite build
# Assumes build output already present in dist/

# If dist is empty, attempt a build (fallback safety)
if [ ! -d dist ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
  echo "[startup] dist/ empty - running npm install && npm run build"
  npm install --production=false
  npm run build
fi

# Serve static files with a lightweight node server using 'serve' if available, else python
if command -v npx >/dev/null 2>&1; then
  echo "[startup] Using npx serve to host dist on port $PORT"
  exec npx serve -s dist -l ${PORT:-8080}
else
  echo "[startup] Falling back to Python http.server on port $PORT"
  cd dist
  python3 -m http.server ${PORT:-8080}
fi
