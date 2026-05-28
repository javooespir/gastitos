# Script de inicio de Gastitos
# Ejecutar con: .\start.ps1

Write-Host "Iniciando Gastitos..." -ForegroundColor Cyan

# Verificar si el backend fue instalado
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Instalando dependencias del backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    npx prisma generate
    npx prisma db push
    Set-Location ..
}

# Verificar si el frontend fue instalado
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Instalando dependencias del frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "Iniciando backend en puerto 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Iniciando frontend en puerto 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "App corriendo en: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API corriendo en: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: Edita backend/.env con tu CLAUDE_API_KEY para usar el asesor IA" -ForegroundColor Yellow
