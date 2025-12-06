// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAzPEOV2oQVnRH1I44QAv-FbOyb3NCwSH4",
  authDomain: "onevo-4ea2d.firebaseapp.com",
  projectId: "onevo-4ea2d",
  storageBucket: "onevo-4ea2d.firebasestorage.app",
  messagingSenderId: "672262308444",
  appId: "1:672262308444:web:9840cd6bc6a4861dcddc99",
  measurementId: "G-TCBPD0GXBB"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo.png', // Use your logo
    badge: '/logo.png',
    data: payload.data,
    requireInteraction: false,
    tag: payload.data?.notificationId || 'default',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  // Handle navigation if data contains URL
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // Default: focus or open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

