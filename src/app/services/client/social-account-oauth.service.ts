import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap, catchError, throwError, switchMap } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { Platform, SocialAccount } from '../../models/social.models';
import { SocialAccountsDataService } from './social-accounts-data.service';

/**
 * Service responsible for OAuth flow operations
 */
@Injectable({
  providedIn: 'root',
})
export class SocialAccountOAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dataService = inject(SocialAccountsDataService);

  /**
   * Connect a social account (initiates OAuth flow)
   * Returns the authorization URL that the user should be redirected to
   */
  connect(
    platform: Platform,
    accountName?: string,
    accountType: 'business' | 'personal' | 'creator' = 'business',
  ): Observable<SocialAccount> {
    const user = this.authService.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Backend OAuth callback URL (where OAuth provider redirects)
    const backendCallbackUrl = `${this.baseUrl}/api/socialaccount/callback`;

    // Frontend redirect URL (where user is redirected after callback processing)
    // Detect if we're in an agency or team client dashboard route
    const currentUrl = this.router.url;
    const isAgencyClientRoute = currentUrl.includes('/agency/client/');
    const isTeamClientRoute = currentUrl.includes('/team/client/');
    let frontendRedirectUrl: string;

    if (isAgencyClientRoute || isTeamClientRoute) {
      // Extract clientId from current route
      const clientMatch = currentUrl.match(/\/(?:agency|team)\/client\/([^/]+)/);
      if (clientMatch) {
        const clientId = clientMatch[1];
        const basePath = isAgencyClientRoute ? 'agency' : 'team';
        frontendRedirectUrl = `${window.location.origin}/${basePath}/client/${clientId}/social-account/callback`;
      } else {
        // Fallback to agency social-account
        const basePath = isAgencyClientRoute ? 'agency' : 'team';
        frontendRedirectUrl = `${window.location.origin}/${basePath}/social-account/callback`;
      }
    } else {
      // Individual dashboard route
      frontendRedirectUrl = `${window.location.origin}/dashboard/social-account/callback`;
    }

    const request = {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1), // Capitalize first letter
      redirectUrl: backendCallbackUrl, // OAuth provider callback URL
      frontendRedirectUrl: frontendRedirectUrl, // Frontend redirect URL after callback
      scope: undefined, // Use default scope from backend
      state: undefined, // Backend will generate state
    };

    // Call backend to get authorization URL
    // If we're in an agency or team client dashboard, initiate connect for that clientId
    let connectUrl = `${this.baseUrl}/api/socialaccount/connect`;
    const clientIdForConnectMatch = currentUrl.match(/\/(?:agency|team)\/client\/([^/]+)/);
    if (clientIdForConnectMatch) {
      const clientIdForConnect = clientIdForConnectMatch[1];
      connectUrl = `${this.baseUrl}/api/socialaccount/client/${clientIdForConnect}/connect`;
    }

    // Response interceptor unwraps ApiResponse<T>, so we get the string directly
    return this.http.post<unknown>(connectUrl, request).pipe(
      switchMap((response) => {
        const authUrl =
          typeof response === 'string'
            ? response
            : typeof response === 'object' && response !== null && 'data' in response
              ? (response as { data: string }).data
              : null;

        if (!authUrl || typeof authUrl !== 'string') {
          console.error('Unexpected connect response format', response);
          return throwError(() => new Error('Failed to initiate social account connection'));
        }

        // Open OAuth authorization in a small popup window so the app stays on the dashboard
        // Calculate center position for popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popupFeatures = `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,status=no`;
        const oauthWindow = window.open(authUrl, 'oauthPopup', popupFeatures);

        // Fallback: if the browser blocks popups, fall back to full-page redirect
        if (!oauthWindow) {
          window.location.href = authUrl;
        } else {
          // Monitor the popup window to detect when it closes or redirects
          // This helps handle the OAuth callback
          const checkClosed = setInterval(() => {
            if (oauthWindow.closed) {
              clearInterval(checkClosed);
              // Refresh accounts when popup closes (OAuth might have completed)
              setTimeout(() => {
                this.dataService.getSocialAccounts().subscribe();
              }, 1000);
            }
          }, 500);
        }

        // Return a placeholder observable that never completes
        // The actual account will be created after OAuth callback
        return new Observable<SocialAccount>((observer) => {
          // This will be handled by the OAuth callback
          // For now, we'll create a temporary account object
          const tempAccount: SocialAccount = {
            id: 'temp',
            platform: platform,
            accountName: accountName || `${platform} Account`,
            accountId: 'pending',
            accountType: accountType,
            connectedAt: new Date().toISOString(),
            status: 'reconnecting',
          };

          // Don't complete immediately - wait for callback
          // In a real implementation, you'd use a service or event to notify when OAuth completes
          setTimeout(() => {
            observer.next(tempAccount);
            observer.complete();
          }, 100);
        });
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback(code: string, state: string): Observable<SocialAccount> {
    const request = {
      code: code,
      state: state,
    };

    return this.http
      .post<{ id: string; platform: string; displayName: string; platformUsername: string; platformUserId: string; isActive: boolean; lastConnectedAt?: string; createdAt: string }>(
        `${this.baseUrl}/api/socialaccount/callback`,
        request,
      )
      .pipe(
        map((response) => this.dataService.mapToSocialAccount({
          id: response.id,
          tenantId: '',
          userId: '',
          platform: response.platform,
          platformUserId: response.platformUserId,
          platformUsername: response.platformUsername,
          displayName: response.displayName,
          isActive: response.isActive,
          connectionAttempts: 0,
          lastConnectedAt: response.lastConnectedAt,
          createdAt: response.createdAt,
          pages: [],
        })),
        tap((_account) => {
          // Refresh accounts list after successful connection
          this.dataService.getSocialAccounts().subscribe();
        }),
      );
  }

  /**
   * Reconnect a social account (reinitiates OAuth flow)
   */
  reconnect(accountId: string): Observable<SocialAccount> {
    // Get the account to find its platform
    const account = this.dataService.accounts().find((acc) => acc.id === accountId);
    if (!account) {
      return throwError(() => new Error('Account not found'));
    }

    // Reconnect using the same platform
    return this.connect(account.platform, account.accountName, account.accountType);
  }
}

