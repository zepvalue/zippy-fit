if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}
Write-Host "Starting Mobile App..."
npx expo start
