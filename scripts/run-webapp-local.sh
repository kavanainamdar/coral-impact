#!/bin/bash
set -euo pipefail

if [ ! -d dist ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
  echo "[local] No dist/ found. Building first..."
  npm install
  npm run build
fi

echo "[local] Serving dist/ on http://localhost:4173 (vite preview)"
npm run preview
