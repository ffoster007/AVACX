#!/usr/bin/env bash
set -euo pipefail

# Simple installer script for the vulture CLI
# Usage: ./scripts/install.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Building vulture..."
go build -o vulture ./cmd

echo "Installing to /usr/local/bin (sudo may be required)..."
sudo mv vulture /usr/local/bin/
sudo chmod +x /usr/local/bin/vulture

echo "Installed /usr/local/bin/vulture"
