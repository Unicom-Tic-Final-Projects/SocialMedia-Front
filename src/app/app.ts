import { Component, OnInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AosService } from './shared/services/aos.service';
import { ToastMessageComponent } from './shared/ui/toast-message/toast-message';
import { ConfirmationDialogComponent } from './shared/ui/confirmation-dialog/confirmation-dialog';
import { CookieConsentComponent } from './shared/ui/cookie-consent/cookie-consent';
import { FirebaseService } from './core/services/firebase.service';
import { AuthService } from './core/services/auth.service';
import { CookieConsentService } from './core/services/cookie-consent.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastMessageComponent, ConfirmationDialogComponent, CookieConsentComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('onevo');
  private routerSubscription?: Subscription;
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private cookieConsentService = inject(CookieConsentService);

  constructor(
    private router: Router,
    private aosService: AosService
  ) {
    // Listen for authentication state changes using effect
    // Effect must be called in constructor for proper signal tracking
    effect(() => {
      const user = this.authService.user();
      const functionalAccepted = this.cookieConsentService.functionalAccepted();
      
      if (user && functionalAccepted) {
        // User logged in and functional cookies accepted, initialize push notifications
        this.initializePushNotifications();
      }
    });
  }

  ngOnInit() {
    // Refresh AOS on route navigation
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          this.aosService.refreshAos();
        }, 100);
      });

    // Initialize push notifications if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.initializePushNotifications();
    }
  }

  private async initializePushNotifications() {
    try {
      // Request permission and get token
      const token = await this.firebaseService.requestPermission();
      
      if (token) {
        console.log('Push notifications enabled');
        
        // Listen for foreground messages
        this.firebaseService.onMessage().subscribe((payload) => {
          console.log('Foreground message:', payload);
          // Handle notification display in your app
          this.showNotification(payload);
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private showNotification(payload: any) {
    // Show in-app notification or toast
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(
        payload.notification?.title || 'New Notification',
        {
          body: payload.notification?.body,
          icon: payload.notification?.icon || '/logo.png',
          badge: '/logo.png',
          data: payload.data
        }
      );

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (payload.data?.url) {
          this.router.navigateByUrl(payload.data.url);
        }
        notification.close();
      };
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
