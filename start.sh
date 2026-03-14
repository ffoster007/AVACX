#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/webapp" || { echo "Error: folder 'webapp' not found"; exit 1; }

if [ ! -f ".env" ]; then
  echo "Error: .env file not found"
  echo "Please copy .env.example and fill in the required values:"
  echo "  cp webapp/.env.example webapp/.env"
  exit 1
fi

npm install
npm run dev