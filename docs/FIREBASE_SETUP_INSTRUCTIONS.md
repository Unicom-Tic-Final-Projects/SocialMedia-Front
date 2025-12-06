# Firebase Cloud Messaging Setup Instructions

## ✅ Implementation Complete

Firebase Cloud Messaging has been successfully integrated into your Angular application. Here's what was implemented:

### Files Created/Modified

1. **`src/app/config/firebase.config.ts`** - Firebase configuration with your project credentials
2. **`src/app/core/services/firebase.service.ts`** - Firebase service for push notifications
3. **`public/firebase-messaging-sw.js`** - Service worker for background notifications
4. **`src/app/app.ts`** - Updated to initialize Firebase
5. **`src/app/core/services/auth.service.ts`** - Updated to register FCM tokens after login

## 🔧 Next Steps: Get VAPID Key

### Step 1: Get VAPID Key from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **onevo-4ea2d**
3. Click the **Settings (gear icon)** → **Project settings**
4. Go to the **Cloud Messaging** tab
5. Scroll down to **Web Push certificates** section
6. Click **Generate key pair** (if you don't have one)
7. Copy the **Public key** (it starts with `BKagOny0KF_...`)

### Step 2: Update VAPID Key

Open `src/app/config/firebase.config.ts` and replace:

```typescript
export const vapidKey = "YOUR_VAPID_KEY_HERE";
```

With your actual VAPID key:

```typescript
export const vapidKey = "BKagOny0KF_2pCJQ3m....moL0ewzQ8rZu"; // Your actual key
```

## 🚀 How It Works

### Automatic Registration

1. **After Login**: When a user logs in, the app automatically:
   - Requests notification permission
   - Gets FCM token
   - Registers token with your backend API

2. **Foreground Messages**: When app is open, notifications are handled by `FirebaseService.onMessage()`

3. **Background Messages**: When app is closed, service worker handles notifications

### Manual Testing

1. **Start your Angular app**: `npm start`
2. **Log in** to your application
3. **Check browser console** for FCM token
4. **Test from Firebase Console**:
   - Go to Firebase Console → Cloud Messaging
   - Click "Send test message"
   - Enter your FCM token
   - Click "Test"

## 📱 Features

- ✅ Automatic token registration after login
- ✅ Token unregistration on logout
- ✅ Foreground message handling
- ✅ Background message handling (service worker)
- ✅ Notification click handling
- ✅ Multi-device support

## 🔍 Troubleshooting

### "VAPID key not configured" warning

- Make sure you've added your VAPID key to `firebase.config.ts`
- Get the key from Firebase Console → Project Settings → Cloud Messaging

### "Service Worker not supported" warning

- Push notifications require HTTPS (except localhost)
- Make sure you're testing on `localhost` or a deployed HTTPS site

### Notifications not received

1. Check browser notification permissions (Settings → Notifications)
2. Verify FCM token is registered (check browser console)
3. Check Firebase Console for delivery status
4. Verify backend API is running and accessible

### Service Worker not loading

- Make sure `firebase-messaging-sw.js` is in the `public/` folder
- Check browser console for service worker errors
- Clear browser cache and reload

## 📚 Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## 🎯 Production Checklist

Before deploying to production:

- [ ] Add VAPID key to `firebase.config.ts`
- [ ] Test push notifications on HTTPS domain
- [ ] Update notification icons (currently using `/logo.png`)
- [ ] Configure notification click actions
- [ ] Test on multiple browsers (Chrome, Firefox, Edge)
- [ ] Set up error monitoring for failed notifications

