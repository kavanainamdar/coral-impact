#!/bin/bash
set -euo pipefail

echo "[build] Installing dependencies"
npm install
echo "[build] Building production bundle"
npm run build
echo "[build] Output in dist/"
