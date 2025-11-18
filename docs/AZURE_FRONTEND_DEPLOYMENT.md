# Angular Frontend Deployment to Azure Static Web Apps

## 🎯 Overview

This guide will help you deploy your Angular frontend to **Azure Static Web Apps** (Free tier available for students).

## ✅ Prerequisites

- Azure account (you already have this)
- Azure CLI installed (you already have this)
- GitHub repository with your frontend code
- Node.js and npm installed locally

## 📋 Step 1: Build the Angular App Locally (Test)

First, let's make sure the app builds successfully:

```bash
cd SocialMedia-Front
npm install
npm run build
```

The build output should be in `dist/nexuspost/browser/` (or similar based on your angular.json config).

## 🚀 Step 2: Create Azure Static Web App

### Option A: Using Azure Portal (Recommended for First Time)

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"Static Web App"**
4. Click **"Create"**
5. Fill in the details:
   - **Subscription**: Your student subscription
   - **Resource Group**: `nexuspost-dev-rg` (same as backend)
   - **Name**: `nexuspost-frontend-dev` (or your preferred name)
   - **Plan type**: Free
   - **Region**: Same as backend (Central India, East US, etc.)
   - **Source**: GitHub
   - **GitHub account**: Sign in and authorize
   - **Organization**: Your GitHub org/username
   - **Repository**: Your repository name
   - **Branch**: `main` (or your default branch)
   - **Build Presets**: Custom
   - **App location**: `/SocialMedia-Front` (or `/` if frontend is in root)
   - **Api location**: Leave empty (backend is separate)
   - **Output location**: `dist/nexuspost` (Angular build output)

6. Click **"Review + create"** then **"Create"**

### Option B: Using Azure CLI

```powershell
# Set variables
$resourceGroup = "nexuspost-dev-rg"
$staticWebAppName = "nexuspost-frontend-dev"
$location = "Central India"  # or East US, etc.
$repoUrl = "https://github.com/YOUR_USERNAME/YOUR_REPO"
$branch = "main"
$appLocation = "SocialMedia-Front"  # or "." if in root
$outputLocation = "dist/nexuspost"

# Create Static Web App
az staticwebapp create `
    --name $staticWebAppName `
    --resource-group $resourceGroup `
    --location $location `
    --sku Free `
    --app-location $appLocation `
    --output-location $outputLocation `
    --login-with-github
```

## 🔧 Step 3: Configure Build Settings

After creation, Azure will automatically:
1. Create a GitHub Actions workflow file
2. Set up deployment from your GitHub repo
3. Build and deploy on every push to `main`

### Verify Build Configuration

Check the generated `.github/workflows/azure-static-web-apps-*.yml` file:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_... }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "SocialMedia-Front"
          output_location: "dist/nexuspost"
```

### Manual Build Configuration

If the workflow file doesn't exist or needs updating:

1. Create `.github/workflows/azure-static-web-apps-nexuspost-frontend-dev.yml`
2. Get your deployment token from Azure Portal:
   - Go to Static Web App → **"Manage deployment token"**
   - Copy the token
3. Add it to GitHub Secrets:
   - Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN_...` (use the exact name from workflow)
   - Value: Paste the token

## 📝 Step 4: Update Angular Build Configuration

Ensure your `angular.json` has the correct output path:

```json
{
  "projects": {
    "nexuspost": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "dist/nexuspost/browser"
          }
        }
      }
    }
  }
}
```

## 🔗 Step 5: Configure API Backend URL

The frontend is already configured to use:
- **Production**: `https://nexuspost-api-dev-896.azurewebsites.net`

This is set in `src/app/config/api.config.ts`.

### For Different Environments

You can override the API URL using environment variables in the GitHub Actions workflow:

```yaml
- name: Build
  run: |
    cd SocialMedia-Front
    npm install
    npm run build
  env:
    API_BASE_URL: https://nexuspost-api-dev-896.azurewebsites.net
```

## 🚀 Step 6: Deploy

### Automatic Deployment (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Configure for Azure Static Web Apps deployment"
   git push origin main
   ```

2. **Monitor deployment:**
   - Go to GitHub → **Actions** tab
   - Watch the workflow run
   - Check Azure Portal → Static Web App → **"Deployment history"**

### Manual Deployment (Alternative)

If you need to deploy manually:

```bash
cd SocialMedia-Front
npm install
npm run build

# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy (get token from Azure Portal)
swa deploy dist/nexuspost --deployment-token YOUR_TOKEN --env production
```

## 🌐 Step 7: Access Your Deployed App

After deployment, your app will be available at:
- **URL**: `https://nexuspost-frontend-dev.azurestaticapps.net` (or your custom domain)

## 🔧 Step 8: Configure Custom Domain (Optional)

1. Go to Azure Portal → Static Web App → **"Custom domains"**
2. Click **"Add"**
3. Enter your domain name
4. Follow DNS configuration instructions

## 🐛 Troubleshooting

### Build Fails

**Issue**: Build errors in GitHub Actions
**Solution**: 
- Check build logs in GitHub Actions
- Test build locally: `npm run build`
- Verify Node.js version matches (Azure uses Node 18+)

### 404 Errors on Routes

**Issue**: Direct URL access returns 404
**Solution**: 
- Verify `staticwebapp.config.json` exists
- Check `navigationFallback` configuration
- Ensure `index.html` is in the output directory

### API Calls Fail

**Issue**: CORS errors or API not reachable
**Solution**:
- Verify backend URL in `api.config.ts`
- Check backend CORS configuration (already set to allow all)
- Test API directly: `https://nexuspost-api-dev-896.azurewebsites.net/swagger`

### Assets Not Loading

**Issue**: Images, fonts, or other assets return 404
**Solution**:
- Check `angular.json` assets configuration
- Verify files are in `src/assets` or `public` folder
- Check `staticwebapp.config.json` mimeTypes configuration

## 📊 Monitoring

- **Azure Portal**: Static Web App → **"Overview"** → View metrics
- **GitHub Actions**: Check deployment status
- **Browser DevTools**: Check network tab for API calls

## 💰 Cost

**Azure Static Web Apps Free Tier:**
- ✅ 100 GB bandwidth/month
- ✅ 100 custom domains
- ✅ SSL certificates (automatic)
- ✅ Custom authentication
- ✅ **Perfect for student projects!**

## 📚 Next Steps

1. ✅ Deploy frontend
2. ✅ Test login/register functionality
3. ✅ Test social account connection
4. ✅ Monitor usage and performance
5. ✅ Set up custom domain (optional)

## 🔗 Useful Links

- [Azure Static Web Apps Docs](https://docs.microsoft.com/azure/static-web-apps/)
- [Angular Deployment Guide](https://angular.io/guide/deployment)
- [Your Backend API](https://nexuspost-api-dev-896.azurewebsites.net/swagger)

---

**Need Help?** Check the deployment logs in Azure Portal or GitHub Actions for detailed error messages.

