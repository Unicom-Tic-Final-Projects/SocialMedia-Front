# Frontend-Backend Connection Guide

## ✅ Configuration Complete

The frontend is now configured to connect to the Azure backend at:
**https://nexuspost-api-dev-896.azurewebsites.net**

## 📝 Changes Made

### 1. API Configuration (`src/app/config/api.config.ts`)
- Updated default API URL to Azure backend
- Supports runtime override via `window.ENV.API_BASE_URL`

### 2. Index.html (`src/index.html`)
- Added runtime environment configuration script
- Allows easy switching between local and Azure backend

## 🔧 How to Switch Between Environments

### Use Azure Backend (Production - Default)
The frontend is already configured to use Azure. No changes needed.

### Use Local Backend (Development)
If you want to test with local backend:

**Option 1: Edit `api.config.ts`**
```typescript
// Comment out Azure URL
// 'https://nexuspost-api-dev-896.azurewebsites.net';

// Uncomment local URL
'http://localhost:5000';
```

**Option 2: Runtime Override (in `index.html`)**
```html
<script>
  window.ENV = window.ENV || {};
  window.ENV.API_BASE_URL = 'http://localhost:5000';
</script>
```

## 🚀 Testing the Connection

1. **Start the frontend:**
   ```bash
   cd SocialMedia-Front
   npm start
   # or
   ng serve
   ```

2. **Open browser:** http://localhost:4200

3. **Test API connection:**
   - Try logging in/registering
   - Check browser console for API calls
   - Verify requests go to: `https://nexuspost-api-dev-896.azurewebsites.net`

## 🔍 Verify Backend is Running

Check backend status:
- **Backend URL:** https://nexuspost-api-dev-896.azurewebsites.net/
- **Swagger UI:** https://nexuspost-api-dev-896.azurewebsites.net/swagger

## 📋 CORS Configuration

The backend is configured to allow all origins (for development):
- ✅ Allows any origin
- ✅ Allows any method (GET, POST, PUT, DELETE, etc.)
- ✅ Allows any header

## 🐛 Troubleshooting

### Issue: CORS Errors
- **Solution:** Backend CORS is already configured. If you see errors, check:
  1. Backend is running and accessible
  2. Frontend is making requests to correct URL
  3. Browser console for specific error messages

### Issue: 404 Not Found
- **Solution:** Check that:
  1. Backend is deployed and running
  2. API endpoints match (e.g., `/api/auth/login`)
  3. Swagger UI shows all endpoints

### Issue: Connection Refused
- **Solution:** 
  1. Verify backend URL is correct
  2. Check Azure App Service is running
  3. Check network connectivity

## 📱 Next Steps

1. **Test Authentication:**
   - Register a new user
   - Login with credentials
   - Verify JWT token is stored

2. **Test API Endpoints:**
   - Social accounts
   - Posts
   - Content management

3. **Deploy Frontend (Optional):**
   - Consider deploying to Azure Static Web Apps
   - Or use any static hosting service

## 🔐 Security Notes

For production:
- Consider restricting CORS to specific origins
- Use environment variables for API URLs
- Enable HTTPS only
- Review JWT token expiration settings

