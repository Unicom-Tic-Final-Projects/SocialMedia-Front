import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-auth-success',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './auth-success.html',
  styleUrl: './auth-success.css',
})
export class AuthSuccess extends BaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly loggingService = inject(LoggingService);

  success = false;
  error: string | null = null;
  errorDescription: string | null = null;
  platform: string | null = null;
  loading = true;

  ngOnInit(): void {
    // Check if we're in a popup window
    const isPopup = window.opener !== null && !window.opener.closed;

    // Check query parameters
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
      this.success = params['success'] === 'true';
      this.error = params['error'] || null;
      this.errorDescription = params['error_description'] || null;
      this.platform = params['platform'] || null;

      this.loading = false;

      // If we're in a popup window, handle it differently
      if (isPopup) {
        if (this.success) {
          // Notify parent window that connection was successful
          if (window.opener) {
            // Send message to parent window
            window.opener.postMessage(
              {
                type: 'OAUTH_SUCCESS',
                platform: this.platform,
                success: true,
              },
              window.location.origin,
            );

            // Refresh accounts in parent window
            try {
              // Try to call parent's refresh method if available
              (window.opener as any)?.location?.reload?.();
            } catch {
              this.loggingService.debug('Could not reload parent window', undefined, 'AuthSuccess');
            }
          }

          // Close popup after a short delay
          setTimeout(() => {
            window.close();
          }, 1500);
        } else if (this.error) {
          // Show error in popup, user can close manually
          // Or close after showing error
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: 'OAUTH_ERROR',
                  error: this.error,
                  errorDescription: this.errorDescription,
                },
                window.location.origin,
              );
            }
            // Don't auto-close on error, let user see the error message
          }, 2000);
        }
        return; // Don't proceed with normal navigation in popup
      }

      // Normal flow (not in popup) - determine redirect route based on current URL
      const currentUrl = this.router.url;
      const isAgencyClientRoute = currentUrl.includes('/agency/client/');
      let redirectRoute: string[];

      if (isAgencyClientRoute) {
        // Extract clientId from current route
        const clientMatch = currentUrl.match(/\/agency\/client\/([^/]+)/);
        if (clientMatch) {
          const clientId = clientMatch[1];
          redirectRoute = ['/agency/client', clientId, 'social-account'];
        } else {
          // Fallback to agency social-account
          redirectRoute = ['/agency/social-account'];
        }
      } else {
        // Individual dashboard route
        redirectRoute = ['/dashboard/social-account'];
      }

      // If success, refresh accounts list and redirect immediately with connected parameter
      if (this.success) {
        // Refresh accounts first to ensure they're loaded
        this.socialAccountsService
          .refresh()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: () => {
            // Auto-redirect to social-account page after 2 seconds (reduced from 3)
            // with connected=true to trigger refresh on social account page
            setTimeout(() => {
              this.router.navigate(redirectRoute, {
                queryParams: { connected: 'true', platform: this.platform },
                replaceUrl: true, // Replace current history entry to avoid back button issues
              });
            }, 2000);
          },
          error: (error) => {
            this.loggingService.error('Failed to refresh accounts', error, 'AuthSuccess');
            // Still redirect even if refresh fails
            setTimeout(() => {
              this.router.navigate(redirectRoute, {
                queryParams: { connected: 'true', platform: this.platform },
                replaceUrl: true,
              });
            }, 2000);
          },
        });
      } else if (this.error) {
        // If error, stay on page to show error message
        // User can manually navigate back
      }
    });
  }

  goToSocialAccounts(): void {
    // Determine redirect route based on current URL
    const currentUrl = this.router.url;
    const isAgencyClientRoute = currentUrl.includes('/agency/client/');
    let redirectRoute: string[];

    if (isAgencyClientRoute) {
      // Extract clientId from current route
      const clientMatch = currentUrl.match(/\/agency\/client\/([^/]+)/);
      if (clientMatch) {
        const clientId = clientMatch[1];
        redirectRoute = ['/agency/client', clientId, 'social-account'];
      } else {
        // Fallback to agency social-account
        redirectRoute = ['/agency/social-account'];
      }
    } else {
      // Individual dashboard route
      redirectRoute = ['/dashboard/social-account'];
    }

    // Navigate with connected parameter to trigger refresh
    this.router.navigate(redirectRoute, {
      queryParams: { connected: 'true', platform: this.platform },
      replaceUrl: true,
    });
  }

}
