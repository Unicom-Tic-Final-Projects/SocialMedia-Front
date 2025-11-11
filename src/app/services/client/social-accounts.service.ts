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

    return this.http.get<SocialAccountResponse[]>(`${this.baseUrl}/api/socialaccount`).pipe(
      map((accounts) => accounts.map((acc) => this.mapToSocialAccount(acc))),
      tap((accounts) => {
        this.accountsSignal.set(accounts);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
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

    // Get the current origin for redirect URL
    const redirectUrl = `${window.location.origin}/dashboard/social-account/callback`;
    
    const request = {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1), // Capitalize first letter
      redirectUrl: redirectUrl,
      scope: undefined, // Use default scope from backend
      state: undefined, // Backend will generate state
    };

    // Call backend to get authorization URL
    // Response interceptor unwraps ApiResponse<T>, so we get the string directly
    return this.http.post<string>(`${this.baseUrl}/api/socialaccount/connect`, request).pipe(
      switchMap((authUrl: string) => {
        // Backend returns authorization URL (unwrapped by response interceptor)
        
        // Redirect user to OAuth authorization page
        window.location.href = authUrl;
        
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
   * Refresh accounts list
   */
  refresh(): Observable<SocialAccount[]> {
    return this.getSocialAccounts();
  }
}
