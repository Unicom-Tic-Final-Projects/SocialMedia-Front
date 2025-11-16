# Deployment Fix Guide

## ✅ Issue Identified

**Problem**: Deployment fails because the GitHub Actions workflow wasn't properly configured.

**Solution**: Created the correct workflow file that:
1. ✅ Builds the Angular app during CI/CD (no need to commit `dist/`)
2. ✅ Uses correct paths matching your Azure configuration
3. ✅ Includes all necessary build steps

## 📋 What Was Fixed

### 1. Created GitHub Actions Workflow
- **File**: `.github/workflows/azure-static-web-apps-onevo.yml`
- **Location**: This file should be in your GitHub repository

### 2. Correct Configuration
- **App Location**: `SocialMedia-Front` (matches Azure Portal)
- **Output Location**: `SocialMedia-Front/dist/nexuspost`
- **Branch**: `master` (matches your repo)
- **Node Version**: 20 (compatible with Angular 20)

### 3. Build Process
The workflow now:
1. Checks out your code
2. Sets up Node.js 20
3. Installs dependencies (`npm ci`)
4. Builds the Angular app (`npm run build`)
5. Deploys to Azure Static Web Apps

## 🔑 Required Setup

### Step 1: Get Deployment Token

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Static Web App: **Onevo**
3. Click **"Manage deployment token"**
4. **Copy the token** (you'll need it in Step 2)

### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/Unicom-Tic-Final-Projects/SocialMedia-Front`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN_ONEVO`
   - ⚠️ **IMPORTANT**: Use the EXACT name from the workflow file
5. **Value**: Paste the token from Step 1
6. Click **"Add secret"**

### Step 3: Commit and Push

```bash
# Add the workflow file
git add .github/workflows/azure-static-web-apps-onevo.yml

# Commit
git commit -m "Add Azure Static Web Apps deployment workflow"

# Push to trigger deployment
git push origin master
```

## ✅ Verification

After pushing:

1. **Check GitHub Actions**:
   - Go to your repo → **Actions** tab
   - You should see a workflow run starting
   - Wait for it to complete (usually 3-5 minutes)

2. **Check Deployment**:
   - Go to Azure Portal → Static Web App → **"Deployment history"**
   - You should see a new deployment

3. **Test Your App**:
   - Visit your Static Web App URL
   - Should see your Angular app running

## 🐛 Common Issues

### Issue: "Secret not found"
**Solution**: Make sure the secret name is EXACTLY:
```
AZURE_STATIC_WEB_APPS_API_TOKEN_ONEVO
```
(Case-sensitive, no spaces)

### Issue: "Build failed"
**Solution**: 
- Check the Actions logs for specific errors
- Verify Node.js version compatibility
- Ensure `package.json` has correct build script

### Issue: "Output location not found"
**Solution**: 
- Verify the build actually creates `dist/nexuspost`
- Check if the path in workflow matches your `angular.json` output path

### Issue: "App location not found"
**Solution**:
- If your repo structure is different, update `app_location` in the workflow
- If frontend is in root, use `app_location: "/"`
- If in subfolder, use `app_location: "SocialMedia-Front"`

## 📝 Important Notes

1. **DO NOT commit `dist/` folder** - It's already in `.gitignore` ✅
2. **The workflow builds the app** - No need to build locally before pushing
3. **Deployment is automatic** - Every push to `master` triggers deployment
4. **Token is secret** - Never commit it to the repository

## 🔗 Useful Links

- [GitHub Actions Logs](https://github.com/Unicom-Tic-Final-Projects/SocialMedia-Front/actions)
- [Azure Portal](https://portal.azure.com)
- [Static Web App Documentation](https://docs.microsoft.com/azure/static-web-apps/)

---

**After completing these steps, your deployment should work!** 🚀



