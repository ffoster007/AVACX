$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\webapp"

if (-Not (Test-Path ".env")) {
  Write-Host "Error: .env file not found" -ForegroundColor Red
  Write-Host "Please copy .env.example and fill in the required values:" -ForegroundColor Yellow
  Write-Host "  copy webapp\.env.example webapp\.env" -ForegroundColor Yellow
  exit 1
}

npm install
npx prisma generate
npm run dev