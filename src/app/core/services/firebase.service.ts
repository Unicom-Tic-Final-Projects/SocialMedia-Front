import { Injectable, inject } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, Messaging, onMessage } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from '../../config/firebase.config';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../config/api.config';
import { CookieConsentService } from './cookie-consent.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly cookieConsentService = inject(CookieConsentService);
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;

  constructor() {
    // Only initialize Firebase if functional cookies are accepted
    if (this.cookieConsentService.functionalAccepted()) {
      this.initializeFirebase();
    }
  }

  private initializeFirebase(): void {
    try {
      this.app = initializeApp(firebaseConfig);

      // Only initialize messaging if browser supports it
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        this.messaging = getMessaging(this.app);
        console.log('Firebase initialized successfully');
      } else {
        console.warn('Service Worker not supported. Push notifications will not work.');
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermission(): Promise<string | null> {
    // Check if functional cookies are accepted
    if (!this.cookieConsentService.functionalAccepted()) {
      console.warn('Functional cookies not accepted. Push notifications disabled.');
      return null;
    }

    if (!this.messaging) {
      // Try to initialize if not already done
      this.initializeFirebase();
      if (!this.messaging) {
        console.error('Firebase messaging not initialized');
        return null;
      }
    }

    // Check if VAPID key is configured
    if (!vapidKey || vapidKey.trim().length === 0) {
      console.warn('VAPID key not configured. Please add your VAPID key in firebase.config.ts');
      return null;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('Notification permission granted.');

        // Register service worker explicitly before getting token
        let serviceWorkerRegistration: ServiceWorkerRegistration | undefined = undefined;
        try {
          // Try to get existing registration first (check root scope)
          const existingRegistrations = await navigator.serviceWorker.getRegistrations();
          serviceWorkerRegistration = existingRegistrations.find(
            (reg) =>
              reg.scope === window.location.origin + '/' || reg.scope === window.location.origin,
          );

          // If not found, register it at root
          if (!serviceWorkerRegistration) {
            console.log('Registering service worker...');
            serviceWorkerRegistration = await navigator.serviceWorker.register(
              '/firebase-messaging-sw.js',
              {
                scope: '/',
              },
            );

            // Wait for service worker to be ready
            if (serviceWorkerRegistration.installing) {
              await new Promise<void>((resolve) => {
                serviceWorkerRegistration!.installing!.addEventListener('statechange', () => {
                  if (serviceWorkerRegistration!.installing!.state === 'installed') {
                    resolve();
                  }
                });
              });
            } else if (serviceWorkerRegistration.waiting) {
              // Already installed, just wait a bit
              await new Promise((resolve) => setTimeout(resolve, 100));
            } else if (serviceWorkerRegistration.active) {
              // Already active
              console.log('Service worker is active');
            }

            console.log('Service worker registered and ready');
          } else {
            console.log('Service worker already registered');
          }
        } catch (swError) {
          console.error('Error registering service worker:', swError);
          // Continue anyway - Firebase might still work
        }

        // Get FCM token with service worker registration
        const tokenOptions: any = { vapidKey };
        if (serviceWorkerRegistration) {
          tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
        }

        const token = await getToken(this.messaging!, tokenOptions);

        if (token) {
          console.log('FCM Token:', token);
          this.currentToken = token;

          // Register token with backend
          await this.registerTokenWithBackend(token);

          return token;
        } else {
          console.log('No registration token available.');
          return null;
        }
      } else {
        console.log('Notification permission denied.');
        return null;
      }
    } catch (error: any) {
      // Check if this is a service worker registration error (non-critical)
      if (error?.code === 'messaging/failed-service-worker-registration') {
        console.warn('Service worker registration warning (non-critical):', error.message);
        // If we already have a token, return it anyway
        if (this.currentToken) {
          console.log('Using existing FCM token despite service worker warning');
          return this.currentToken;
        }
      }
      console.error('An error occurred while retrieving token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend API
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const deviceId = this.getDeviceId();
      const userAgent = navigator.userAgent;

      const response = await this.http
        .post(`${this.baseUrl}/api/notifications/devices/register`, {
          token: token,
          platform: 'Web',
          deviceId: deviceId,
          userAgent: userAgent,
          appVersion: '1.0.0',
        })
        .toPromise();

      console.log('Device token registered successfully:', response);
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  /**
   * Get unique device ID (stored in localStorage)
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Listen for foreground messages
   */
  onMessage(): Observable<any> {
    if (!this.messaging) {
      return new Observable((observer) => {
        observer.error('Firebase messaging not initialized');
      });
    }

    return new Observable((observer) => {
      onMessage(this.messaging!, (payload) => {
        console.log('Message received:', payload);
        observer.next(payload);
      });
    });
  }

  /**
   * Unregister device token
   */
  async unregisterToken(): Promise<void> {
    try {
      await this.http.delete(`${this.baseUrl}/api/notifications/devices/all`).toPromise();

      this.currentToken = null;
      console.log('Device token unregistered');
    } catch (error) {
      console.error('Error unregistering device token:', error);
    }
  }
}
