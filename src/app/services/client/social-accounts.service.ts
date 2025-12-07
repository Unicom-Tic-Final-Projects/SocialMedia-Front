import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Platform, SocialAccount } from '../../models/social.models';
import {
  SocialAccountsDataService,
  SocialAccountResponse,
  SocialAccountPageResponse,
} from './social-accounts-data.service';
import { SocialAccountOAuthService } from './social-account-oauth.service';
import { SocialAccountManualConnectService } from './social-account-manual-connect.service';

// Re-export interfaces for backward compatibility
export type { SocialAccountResponse, SocialAccountPageResponse };

/**
 * Main service facade that delegates to specialized services
 * Maintains backward compatibility while using refactored services
 */
@Injectable({
  providedIn: 'root',
})
export class SocialAccountsService {
  private readonly dataService = inject(SocialAccountsDataService);
  private readonly oauthService = inject(SocialAccountOAuthService);
  private readonly manualConnectService = inject(SocialAccountManualConnectService);

  // Expose data service properties for backward compatibility
  readonly accounts = this.dataService.accounts;
  readonly accounts$ = this.dataService.accounts$;
  readonly loading = this.dataService.loading;

  /**
   * Get all social accounts for current user/tenant
   * Delegates to data service
   */
  getSocialAccounts(): Observable<SocialAccount[]> {
    return this.dataService.getSocialAccounts();
  }

  /**
   * Get social account by ID
   * Delegates to data service
   */
  getSocialAccountById(id: string): Observable<SocialAccount> {
    return this.dataService.getSocialAccountById(id);
  }

  /**
   * Get accounts for a specific platform
   * Delegates to data service
   */
  getAccountsByPlatform(platform: Platform): Observable<SocialAccount[]> {
    return this.dataService.getAccountsByPlatform(platform);
  }

  /**
   * Check if platform is connected
   * Delegates to data service
   */
  isPlatformConnected(platform: Platform): boolean {
    return this.dataService.isPlatformConnected(platform);
  }

  /**
   * Alias for isPlatformConnected (for backward compatibility)
   */
  isConnected(platform: Platform): boolean {
    return this.dataService.isConnected(platform);
  }

  /**
   * Get connected accounts for platform selection
   * Delegates to data service
   */
  getConnectedAccounts(): SocialAccount[] {
    return this.dataService.getConnectedAccounts();
  }

  /**
   * Connect a social account (initiates OAuth flow)
   * Delegates to OAuth service
   */
  connect(
    platform: Platform,
    accountName?: string,
    accountType: 'business' | 'personal' | 'creator' = 'business',
  ): Observable<SocialAccount> {
    return this.oauthService.connect(platform, accountName, accountType);
  }

  /**
   * Handle OAuth callback
   * Delegates to OAuth service
   */
  handleOAuthCallback(code: string, state: string): Observable<SocialAccount> {
    return this.oauthService.handleOAuthCallback(code, state);
  }

  /**
   * Reconnect a social account (reinitiates OAuth flow)
   * Delegates to OAuth service
   */
  reconnect(accountId: string): Observable<SocialAccount> {
    return this.oauthService.reconnect(accountId);
  }

  /**
   * Disconnect a social account
   * Delegates to data service
   */
  disconnect(accountId: string): Observable<boolean> {
    return this.dataService.disconnect(accountId);
  }

  /**
   * Manual connect Instagram (or other platform) using access token and account ID
   * Delegates to manual connect service
   */
  manualConnect(
    platform: Platform,
    accountId: string,
    accessToken: string,
    username?: string,
    accountName?: string,
    profilePictureUrl?: string,
    refreshToken?: string,
    tokenExpiresAt?: string,
  ): Observable<SocialAccount> {
    return this.manualConnectService.manualConnect(
      platform,
      accountId,
      accessToken,
      username,
      accountName,
      profilePictureUrl,
      refreshToken,
      tokenExpiresAt,
    );
  }

  /**
   * Refresh accounts list
   * Delegates to data service
   */
  refresh(): Observable<SocialAccount[]> {
    return this.dataService.refresh();
  }
}
