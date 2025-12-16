import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ClientContextService } from './client-context.service';
import { LoggingService } from '../../core/services/logging.service';
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

/**
 * Service responsible for social account data operations and state management
 */
@Injectable({
  providedIn: 'root',
})
export class SocialAccountsDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly clientContextService = inject(ClientContextService);
  private readonly loggingService = inject(LoggingService);

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
   * If viewing a client dashboard, will attempt to get client's accounts
   */
  getSocialAccounts(): Observable<SocialAccount[]> {
    this.loadingSignal.set(true);

    // If viewing a client dashboard (agency or team context), load accounts for that client
    const isViewingClient = this.clientContextService.isViewingClientDashboard();
    const clientId = this.clientContextService.getCurrentClientId();
    const clientUserId = this.clientContextService.getCurrentClientUserId();

    // Only use client-specific endpoint if client has a user account
    let url = `${this.baseUrl}/api/socialaccount`;
    if (isViewingClient && clientId && clientUserId) {
      url = `${this.baseUrl}/api/socialaccount/client/${clientId}`;
    }

    return this.http.get<unknown>(url).pipe(
      map((response) => {
        this.loggingService.debug('Raw API response', { response, type: typeof response, isArray: Array.isArray(response) }, 'SocialAccountsDataService');

        // Handle both unwrapped array and ApiResponse structure
        let accounts: SocialAccountResponse[] = [];

        if (Array.isArray(response)) {
          // Direct array response (already unwrapped by interceptor)
          this.loggingService.debug(`Response is direct array, length: ${response.length}`, { length: response.length }, 'SocialAccountsDataService');
          accounts = response as SocialAccountResponse[];
        } else if (response && typeof response === 'object') {
          this.loggingService.debug('Response is object', { keys: Object.keys(response) }, 'SocialAccountsDataService');
          // Check if it's still wrapped in ApiResponse structure
          if ('data' in response) {
            const data = (response as { data: unknown }).data;
            this.loggingService.debug('Response has data property', data, 'SocialAccountsDataService');
            if (Array.isArray(data)) {
              accounts = data as SocialAccountResponse[];
            } else if (data === null || data === undefined) {
              // Empty response
              this.loggingService.warn('Response data is null/undefined', undefined, 'SocialAccountsDataService');
              accounts = [];
            } else {
              this.loggingService.error('Unexpected data format (not an array)', data, 'SocialAccountsDataService');
              accounts = [];
            }
          } else if ('success' in response) {
            // ApiResponse structure but no data property
            this.loggingService.warn(
              'Response has success but no data property',
              response,
              'SocialAccountsDataService',
            );
            accounts = [];
          } else {
            this.loggingService.error('Unexpected response format', response, 'SocialAccountsDataService');
            accounts = [];
          }
        } else {
          // Not an object or array
          this.loggingService.error('Unexpected response type', { type: typeof response, response }, 'SocialAccountsDataService');
          accounts = [];
        }

        this.loggingService.debug(`Mapped accounts array length: ${accounts.length}`, { length: accounts.length }, 'SocialAccountsDataService');
        return accounts.map((acc) => this.mapToSocialAccount(acc));
      }),
      tap((accounts) => {
        this.loggingService.debug(`Setting accounts signal with ${accounts.length} accounts`, { count: accounts.length }, 'SocialAccountsDataService');
        this.accountsSignal.set(accounts);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        
        // If 404 and we were trying to use client-specific endpoint, fall back to regular endpoint
        if (error?.status === 404 && isViewingClient && clientId) {
          this.loggingService.warn(
            'Client-specific social accounts endpoint returned 404, falling back to regular endpoint',
            { clientId, error },
            'SocialAccountsDataService'
          );
          
          // Fall back to regular endpoint (agency user's accounts)
          return this.http.get<unknown>(`${this.baseUrl}/api/socialaccount`).pipe(
            map((response) => {
              let accounts: SocialAccountResponse[] = [];
              if (Array.isArray(response)) {
                accounts = response as SocialAccountResponse[];
              } else if (response && typeof response === 'object' && 'data' in response) {
                const data = (response as { data: unknown }).data;
                if (Array.isArray(data)) {
                  accounts = data as SocialAccountResponse[];
                }
              }
              return accounts.map((acc) => this.mapToSocialAccount(acc));
            }),
            tap((accounts) => {
              this.accountsSignal.set(accounts);
              this.loadingSignal.set(false);
            }),
            catchError((fallbackError) => {
              this.loggingService.error('Error loading social accounts (fallback)', fallbackError, 'SocialAccountsDataService');
              return throwError(() => fallbackError);
            })
          );
        }
        
        this.loggingService.error('Error loading social accounts', error, 'SocialAccountsDataService');
        this.loggingService.error('Error details', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error,
        }, 'SocialAccountsDataService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get social account by ID
   */
  getSocialAccountById(id: string): Observable<SocialAccount> {
    return this.http
      .get<SocialAccountResponse>(`${this.baseUrl}/api/socialaccount/${id}`)
      .pipe(map((acc) => this.mapToSocialAccount(acc)));
  }

  /**
   * Get accounts for a specific platform
   */
  getAccountsByPlatform(platform: Platform): Observable<SocialAccount[]> {
    return this.http
      .get<SocialAccountResponse[]>(`${this.baseUrl}/api/socialaccount`)
      .pipe(
        map((accounts) =>
          accounts
            .filter((acc) => acc.platform.toLowerCase() === platform.toLowerCase() && acc.isActive)
            .map((acc) => this.mapToSocialAccount(acc)),
        ),
      );
  }

  /**
   * Check if platform is connected
   */
  isPlatformConnected(platform: Platform): boolean {
    return this.accountsSignal().some(
      (acc) => acc.platform.toLowerCase() === platform.toLowerCase() && acc.status === 'connected',
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
   * Remove account from local state (used after disconnect)
   */
  removeAccount(accountId: string): void {
    this.accountsSignal.update((accounts) => accounts.filter((acc) => acc.id !== accountId));
  }

  /**
   * Add or update account in local state
   */
  upsertAccount(account: SocialAccount): void {
    this.accountsSignal.update((accounts) => {
      const index = accounts.findIndex((acc) => acc.id === account.id);
      if (index >= 0) {
        // Update existing
        const updated = [...accounts];
        updated[index] = account;
        return updated;
      } else {
        // Add new
        return [...accounts, account];
      }
    });
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
        this.removeAccount(accountId);
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Refresh accounts list
   */
  refresh(): Observable<SocialAccount[]> {
    return this.getSocialAccounts();
  }

  /**
   * Map backend SocialAccountResponse to frontend SocialAccount
   */
  mapToSocialAccount(response: SocialAccountResponse): SocialAccount {
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
   * Get social account statistics
   */
  getAccountStatistics(accountId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/socialaccount/${accountId}/statistics`).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Test social account connection
   */
  testConnection(accountId: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/api/socialaccount/${accountId}/test`, {}).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Refresh social account token
   */
  refreshToken(accountId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/socialaccount/${accountId}/refresh-token`, {}).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get social account pages (for Facebook/Instagram)
   */
  getAccountPages(accountId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/socialaccount/${accountId}/pages`).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }
}

