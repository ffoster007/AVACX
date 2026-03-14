#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/webapp" || { echo "ไม่พบ folder webapp"; exit 1; }

if [ ! -f ".env" ]; then
  echo "ไม่พบไฟล์ .env — กรุณา copy จาก .env.example แล้วใส่ค่าให้ครบ"
  echo "  cp webapp/.env.example webapp/.env"
  exit 1
fi

npm install
npm run dev