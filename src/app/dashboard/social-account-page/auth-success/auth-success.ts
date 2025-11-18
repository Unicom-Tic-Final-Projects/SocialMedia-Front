import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';

@Component({
  selector: 'app-auth-success',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './auth-success.html',
  styleUrl: './auth-success.css',
})
export class AuthSuccess implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly socialAccountsService = inject(SocialAccountsService);

  success = false;
  error: string | null = null;
  errorDescription: string | null = null;
  platform: string | null = null;
  loading = true;

  ngOnInit(): void {
    // Check query parameters
    this.route.queryParams.subscribe((params) => {
      this.success = params['success'] === 'true';
      this.error = params['error'] || null;
      this.errorDescription = params['error_description'] || null;
      this.platform = params['platform'] || null;

      this.loading = false;

      // Determine redirect route based on current URL
      const currentUrl = this.router.url;
      const isAgencyClientRoute = currentUrl.includes('/agency/client/');
      let redirectRoute: string[];

      if (isAgencyClientRoute) {
        // Extract clientId from current route
        const clientMatch = currentUrl.match(/\/agency\/client\/([^\/]+)/);
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
        this.socialAccountsService.refresh().subscribe({
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
            console.error('Failed to refresh accounts:', error);
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
      const clientMatch = currentUrl.match(/\/agency\/client\/([^\/]+)/);
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
