import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError, switchMap, BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { Platform, SocialAccount } from '../../models/social.models';

export interface SocialAccountResponse {
  id: string; // GUID as string
  tenantId: string; // GUID as string
  userId: string; // GUID as string
  platform: string;
  platformUserId: string;
  platformUsername: string;
  displayName: string;
  profilePictureUrl?: string;
  tokenExpiresAt?: string;
  scope?: string;
  isActive: boolean;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  connectionError?: string;
  connectionAttempts: number;
  lastTokenRefreshAt?: string;
  createdAt: string;
  updatedAt?: string;
  pages: SocialAccountPageResponse[];
}

export interface SocialAccountPageResponse {
  id: string;
  pageId: string;
  pageName: string;
  pageCategory?: string;
  accessToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocialAccountsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  private readonly accountsSignal = signal<SocialAccount[]>([]);
  readonly accounts = this.accountsSignal.asReadonly();
  
  // Observable for backward compatibility
  private readonly accountsSubject = new BehaviorSubject<SocialAccount[]>([]);
  readonly accounts$ = this.accountsSubject.asObservable();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  constructor() {
    // Sync signal changes to observable
    effect(() => {
      this.accountsSubject.next(this.accountsSignal());
    });
  }

  /**
   * Get all social accounts for current user/tenant
   */
  getSocialAccounts(): Observable<SocialAccount[]> {
    this.loadingSignal.set(true);

    return this.http.get<unknown>(`${this.baseUrl}/api/socialaccount`).pipe(
      map((response) => {
        console.log('[SocialAccountsService] Raw API response:', response);
        console.log('[SocialAccountsService] Response type:', typeof response);
        console.log('[SocialAccountsService] Is array?', Array.isArray(response));
        
        // Handle both unwrapped array and ApiResponse structure
        let accounts: SocialAccountResponse[] = [];
        
        if (Array.isArray(response)) {
          // Direct array response (already unwrapped by interceptor)
          console.log('[SocialAccountsService] Response is direct array, length:', response.length);
          accounts = response as SocialAccountResponse[];
        } else if (response && typeof response === 'object') {
          console.log('[SocialAccountsService] Response is object, keys:', Object.keys(response));
          // Check if it's still wrapped in ApiResponse structure
          if ('data' in response) {
            const data = (response as { data: unknown }).data;
            console.log('[SocialAccountsService] Response has data property:', data);
            if (Array.isArray(data)) {
              accounts = data as SocialAccountResponse[];
            } else if (data === null || data === undefined) {
              // Empty response
              console.warn('[SocialAccountsService] Response data is null/undefined');
              accounts = [];
            } else {
              console.error('Unexpected data format (not an array):', data);
              accounts = [];
            }
          } else if ('success' in response) {
            // ApiResponse structure but no data property
            console.warn('[SocialAccountsService] Response has success but no data property:', response);
            accounts = [];
          } else {
            console.error('Unexpected response format:', response);
            accounts = [];
          }
        } else {
          // Not an object or array
          console.error('Unexpected response type:', typeof response, response);
          accounts = [];
        }
        
        console.log('[SocialAccountsService] Mapped accounts array length:', accounts.length);
        return accounts.map((acc) => this.mapToSocialAccount(acc));
      }),
      tap((accounts) => {
        console.log('[SocialAccountsService] Setting accounts signal with', accounts.length, 'accounts');
        this.accountsSignal.set(accounts);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        console.error('[SocialAccountsService] Error loading social accounts:', error);
        console.error('[SocialAccountsService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Get social account by ID
   */
  getSocialAccountById(id: string): Observable<SocialAccount> {
    return this.http.get<SocialAccountResponse>(`${this.baseUrl}/api/socialaccount/${id}`).pipe(
      map((acc) => this.mapToSocialAccount(acc))
    );
  }

  /**
   * Get accounts for a specific platform
   */
  getAccountsByPlatform(platform: Platform): Observable<SocialAccount[]> {
    return this.http.get<SocialAccountResponse[]>(`${this.baseUrl}/api/socialaccount`).pipe(
      map((accounts) =>
        accounts
          .filter((acc) => acc.platform.toLowerCase() === platform.toLowerCase() && acc.isActive)
          .map((acc) => this.mapToSocialAccount(acc))
      )
    );
  }

  /**
   * Check if platform is connected
   */
  isPlatformConnected(platform: Platform): boolean {
    return this.accountsSignal().some(
      (acc) => acc.platform.toLowerCase() === platform.toLowerCase() && acc.status === 'connected'
    );
  }

  /**
   * Alias for isPlatformConnected (for backward compatibility)
   */
  isConnected(platform: Platform): boolean {
    return this.isPlatformConnected(platform);
  }

  /**
   * Get connected accounts for platform selection
   */
  getConnectedAccounts(): SocialAccount[] {
    return this.accountsSignal().filter((acc) => acc.status === 'connected');
  }

  /**
   * Map backend SocialAccountResponse to frontend SocialAccount
   */
  private mapToSocialAccount(response: SocialAccountResponse): SocialAccount {
    return {
      id: response.id,
      platform: response.platform.toLowerCase() as Platform,
      accountName: response.displayName || response.platformUsername,
      accountId: response.platformUserId,
      accountType: 'business', // Default, could be determined from response
      connectedAt: response.lastConnectedAt || response.createdAt,
      status: response.isActive ? 'connected' : 'disconnected',
      displayName: response.displayName,
      profilePictureUrl: response.profilePictureUrl,
      platformUsername: response.platformUsername,
    };
  }

  /**
   * Connect a social account (initiates OAuth flow)
   * Returns the authorization URL that the user should be redirected to
   */
    connect(
    platform: Platform,
    accountName?: string,
    accountType: 'business' | 'personal' | 'creator' = 'business'
  ): Observable<SocialAccount> {
    const user = this.authService.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Backend OAuth callback URL (where OAuth provider redirects)
    const backendCallbackUrl = `${this.baseUrl}/api/socialaccount/callback`;
    
    // Frontend redirect URL (where user is redirected after callback processing)
    const frontendRedirectUrl = `${window.location.origin}/dashboard/social-account/callback`;
    
    const request = {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1), // Capitalize first letter
      redirectUrl: backendCallbackUrl, // OAuth provider callback URL
      frontendRedirectUrl: frontendRedirectUrl, // Frontend redirect URL after callback
      scope: undefined, // Use default scope from backend
      state: undefined, // Backend will generate state
    };

    // Call backend to get authorization URL
    // Response interceptor unwraps ApiResponse<T>, so we get the string directly
    return this.http.post<unknown>(`${this.baseUrl}/api/socialaccount/connect`, request).pipe(
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

        // Open OAuth authorization in a new tab/window so the app stays on the dashboard
        const oauthWindow = window.open(authUrl, '_blank', 'noopener,noreferrer');

        // Fallback: if the browser blocks popups, fall back to full-page redirect
        if (!oauthWindow) {
          window.location.href = authUrl;
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
      })
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

    return this.http.post<SocialAccountResponse>(`${this.baseUrl}/api/socialaccount/callback`, request).pipe(
      map((response) => this.mapToSocialAccount(response)),
      tap((account) => {
        // Refresh accounts list after successful connection
        this.getSocialAccounts().subscribe();
      })
    );
  }

  /**
   * Reconnect a social account (reinitiates OAuth flow)
   */
  reconnect(accountId: string): Observable<SocialAccount> {
    // Get the account to find its platform
    const account = this.accountsSignal().find((acc) => acc.id === accountId);
    if (!account) {
      return throwError(() => new Error('Account not found'));
    }

    // Reconnect using the same platform
    return this.connect(account.platform, account.accountName, account.accountType);
  }

  /**
   * Disconnect a social account
   */
  disconnect(accountId: string): Observable<boolean> {
    const request = {
      socialAccountId: accountId,
      revokeTokens: true,
    };

    return this.http.post<boolean>(`${this.baseUrl}/api/socialaccount/disconnect`, request).pipe(
      tap(() => {
        // Remove account from local state
        this.accountsSignal.update((accounts) => accounts.filter((acc) => acc.id !== accountId));
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Manual connect Instagram (or other platform) using access token and account ID
   */
  manualConnect(
    platform: Platform,
    accountId: string,
    accessToken: string,
    username?: string,
    accountName?: string,
    profilePictureUrl?: string,
    refreshToken?: string,
    tokenExpiresAt?: string
  ): Observable<SocialAccount> {
    const request = {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1), // Capitalize first letter
      accountId: accountId,
      accessToken: accessToken,
      username: username,
      accountName: accountName,
      profilePictureUrl: profilePictureUrl,
      refreshToken: refreshToken,
      tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt).toISOString() : undefined,
      scope: undefined, // Optional
    };

    return this.http.post<SocialAccountResponse>(`${this.baseUrl}/api/socialaccount/manual-connect`, request).pipe(
      map((response) => this.mapToSocialAccount(response)),
      tap((account) => {
        // Refresh accounts list after successful connection
        this.getSocialAccounts().subscribe();
      }),
      catchError((error) => {
        console.error('Failed to manually connect account:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh accounts list
   */
  refresh(): Observable<SocialAccount[]> {
    return this.getSocialAccounts();
  }
}
