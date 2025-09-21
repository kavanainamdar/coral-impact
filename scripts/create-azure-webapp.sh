#!/bin/bash
set -euo pipefail

# Resolve script directory and project root so the script can be run from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR%/scripts}"
if [ ! -f "$ROOT_DIR/package.json" ]; then
  echo "[azure] ERROR: Could not locate project root (missing package.json). Abort." >&2
  exit 1
fi
cd "$ROOT_DIR"
echo "[azure] Working directory: $(pwd)"

# Variables (override via env or edit here)
: "${AZ_RESOURCE_GROUP:=coral-impact-rg}"
: "${AZ_REGION:=westus2}"
: "${AZ_PLAN:=coral-impact-plan}"
: "${AZ_WEBAPP:=coral-impact-webapp}"

echo "[azure] Ensuring Azure CLI login (browser preferred, device code fallback)"
if ! az account show >/dev/null 2>&1; then
  # Detect WSL for better browser handling
  IS_WSL=0
  grep -qi 'microsoft' /proc/version 2>/dev/null && IS_WSL=1 || true

  if [ "$IS_WSL" -eq 1 ]; then
    echo "[azure] Detected WSL environment. Attempting browser login via wslview/explorer.exe."
    if command -v wslview >/dev/null 2>&1; then
      export BROWSER=wslview
    elif command -v explorer.exe >/dev/null 2>&1; then
      # azure cli will launch default browser via Windows shell
      export BROWSER=explorer.exe
    fi
  fi

  if az login >/dev/null 2>&1; then
    echo "[azure] Logged in via interactive browser.";
  else
    echo "[azure] Browser login not available or failed. Use the device code flow instead.";
    az login --use-device-code || { echo "[azure] ERROR: az login failed"; exit 1; }
  fi
fi

echo "[azure] Creating resource group: $AZ_RESOURCE_GROUP ($AZ_REGION)"
az group create --name "$AZ_RESOURCE_GROUP" --location "$AZ_REGION" >/dev/null

echo "[azure] Creating App Service plan: $AZ_PLAN"
az appservice plan create --name "$AZ_PLAN" --resource-group "$AZ_RESOURCE_GROUP" --sku FREE --is-linux >/dev/null

echo "[azure] Creating Web App: $AZ_WEBAPP"
az webapp create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --plan "$AZ_PLAN" \
  --name "$AZ_WEBAPP" \
  --runtime "NODE:20-lts" >/dev/null

echo "[azure] Building app locally (at $ROOT_DIR)"
npm install
npm run build

echo "[azure] Verifying 'zip' utility is available"
if ! command -v zip >/dev/null 2>&1; then
  echo "[azure] 'zip' not found. Attempting to install (Ubuntu/Debian only).";
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y zip || { echo "[azure] ERROR: Failed to install zip"; exit 1; }
  else
    echo "[azure] ERROR: zip utility missing. Please install it and re-run."; exit 1;
  fi
fi

echo "[azure] Preparing deployment zip (including startup.sh)"
if [ ! -d dist ]; then
  echo "[azure] ERROR: dist/ directory not found after build. Abort." >&2
  exit 2
fi
if [ ! -f startup.sh ]; then
  echo "[azure] WARNING: startup.sh missing in root; continuing but startup command may fail." >&2
fi
zip -r site.zip dist startup.sh >/dev/null || { code=$?; echo "[azure] ERROR: zip failed (exit $code)." >&2; exit $code; }
echo "[azure] Created site.zip ($(du -h site.zip | cut -f1))"

echo "[azure] Deploying site.zip"
az webapp deploy --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_WEBAPP" --src-path site.zip --type zip

echo "[azure] Configuring startup command (serve static via npx serve)"
az webapp config set --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_WEBAPP" --startup-file "startup.sh"

echo "[azure] Cleaning up temporary artifacts"
rm -f site.zip

echo "[azure] Done. Visit: https://$AZ_WEBAPP.azurewebsites.net/"
