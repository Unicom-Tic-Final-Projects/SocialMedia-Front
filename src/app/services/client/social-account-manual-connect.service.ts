import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Platform, SocialAccount } from '../../models/social.models';
import { SocialAccountsDataService } from './social-accounts-data.service';

/**
 * Service responsible for manual connection operations (using tokens)
 */
@Injectable({
  providedIn: 'root',
})
export class SocialAccountManualConnectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly dataService = inject(SocialAccountsDataService);

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
    tokenExpiresAt?: string,
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

    return this.http
      .post<{
        id: string;
        platform: string;
        displayName: string;
        platformUsername: string;
        platformUserId: string;
        isActive: boolean;
        lastConnectedAt?: string;
        createdAt: string;
        profilePictureUrl?: string;
      }>(`${this.baseUrl}/api/socialaccount/manual-connect`, request)
      .pipe(
        map((response) => this.dataService.mapToSocialAccount({
          id: response.id,
          tenantId: '',
          userId: '',
          platform: response.platform,
          platformUserId: response.platformUserId,
          platformUsername: response.platformUsername,
          displayName: response.displayName,
          profilePictureUrl: response.profilePictureUrl,
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
        catchError((error) => {
          console.error('Failed to manually connect account:', error);
          return throwError(() => error);
        }),
      );
  }
}

