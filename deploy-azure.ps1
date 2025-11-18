# Azure Static Web Apps Deployment Script
# This script helps you deploy your Angular frontend to Azure

param(
    [string]$ResourceGroup = "nexuspost-dev-rg",
    [string]$StaticWebAppName = "nexuspost-frontend-dev",
    [string]$Location = "Central India",
    [string]$AppLocation = "SocialMedia-Front",
    [string]$OutputLocation = "dist/nexuspost"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure Static Web Apps Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI is not installed!" -ForegroundColor Red
    Write-Host "Install from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Azure CLI found" -ForegroundColor Green

# Check if logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "⚠️  Not logged in to Azure. Logging in..." -ForegroundColor Yellow
    az login
}

Write-Host "✅ Logged in to Azure" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""

# Check if resource group exists
$rgExists = az group exists --name $ResourceGroup 2>$null
if ($rgExists -eq "false") {
    Write-Host "⚠️  Resource group '$ResourceGroup' does not exist." -ForegroundColor Yellow
    Write-Host "Creating resource group..." -ForegroundColor Yellow
    az group create --name $ResourceGroup --location $Location
    Write-Host "✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✅ Resource group exists: $ResourceGroup" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Deployment Options:" -ForegroundColor Cyan
Write-Host "1. Create Static Web App via Portal (Recommended)" -ForegroundColor White
Write-Host "   → https://portal.azure.com" -ForegroundColor Gray
Write-Host "   → Create resource → Static Web App" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Create via Azure CLI (requires GitHub connection)" -ForegroundColor White
Write-Host "   → Run: az staticwebapp create --name $StaticWebAppName --resource-group $ResourceGroup --location $Location --sku Free --login-with-github" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Manual deployment (after Static Web App is created)" -ForegroundColor White
Write-Host "   → Build: npm run build" -ForegroundColor Gray
Write-Host "   → Deploy: swa deploy $OutputLocation --deployment-token YOUR_TOKEN" -ForegroundColor Gray
Write-Host ""

Write-Host "📝 Configuration:" -ForegroundColor Cyan
Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "   Static Web App Name: $StaticWebAppName" -ForegroundColor White
Write-Host "   Location: $Location" -ForegroundColor White
Write-Host "   App Location: $AppLocation" -ForegroundColor White
Write-Host "   Output Location: $OutputLocation" -ForegroundColor White
Write-Host ""

Write-Host "📚 See docs/AZURE_FRONTEND_DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""

# Check if build output exists
if (Test-Path $OutputLocation) {
    Write-Host "✅ Build output found at: $OutputLocation" -ForegroundColor Green
} else {
    Write-Host "⚠️  Build output not found. Run 'npm run build' first." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Ready to deploy!" -ForegroundColor Green

